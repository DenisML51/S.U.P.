# backend/app/crud/action.py
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status
from typing import Optional, Dict, Any, List, Tuple
import random
import re
import logging

# Импортируем character_crud и модели/схемы
from . import character as character_crud
from .. import models, schemas
# Импортируем утилиты, включая обновленные determine_roll_mode и format_roll_details
from .utils import (
    _parse_and_roll, SKILL_MODIFIER_MAP,
    roll_with_advantage_disadvantage, format_roll_details, RollMode,
    determine_roll_mode # Убедимся, что импортирована обновленная версия
)
from .item import get_inventory_item

logger = logging.getLogger(__name__)

# --- Вспомогательная функция расхода патронов ---
def _consume_ammo(
    db: Session,
    character: models.Character,
    weapon: models.Weapon,
    amount: int = 1) -> Tuple[bool, Optional[Dict[str, Any]]]:
    # ... (код _consume_ammo без изменений) ...
    if not weapon.required_ammo_type:
        logger.debug(f"Weapon '{weapon.name}' does not require ammo type. Skipping consumption.")
        return True, None

    required_type = weapon.required_ammo_type
    ammo_item_entry: Optional[models.CharacterInventoryItem] = None
    found_in_loaded = False

    if character.inventory:
         for inv_item in character.inventory:
             if inv_item.item and isinstance(inv_item.item, models.Ammo) and inv_item.item.ammo_type == required_type:
                 ammo_item_entry = inv_item
                 found_in_loaded = True
                 break

    if not found_in_loaded:
        logger.warning(f"Ammo type '{required_type}' not found in preloaded inventory for char {character.id}. Querying DB again.")
        character_inventory = db.query(models.CharacterInventoryItem).filter(
            models.CharacterInventoryItem.character_id == character.id
        ).options(selectinload(models.CharacterInventoryItem.item)).all()

        for inv_item in character_inventory:
            if inv_item.item and isinstance(inv_item.item, models.Ammo) and inv_item.item.ammo_type == required_type:
                ammo_item_entry = inv_item
                break

    if not ammo_item_entry:
        logger.warning(f"Ammo type '{required_type}' not found in inventory for character {character.id}.")
        return False, None

    if ammo_item_entry.quantity < amount:
        logger.warning(f"Not enough ammo type '{required_type}' for character {character.id}. Needed: {amount}, Has: {ammo_item_entry.quantity}.")
        return False, None

    ammo_item_entry.quantity -= amount
    remaining_ammo = ammo_item_entry.quantity

    ammo_info = {
        "ammo_item_id": ammo_item_entry.item.id,
        "ammo_name": ammo_item_entry.item.name,
        "consumed": amount,
        "remaining": remaining_ammo
    }
    logger.info(f"Consumed {amount} of ammo '{required_type}'. Remaining: {remaining_ammo} (InvItemID: {ammo_item_entry.id})")

    # Помечаем объект как измененный для сессии SQLAlchemy
    db.add(ammo_item_entry)
    # Удаление объекта произойдет при коммите, если quantity <= 0 (нужно удалить объект перед коммитом)

    return True, ammo_info


# Функция для броска 3к6 (без изменений)
def roll_3d6():
    return random.randint(1, 6) + random.randint(1, 6) + random.randint(1, 6)


