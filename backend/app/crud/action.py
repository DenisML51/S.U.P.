# backend/app/crud/action.py
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status
from typing import Optional, Dict, Any, List, Tuple
import random
import re
import logging

# Импортируем модели, схемы, зависимости
from .. import models, schemas
from . import character as character_crud  # Для apply_status_effect
from .item import get_inventory_item  # Для получения предмета из инвентаря

# Импортируем утилиты, включая парсер кулдауна
from .utils import (
    _parse_and_roll, SKILL_MODIFIER_MAP,
    roll_with_advantage_disadvantage, format_roll_details, RollMode,
    determine_roll_mode,
    parse_cooldown_duration  # <-- Парсер кулдауна
)

logger = logging.getLogger(__name__)

# Импортируем хелпер парсинга числовых модификаторов
try:
    from .skill_check import _get_numeric_modifier_for_context
except ImportError:
    try:
        from .utils import _get_numeric_modifier_for_context
        # logger.warning("Using '_get_numeric_modifier_for_context' from 'utils'.")
    except ImportError:
        logger.error("Failed to import '_get_numeric_modifier_for_context'. Using fallback.")


        # Fallback function if import fails
        def _get_numeric_modifier_for_context(active_effects, target_context):
            return 0


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
            if inv_item.item and isinstance(inv_item.item, models.Ammo) and inv_item.item.ammo_type == required_type:
                ammo_item_entry = inv_item
                break

    # Если не нашли в загруженном, делаем запрос к БД (на всякий случай)
    if not ammo_item_entry:
        logger.warning(
            f"Ammo type '{required_type}' not found in preloaded inventory for char {character.id}. Querying DB.")
        character_inventory = db.query(models.CharacterInventoryItem).join(models.Item).filter(
            models.CharacterInventoryItem.character_id == character.id,
            models.Item.item_type == 'ammo'
        ).options(
            selectinload(models.CharacterInventoryItem.item.of_type(models.Ammo))
        ).all()
        for inv_item in character_inventory:
            if inv_item.item and isinstance(inv_item.item, models.Ammo) and inv_item.item.ammo_type == required_type:
                ammo_item_entry = inv_item
                break

    if not ammo_item_entry:
        logger.warning(f"Ammo type '{required_type}' not found for character {character.id} even after DB query.")
        return False, None  # Патроны не найдены

    if ammo_item_entry.quantity < amount:
        logger.warning(
            f"Not enough ammo '{required_type}' for character {character.id}. Needed: {amount}, Have: {ammo_item_entry.quantity}")
        return False, None  # Недостаточно патронов

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
    db.add(ammo_item_entry)  # Помечаем для сохранения
    return True, ammo_info


# --- Функция броска 3к6 (roll_3d6) ---
def roll_3d6():
    """Бросает 3 шестигранных кубика."""
    return random.randint(1, 6) + random.randint(1, 6) + random.randint(1, 6)


