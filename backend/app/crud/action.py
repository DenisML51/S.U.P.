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
    # ... (код _consume_ammo без изменений, как в предыдущем ответе) ...
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
    Включает логику расхода патронов, преимущество/помеху, числовые модификаторы, временные эффекты и ограничения действий.
    """
    # Загрузка персонажа со всеми нужными связями
    character = db.query(models.Character).options(
        selectinload(models.Character.inventory).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_weapon1).selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon)).selectinload(models.Weapon.granted_abilities),
        selectinload(models.Character.equipped_weapon2).selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon)).selectinload(models.Weapon.granted_abilities),
        selectinload(models.Character.equipped_armor).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_shield).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.active_status_effects) # Эффекты загружены
    ).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()

    if not character:
        logger.warning(f"--- ACTION FAILED: Character not found (ID: {character_id}, UserID: {user_id})")
        return schemas.ActionResultOut(success=False, message="Персонаж не найден", character_update_needed=False)

    activation_type = activation_data.activation_type
    target_id = activation_data.target_id
    target_entities: List[int] = activation_data.target_entities or []

    # Логирование старта
    logger.info(f"--- ACTION START ---")
    logger.info(f"  Character: {character.name} (ID: {character.id})")
    logger.info(f"  Activation Type: {activation_type}, Target ID: {target_id}")

    # Инициализация переменных
    consumed_resources_dict = {}
    action_result: Optional[schemas.ActionResultOut] = None
    objects_to_delete = [] # Список для обычных предметов инвентаря на удаление
    ammo_inv_item_to_delete = None # Для патронов, которые закончились

    try:
        # ===========================================
        # === ЛОГИКА ИСПОЛЬЗОВАНИЯ ПРЕДМЕТА (item) ===
        # ===========================================
        if activation_type == 'item':
            # Проверка ограничений (упрощенная, блокируем если Основное Действие заблокировано)
            action_restricted_by_effect = None
            if character.active_status_effects:
                 for effect in character.active_status_effects:
                      if effect.action_restrictions and isinstance(effect.action_restrictions, dict) and effect.action_restrictions.get("block_action"):
                           action_restricted_by_effect = effect.name; break
            if action_restricted_by_effect:
                message = f"Невозможно использовать предмет: Действие заблокировано эффектом '{action_restricted_by_effect}'."
                logger.warning(message)
                return schemas.ActionResultOut(success=False, message=message, character_update_needed=False)

            # Получение предмета из инвентаря
            inv_item = get_inventory_item(db, inventory_item_id=target_id, character_id=character_id, user_id=user_id)
            if not inv_item: action_result = schemas.ActionResultOut(success=False, message="Предмет не найден в инвентаре.", character_update_needed=False); raise ValueError(action_result.message)
            item = inv_item.item
            if inv_item.quantity <= 0: action_result = schemas.ActionResultOut(success=False, message=f"У предмета '{item.name}' закончились использования.", character_update_needed=False); raise ValueError(action_result.message)

            # Расчет эффекта предмета
            formula = getattr(item, 'effect_dice_formula', None)
            calculated_value = 0; roll_details = "Нет формулы"
            if formula: calculated_value, roll_details = _parse_and_roll(formula, character)

            # Расход предмета (если он расходуемый)
            item_was_consumed_or_deleted = False
            if item.item_type == 'general' and getattr(item, 'uses', None) is not None:
                 if inv_item.quantity > 1:
                     inv_item.quantity -= 1; consumed_resources_dict['item'] = {"item_id": item.id, "name": item.name, "consumed": 1, "remaining": inv_item.quantity}; db.add(inv_item); item_was_consumed_or_deleted = True
                 else:
                     consumed_resources_dict['item'] = {"item_id": item.id, "name": item.name, "consumed": 1, "remaining": 0}; objects_to_delete.append(inv_item); item_was_consumed_or_deleted = True; logger.info(f"Item entry {inv_item.id} marked for deletion.")

            # Обработка эффекта (например, лечения)
            healing_applied = False; final_message = ""; result_details = {}
            if isinstance(item, models.GeneralItem) and item.category == 'Медицина' and calculated_value > 0:
                 current_hp = character.current_hp; max_hp = character.max_hp; new_hp = min(max_hp, current_hp + calculated_value); healed_for = new_hp - current_hp
                 if healed_for > 0: character.current_hp = new_hp; final_message = f"'{item.name}' исп. Восст. {healed_for} ПЗ ({roll_details}). ПЗ: {new_hp}/{max_hp}."; result_details = {"roll_details": roll_details, "calculated_value": calculated_value, "healing_done": healed_for, "new_hp": new_hp}; db.add(character); healing_applied = True
                 else: final_message = f"'{item.name}' исп. Здоровье полное."; result_details = {"roll_details": roll_details, "calculated_value": calculated_value}
            else:
                 final_message = f"Предмет '{item.name}' использован."; result_details = {"roll_details": roll_details, "calculated_value": calculated_value}
                 if calculated_value > 0: final_message += f" Результат ({roll_details}): {calculated_value}."

            # Формирование результата
            character_update_needed = item_was_consumed_or_deleted or healing_applied
            action_result = schemas.ActionResultOut(success=True, message=final_message, details=result_details, consumed_resources=consumed_resources_dict or None, character_update_needed=character_update_needed)

        # ==============================================
        # === ЛОГИКА АКТИВАЦИИ СПОСОБНОСТИ (ability) ===
        # ==============================================
        elif activation_type == 'ability':
            ability = db.query(models.Ability).filter(models.Ability.id == target_id).first()
            if not ability: action_result = schemas.ActionResultOut(success=False, message="Способность не найдена.", character_update_needed=False); raise ValueError(action_result.message)

            # --- ПРОВЕРКА ОГРАНИЧЕНИЙ ДЕЙСТВИЙ (Исправленная) ---
            required_action_type = ability.action_type or "Действие" # Тип действия из способности
            restriction_violated = False; action_restricted_by_effect = None
            if character.active_status_effects:
                for effect in character.active_status_effects:
                    if effect.action_restrictions and isinstance(effect.action_restrictions, dict):
                        restrictions = effect.action_restrictions
                        # Проверяем, начинается ли тип действия с "Действие" или "Атака"
                        is_main_action = required_action_type.startswith("Действие") or required_action_type.startswith("Атака")
                        if is_main_action and restrictions.get("block_action"):
                            action_restricted_by_effect = effect.name; restriction_violated = True; break
                        if required_action_type == "Бонусное действие" and restrictions.get("block_bonus"):
                            action_restricted_by_effect = effect.name; restriction_violated = True; break
                        if required_action_type == "Реакция" and restrictions.get("block_reaction"):
                             action_restricted_by_effect = effect.name; restriction_violated = True; break
            if restriction_violated:
                message = f"Невозможно исп. '{ability.name}': {required_action_type} заблокировано эффектом '{action_restricted_by_effect}'."
                logger.warning(message)
                return schemas.ActionResultOut(success=False, message=message, character_update_needed=False) # Сразу выходим
            # --- КОНЕЦ ПРОВЕРКИ ОГРАНИЧЕНИЙ ---

            # Поиск оружия
            equipped_weapon: Optional[models.Weapon] = None
            if character.equipped_weapon1 and isinstance(character.equipped_weapon1.item, models.Weapon) and ability.id in [a.id for a in character.equipped_weapon1.item.granted_abilities]: equipped_weapon = character.equipped_weapon1.item
            if not equipped_weapon and character.equipped_weapon2 and isinstance(character.equipped_weapon2.item, models.Weapon) and ability.id in [a.id for a in character.equipped_weapon2.item.granted_abilities]: equipped_weapon = character.equipped_weapon2.item

            # Расход патронов
            ammo_consumed_info: Optional[Dict[str, Any]] = None; ammo_to_consume = 0
            if equipped_weapon and equipped_weapon.required_ammo_type:
                if ability.name == "Очередь": ammo_to_consume = random.randint(3, 5)
                elif ability.name == "Атака конусом (Дробовик)": ammo_to_consume = 1
                elif ability.is_weapon_attack: ammo_to_consume = 1
                if ammo_to_consume > 0:
                    ammo_check_passed, ammo_consumed_info = _consume_ammo(db, character, equipped_weapon, ammo_to_consume)
                    if not ammo_check_passed: db.rollback(); action_result = schemas.ActionResultOut(success=False, message=f"Нет патронов '{equipped_weapon.required_ammo_type}'.", character_update_needed=False); raise ValueError(action_result.message)
                    if ammo_consumed_info:
                        consumed_resources_dict['ammo'] = ammo_consumed_info
                        if ammo_consumed_info['remaining'] <= 0:
                             ammo_inv_item_to_find = db.query(models.CharacterInventoryItem).filter(models.CharacterInventoryItem.item_id == ammo_consumed_info['ammo_item_id'], models.CharacterInventoryItem.character_id == character.id).first()
                             if ammo_inv_item_to_find: ammo_inv_item_to_delete = ammo_inv_item_to_find

            # --- Обработка Базовой Атаки Оружием ---
            if ability.is_weapon_attack:
                attack_skill_name = ability.attack_skill or "Ловкость"; mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3]); attack_modifier = getattr(character, mod_attribute_name, 0)
                numeric_attack_mod_sum = sum(eff.attack_roll_modifier for eff in character.active_status_effects if eff.attack_roll_modifier is not None)
                if numeric_attack_mod_sum != 0: logger.debug(f"Attack Roll numeric mod: {numeric_attack_mod_sum}")

                # Проверяем временное преимущество
                has_temp_advantage = False; effect_to_remove_after_attack = None
                is_ranged_attack = attack_skill_name in ["Ловкость", "Внимательность"] and equipped_weapon and equipped_weapon.range_normal is not None
                if is_ranged_attack and character.active_status_effects:
                    for effect in list(character.active_status_effects): # Итерация по копии
                        if effect.name == "_Temp: Precise Aim":
                            targets = effect.roll_modifier_targets; applies = False
                            if isinstance(targets, dict):
                                target_list = targets.get("attack_rolls")
                                if target_list is True or target_list == "all" or (isinstance(target_list, list) and "ranged" in target_list):
                                    applies = True
                            if applies: logger.info(f"Consuming temporary effect: _Temp: Precise Aim"); has_temp_advantage = True; effect_to_remove_after_attack = effect; break

                # Определяем режим броска
                attack_type_str = 'ranged' if is_ranged_attack else 'melee'
                skill_attr_map = {'Сила': 'strength', 'Ловкость': 'dexterity', 'Внимательность': 'attention'}
                skill_attr_for_target = skill_attr_map.get(attack_skill_name, 'other')
                roll_target_string = f"attack_rolls.{attack_type_str}.{skill_attr_for_target}"
                logger.debug(f"Generated roll_target_string for base attack: {roll_target_string}")
                attack_roll_mode = determine_roll_mode(character, roll_target_string, 'normal', has_temporary_advantage=has_temp_advantage)

                # Бросок
                attack_roll_base, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(mode=attack_roll_mode)
                attack_roll_total = attack_roll_base + attack_modifier + numeric_attack_mod_sum

                # Детали броска
                attack_roll_detail = format_roll_details(kept_dice, all_rolls, attack_modifier, f"Мод.{attack_skill_name[:3]}", numeric_attack_mod_sum, "Эффекты", used_mode)

                # Удаляем временный эффект, если был использован
                if effect_to_remove_after_attack:
                    try: character.active_status_effects.remove(effect_to_remove_after_attack); logger.info(f"Temp effect '{effect_to_remove_after_attack.name}' removed.")
                    except ValueError: logger.warning(f"Effect '{effect_to_remove_after_attack.name}' not found for removal.")

                # Попадание и Урон
                hit = True # ЗАГЛУШКА
                damage_value = 0; damage_roll_detail = "Промах"; damage_type = ability.damage_type or "Неизвестный"
                if hit:
                     formula_to_roll = ability.damage_formula
                     if formula_to_roll and formula_to_roll.lower() == 'см. оружие':
                         if equipped_weapon and equipped_weapon.damage: formula_to_roll = equipped_weapon.damage; damage_type = equipped_weapon.damage_type
                         else: formula_to_roll = None; damage_roll_detail = "Нет оружия"
                     if formula_to_roll: damage_value, damage_roll_detail = _parse_and_roll(formula_to_roll, character)
                     elif ability.damage_formula: damage_value, damage_roll_detail = _parse_and_roll(ability.damage_formula, character)
                     else: damage_roll_detail = "Нет формулы"

                # Сообщение результата
                result_message = f"Атака '{ability.name}' ({attack_skill_name}). Бросок: {attack_roll_total} ({attack_roll_detail})."
                if hit: result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали: {damage_roll_detail}."
                else: result_message += " Промах."
                if ammo_consumed_info: result_message += f" Патроны: -{ammo_consumed_info['consumed']} (ост: {ammo_consumed_info['remaining']})."

                # Результат (с исправленным details)
                action_result = schemas.ActionResultOut(
                    success=True, message=result_message,
                    details={
                        "attack_roll": attack_roll_total, "attack_roll_detail": attack_roll_detail,
                        "roll_mode": used_mode, "hit": hit, "damage_dealt": damage_value if hit else 0,
                        "damage_roll_detail": damage_roll_detail if hit else "Нет урона",
                        "damage_type": damage_type if hit else None
                    },
                    consumed_resources=consumed_resources_dict or None, character_update_needed=True
                )

            # --- Обработка Других Способностей ---
            else:
                # --- Атака Конусом (Дробовик) ---
                if ability.name == "Атака конусом (Дробовик)":
                     if not equipped_weapon: action_result = schemas.ActionResultOut(success=False, message="Нет оружия.", character_update_needed=False); raise ValueError(action_result.message)
                     save_dc = 8 + character.dexterity_mod; save_attribute = "Ловкость"; base_damage_formula = equipped_weapon.damage
                     full_damage_value, full_damage_details = _parse_and_roll(base_damage_formula, character)
                     damage_on_fail = max(1, full_damage_value // 2); damage_on_success = 0; damage_type = equipped_weapon.damage_type
                     final_message = f"'{ability.name}'. Цели: Спасбр. {save_attribute} СЛ {save_dc}. Провал: {damage_on_fail} ({damage_type}). Успех: без урона."
                     if ammo_consumed_info: final_message += f" Патроны: -{ammo_consumed_info['consumed']} (ост: {ammo_consumed_info['remaining']})."
                     result_details = {"area_effect": "cone_5m", "saving_throw_dc": save_dc, "saving_throw_attribute": save_attribute, "damage_on_fail": damage_on_fail, "damage_on_success": damage_on_success, "damage_type": damage_type, "base_damage_roll_details": full_damage_details}
                     action_result = schemas.ActionResultOut(success=True, message=final_message, details=result_details, consumed_resources=consumed_resources_dict or None, character_update_needed=True)

                # --- Очередь ---
                elif ability.name == "Очередь":
                    if not equipped_weapon: action_result = schemas.ActionResultOut(success=False, message="Нет оружия.", character_update_needed=False); raise ValueError(action_result.message)
                    attack_skill_name = ability.attack_skill or "Ловкость"; mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3]); attack_modifier = getattr(character, mod_attribute_name, 0)
                    numeric_attack_mod_sum = sum(eff.attack_roll_modifier for eff in character.active_status_effects if eff.attack_roll_modifier is not None)
                    if numeric_attack_mod_sum != 0: logger.debug(f"Burst Attack Roll numeric mod: {numeric_attack_mod_sum}")

                    # Проверяем временное преимущество
                    has_temp_advantage = False; effect_to_remove_after_attack = None; is_ranged_attack_burst = True
                    if is_ranged_attack_burst and character.active_status_effects:
                        for effect in list(character.active_status_effects): # Итерация по копии
                            if effect.name == "_Temp: Precise Aim":
                                targets = effect.roll_modifier_targets; applies = False
                                # Исправленный синтаксис проверки цели
                                if isinstance(targets, dict):
                                    target_list = targets.get("attack_rolls")
                                    if target_list is True or target_list == "all" or (isinstance(target_list, list) and "ranged" in target_list):
                                        applies = True
                                if applies: logger.info(f"Consuming temp effect _Temp: Precise Aim for Burst"); has_temp_advantage = True; effect_to_remove_after_attack = effect; break

                    # Определяем режим броска (Помеха от Очереди + Временное Преим. + Статусы)
                    skill_attr_map_burst = {'Ловкость': 'dexterity', 'Внимательность': 'attention'}
                    skill_attr_for_target_burst = skill_attr_map_burst.get(attack_skill_name, 'other')
                    roll_target_string_burst = f"attack_rolls.ranged.{skill_attr_for_target_burst}"
                    logger.debug(f"Generated roll_target_string for Burst Fire: {roll_target_string_burst}")

                    attack_roll_mode = determine_roll_mode(
                        character, roll_target_string_burst,
                        ability_modifies='disadvantage', # <-- Всегда передаем помеху от Очереди
                        has_temporary_advantage=has_temp_advantage # <-- Передаем флаг временного преим.
                    )

                    # Бросок
                    attack_roll_base, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(mode=attack_roll_mode)
                    attack_roll_total = attack_roll_base + attack_modifier + numeric_attack_mod_sum

                    # Детали
                    attack_roll_detail = format_roll_details(kept_dice, all_rolls, attack_modifier, f"Мод.{attack_skill_name[:3]}", numeric_attack_mod_sum, "Эффекты", used_mode)

                    # Удаляем временный эффект, если был использован
                    if effect_to_remove_after_attack:
                        try: character.active_status_effects.remove(effect_to_remove_after_attack); logger.info(f"Temp effect '{effect_to_remove_after_attack.name}' removed after Burst.")
                        except ValueError: logger.warning(f"Effect '{effect_to_remove_after_attack.name}' not found for removal after Burst.")

                    # Попадание и Урон
                    hit = True # ЗАГЛУШКА
                    # ... (расчет урона Очереди как был)
                    damage_value = 0; damage_roll_detail = "Промах"; damage_type = equipped_weapon.damage_type or "Неизвестный"
                    if hit:
                        base_formula = equipped_weapon.damage; dice_match = re.search(r"(\d+)к(\d+)", base_formula); extra_dice_formula = f"1к{dice_match.group(2)}" if dice_match else "1к6"
                        base_damage_val, base_details = _parse_and_roll(base_formula, character); extra_damage_val, extra_details = _parse_and_roll(extra_dice_formula, character)
                        damage_value = base_damage_val + extra_damage_val; damage_roll_detail = f"{base_details} + {extra_details}(Очередь)"

                    # Сообщение
                    result_message = f"'{ability.name}' из '{equipped_weapon.name}'. Атака ({'с помехой' if used_mode == 'disadvantage' else ('с преимуществом' if used_mode == 'advantage' else 'обычная')}): {attack_roll_total} ({attack_roll_detail})."
                    # ... (добавление урона, патронов)
                    if hit: result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали: {damage_roll_detail}."
                    else: result_message += " Промах."
                    if ammo_consumed_info: result_message += f" Патроны: -{ammo_consumed_info['consumed']} (ост: {ammo_consumed_info['remaining']})."

                    # Результат (с исправленным details)
                    action_result = schemas.ActionResultOut(
                        success=True, message=result_message,
                        details={
                            "attack_roll": attack_roll_total, "attack_roll_detail": attack_roll_detail, "roll_mode": used_mode,
                            "hit": hit, "damage_dealt": damage_value if hit else 0, "damage_roll_detail": damage_roll_detail if hit else "Нет урона",
                            "damage_type": damage_type if hit else None
                        },
                        consumed_resources=consumed_resources_dict or None, character_update_needed=True
                    )

                # --- Точный Выстрел ---
                elif ability.name == "Точный Выстрел":
                     logger.info(f"Activating ability: {ability.name}")
                     temp_effect_name = "_Temp: Precise Aim"; effect_template = db.query(models.StatusEffect).filter(models.StatusEffect.name == temp_effect_name).first()
                     if effect_template:
                         added_effect_name = character_crud.apply_status_effect(db, character, effect_template.id)
                         if added_effect_name: action_result = schemas.ActionResultOut(success=True, message=f"'{ability.name}'. След. дальняя атака с преимуществом.", details={}, consumed_resources=consumed_resources_dict or None, character_update_needed=True); logger.info(f"Applied temp effect '{added_effect_name}'.")
                         else: action_result = schemas.ActionResultOut(success=True, message=f"Эффект '{temp_effect_name}' уже активен.", details={}, consumed_resources=consumed_resources_dict or None, character_update_needed=False); logger.info(f"Effect '{temp_effect_name}' already active.")
                     else: action_result = schemas.ActionResultOut(success=False, message=f"Ошибка: Не найден эффект '{temp_effect_name}'.", character_update_needed=False); logger.error(f"Config error: StatusEffect '{temp_effect_name}' not found.")

                # --- Другие способности (Заглушка) ---
                else:
                    db.rollback() # Откатываем, так как действие не выполнено
                    action_result = schemas.ActionResultOut(success=False, message=f"Логика для '{ability.name}' не реализована.", character_update_needed=False)

        # --- Неизвестный тип активации ---
        else:
            db.rollback()
            action_result = schemas.ActionResultOut(success=False, message="Неизвестный тип активации.", character_update_needed=False)
            raise ValueError(action_result.message)

        # --- УСПЕШНОЕ ЗАВЕРШЕНИЕ (Общий блок коммита) ---
        if action_result and action_result.success:
            logger.info(f"--- ACTION RESULT (Success): {action_result.message} ---")
            try:
                # Удаляем объекты перед коммитом
                for obj_to_del in objects_to_delete: logger.info(f"Deleting Item object {obj_to_del}"); db.delete(obj_to_del)
                if ammo_inv_item_to_delete and ammo_inv_item_to_delete.quantity <= 0: logger.info(f"Deleting ammo InvItem ID {ammo_inv_item_to_delete.id}"); db.delete(ammo_inv_item_to_delete)

                db.commit() # Сохраняем все изменения
                logger.info("Action successful, changes committed.")
                if action_result.character_update_needed:
                    db.refresh(character)
                    # Перезагружаем связи (оптимизировать при необходимости)
                    db.refresh(character, attribute_names=['active_status_effects', 'inventory'])
                    logger.debug("Character object/relations refreshed.")
            except Exception as commit_exc:
                logger.error(f"DATABASE COMMIT FAILED: {commit_exc}", exc_info=True); db.rollback()
                action_result = schemas.ActionResultOut(success=False, message=f"Ошибка сохранения: {commit_exc}", character_update_needed=False) # Перезаписываем

        elif not action_result or not action_result.success:
             logger.warning(f"--- ACTION RESULT (Failed Internally or Not Implemented): {action_result.message if action_result else 'No result'} ---")
             if not action_result: action_result = schemas.ActionResultOut(success=False, message="Непредвиденная ошибка.", character_update_needed=False)

        return action_result # Возвращаем итоговый результат

    # --- Обработка Исключений ---
    except Exception as e:
        db.rollback() # Откат при любой ошибке
        error_message = f"Внутренняя ошибка сервера: {e}"
        # Используем сообщение из action_result, если оно было установлено как ошибка до исключения
        if action_result and not action_result.success and action_result.message: error_message = action_result.message
        logger.error(f"--- ACTION FAILED (Exception): {error_message} ---", exc_info=True)
        return schemas.ActionResultOut(success=False, message=error_message, character_update_needed=False)