# --- Основная функция активации действия ---
def activate_action(
    db: Session,
    character_id: int,
    user_id: int,
    activation_data: schemas.ActivationRequest) -> Optional[schemas.ActionResultOut]:
    """
    Обрабатывает активацию способности или использование предмета.
    Включает логику расхода патронов, преимущество/помеху, числовые модификаторы и временные эффекты.
    """
    # Загрузка персонажа
    character = db.query(models.Character).options(
        selectinload(models.Character.inventory).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_weapon1).selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon)).selectinload(models.Weapon.granted_abilities),
        selectinload(models.Character.equipped_weapon2).selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon)).selectinload(models.Weapon.granted_abilities),
        selectinload(models.Character.equipped_armor).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_shield).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.active_status_effects) # <-- Эффекты загружены
    ).filter(
        models.Character.id == character_id,
        models.Character.owner_id == user_id
    ).first()

    if not character:
        # ... (обработка ошибки "Персонаж не найден")
        logger.warning(f"--- ACTION FAILED ---")
        logger.warning(f"  Reason: Character not found (ID: {character_id}, UserID: {user_id})")
        logger.warning(f"---------------------")
        return schemas.ActionResultOut(success=False, message="Персонаж не найден", character_update_needed=False)


    activation_type = activation_data.activation_type
    target_id = activation_data.target_id
    target_entities: List[int] = activation_data.target_entities or []

    # Логирование старта
    logger.info(f"--- ACTION START ---")
    logger.info(f"  Character: {character.name} (ID: {character.id})")
    logger.info(f"  Activation Type: {activation_type}")
    logger.info(f"  Target ID: {target_id}")
    if target_entities: logger.info(f"  Target Entities: {target_entities}")
    logger.info(f"--------------------")

    consumed_resources_dict = {}
    action_result: Optional[schemas.ActionResultOut] = None
    objects_to_delete = [] # Список для объектов, которые нужно удалить перед коммитом

    ammo_inv_item_to_delete = None

    try:
        # ===========================================
        # === ЛОГИКА ИСПОЛЬЗОВАНИЯ ПРЕДМЕТА (item) ===
        # ===========================================
        if activation_type == 'item':
            inv_item = get_inventory_item(db, inventory_item_id=target_id, character_id=character_id, user_id=user_id)
            if not inv_item:
                 action_result = schemas.ActionResultOut(success=False, message="Предмет не найден в инвентаре.", character_update_needed=False)
                 raise ValueError(action_result.message)

            item = inv_item.item
            if inv_item.quantity <= 0:
                 action_result = schemas.ActionResultOut(success=False, message=f"У предмета '{item.name}' закончились использования.", character_update_needed=False)
                 raise ValueError(action_result.message)

            formula = getattr(item, 'effect_dice_formula', None)
            calculated_value = 0
            roll_details = "Нет формулы"
            if formula:
                calculated_value, roll_details = _parse_and_roll(formula, character)

            # Расход предмета
            item_was_consumed_or_deleted = False
            if item.item_type == 'general' and getattr(item, 'uses', None) is not None:
                 if inv_item.quantity > 1:
                     inv_item.quantity -= 1
                     consumed_resources_dict['item'] = {"item_id": item.id, "name": item.name, "consumed": 1, "remaining": inv_item.quantity}
                     db.add(inv_item) # Добавляем измененный объект в сессию
                     item_was_consumed_or_deleted = True
                 else:
                     consumed_resources_dict['item'] = {"item_id": item.id, "name": item.name, "consumed": 1, "remaining": 0}
                     # Снимаем с экипировки перед удалением (хотя для General маловероятно)
                     if character.armor_inv_item_id == inv_item.id: character.armor_inv_item_id = None
                     if character.shield_inv_item_id == inv_item.id: character.shield_inv_item_id = None
                     if character.weapon1_inv_item_id == inv_item.id: character.weapon1_inv_item_id = None
                     if character.weapon2_inv_item_id == inv_item.id: character.weapon2_inv_item_id = None
                     # db.delete(inv_item) # Помечаем для удаления - НЕ НАДО, добавим в список
                     objects_to_delete.append(inv_item)
                     item_was_consumed_or_deleted = True
                     logger.info(f"Item entry ID {inv_item.id} ({item.name}) marked for deletion.")

            # --- Обработка лечения ---
            healing_applied = False
            if isinstance(item, models.GeneralItem) and item.category == 'Медицина' and calculated_value > 0:
                 current_hp = character.current_hp
                 max_hp = character.max_hp
                 new_hp = min(max_hp, current_hp + calculated_value)
                 healed_for = new_hp - current_hp
                 if healed_for > 0:
                     character.current_hp = new_hp
                     final_message = f"Предмет '{item.name}' использован. Восстановлено {healed_for} ПЗ ({roll_details}). Текущие ПЗ: {new_hp}/{max_hp}."
                     result_details = {"roll_details": roll_details, "calculated_value": calculated_value, "healing_done": healed_for, "new_hp": new_hp}
                     db.add(character) # Добавляем измененного персонажа в сессию
                     healing_applied = True
                 else:
                     final_message = f"Предмет '{item.name}' использован. Здоровье уже полное."
                     result_details = {"roll_details": roll_details, "calculated_value": calculated_value}
            else:
                 final_message = f"Предмет '{item.name}' использован."
                 result_details = {"roll_details": roll_details, "calculated_value": calculated_value}
                 if calculated_value > 0:
                     final_message += f" Результат ({roll_details}): {calculated_value}."


            # Обновление нужно, если потрачен ресурс или было лечение
            character_update_needed = item_was_consumed_or_deleted or healing_applied

            # Формируем результат
            action_result = schemas.ActionResultOut(
                success=True,
                message=final_message,
                details=result_details,
                consumed_resources=consumed_resources_dict if consumed_resources_dict else None,
                character_update_needed=character_update_needed
            )


        # ==============================================
        # === ЛОГИКА АКТИВАЦИИ СПОСОБНОСТИ (ability) ===
        # ==============================================
        elif activation_type == 'ability':
            ability = db.query(models.Ability).filter(models.Ability.id == target_id).first()
            if not ability:
                action_result = schemas.ActionResultOut(success=False, message="Способность не найдена.", character_update_needed=False)
                raise ValueError(action_result.message)

            # Поиск оружия
            equipped_weapon: Optional[models.Weapon] = None
            weapon_inv_item_id: Optional[int] = None
            if character.equipped_weapon1 and isinstance(character.equipped_weapon1.item, models.Weapon):
                 if ability.id in [a.id for a in character.equipped_weapon1.item.granted_abilities]:
                     equipped_weapon = character.equipped_weapon1.item
                     weapon_inv_item_id = character.weapon1_inv_item_id
            if not equipped_weapon and character.equipped_weapon2 and isinstance(character.equipped_weapon2.item, models.Weapon):
                 if ability.id in [a.id for a in character.equipped_weapon2.item.granted_abilities]:
                     equipped_weapon = character.equipped_weapon2.item
                     weapon_inv_item_id = character.weapon2_inv_item_id

            # Расход патронов
            ammo_consumed_info: Optional[Dict[str, Any]] = None
            ammo_check_passed = True
            ammo_to_consume = 0
            ammo_inv_item_to_delete = None
            if equipped_weapon and equipped_weapon.required_ammo_type:
                if ability.name == "Очередь": ammo_to_consume = random.randint(3, 5)
                elif ability.name == "Атака конусом (Дробовик)": ammo_to_consume = 1
                elif ability.is_weapon_attack: ammo_to_consume = 1

                if ammo_to_consume > 0:
                    ammo_check_passed, ammo_consumed_info = _consume_ammo(db, character, equipped_weapon, ammo_to_consume)
                    if not ammo_check_passed:
                        db.rollback()
                        action_result = schemas.ActionResultOut(success=False, message=f"Нет патронов типа '{equipped_weapon.required_ammo_type}' для '{ability.name}'.", character_update_needed=False)
                        raise ValueError(action_result.message)
                    if ammo_consumed_info:
                        consumed_resources_dict['ammo'] = ammo_consumed_info
                        # Если патроны закончились, добавляем в список на удаление
                        if ammo_consumed_info['remaining'] <= 0:
                             ammo_inv_item_id_to_find = ammo_consumed_info['ammo_item_id']
                             # Найдем объект CharacterInventoryItem, который был изменен в _consume_ammo
                             ammo_inv_item_to_check = db.query(models.CharacterInventoryItem).filter(
                                 models.CharacterInventoryItem.item_id == ammo_inv_item_id_to_find,
                                 models.CharacterInventoryItem.character_id == character.id
                                 ).first() # Предполагаем, что только один стак патронов такого типа
                             if ammo_inv_item_to_check and ammo_inv_item_to_check.quantity <= 0:
                                 ammo_inv_item_to_delete = ammo_inv_item_to_check

            # --- Обработка Базовой Атаки Оружием ---
            if ability.is_weapon_attack:
                attack_skill_name = ability.attack_skill or "Ловкость"
                mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3])
                attack_modifier = getattr(character, mod_attribute_name, 0)

                # Суммируем числовые модификаторы атаки от эффектов
                numeric_attack_mod_sum = 0
                if character.active_status_effects:
                    numeric_attack_mod_sum = sum(eff.attack_roll_modifier for eff in character.active_status_effects if eff.attack_roll_modifier is not None)
                    if numeric_attack_mod_sum != 0: logger.debug(f"Attack Roll numeric mod from effects: {numeric_attack_mod_sum}")

                # Обработка временного эффекта (_Temp: Precise Aim)
                temp_advantage_effect_name = "_Temp: Precise Aim"
                force_advantage_mode = False
                effect_to_remove_after_attack = None
                is_ranged_attack = attack_skill_name in ["Ловкость", "Внимательность"] and equipped_weapon and equipped_weapon.range_normal is not None

                if is_ranged_attack and character.active_status_effects:
                    for effect in list(character.active_status_effects):
                        if effect.name == temp_advantage_effect_name:
                            targets = effect.roll_modifier_targets
                            applies = False
                            if isinstance(targets, dict):
                                 target_list = targets.get("attack_rolls")
                                 if target_list == True or target_list == "all" or (isinstance(target_list, list) and "ranged" in target_list): applies = True
                            if applies:
                                logger.info(f"Consuming temporary effect: {temp_advantage_effect_name}")
                                force_advantage_mode = True
                                effect_to_remove_after_attack = effect
                                break

                # Определяем итоговый режим броска
                # --- ИЗМЕНЕНИЕ: Передаем более специфичную строку цели ---
                attack_skill_short = SKILL_MODIFIER_MAP.get(attack_skill_name[:3], "unknown")[-3:] # Получаем _mod
                attack_type_str = 'ranged' if is_ranged_attack else 'melee'
                # Пытаемся получить атрибут навыка (Сила, Ловкость и т.д.) для более точной цели
                skill_attr_for_target = 'strength' if attack_skill_name == 'Сила' else \
                                        'dexterity' if attack_skill_name == 'Ловкость' else \
                                        'attention' if attack_skill_name == 'Внимательность' else 'other' # Пример
                roll_target_string = f"attack_rolls.{attack_type_str}.{skill_attr_for_target}" # e.g., attack_rolls.melee.strength
                logger.debug(f"Generated roll_target_string for determine_roll_mode: {roll_target_string}")

                attack_roll_mode = 'advantage' if force_advantage_mode else determine_roll_mode(
                    character,
                    roll_target_string,
                    'normal'
                )
                # --- КОНЕЦ ИЗМЕНЕНИЯ ---

                # Бросок
                attack_roll_base, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(mode=attack_roll_mode)
                attack_roll_total = attack_roll_base + attack_modifier + numeric_attack_mod_sum

                # Детали броска
                attack_roll_detail = format_roll_details(
                    kept_dice, all_rolls,
                    attack_modifier, f"Мод.{attack_skill_name[:3]}",
                    numeric_attack_mod_sum, "Эффекты",
                    used_mode
                )

                # Удаляем временный эффект, если был использован
                if effect_to_remove_after_attack:
                    try:
                        character.active_status_effects.remove(effect_to_remove_after_attack)
                        logger.info(f"Temporary effect '{effect_to_remove_after_attack.name}' removed from character session.")
                        # SQLAlchemy удалит связь при коммите
                    except ValueError: logger.warning(f"Effect '{effect_to_remove_after_attack.name}' not found in list for removal.")
                    except Exception as remove_exc: logger.error(f"Error removing temp effect: {remove_exc}")


                # Проверка попадания и урон (как было)
                hit = True # ЗАГЛУШКА
                damage_value = 0
                damage_roll_detail = "Промах или нет формулы"
                damage_type = ability.damage_type or "Неизвестный"
                if hit:
                     formula_to_roll = ability.damage_formula
                     if formula_to_roll and formula_to_roll.lower() == 'см. оружие':
                         if equipped_weapon and equipped_weapon.damage:
                             formula_to_roll = equipped_weapon.damage
                             damage_type = equipped_weapon.damage_type
                         else:
                             formula_to_roll = None
                             damage_roll_detail = "Не найдено оружие для формулы 'См. оружие'"
                     if formula_to_roll:
                         damage_value, damage_roll_detail = _parse_and_roll(formula_to_roll, character)
                     elif ability.damage_formula: # Если нет оружия, но у способности есть своя формула
                          damage_value, damage_roll_detail = _parse_and_roll(ability.damage_formula, character)
                     else: # Если и там пусто
                          damage_roll_detail = "Нет формулы урона"

                # Сообщение результата
                result_message = f"Атака '{ability.name}' ({attack_skill_name}). Бросок атаки: {attack_roll_total} ({attack_roll_detail})."
                if hit: result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали урона: {damage_roll_detail}."
                else: result_message += " Промах."
                if ammo_consumed_info: result_message += f" Потрачено: {ammo_consumed_info['consumed']} {ammo_consumed_info['ammo_name']} (ост: {ammo_consumed_info['remaining']})."

                # Результат
                action_result = schemas.ActionResultOut(
                    success=True, message=result_message,
                    details={
                        "attack_roll": attack_roll_total,
                        "attack_roll_detail": attack_roll_detail,
                        "roll_mode": used_mode,
                        "hit": hit,
                        "damage_dealt": damage_value if hit else 0,
                        "damage_roll_detail": damage_roll_detail if hit else "Нет урона",
                        "damage_type": damage_type if hit else None
                    },
                    consumed_resources=consumed_resources_dict if consumed_resources_dict else None,
                    character_update_needed=True
                )

            # --- Обработка Других Способностей ---
            else:
                # --- Атака Конусом (Дробовик) ---
                if ability.name == "Атака конусом (Дробовик)":
                    # ... (логика конуса без изменений)
                    if not equipped_weapon:
                        action_result = schemas.ActionResultOut(success=False, message="Ошибка: Не найдено оружие для Атаки конусом.", character_update_needed=False)
                        raise ValueError(action_result.message)
                    save_dc = 8 + character.dexterity_mod
                    save_attribute = "Ловкость"
                    base_damage_formula = equipped_weapon.damage
                    full_damage_value, full_damage_details = _parse_and_roll(base_damage_formula, character)
                    damage_on_fail = max(1, full_damage_value // 2)
                    damage_on_success = 0
                    damage_type = equipped_weapon.damage_type
                    final_message = (f"'{character.name}' использует '{ability.name}' из '{equipped_weapon.name}'. "
                                     f"Цели в конусе 5м: Спасбросок {save_attribute} СЛ {save_dc}. "
                                     f"Провал: {damage_on_fail} ({damage_type}) урона. Успех: без урона.")
                    if ammo_consumed_info:
                        final_message += f" Потрачено: {ammo_consumed_info['consumed']} {ammo_consumed_info['ammo_name']} (ост: {ammo_consumed_info['remaining']})."
                    result_details = {
                        "area_effect": "cone_5m", "saving_throw_dc": save_dc, "saving_throw_attribute": save_attribute,
                        "damage_on_fail": damage_on_fail, "damage_on_success": damage_on_success, "damage_type": damage_type,
                        "base_damage_roll_details": full_damage_details
                    }
                    action_result = schemas.ActionResultOut(success=True, message=final_message, details=result_details, consumed_resources=consumed_resources_dict if consumed_resources_dict else None, character_update_needed=True)


                # --- Очередь ---
                elif ability.name == "Очередь":
                    if not equipped_weapon:
                        action_result = schemas.ActionResultOut(success=False, message="Ошибка: Не найдено оружие для Очереди.", character_update_needed=False)
                        raise ValueError(action_result.message)

                    attack_skill_name = ability.attack_skill or "Ловкость"
                    mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3])
                    attack_modifier = getattr(character, mod_attribute_name, 0)

                    # --- ИЗМЕНЕНИЕ: Расчет числового модификатора ---
                    numeric_attack_mod_sum = 0
                    if character.active_status_effects:
                        numeric_attack_mod_sum = sum(eff.attack_roll_modifier for eff in character.active_status_effects if eff.attack_roll_modifier is not None)
                        if numeric_attack_mod_sum != 0: logger.debug(f"Burst Attack Roll numeric mod: {numeric_attack_mod_sum}")
                    # --- КОНЕЦ ИЗМЕНЕНИЯ ---

                    # Определяем режим (Очередь с помехой + эффекты)
                    # --- ИЗМЕНЕНИЕ: Передаем более специфичную строку цели ---
                    attack_skill_short = SKILL_MODIFIER_MAP.get(attack_skill_name[:3], "unknown")[-3:]
                    # Очередь обычно дальняя атака
                    is_ranged_attack_burst = True # Упрощение
                    attack_type_str_burst = 'ranged' if is_ranged_attack_burst else 'melee'
                    skill_attr_for_target_burst = 'dexterity' # Очередь обычно от Ловкости
                    roll_target_string_burst = f"attack_rolls.{attack_type_str_burst}.{skill_attr_for_target_burst}"
                    logger.debug(f"Generated roll_target_string for Burst Fire: {roll_target_string_burst}")

                    attack_roll_mode = determine_roll_mode(character, roll_target_string_burst, 'disadvantage') # Помеха от способности
                    # --- КОНЕЦ ИЗМЕНЕНИЯ ---

                    # Бросок
                    attack_roll_base, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(mode=attack_roll_mode)
                    attack_roll_total = attack_roll_base + attack_modifier + numeric_attack_mod_sum # <-- Добавлен numeric_attack_mod_sum

                    # Детали
                    attack_roll_detail = format_roll_details(
                        kept_dice, all_rolls,
                        attack_modifier, f"Мод.{attack_skill_name[:3]}",
                        numeric_attack_mod_sum, "Эффекты", # <-- Передаем числовой модификатор
                        used_mode
                    )

                    # Попадание и Урон (как было)
                    hit = True # ЗАГЛУШКА
                    damage_value = 0
                    damage_roll_detail = "Промах или нет формулы"
                    damage_type = equipped_weapon.damage_type or "Неизвестный"
                    if hit:
                        base_formula = equipped_weapon.damage
                        dice_match = re.search(r"(\d+)к(\d+)", base_formula)
                        extra_dice_formula = f"1к{dice_match.group(2)}" if dice_match else "1к6"
                        base_damage_val, base_details = _parse_and_roll(base_formula, character)
                        extra_damage_val, extra_details = _parse_and_roll(extra_dice_formula, character)
                        damage_value = base_damage_val + extra_damage_val
                        damage_roll_detail = f"{base_details} + {extra_details}(Очередь)"

                    # Сообщение
                    result_message = f"'{character.name}' стреляет Очередью из '{equipped_weapon.name}'. Атака ({'с помехой' if used_mode == 'disadvantage' else ('с преимуществом' if used_mode == 'advantage' else 'обычная')}): {attack_roll_total} ({attack_roll_detail})."
                    if hit: result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали: {damage_roll_detail}."
                    else: result_message += " Промах."
                    if ammo_consumed_info: result_message += f" Потрачено: {ammo_consumed_info['consumed']} {ammo_consumed_info['ammo_name']} (ост: {ammo_consumed_info['remaining']})."

                    # Результат
                    action_result = schemas.ActionResultOut(
                        success=True, message=result_message,
                        details={
                            "attack_roll": attack_roll_total, "attack_roll_detail": attack_roll_detail,
                            "roll_mode": used_mode, "hit": hit, "damage_dealt": damage_value if hit else 0,
                            "damage_roll_detail": damage_roll_detail if hit else "Нет урона",
                            "damage_type": damage_type if hit else None, "attack_modifier": used_mode
                        },
                        consumed_resources=consumed_resources_dict if consumed_resources_dict else None,
                        character_update_needed=True
                    )

                # --- Точный Выстрел (Применение Эффекта) ---
                elif ability.name == "Точный Выстрел":
                    logger.info(f"Activating ability: {ability.name}")
                    temp_effect_name = "_Temp: Precise Aim"
                    effect_template = db.query(models.StatusEffect).filter(models.StatusEffect.name == temp_effect_name).first()

                    if effect_template:
                        added_effect_name = character_crud.apply_status_effect(db, character, effect_template.id)
                        if added_effect_name:
                            # db.flush() # Не нужно здесь, изменения в сессии
                            action_result = schemas.ActionResultOut(
                                success=True,
                                message=f"Вы прицелились с помощью '{ability.name}'. Следующая дальняя атака будет с преимуществом.",
                                details={},
                                consumed_resources=consumed_resources_dict if consumed_resources_dict else None,
                                character_update_needed=True
                            )
                            logger.info(f"Applied temporary effect '{added_effect_name}' for '{ability.name}'.")
                        else:
                             action_result = schemas.ActionResultOut(
                                success=True, message=f"Эффект '{temp_effect_name}' уже активен.", details={},
                                consumed_resources=consumed_resources_dict if consumed_resources_dict else None,
                                character_update_needed=False
                            )
                             logger.info(f"Effect '{temp_effect_name}' was already active for '{ability.name}'.")
                    else:
                         action_result = schemas.ActionResultOut(
                            success=False,
                            message=f"Ошибка конфигурации: Не найден статус-эффект '{temp_effect_name}' для '{ability.name}'.",
                            character_update_needed=False
                        )
                         logger.error(f"Configuration error: StatusEffect '{temp_effect_name}' not found in DB.")

                # --- Другие способности (Заглушка) ---
                else:
                    db.rollback() # Откатываем, т.к. не знаем, что делать
                    action_result = schemas.ActionResultOut(success=False, message=f"Логика для способности '{ability.name}' пока не реализована.", character_update_needed=False)

        # --- Неизвестный тип активации ---
        else:
            db.rollback()
            action_result = schemas.ActionResultOut(success=False, message="Неизвестный тип активации.", character_update_needed=False)
            raise ValueError(action_result.message)

        # --- УСПЕШНОЕ ЗАВЕРШЕНИЕ (если не было исключения выше) ---
        if action_result and action_result.success:
            # Логирование успеха...
            logger.info(f"--- ACTION RESULT (Success) ---")
            logger.info(f"  Character: {character.name} (ID: {character.id})")
            # ... (остальное логирование)
            logger.info(f"-------------------------------")

            # !!! Коммит ПОСЛЕ всех успешных операций ветки try !!!
            try:
                # Удаляем объекты инвентаря, помеченные для удаления
                for obj_to_del in objects_to_delete:
                    logger.info(f"Deleting object {obj_to_del} from DB before commit.")
                    db.delete(obj_to_del)
                if ammo_inv_item_to_delete:
                     logger.info(f"Deleting ammo InvItem ID {ammo_inv_item_to_delete.id} from DB before commit.")
                     db.delete(ammo_inv_item_to_delete)

                db.commit() # Сохраняем все изменения
                logger.info("Action successful, changes committed.")
                # Обновляем состояние персонажа из БД ПОСЛЕ коммита
                if action_result.character_update_needed:
                    db.refresh(character)
                    # Перезагружаем связи
                    # TODO: Оптимизировать перезагрузку только нужных связей
                    db.refresh(character, attribute_names=['active_status_effects', 'inventory'])
                    logger.debug("Character object and relations refreshed from DB.")

            except Exception as commit_exc:
                logger.error(f"DATABASE COMMIT FAILED after successful action logic: {commit_exc}", exc_info=True)
                db.rollback()
                action_result = schemas.ActionResultOut(
                    success=False,
                    message=f"Внутренняя ошибка сервера при сохранении результата: {commit_exc}",
                    character_update_needed=False
                ) # Перезаписываем результат на ошибку

        # --- Обработка неуспешного или ненайденного результата ---
        elif not action_result or not action_result.success:
             # Логирование неудачи/нереализации ...
             logger.warning(f"--- ACTION RESULT (Not Implemented or Failed Internally) ---")
             # ...
             logger.warning(f"---------------------------------------------")
             if not action_result: # Если вообще не был создан
                 action_result = schemas.ActionResultOut(success=False, message="Непредвиденная ошибка обработки действия.", character_update_needed=False)

        # Возвращаем итоговый результат
        return action_result

    # --- Обработка Исключений ---
    except Exception as e:
        db.rollback() # Откат при любой ошибке в блоке try
        error_message = f"Внутренняя ошибка сервера при активации: {e}"
        if action_result and not action_result.success and action_result.message:
            error_message = action_result.message # Используем более конкретное сообщение, если есть

        logger.error(f"--- ACTION FAILED (Exception) ---")
        logger.error(f"  Character: {character.name} (ID: {character.id})")
        logger.error(f"  Action Type: {activation_type}")
        logger.error(f"  Target ID: {target_id}")
        logger.error(f"  Error: {error_message}", exc_info=True if not action_result else False)
        logger.error(f"--------------------------------")

        return schemas.ActionResultOut(
            success=False,
            message=error_message,
            character_update_needed=False
        )