# backend/app/crud/action.py
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status
from typing import Optional, Dict, Any, List, Tuple
import random
import re
import logging

# Импортируем модели, схемы, зависимости
from .. import models, schemas
from . import character as character_crud
from .item import get_inventory_item

# --- ОБНОВЛЕННЫЙ ИМПОРТ UTILS ---
from .utils import (
    _parse_and_roll, SKILL_MODIFIER_MAP,
    roll_with_advantage_disadvantage, format_roll_details, RollMode,
    determine_roll_mode,
    parse_cooldown_duration # <-- Добавляем парсер кулдауна
)
# --- КОНЕЦ ОБНОВЛЕНИЯ ---

logger = logging.getLogger(__name__)

# Импортируем хелпер парсинга числовых модов
try:
    from .skill_check import _get_numeric_modifier_for_context
except ImportError:
    try:
        from .utils import _get_numeric_modifier_for_context
        logger.warning("Could not import '_get_numeric_modifier_for_context' from 'skill_check', using 'utils'.")
    except ImportError:
         logger.error("Failed to import '_get_numeric_modifier_for_context' from both 'skill_check' and 'utils'. Using fallback.")
         def _get_numeric_modifier_for_context(active_effects, target_context): return 0


# --- Вспомогательная функция расхода патронов (_consume_ammo) ---
def _consume_ammo(
    db: Session,
    character: models.Character,
    weapon: models.Weapon,
    amount: int = 1
) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Расходует указанное количество патронов нужного типа."""
    if not weapon.required_ammo_type:
        logger.debug(f"Weapon '{weapon.name}' does not require ammo type.")
        return True, None

    required_type = weapon.required_ammo_type
    ammo_item_entry: Optional[models.CharacterInventoryItem] = None

    # Ищем патроны сначала в загруженном инвентаре
    if character.inventory:
         for inv_item in character.inventory:
             # Проверяем, что item существует и является Ammo
             if inv_item.item and isinstance(inv_item.item, models.Ammo) and inv_item.item.ammo_type == required_type:
                 ammo_item_entry = inv_item
                 break

    # Если не нашли в загруженном, делаем запрос к БД (на всякий случай, хотя инвентарь должен быть загружен)
    if not ammo_item_entry:
        logger.warning(f"Ammo type '{required_type}' not found in preloaded inventory for char {character.id}. Querying DB.")
        # Используем существующую связь inventory, но можем и перестраховаться запросом
        character_inventory = db.query(models.CharacterInventoryItem).join(models.Item).filter(
            models.CharacterInventoryItem.character_id == character.id,
            models.Item.item_type == 'ammo' # Уточняем тип предмета
        ).options(
            selectinload(models.CharacterInventoryItem.item.of_type(models.Ammo)) # Загружаем конкретный тип Ammo
        ).all()

        for inv_item in character_inventory:
            # Повторная проверка типа
            if inv_item.item and isinstance(inv_item.item, models.Ammo) and inv_item.item.ammo_type == required_type:
                ammo_item_entry = inv_item
                break

    if not ammo_item_entry:
        logger.warning(f"Ammo type '{required_type}' not found for character {character.id} even after DB query.")
        return False, None # Патроны не найдены

    if ammo_item_entry.quantity < amount:
        logger.warning(f"Not enough ammo '{required_type}' for character {character.id}. Needed: {amount}, Have: {ammo_item_entry.quantity}")
        return False, None # Недостаточно патронов

    # Расходуем патроны
    ammo_item_entry.quantity -= amount
    remaining_ammo = ammo_item_entry.quantity
    item_name = ammo_item_entry.item.name if ammo_item_entry.item else "???"
    item_id = ammo_item_entry.item.id if ammo_item_entry.item else None

    ammo_info = {
        "ammo_item_id": item_id,
        "ammo_name": item_name,
        "consumed": amount,
        "remaining": remaining_ammo
    }
    logger.info(f"Consumed {amount} of ammo '{required_type}' for char {character.id}. Remaining: {remaining_ammo}")
    db.add(ammo_item_entry) # Помечаем для сохранения (коммит будет позже)
    return True, ammo_info

# --- Функция броска 3к6 (roll_3d6) ---
def roll_3d6():
    """Бросает 3 шестигранных кубика."""
    return random.randint(1, 6) + random.randint(1, 6) + random.randint(1, 6)

# --- Основная функция активации действия (v2 - с учетом слотов и кулдаунов) ---
def activate_action(
    db: Session,
    character_id: int,
    user_id: int,
    activation_data: schemas.ActivationRequest
) -> Optional[schemas.ActionResultOut]:
    """
    Обрабатывает активацию способности или использование предмета.
    Учитывает активные слоты способностей и их кулдауны.
    """
    # Загрузка персонажа со всеми необходимыми связями
    character = db.query(models.Character).options(
        selectinload(models.Character.inventory).selectinload(models.CharacterInventoryItem.item),
        # Загружаем способности оружия явно
        selectinload(models.Character.equipped_weapon1)
            .selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon))
            .selectinload(models.Weapon.granted_abilities),
        selectinload(models.Character.equipped_weapon2)
            .selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon))
            .selectinload(models.Weapon.granted_abilities),
        # Остальная экипировка
        selectinload(models.Character.equipped_armor).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_shield).selectinload(models.CharacterInventoryItem.item),
        # Активные эффекты
        selectinload(models.Character.active_status_effects),
        # --- НОВОЕ: Загружаем способности в слотах ---
        selectinload(models.Character.active_ability_1),
        selectinload(models.Character.active_ability_2),
        selectinload(models.Character.active_ability_3),
        selectinload(models.Character.active_ability_4),
        selectinload(models.Character.active_ability_5),
        # --- КОНЕЦ ---
    ).filter(
        models.Character.id == character_id,
        models.Character.owner_id == user_id
    ).first()

    if not character:
        logger.warning(f"FAIL: Character {character_id} not found or doesn't belong to user {user_id}.")
        # Возвращаем ошибку сразу, не используя action_result
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден")

    activation_type = activation_data.activation_type
    target_id = activation_data.target_id # ID способности ИЛИ ID записи инвентаря
    logger.info(f"--- ACTION START: Type='{activation_type}', TargetID={target_id} for Char='{character.name}' (ID:{character.id}) ---")

    # Инициализация
    consumed_resources_dict = {}
    action_result: Optional[schemas.ActionResultOut] = None # Результат, который вернем
    objects_to_delete = [] # Объекты инвентаря для удаления (если quantity=0)
    ammo_inv_item_to_delete = None # Отдельно для патронов

    try:
        # ===========================================
        # === ЛОГИКА ИСПОЛЬЗОВАНИЯ ПРЕДМЕТА (item) ===
        # ===========================================
        if activation_type == 'item':
            # Проверка блокировки действия статус-эффектами
            action_restricted_by_effect = None
            if character.active_status_effects:
                 for effect in character.active_status_effects:
                      if effect.action_restrictions and isinstance(effect.action_restrictions, dict):
                           # Проверяем, блокирует ли эффект использование предметов (может быть отдельный флаг или общая блокировка Действия/Бонусного)
                           # Пока считаем, что block_action блокирует и предметы
                           if effect.action_restrictions.get("block_action"):
                                action_restricted_by_effect = effect.name
                                break
            if action_restricted_by_effect:
                message = f"Предмет не может быть использован: Действие заблокировано эффектом '{action_restricted_by_effect}'."
                logger.warning(message)
                # Используем HTTPException для явной ошибки 400
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

            # Получаем предмет инвентаря
            inv_item = get_inventory_item(db, inventory_item_id=target_id, character_id=character_id, user_id=user_id)
            if not inv_item or not inv_item.item: # Добавлена проверка inv_item.item
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден в инвентаре")

            item = inv_item.item # Теперь item точно не None

            if inv_item.quantity <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"У предмета '{item.name}' закончились использования.")

            # Расчет эффекта (если есть формула)
            formula = getattr(item, 'effect_dice_formula', None)
            calculated_value = 0
            roll_details = "Нет формулы"
            if formula:
                calculated_value, roll_details = _parse_and_roll(formula, character)

            # Расход предмета
            item_was_consumed_or_deleted = False
            if isinstance(item, models.GeneralItem): # Расходуются только GeneralItem (пока)
                if inv_item.quantity > 1:
                    inv_item.quantity -= 1
                    consumed_resources_dict['item'] = {"item_id": item.id, "name": item.name, "consumed": 1, "remaining": inv_item.quantity}
                    db.add(inv_item) # Помечаем для сохранения
                    item_was_consumed_or_deleted = True
                    logger.info(f"Item '{item.name}' (InvID: {inv_item.id}) quantity reduced to {inv_item.quantity}.")
                else:
                    # Если это последний предмет, помечаем для удаления
                    consumed_resources_dict['item'] = {"item_id": item.id, "name": item.name, "consumed": 1, "remaining": 0}
                    objects_to_delete.append(inv_item)
                    item_was_consumed_or_deleted = True
                    logger.info(f"Item '{item.name}' (InvID: {inv_item.id}) marked for deletion.")
                    # Сразу снимаем с экипировки, если был экипирован (хотя расходники обычно нет)
                    if character.armor_inv_item_id == inv_item.id: character.armor_inv_item_id = None
                    if character.shield_inv_item_id == inv_item.id: character.shield_inv_item_id = None
                    if character.weapon1_inv_item_id == inv_item.id: character.weapon1_inv_item_id = None
                    if character.weapon2_inv_item_id == inv_item.id: character.weapon2_inv_item_id = None

            # Применение эффекта (пример: лечение)
            healing_applied = False
            final_message = ""
            result_details = {}

            if isinstance(item, models.GeneralItem) and item.category == 'Медицина' and calculated_value > 0:
                current_hp = character.current_hp
                max_hp = character.max_hp
                new_hp = min(max_hp, current_hp + calculated_value)
                healed_for = new_hp - current_hp
                if healed_for > 0:
                    character.current_hp = new_hp
                    final_message = f"'{item.name}' использован. Восстановлено {healed_for} ПЗ ({roll_details}). Текущие ПЗ: {new_hp}/{max_hp}."
                    result_details = {"roll_details": roll_details, "calculated_value": calculated_value, "healing_done": healed_for, "new_hp": new_hp}
                    db.add(character) # Помечаем персонажа для сохранения
                    healing_applied = True
                else:
                    final_message = f"'{item.name}' использован, но здоровье уже полное."
                    result_details = {"roll_details": roll_details, "calculated_value": calculated_value}
            else:
                # Общий случай использования предмета
                final_message = f"Предмет '{item.name}' использован."
                result_details = {"roll_details": roll_details, "calculated_value": calculated_value}
                if calculated_value > 0 and not healing_applied: # Добавляем результат, если он был и не был лечением
                    final_message += f" Результат ({roll_details}): {calculated_value}."

            character_update_needed = item_was_consumed_or_deleted or healing_applied

            action_result = schemas.ActionResultOut(
                success=True,
                message=final_message,
                details=result_details,
                consumed_resources=consumed_resources_dict or None,
                character_update_needed=character_update_needed
            )

        # ==============================================
        # === ЛОГИКА АКТИВАЦИИ СПОСОБНОСТИ (ability) ===
        # ==============================================
        elif activation_type == 'ability':
            # Находим способность в БД
            ability = db.query(models.Ability).filter(models.Ability.id == target_id).first()
            if not ability:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Способность не найдена")

            # --- Проверка ограничений действий от статус-эффектов ---
            required_action_type = ability.action_type or "Действие" # Тип действия, нужный для способности
            restriction_violated = False
            action_restricted_by_effect = None
            if character.active_status_effects:
                for effect in character.active_status_effects:
                    if effect.action_restrictions and isinstance(effect.action_restrictions, dict):
                        restrictions = effect.action_restrictions
                        is_main_action = required_action_type.startswith("Действие") or required_action_type.startswith("Атака")
                        if is_main_action and restrictions.get("block_action"):
                            action_restricted_by_effect = effect.name; restriction_violated = True; break
                        if required_action_type == "Бонусное действие" and restrictions.get("block_bonus"):
                            action_restricted_by_effect = effect.name; restriction_violated = True; break
                        if required_action_type == "Реакция" and restrictions.get("block_reaction"):
                            action_restricted_by_effect = effect.name; restriction_violated = True; break
            if restriction_violated:
                message = f"Невозможно использовать '{ability.name}': {required_action_type} заблокировано эффектом '{action_restricted_by_effect}'."
                logger.warning(message)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

            # --- Определение источника способности (Оружие или Слот) ---
            is_weapon_ability = False
            equipped_weapon: Optional[models.Weapon] = None # Оружие, дающее способность

            # Проверяем оружие 1
            if character.equipped_weapon1 and isinstance(character.equipped_weapon1.item, models.Weapon):
                # Проверяем ID способности в списке granted_abilities оружия
                if ability.id in {ab.id for ab in character.equipped_weapon1.item.granted_abilities if ab}: # Добавлена проверка if ab
                    is_weapon_ability = True
                    equipped_weapon = character.equipped_weapon1.item
                    logger.debug(f"Ability '{ability.name}' identified as granted by weapon 1: '{equipped_weapon.name}'")

            # Проверяем оружие 2 (если не найдено в первом)
            if not is_weapon_ability and character.equipped_weapon2 and isinstance(character.equipped_weapon2.item, models.Weapon):
                if ability.id in {ab.id for ab in character.equipped_weapon2.item.granted_abilities if ab}: # Добавлена проверка if ab
                    is_weapon_ability = True
                    equipped_weapon = character.equipped_weapon2.item
                    logger.debug(f"Ability '{ability.name}' identified as granted by weapon 2: '{equipped_weapon.name}'")

            # Переменные для слота и кулдауна (если это не оружейная способность)
            slot_number_used: Optional[int] = None
            slot_cooldown_attr_name: Optional[str] = None

            if not is_weapon_ability:
                # --- Проверка Слотов и Кулдаунов для НЕоружейных способностей ---
                found_in_slot = False
                for i in range(1, 6):
                    slot_id_attr = f"active_ability_slot_{i}_id"
                    if getattr(character, slot_id_attr) == ability.id:
                        # Нашли способность в слоте i
                        slot_number_used = i
                        slot_cooldown_attr_name = f"active_ability_slot_{i}_cooldown"
                        current_slot_cooldown = getattr(character, slot_cooldown_attr_name, 0)

                        if current_slot_cooldown > 0:
                            message = f"Способность '{ability.name}' в слоте {i} на кулдауне ({current_slot_cooldown} ход(а/ов))."
                            logger.warning(message)
                            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

                        found_in_slot = True
                        logger.debug(f"Ability '{ability.name}' found in active slot {i}. Cooldown OK.")
                        break # Выходим из цикла, как только нашли

                if not found_in_slot:
                    message = f"Способность '{ability.name}' не найдена в активных слотах и не предоставлена оружием."
                    logger.warning(message)
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
            # --- Конец проверки слотов ---

            # --- Общая Логика Способности (Атака, Эффект и т.д.) ---
            # (Сюда переносится существующая логика обработки разных способностей:
            #  базовая атака, очередь, конус дробовика, точный выстрел и т.д.)

            # Расход патронов (если это атака оружием или способность требует патронов)
            ammo_consumed_info: Optional[Dict[str, Any]] = None
            ammo_to_consume = 0
            if equipped_weapon and equipped_weapon.required_ammo_type:
                # Определяем, сколько патронов нужно для этой способности
                if ability.is_weapon_attack: # Базовая атака оружием
                     ammo_to_consume = 1
                elif ability.name == "Очередь":
                     ammo_to_consume = random.randint(3, 5)
                elif ability.name == "Атака конусом (Дробовик)":
                     ammo_to_consume = 1
                # Добавить другие способности, требующие патронов

                if ammo_to_consume > 0:
                    ammo_check_passed, ammo_consumed_info = _consume_ammo(db, character, equipped_weapon, ammo_to_consume)
                    if not ammo_check_passed:
                        # Ошибка уже залогирована в _consume_ammo
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Недостаточно патронов '{equipped_weapon.required_ammo_type}'")
                    if ammo_consumed_info:
                        consumed_resources_dict['ammo'] = ammo_consumed_info
                        # Помечаем патроны для удаления, если они закончились
                        if ammo_consumed_info.get('remaining', 1) <= 0:
                             ammo_inv_item_to_find = db.query(models.CharacterInventoryItem).filter(
                                 models.CharacterInventoryItem.item_id == ammo_consumed_info.get('ammo_item_id'),
                                 models.CharacterInventoryItem.character_id == character.id
                             ).first()
                             if ammo_inv_item_to_find:
                                 ammo_inv_item_to_delete = ammo_inv_item_to_find # Пометим для удаления в конце

            # --- Обработка Базовой Атаки Оружием (is_weapon_attack=True) ---
            if ability.is_weapon_attack:
                if not equipped_weapon: # Должен быть, если is_weapon_ability=True
                     logger.error(f"Weapon ability '{ability.name}' activated but no equipped_weapon found.")
                     raise HTTPException(status_code=500, detail="Ошибка: Оружейная способность без оружия.")

                attack_skill_name = ability.attack_skill or "Ловкость" # Навык для атаки
                mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3])
                if not mod_attribute_name:
                     logger.error(f"Invalid attack_skill '{attack_skill_name}' for ability '{ability.name}'.")
                     raise HTTPException(status_code=500, detail="Ошибка конфигурации способности: неверный навык атаки.")
                base_modifier = getattr(character, mod_attribute_name, 0)

                # Определяем контекст атаки (melee/ranged, stat)
                is_ranged_attack = attack_skill_name in ["Ловкость", "Внимательность"] and equipped_weapon.range_normal is not None
                attack_type_str = 'ranged' if is_ranged_attack else 'melee'
                skill_attr_map = {'Сила': 'strength', 'Ловкость': 'dexterity', 'Внимательность': 'attention'}
                skill_attr_for_target = skill_attr_map.get(attack_skill_name, 'other')
                attack_context_string = f"attack_rolls.{attack_type_str}.{skill_attr_for_target}"

                # Получаем числовой мод от эффектов и предметов
                numeric_mod_from_effects = _get_numeric_modifier_for_context(character.active_status_effects, attack_context_string)
                item_bonus_value = 0 # TODO: Добавить логику бонусов от предметов, как в perform_skill_check

                # Проверяем временное преимущество (например, от "Точный Выстрел")
                has_temp_advantage = False
                effect_to_remove_after_attack = None
                if is_ranged_attack and character.active_status_effects:
                    for effect in list(character.active_status_effects):
                        if effect.name == "_Temp: Precise Aim":
                            # Проверяем, применим ли эффект (логика из utils.determine_roll_mode)
                            targets = effect.roll_modifier_targets; applies = False
                            if isinstance(targets, dict):
                                target_list = targets.get("attack_rolls")
                                if target_list is True or target_list == "all" or (isinstance(target_list, list) and "ranged" in target_list):
                                    applies = True
                            if applies:
                                logger.info(f"Consuming temporary effect: _Temp: Precise Aim for attack '{ability.name}'")
                                has_temp_advantage = True
                                effect_to_remove_after_attack = effect
                                break

                # Определяем режим броска атаки
                attack_roll_mode = determine_roll_mode(
                    character, attack_context_string,
                    ability_modifies='normal', # Базовая атака сама по себе не дает преим./помеху
                    has_temporary_advantage=has_temp_advantage
                )

                # Бросок атаки
                attack_roll_base, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(mode=attack_roll_mode)
                attack_roll_total = attack_roll_base + base_modifier + numeric_mod_from_effects + item_bonus_value

                # Детали броска
                attack_roll_detail = format_roll_details(
                    kept_dice, all_rolls, base_modifier, f"Мод.{attack_skill_name[:3]}",
                    numeric_mod_from_effects, item_bonus_value, used_mode
                )

                # Удаляем временный эффект, если он был использован
                if effect_to_remove_after_attack:
                    try:
                        character.active_status_effects.remove(effect_to_remove_after_attack)
                        logger.info(f"Temp effect '{effect_to_remove_after_attack.name}' removed after attack.")
                    except ValueError:
                        logger.warning(f"Effect '{effect_to_remove_after_attack.name}' not found for removal.")

                # Попадание (ЗАГЛУШКА - нужно сравнить с AC цели, если она есть)
                # target_ac = 10 # Пример
                # hit = attack_roll_total >= target_ac
                hit = True # Пока считаем, что всегда попадаем для теста

                # Урон
                damage_value = 0
                damage_roll_detail = "Промах"
                damage_type = ability.damage_type or "Неизвестный"
                if hit:
                    formula_to_roll = ability.damage_formula
                    # Если формула "См. оружие", берем из оружия
                    if formula_to_roll and formula_to_roll.lower() == 'см. оружие':
                        if equipped_weapon and equipped_weapon.damage:
                            formula_to_roll = equipped_weapon.damage
                            damage_type = equipped_weapon.damage_type or damage_type # Обновляем тип урона
                        else:
                            formula_to_roll = None # Нет оружия или у него нет урона
                            damage_roll_detail = "Нет данных об уроне оружия"
                    # Бросаем кубики урона
                    if formula_to_roll:
                        damage_value, damage_roll_detail = _parse_and_roll(formula_to_roll, character)
                    else:
                        damage_roll_detail = "Нет формулы урона"

                # Формируем сообщение результата
                result_message = f"Атака '{ability.name}' ({attack_skill_name}). Бросок: {attack_roll_total} ({attack_roll_detail})."
                if hit:
                    result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали: {damage_roll_detail}."
                else:
                    result_message += " Промах."
                if ammo_consumed_info:
                    result_message += f" Патроны: -{ammo_consumed_info['consumed']} (ост: {ammo_consumed_info['remaining']})."

                # Собираем результат
                action_result = schemas.ActionResultOut(
                    success=True, message=result_message,
                    details={
                        "attack_roll": attack_roll_total, "attack_roll_detail": attack_roll_detail,
                        "roll_mode": used_mode, "hit": hit, "damage_dealt": damage_value if hit else 0,
                        "damage_roll_detail": damage_roll_detail if hit else "Нет урона",
                        "damage_type": damage_type if hit else None
                    },
                    numeric_mod_from_effects=numeric_mod_from_effects + item_bonus_value if (numeric_mod_from_effects + item_bonus_value) != 0 else None,
                    consumed_resources=consumed_resources_dict or None,
                    character_update_needed=True # Обновление нужно из-за патронов или эффектов
                )

            # --- Обработка Других Способностей (не is_weapon_attack) ---
            else:
                # --- Атака Конусом (Дробовик) ---
                if ability.name == "Атака конусом (Дробовик)":
                    if not equipped_weapon: raise HTTPException(status_code=400, detail="Требуется экипированный дробовик.")
                    save_dc = 8 + character.dexterity_mod # Пример СЛ, можно сделать сложнее
                    save_attribute = "Ловкость"
                    base_damage_formula = equipped_weapon.damage or "0" # Нужна формула урона оружия
                    full_damage_value, full_damage_details = _parse_and_roll(base_damage_formula, character)
                    damage_on_fail = max(1, full_damage_value // 2) # Половина урона при провале
                    damage_on_success = 0 # Без урона при успехе
                    damage_type = equipped_weapon.damage_type or "Колющий"

                    final_message = f"'{ability.name}'. Цели в конусе 5м: Спасбросок {save_attribute} СЛ {save_dc}. Провал: {damage_on_fail} ({damage_type}). Успех: без урона."
                    if ammo_consumed_info: final_message += f" Патроны: -{ammo_consumed_info['consumed']} (ост: {ammo_consumed_info['remaining']})."

                    result_details = {
                        "area_effect": "cone_5m", "saving_throw_dc": save_dc, "saving_throw_attribute": save_attribute,
                        "damage_on_fail": damage_on_fail, "damage_on_success": damage_on_success,
                        "damage_type": damage_type, "base_damage_roll_details": full_damage_details
                    }
                    action_result = schemas.ActionResultOut(success=True, message=final_message, details=result_details, consumed_resources=consumed_resources_dict or None, character_update_needed=True)

                # --- Очередь ---
                elif ability.name == "Очередь":
                    if not equipped_weapon: raise HTTPException(status_code=400, detail="Требуется экипированное оружие с очередью.")
                    # Почти как базовая атака, но с помехой и доп. уроном
                    attack_skill_name = ability.attack_skill or "Ловкость"
                    mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3])
                    if not mod_attribute_name: raise HTTPException(status_code=500, detail="Ошибка конфигурации Очереди: неверный навык.")
                    base_modifier = getattr(character, mod_attribute_name, 0)

                    attack_context_string = f"attack_rolls.ranged.{skill_attr_map.get(attack_skill_name, 'other')}"
                    numeric_mod_from_effects = _get_numeric_modifier_for_context(character.active_status_effects, attack_context_string)
                    item_bonus_value = 0 # TODO: Бонусы от предметов

                    # Проверяем временное преимущество (может скомпенсировать помеху от очереди)
                    has_temp_advantage = False; effect_to_remove_after_attack = None
                    if character.active_status_effects:
                        for effect in list(character.active_status_effects):
                            if effect.name == "_Temp: Precise Aim":
                                targets = effect.roll_modifier_targets; applies = False
                                if isinstance(targets, dict):
                                    target_list = targets.get("attack_rolls")
                                    if target_list is True or target_list == "all" or (isinstance(target_list, list) and "ranged" in target_list): applies = True
                                if applies: has_temp_advantage = True; effect_to_remove_after_attack = effect; break

                    # Определяем режим броска (Помеха от Очереди + Статусы + Временное Преим.)
                    attack_roll_mode = determine_roll_mode(
                        character, attack_context_string,
                        ability_modifies='disadvantage', # <-- Помеха от способности
                        has_temporary_advantage=has_temp_advantage
                    )

                    # Бросок атаки
                    attack_roll_base, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(mode=attack_roll_mode)
                    attack_roll_total = attack_roll_base + base_modifier + numeric_mod_from_effects + item_bonus_value
                    attack_roll_detail = format_roll_details(kept_dice, all_rolls, base_modifier, f"Мод.{attack_skill_name[:3]}", numeric_mod_from_effects, item_bonus_value, used_mode)

                    # Удаляем временный эффект
                    if effect_to_remove_after_attack:
                        try: character.active_status_effects.remove(effect_to_remove_after_attack); logger.info("Temp effect removed after Burst.")
                        except ValueError: logger.warning("Temp effect not found for removal after Burst.")

                    # Попадание (ЗАГЛУШКА)
                    hit = True

                    # Урон (базовый + доп. кость)
                    damage_value = 0; damage_roll_detail = "Промах"; damage_type = equipped_weapon.damage_type or "Неизвестный"
                    if hit:
                        base_formula = equipped_weapon.damage or "0"
                        dice_match = re.search(r"(\d+)к(\d+)", base_formula) # Находим первую кость типа NdM
                        extra_dice_formula = f"1к{dice_match.group(2)}" if dice_match else "1к6" # Доп. кость того же типа или 1к6 по умолчанию
                        base_damage_val, base_details = _parse_and_roll(base_formula, character)
                        extra_damage_val, extra_details = _parse_and_roll(extra_dice_formula, character)
                        damage_value = base_damage_val + extra_damage_val
                        damage_roll_detail = f"{base_details} + {extra_details}(Очередь)"

                    # Сообщение
                    result_message = f"'{ability.name}' из '{equipped_weapon.name}'. Атака ({used_mode}): {attack_roll_total} ({attack_roll_detail})."
                    if hit: result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали: {damage_roll_detail}."
                    else: result_message += " Промах."
                    if ammo_consumed_info: result_message += f" Патроны: -{ammo_consumed_info['consumed']} (ост: {ammo_consumed_info['remaining']})."

                    # Результат
                    action_result = schemas.ActionResultOut(
                        success=True, message=result_message,
                        details={
                            "attack_roll": attack_roll_total, "attack_roll_detail": attack_roll_detail, "roll_mode": used_mode,
                            "hit": hit, "damage_dealt": damage_value if hit else 0, "damage_roll_detail": damage_roll_detail if hit else "Нет урона",
                            "damage_type": damage_type if hit else None
                        },
                        numeric_mod_from_effects=numeric_mod_from_effects + item_bonus_value if (numeric_mod_from_effects + item_bonus_value) != 0 else None,
                        consumed_resources=consumed_resources_dict or None, character_update_needed=True
                    )

                # --- Точный Выстрел (Применение временного эффекта) ---
                elif ability.name == "Точный Выстрел":
                    logger.info(f"Activating ability: {ability.name}")
                    temp_effect_name = "_Temp: Precise Aim" # Имя временного эффекта
                    # Ищем шаблон эффекта в БД
                    effect_template = db.query(models.StatusEffect).filter(models.StatusEffect.name == temp_effect_name).first()
                    if effect_template:
                        # Применяем эффект к персонажу (функция из character_crud)
                        # Эта функция сама проверит, не активен ли уже эффект
                        added_effect_name = character_crud.apply_status_effect(db, character, effect_template.id)
                        if added_effect_name:
                            action_result = schemas.ActionResultOut(success=True, message=f"'{ability.name}'. Следующая дальняя атака будет с преимуществом.", details={}, consumed_resources=consumed_resources_dict or None, character_update_needed=True) # Обновление нужно, т.к. статус добавлен
                            logger.info(f"Applied temp effect '{added_effect_name}' to character {character.id}.")
                        else:
                            # Эффект уже был активен
                            action_result = schemas.ActionResultOut(success=True, message=f"Эффект '{temp_effect_name}' уже активен.", details={}, consumed_resources=consumed_resources_dict or None, character_update_needed=False)
                            logger.info(f"Effect '{temp_effect_name}' was already active on character {character.id}.")
                    else:
                        # Ошибка конфигурации - эффект не найден в БД
                        logger.error(f"Configuration error: StatusEffect template '{temp_effect_name}' not found in DB.")
                        raise HTTPException(status_code=500, detail=f"Ошибка конфигурации: Не найден эффект '{temp_effect_name}'")

                # --- Другие способности (Заглушка) ---
                else:
                    # Если логика для способности не реализована
                    logger.warning(f"Logic for ability '{ability.name}' (ID: {ability.id}) is not implemented yet.")
                    raise HTTPException(status_code=501, detail=f"Логика для способности '{ability.name}' не реализована.")

            # --- Установка Кулдауна для Слота (если способность была из слота) ---
            if action_result and action_result.success and slot_number_used is not None and slot_cooldown_attr_name is not None:
                cooldown_duration = parse_cooldown_duration(ability.cooldown)
                if cooldown_duration is not None and cooldown_duration > 0:
                    setattr(character, slot_cooldown_attr_name, cooldown_duration)
                    logger.info(f"Ability '{ability.name}' used from slot {slot_number_used}. Cooldown set to {cooldown_duration} turns.")
                    # Помечаем персонажа для сохранения, если еще не помечен
                    if not db.is_modified(character):
                         db.add(character)
                    action_result.character_update_needed = True # Обновление точно нужно

        # --- Неизвестный тип активации ---
        else:
            logger.error(f"Unknown activation type received: {activation_type}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неизвестный тип активации")

        # --- УСПЕШНОЕ ЗАВЕРШЕНИЕ (Общий блок коммита) ---
        if action_result and action_result.success:
            logger.info(f"--- ACTION RESULT (Success): {action_result.message} ---")
            try:
                # Удаляем объекты инвентаря перед коммитом
                for obj_to_del in objects_to_delete:
                    logger.info(f"Deleting Item object ID {obj_to_del.id} (Item: {obj_to_del.item.name if obj_to_del.item else '???'})")
                    db.delete(obj_to_del)

                # Удаляем патроны, если они закончились
                if ammo_inv_item_to_delete and ammo_inv_item_to_delete.quantity <= 0:
                    logger.info(f"Deleting ammo InvItem ID {ammo_inv_item_to_delete.id} (Item: {ammo_inv_item_to_delete.item.name if ammo_inv_item_to_delete.item else '???'})")
                    db.delete(ammo_inv_item_to_delete)

                # Коммитим все изменения (персонаж, инвентарь, кулдауны)
                db.commit()
                logger.info("Action successful, changes committed.")

                # Обновляем объект персонажа из БД, чтобы получить актуальные данные (особенно связи)
                if action_result.character_update_needed:
                    db.refresh(character)
                    # Явно обновим связи, которые могли измениться (статусы, инвентарь, слоты)
                    db.refresh(character, attribute_names=[
                        'active_status_effects', 'inventory',
                        'active_ability_1', 'active_ability_2', 'active_ability_3',
                        'active_ability_4', 'active_ability_5'
                    ])
                    logger.debug("Character object and relevant relations refreshed.")

            except Exception as commit_exc:
                logger.error(f"DATABASE COMMIT FAILED after successful action: {commit_exc}", exc_info=True)
                db.rollback() # Откатываем транзакцию
                # Возвращаем ошибку 500, т.к. действие выполнилось, но сохранить не удалось
                raise HTTPException(status_code=500, detail=f"Ошибка сохранения результата действия: {commit_exc}")

        # Возвращаем результат (даже если success=False, но action_result был создан)
        # Если дошли сюда без action_result (например, из-за раннего raise), то вернется None, что вызовет ошибку в роутере
        return action_result

    # --- Обработка Исключений (включая HTTPException) ---
    except HTTPException as http_exc:
        # Перехватываем HTTP исключения, чтобы залогировать и пробросить дальше
        logger.warning(f"--- ACTION FAILED (HTTPException {http_exc.status_code}): {http_exc.detail} ---")
        db.rollback() # Откатываем на всякий случай
        raise http_exc # Пробрасываем исключение дальше, FastAPI его обработает

    except Exception as e:
        # Ловим все остальные непредвиденные ошибки
        db.rollback() # Откатываем транзакцию
        error_message = f"Внутренняя ошибка сервера при активации действия: {e}"
        logger.error(f"--- ACTION FAILED (Unexpected Exception): {error_message} ---", exc_info=True)
        # Возвращаем ошибку 500
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_message)