# --- Основная функция активации действия (v5 - Merged Logic + Action Economy) ---
def activate_action(
        db: Session,
        character_id: int,
        user_id: int,
        activation_data: schemas.ActivationRequest
) -> Optional[schemas.ActionResultOut]:
    """
    Обрабатывает активацию способности или использование предмета.
    Учитывает активные слоты, кулдауны и использованные действия за ход.
    Содержит логику для конкретных способностей.
    """
    # Загрузка персонажа со всеми необходимыми связями
    character = db.query(models.Character).options(
        selectinload(models.Character.inventory).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_weapon1).selectinload(
            models.CharacterInventoryItem.item.of_type(models.Weapon)).selectinload(models.Weapon.granted_abilities),
        selectinload(models.Character.equipped_weapon2).selectinload(
            models.CharacterInventoryItem.item.of_type(models.Weapon)).selectinload(models.Weapon.granted_abilities),
        selectinload(models.Character.equipped_armor).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_shield).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.active_status_effects),
        selectinload(models.Character.active_ability_1), selectinload(models.Character.active_ability_2),
        selectinload(models.Character.active_ability_3), selectinload(models.Character.active_ability_4),
        selectinload(models.Character.active_ability_5),
    ).filter(
        models.Character.id == character_id,
        models.Character.owner_id == user_id
    ).first()

    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден")

    activation_type = activation_data.activation_type
    target_id = activation_data.target_id
    logger.info(
        f"--- ACTION START: Type='{activation_type}', TargetID={target_id} for Char='{character.name}' (ID:{character.id}) ---")

    # Инициализация
    consumed_resources_dict = {}
    action_result: Optional[schemas.ActionResultOut] = None
    objects_to_delete = []
    ammo_inv_item_to_delete = None
    action_type_used: Optional[str] = None  # 'main', 'bonus', 'reaction'
    slot_number_used: Optional[int] = None
    slot_cooldown_attr_name: Optional[str] = None
    ability: Optional[models.Ability] = None

    try:
        # ===========================================
        # === ЛОГИКА ИСПОЛЬЗОВАНИЯ ПРЕДМЕТА (item) ===
        # ===========================================
        if activation_type == 'item':
            # Получаем предмет инвентаря
            inv_item = db.query(models.CharacterInventoryItem).options(
                selectinload(models.CharacterInventoryItem.item)).get(target_id)
            if not inv_item or not inv_item.item: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                                                      detail="Предмет не найден в инвентаре")
            item = inv_item.item

            # Определяем стоимость действия предмета (упрощенная логика)
            item_action_cost = "Бонусное действие" if item.category == 'Медицина' else "Действие"
            logger.debug(f"Item '{item.name}' requires action: {item_action_cost}")

            # Проверка доступности действия
            if item_action_cost == "Действие" and character.has_used_main_action: raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Основное действие уже использовано.")
            if item_action_cost == "Бонусное действие" and character.has_used_bonus_action: raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Бонусное действие уже использовано.")

            # Проверка блокировки статус-эффектами
            action_restricted_by_effect = None
            if character.active_status_effects:
                for effect in character.active_status_effects:
                    if effect.action_restrictions and isinstance(effect.action_restrictions, dict):
                        restrictions = effect.action_restrictions
                        if item_action_cost == "Действие" and restrictions.get(
                            "block_action"): action_restricted_by_effect = effect.name; break
                        if item_action_cost == "Бонусное действие" and restrictions.get(
                            "block_bonus"): action_restricted_by_effect = effect.name; break
            if action_restricted_by_effect: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                                                detail=f"Предмет '{item.name}' ({item_action_cost}) заблокирован: '{action_restricted_by_effect}'.")

            # Проверка количества
            if inv_item.quantity <= 0: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                                           detail=f"У предмета '{item.name}' закончились использования.")

            # Расчет эффекта
            formula = getattr(item, 'effect_dice_formula', None);
            calculated_value = 0;
            roll_details = "Нет формулы"
            if formula: calculated_value, roll_details = _parse_and_roll(formula, character)

            # Расход предмета
            item_was_consumed_or_deleted = False
            if isinstance(item, models.GeneralItem):
                if inv_item.quantity > 1:
                    inv_item.quantity -= 1;
                    db.add(inv_item);
                    item_was_consumed_or_deleted = True
                    consumed_resources_dict['item'] = {"item_id": item.id, "name": item.name, "consumed": 1,
                                                       "remaining": inv_item.quantity}
                else:
                    consumed_resources_dict['item'] = {"item_id": item.id, "name": item.name, "consumed": 1,
                                                       "remaining": 0}
                    objects_to_delete.append(inv_item);
                    item_was_consumed_or_deleted = True
                    if character.armor_inv_item_id == inv_item.id: character.armor_inv_item_id = None
                    if character.shield_inv_item_id == inv_item.id: character.shield_inv_item_id = None
                    if character.weapon1_inv_item_id == inv_item.id: character.weapon1_inv_item_id = None
                    if character.weapon2_inv_item_id == inv_item.id: character.weapon2_inv_item_id = None

            # Применение эффекта (пример: лечение)
            healing_applied = False;
            final_message = "";
            result_details = {}
            if isinstance(item, models.GeneralItem) and item.category == 'Медицина' and calculated_value > 0:
                current_hp = character.current_hp;
                max_hp = character.max_hp;
                new_hp = min(max_hp, current_hp + calculated_value);
                healed_for = new_hp - current_hp
                if healed_for > 0:
                    character.current_hp = new_hp; final_message = f"'{item.name}' исп. Восст. {healed_for} ПЗ ({roll_details}). ПЗ: {new_hp}/{max_hp}."; result_details = {
                        "healing_done": healed_for, "new_hp": new_hp}; db.add(character); healing_applied = True
                else:
                    final_message = f"'{item.name}' исп. Здоровье полное."; result_details = {}
            else:
                final_message = f"Предмет '{item.name}' использован.";
                result_details = {};
                if calculated_value > 0: final_message += f" Результат ({roll_details}): {calculated_value}."
            result_details.update({"roll_details": roll_details, "calculated_value": calculated_value})

            # Устанавливаем флаг потраченного действия
            if item_action_cost == "Действие":
                action_type_used = 'main'
            elif item_action_cost == "Бонусное действие":
                action_type_used = 'bonus'

            character_update_needed = item_was_consumed_or_deleted or healing_applied or (action_type_used is not None)

            action_result = schemas.ActionResultOut(
                success=True, message=final_message, details=result_details,
                consumed_resources=consumed_resources_dict or None,
                character_update_needed=character_update_needed
            )

        # ==============================================
        # === ЛОГИКА АКТИВАЦИИ СПОСОБНОСТИ (ability) ===
        # ==============================================
        elif activation_type == 'ability':
            ability = db.query(models.Ability).filter(models.Ability.id == target_id).first()
            if not ability: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Способность не найдена")

            # Проверка типа действия и его доступности
            required_action_type_str = ability.action_type or "Действие"
            action_flag_attr: Optional[str] = None;
            action_log_name: Optional[str] = None;
            action_type_for_status_check: Optional[str] = None
            if required_action_type_str == "Действие" or required_action_type_str.startswith("Атака"):
                action_flag_attr = "has_used_main_action"; action_log_name = "Main action"; action_type_for_status_check = 'main'
            elif required_action_type_str == "Бонусное действие":
                action_flag_attr = "has_used_bonus_action"; action_log_name = "Bonus action"; action_type_for_status_check = 'bonus'
            elif required_action_type_str == "Реакция":
                action_flag_attr = "has_used_reaction"; action_log_name = "Reaction"; action_type_for_status_check = 'reaction'
            elif required_action_type_str.lower() == "пассивно":
                raise HTTPException(status_code=400,
                                    detail=f"Пассивную способность '{ability.name}' нельзя активировать.")
            else:
                logger.warning(
                    f"Ability '{ability.name}' unknown action type: '{required_action_type_str}'. Assuming 'Main action'."); action_flag_attr = "has_used_main_action"; action_log_name = "Main action (default)"; action_type_for_status_check = 'main'
            if action_flag_attr and getattr(character, action_flag_attr, False): raise HTTPException(status_code=400,
                                                                                                     detail=f"{required_action_type_str} уже использовано в этом ходу.")

            # Проверка блокировки статус-эффектами
            restriction_violated = False;
            action_restricted_by_effect = None
            if character.active_status_effects:
                for effect in character.active_status_effects:
                    if effect.action_restrictions and isinstance(effect.action_restrictions, dict):
                        restrictions = effect.action_restrictions
                        if action_type_for_status_check == 'main' and restrictions.get(
                            "block_action"): action_restricted_by_effect = effect.name; restriction_violated = True; break
                        if action_type_for_status_check == 'bonus' and restrictions.get(
                            "block_bonus"): action_restricted_by_effect = effect.name; restriction_violated = True; break
                        if action_type_for_status_check == 'reaction' and restrictions.get(
                            "block_reaction"): action_restricted_by_effect = effect.name; restriction_violated = True; break
            if restriction_violated: raise HTTPException(status_code=400,
                                                         detail=f"Невозможно использовать '{ability.name}': {required_action_type_str} заблокировано эффектом '{action_restricted_by_effect}'.")

            # Определение источника (Оружие или Слот) и проверка кулдауна слота
            is_weapon_ability = False;
            equipped_weapon: Optional[models.Weapon] = None
            slot_number_used: Optional[int] = None;
            slot_cooldown_attr_name: Optional[str] = None
            if character.equipped_weapon1 and isinstance(character.equipped_weapon1.item, models.Weapon):
                if ability.id in {ab.id for ab in character.equipped_weapon1.item.granted_abilities if
                                  ab}: is_weapon_ability = True; equipped_weapon = character.equipped_weapon1.item
            if not is_weapon_ability and character.equipped_weapon2 and isinstance(character.equipped_weapon2.item,
                                                                                   models.Weapon):
                if ability.id in {ab.id for ab in character.equipped_weapon2.item.granted_abilities if
                                  ab}: is_weapon_ability = True; equipped_weapon = character.equipped_weapon2.item
            if not is_weapon_ability:
                found_in_slot = False
                for i in range(1, 6):
                    slot_id_attr = f"active_ability_slot_{i}_id"
                    if getattr(character, slot_id_attr, None) == ability.id:
                        slot_number_used = i;
                        slot_cooldown_attr_name = f"active_ability_slot_{i}_cooldown"
                        current_slot_cooldown = getattr(character, slot_cooldown_attr_name, 0)
                        if current_slot_cooldown > 0: raise HTTPException(status_code=400,
                                                                          detail=f"Способность '{ability.name}' в слоте {i} на КД ({current_slot_cooldown} ход).")
                        found_in_slot = True;
                        break
                if not found_in_slot: raise HTTPException(status_code=400,
                                                          detail=f"Способность '{ability.name}' не в активных слотах и не от оружия.")

            # --- Общая Логика Способности ---
            # Расход патронов
            ammo_consumed_info: Optional[Dict[str, Any]] = None;
            ammo_to_consume = 0
            if equipped_weapon and equipped_weapon.required_ammo_type:
                if ability.is_weapon_attack:
                    ammo_to_consume = 1
                elif ability.name == "Очередь":
                    ammo_to_consume = random.randint(3, 5)
                elif ability.name == "Атака конусом (Дробовик)":
                    ammo_to_consume = 1
                if ammo_to_consume > 0:
                    ammo_check_passed, ammo_consumed_info = _consume_ammo(db, character, equipped_weapon,
                                                                          ammo_to_consume)
                    if not ammo_check_passed: raise HTTPException(status_code=400,
                                                                  detail=f"Недостаточно патронов '{equipped_weapon.required_ammo_type}'")
                    if ammo_consumed_info: consumed_resources_dict['ammo'] = ammo_consumed_info
                    if ammo_consumed_info.get('remaining', 1) <= 0:
                        ammo_inv_item_to_find = db.query(models.CharacterInventoryItem).filter(
                            models.CharacterInventoryItem.item_id == ammo_consumed_info.get('ammo_item_id'),
                            models.CharacterInventoryItem.character_id == character.id).first()
                        if ammo_inv_item_to_find: ammo_inv_item_to_delete = ammo_inv_item_to_find

            # --- ВАША ЛОГИКА ОБРАБОТКИ КОНКРЕТНЫХ СПОСОБНОСТЕЙ ---
            # (Вставьте сюда ваши блоки if/elif для is_weapon_attack, "Очередь", "Конус" и т.д.)

            # ПРИМЕР: Обработка Базовой Атаки Оружием (is_weapon_attack=True)
            if ability.is_weapon_attack:
                if not equipped_weapon: raise HTTPException(status_code=500,
                                                            detail="Ошибка: Оружейная способность без оружия.")
                attack_skill_name = ability.attack_skill or "Ловкость";
                mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3])
                if not mod_attribute_name: raise HTTPException(status_code=500,
                                                               detail="Ошибка конфигурации: неверный навык атаки.")
                base_modifier = getattr(character, mod_attribute_name, 0)
                is_ranged_attack = attack_skill_name in ["Ловкость",
                                                         "Внимательность"] and equipped_weapon.range_normal is not None
                attack_type_str = 'ranged' if is_ranged_attack else 'melee';
                skill_attr_map = {'Сила': 'strength', 'Ловкость': 'dexterity', 'Внимательность': 'attention'};
                skill_attr_for_target = skill_attr_map.get(attack_skill_name, 'other')
                attack_context_string = f"attack_rolls.{attack_type_str}.{skill_attr_for_target}"
                numeric_mod_from_effects = _get_numeric_modifier_for_context(character.active_status_effects,
                                                                             attack_context_string);
                item_bonus_value = 0  # TODO: Item bonus
                has_temp_advantage = False;
                effect_to_remove_after_attack = None
                if is_ranged_attack and character.active_status_effects:
                    for effect in list(character.active_status_effects):
                        if effect.name == "_Temp: Precise Aim":
                            targets = effect.roll_modifier_targets;
                            applies = False
                            if isinstance(targets, dict): target_list = targets.get("attack_rolls");
                            if target_list is True or target_list == "all" or (
                                    isinstance(target_list, list) and "ranged" in target_list): applies = True
                            if applies: has_temp_advantage = True; effect_to_remove_after_attack = effect; break
                attack_roll_mode = determine_roll_mode(character, attack_context_string, ability_modifies='normal',
                                                       has_temporary_advantage=has_temp_advantage)
                attack_roll_base, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(
                    mode=attack_roll_mode)
                attack_roll_total = attack_roll_base + base_modifier + numeric_mod_from_effects + item_bonus_value
                attack_roll_detail = format_roll_details(kept_dice, all_rolls, base_modifier,
                                                         f"Мод.{attack_skill_name[:3]}", numeric_mod_from_effects,
                                                         item_bonus_value, used_mode)
                if effect_to_remove_after_attack:
                    try: character.active_status_effects.remove(
                        effect_to_remove_after_attack)
                    except ValueError:
                        pass
                hit = True  # ЗАГЛУШКА
                damage_value = 0
                damage_roll_detail = "Промах"
                damage_type = ability.damage_type or "Неизвестный"
                if hit:
                    formula_to_roll = ability.damage_formula
                    if formula_to_roll and formula_to_roll.lower() == 'см. оружие':
                        if equipped_weapon and equipped_weapon.damage:
                            formula_to_roll = equipped_weapon.damage; damage_type = equipped_weapon.damage_type or damage_type
                        else:
                            formula_to_roll = None; damage_roll_detail = "Нет данных об уроне оружия"
                    if formula_to_roll:
                        damage_value, damage_roll_detail = _parse_and_roll(formula_to_roll, character)
                    else:
                        damage_roll_detail = "Нет формулы урона"
                result_message = f"Атака '{ability.name}' ({attack_skill_name}). Бросок: {attack_roll_total} ({attack_roll_detail})."
                if hit:
                    result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали: {damage_roll_detail}."
                else:
                    result_message += " Промах."
                if ammo_consumed_info: result_message += f" Патроны: -{ammo_consumed_info['consumed']} (ост: {ammo_consumed_info['remaining']})."
                action_result = schemas.ActionResultOut(success=True, message=result_message,
                                                        details={"attack_roll": attack_roll_total,
                                                                 "attack_roll_detail": attack_roll_detail,
                                                                 "roll_mode": used_mode, "hit": hit,
                                                                 "damage_dealt": damage_value if hit else 0,
                                                                 "damage_roll_detail": damage_roll_detail if hit else "Нет урона",
                                                                 "damage_type": damage_type if hit else None},
                                                        numeric_mod_from_effects=(
                                                                                             numeric_mod_from_effects + item_bonus_value) or None,
                                                        consumed_resources=consumed_resources_dict or None,
                                                        character_update_needed=True)

            # Обработка Других Способностей
            elif ability.name == "Атака конусом (Дробовик)":
                if not equipped_weapon: raise HTTPException(status_code=400, detail="Требуется дробовик.")
                save_dc = 8 + character.dexterity_mod;
                save_attribute = "Ловкость";
                base_damage_formula = equipped_weapon.damage or "0"
                full_damage_value, full_damage_details = _parse_and_roll(base_damage_formula, character);
                damage_on_fail = max(1, full_damage_value // 2);
                damage_on_success = 0;
                damage_type = equipped_weapon.damage_type or "Колющий"
                final_message = f"'{ability.name}'. Цели: Спасбр. {save_attribute} СЛ {save_dc}. Провал: {damage_on_fail} ({damage_type}). Успех: без урона.";
                result_details = {"area_effect": "cone_5m", "saving_throw_dc": save_dc,
                                  "saving_throw_attribute": save_attribute, "damage_on_fail": damage_on_fail,
                                  "damage_on_success": damage_on_success, "damage_type": damage_type,
                                  "base_damage_roll_details": full_damage_details}
                if ammo_consumed_info: final_message += f" Патроны: -{ammo_consumed_info['consumed']} (ост: {ammo_consumed_info['remaining']})."
                action_result = schemas.ActionResultOut(success=True, message=final_message, details=result_details,
                                                        consumed_resources=consumed_resources_dict or None,
                                                        character_update_needed=True)

            elif ability.name == "Очередь":
                if not equipped_weapon: raise HTTPException(status_code=400, detail="Требуется оружие с очередью.")
                attack_skill_name = ability.attack_skill or "Ловкость";
                mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3])
                if not mod_attribute_name: raise HTTPException(status_code=500,
                                                               detail="Ошибка Очереди: неверный навык.")
                base_modifier = getattr(character, mod_attribute_name, 0);
                skill_attr_map = {'Сила': 'strength', 'Ловкость': 'dexterity', 'Внимательность': 'attention'}
                attack_context_string = f"attack_rolls.ranged.{skill_attr_map.get(attack_skill_name, 'other')}"
                numeric_mod_from_effects = _get_numeric_modifier_for_context(character.active_status_effects,
                                                                             attack_context_string);
                item_bonus_value = 0  # TODO: Item bonus
                has_temp_advantage = False;
                effect_to_remove_after_attack = None
                if character.active_status_effects:
                    for effect in list(character.active_status_effects):
                        if effect.name == "_Temp: Precise Aim":
                            targets = effect.roll_modifier_targets;
                            applies = False
                            if isinstance(targets, dict): target_list = targets.get("attack_rolls");
                            if target_list is True or target_list == "all" or (
                                    isinstance(target_list, list) and "ranged" in target_list): applies = True
                            if applies: has_temp_advantage = True; effect_to_remove_after_attack = effect; break
                attack_roll_mode = determine_roll_mode(character, attack_context_string,
                                                       ability_modifies='disadvantage',
                                                       has_temporary_advantage=has_temp_advantage)
                attack_roll_base, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(
                    mode=attack_roll_mode)
                attack_roll_total = attack_roll_base + base_modifier + numeric_mod_from_effects + item_bonus_value
                attack_roll_detail = format_roll_details(kept_dice, all_rolls, base_modifier,
                                                         f"Мод.{attack_skill_name[:3]}", numeric_mod_from_effects,
                                                         item_bonus_value, used_mode)
                if effect_to_remove_after_attack:
                    try: character.active_status_effects.remove(
                    effect_to_remove_after_attack)
                    except ValueError:
                        pass
                hit = True  # ЗАГЛУШКА
                damage_value = 0;
                damage_roll_detail = "Промах";
                damage_type = equipped_weapon.damage_type or "Неизвестный"
                if hit:
                    base_formula = equipped_weapon.damage or "0";
                    dice_match = re.search(r"(\d+)к(\d+)", base_formula);
                    extra_dice_formula = f"1к{dice_match.group(2)}" if dice_match else "1к6"
                    base_damage_val, base_details = _parse_and_roll(base_formula, character);
                    extra_damage_val, extra_details = _parse_and_roll(extra_dice_formula, character)
                    damage_value = base_damage_val + extra_damage_val;
                    damage_roll_detail = f"{base_details} + {extra_details}(Очередь)"
                result_message = f"'{ability.name}' из '{equipped_weapon.name}'. Атака ({used_mode}): {attack_roll_total} ({attack_roll_detail})."
                if hit:
                    result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали: {damage_roll_detail}."
                else:
                    result_message += " Промах."
                if ammo_consumed_info: result_message += f" Патроны: -{ammo_consumed_info['consumed']} (ост: {ammo_consumed_info['remaining']})."
                action_result = schemas.ActionResultOut(success=True, message=result_message,
                                                        details={"attack_roll": attack_roll_total,
                                                                 "attack_roll_detail": attack_roll_detail,
                                                                 "roll_mode": used_mode, "hit": hit,
                                                                 "damage_dealt": damage_value if hit else 0,
                                                                 "damage_roll_detail": damage_roll_detail if hit else "Нет урона",
                                                                 "damage_type": damage_type if hit else None},
                                                        numeric_mod_from_effects=(
                                                                                             numeric_mod_from_effects + item_bonus_value) or None,
                                                        consumed_resources=consumed_resources_dict or None,
                                                        character_update_needed=True)

            elif ability.name == "Точный Выстрел":
                temp_effect_name = "_Temp: Precise Aim";
                effect_template = db.query(models.StatusEffect).filter(
                    models.StatusEffect.name == temp_effect_name).first()
                if effect_template:
                    added_effect_name = character_crud.apply_status_effect(db, character, effect_template.id)
                    if added_effect_name:
                        action_result = schemas.ActionResultOut(success=True,
                                                                message=f"'{ability.name}'. След. дальняя атака с преим.",
                                                                details={},
                                                                consumed_resources=consumed_resources_dict or None,
                                                                character_update_needed=True)
                    else:
                        action_result = schemas.ActionResultOut(success=True,
                                                                message=f"Эффект '{temp_effect_name}' уже активен.",
                                                                details={},
                                                                consumed_resources=consumed_resources_dict or None,
                                                                character_update_needed=False)
                else:
                    raise HTTPException(status_code=500,
                                        detail=f"Ошибка конфигурации: Не найден эффект '{temp_effect_name}'")

            # --- ДОБАВЬТЕ ВАШИ ДРУГИЕ БЛОКИ ELIF ЗДЕСЬ ---
            # elif ability.name == "НазваниеДругойСпособности":
            #     # Ваша логика для этой способности
            #     # ...
            #     # action_result = schemas.ActionResultOut(...)
            #     pass

            # --- ЕСЛИ НИ ОДИН IF/ELIF НЕ СРАБОТАЛ ---
            else:
                if not action_result:  # Проверяем, не был ли action_result уже создан (например, базовой атакой)
                    logger.warning(f"Logic for ability '{ability.name}' (ID: {ability.id}) is not implemented yet.")
                    raise HTTPException(status_code=501,
                                        detail=f"Логика для способности '{ability.name}' не реализована.")
            # --- КОНЕЦ ВАШЕЙ ЛОГИКИ ---

            # Устанавливаем флаг потраченного действия для способности
            if action_flag_attr == "has_used_main_action":
                action_type_used = 'main'
            elif action_flag_attr == "has_used_bonus_action":
                action_type_used = 'bonus'
            elif action_flag_attr == "has_used_reaction":
                action_type_used = 'reaction'


        # --- Неизвестный тип активации ---
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неизвестный тип активации")

        # --- УСПЕШНОЕ ЗАВЕРШЕНИЕ (Общий блок коммита) ---
        if action_result and action_result.success:
            action_flag_updated = False
            if action_type_used == 'main' and not character.has_used_main_action:
                character.has_used_main_action = True; action_flag_updated = True; logger.info("Main action consumed.")
            elif action_type_used == 'bonus' and not character.has_used_bonus_action:
                character.has_used_bonus_action = True; action_flag_updated = True; logger.info(
                    "Bonus action consumed.")
            elif action_type_used == 'reaction' and not character.has_used_reaction:
                character.has_used_reaction = True; action_flag_updated = True; logger.info("Reaction consumed.")

            cooldown_set = False
            if slot_number_used is not None and slot_cooldown_attr_name is not None:
                cooldown_duration = parse_cooldown_duration(ability.cooldown)  # Используем ability из текущего скоупа
                if cooldown_duration is not None and cooldown_duration > 0:
                    setattr(character, slot_cooldown_attr_name, cooldown_duration);
                    cooldown_set = True
                    logger.info(
                        f"Ability '{ability.name}' slot {slot_number_used} cooldown set to {cooldown_duration} turns.")

            if (action_flag_updated or cooldown_set) and not db.is_modified(character): db.add(character)
            action_result.character_update_needed = action_result.character_update_needed or action_flag_updated or cooldown_set

            logger.info(f"--- ACTION RESULT (Success): {action_result.message} ---")
            try:
                for obj_to_del in objects_to_delete: db.delete(obj_to_del)
                if ammo_inv_item_to_delete and ammo_inv_item_to_delete.quantity <= 0: db.delete(ammo_inv_item_to_delete)
                db.commit()
                logger.info("Action successful, changes committed.")
                if action_result.character_update_needed:
                    db.refresh(character)
                    db.refresh(character, attribute_names=['active_status_effects', 'inventory', 'active_ability_1',
                                                           'active_ability_2', 'active_ability_3', 'active_ability_4',
                                                           'active_ability_5'])
                    logger.debug("Character object and relevant relations refreshed.")
            except Exception as commit_exc:
                logger.error(f"DATABASE COMMIT FAILED: {commit_exc}", exc_info=True);
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Ошибка сохранения результата действия: {commit_exc}")

        elif not action_result:
            # Эта ветка не должна достигаться при текущей логике с raise HTTPException
            raise HTTPException(status_code=500, detail="Непредвиденная ошибка: результат действия не сформирован.")

        return action_result

    # --- Обработка Исключений ---
    except HTTPException as http_exc:
        logger.warning(f"--- ACTION FAILED (HTTPException {http_exc.status_code}): {http_exc.detail} ---")
        db.rollback();
        raise http_exc
    except Exception as e:
        db.rollback();
        error_message = f"Внутренняя ошибка сервера при активации действия: {e}"
        logger.error(f"--- ACTION FAILED (Unexpected Exception): {error_message} ---", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_message)
