# backend/app/crud/action.py
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status
from typing import Optional, Dict, Any, List, Tuple
import random
import re
from .. import models, schemas
from .utils import _parse_and_roll, SKILL_MODIFIER_MAP, roll_with_advantage_disadvantage, format_roll_details, RollMode
from .item import get_inventory_item
import logging

logger = logging.getLogger(__name__)


# --- НОВАЯ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Определение режима броска для действия ---
def determine_roll_mode(character: models.Character, roll_target: str, ability_modifies: RollMode = 'normal') -> RollMode:
    """
    Определяет итоговый режим броска (advantage, disadvantage, normal),
    учитывая активные статус-эффекты персонажа и модификатор от самой способности/действия.
    roll_target: Строка, описывающая тип броска (напр., 'attack_rolls', 'saving_throws.dexterity', 'skill_checks.strength')
    ability_modifies: Режим, накладываемый самой способностью ('advantage', 'disadvantage')
    """
    status_advantage = False
    status_disadvantage = False

    if character.active_status_effects:
        for effect in character.active_status_effects:
            if effect.roll_modifier_type and effect.roll_modifier_targets:
                targets = effect.roll_modifier_targets
                applies = False
                # Проверяем совпадение цели броска (упрощенная проверка)
                # TODO: Реализовать более точную проверку вложенных целей (skill_checks.strength)
                target_parts = roll_target.split('.')
                main_target_type = target_parts[0] # attack_rolls, saving_throws, skill_checks

                if targets.get(main_target_type) == True or targets.get(main_target_type) == "all":
                    applies = True
                elif isinstance(targets.get(main_target_type), list) and len(target_parts) > 1:
                    if target_parts[1] in targets[main_target_type]:
                        applies = True
                # Добавить другие проверки при необходимости (напр., конкретный навык)

                if applies:
                    if effect.roll_modifier_type == 'advantage':
                        status_advantage = True
                    elif effect.roll_modifier_type == 'disadvantage':
                        status_disadvantage = True

    # Определяем итоговый режим
    final_mode = 'normal'
    action_has_advantage = ability_modifies == 'advantage'
    action_has_disadvantage = ability_modifies == 'disadvantage'

    has_advantage = status_advantage or action_has_advantage
    has_disadvantage = status_disadvantage or action_has_disadvantage

    if has_advantage and has_disadvantage:
        final_mode = 'normal' # Конфликт -> нормальный бросок [Source: 1787]
    elif has_advantage:
        final_mode = 'advantage'
    elif has_disadvantage:
        final_mode = 'disadvantage'

    # Логирование для отладки
    logger.debug(f"Roll Target: {roll_target}, Ability Mod: {ability_modifies}, Status Adv: {status_advantage}, Status Disadv: {status_disadvantage} => Final Mode: {final_mode}")

    return final_mode

# --- Вспомогательная функция для расхода патронов (без изменений) ---
def _consume_ammo(
    db: Session,
    character: models.Character,
    weapon: models.Weapon,
    amount: int = 1
) -> Tuple[bool, Optional[Dict[str, Any]]]:
    if not weapon.required_ammo_type:
        logger.warning(f"Weapon '{weapon.name}' does not require ammo type. Skipping consumption.") # Можно убрать для чистоты лога
        return True, None

    required_type = weapon.required_ammo_type
    ammo_item_entry: Optional[models.CharacterInventoryItem] = None

    found_in_loaded = False
    if character.inventory:
         for inv_item in character.inventory:
             # Добавим проверку inv_item.item существует
             if inv_item.item and isinstance(inv_item.item, models.Ammo) and inv_item.item.ammo_type == required_type:
                 ammo_item_entry = inv_item
                 found_in_loaded = True
                 break

    if not found_in_loaded:
        logger.warning(f"Ammo type '{required_type}' not found in preloaded inventory for character {character.id}. Querying DB again.")
        character_inventory = db.query(models.CharacterInventoryItem).filter(
            models.CharacterInventoryItem.character_id == character.id
        ).options(selectinload(models.CharacterInventoryItem.item)).all()

        for inv_item in character_inventory:
             # Добавим проверку inv_item.item существует
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
    # Убрал лог отсюда, будем логировать в конце действия
    logger.info(f"Consumed {amount} of ammo '{required_type}'. Remaining: {remaining_ammo}")

    if ammo_item_entry.quantity <= 0:
        logger.info(f"Ammo entry ID {ammo_item_entry.id} ({ammo_item_entry.item.name}) removed from inventory.")
        db.delete(ammo_item_entry)

    return True, ammo_info

# Функция для броска 3к6 (без изменений)
def roll_3d6():
    return random.randint(1, 6) + random.randint(1, 6) + random.randint(1, 6)

# --- Основная функция активации действия ---
def activate_action(
    db: Session,
    character_id: int,
    user_id: int,
    activation_data: schemas.ActivationRequest
) -> Optional[schemas.ActionResultOut]:
    """
    Обрабатывает активацию способности или использование предмета.
    Включает логику расхода патронов, преимущество/помеху и улучшенное логирование.
    """
    # Загрузка персонажа (сразу грузим active_status_effects)
    character = db.query(models.Character).options(
        selectinload(models.Character.inventory).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_weapon1).selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon)).selectinload(models.Weapon.granted_abilities),
        selectinload(models.Character.equipped_weapon2).selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon)).selectinload(models.Weapon.granted_abilities),
        selectinload(models.Character.equipped_armor).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_shield).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.active_status_effects) # <-- ДОБАВЛЕНО
    ).filter(
        models.Character.id == character_id,
        models.Character.owner_id == user_id
    ).first()

    if not character:
        logger.warning(f"--- ACTION FAILED ---")
        logger.warning(f"  Reason: Character not found (ID: {character_id}, UserID: {user_id})")
        logger.warning(f"---------------------")
        return schemas.ActionResultOut(success=False, message="Персонаж не найден", character_update_needed=False)

    activation_type = activation_data.activation_type
    target_id = activation_data.target_id
    target_entities: List[int] = activation_data.target_entities or []

    logger.info(f"--- ACTION START ---")
    logger.info(f"  Character: {character.name} (ID: {character.id})")
    logger.info(f"  Activation Type: {activation_type}")
    logger.info(f"  Target ID: {target_id}")
    if target_entities:
        logger.info(f"  Target Entities: {target_entities}")
    logger.info(f"--------------------")

    consumed_resources_dict = {}
    action_result: Optional[schemas.ActionResultOut] = None # Для хранения результата

    try:
        # ===========================================
        # === ЛОГИКА ИСПОЛЬЗОВАНИЯ ПРЕДМЕТА (item) ===
        # ===========================================
        if activation_type == 'item':
            # ... (логика поиска предмета) ... [Source: 2364]
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
                # Броски эффектов предметов (например, лечение) пока не учитывают advantage/disadvantage
                # Если нужно будет, надо будет передавать режим и сюда
                calculated_value, roll_details = _parse_and_roll(formula, character)

            # ... (логика расхода предмета и лечения без изменений) ... [Source: 2365-2370]
            if inv_item.quantity > 1:
                 inv_item.quantity -= 1
                 consumed_resources_dict['item'] = {"item_id": item.id, "name": item.name, "consumed": 1, "remaining": inv_item.quantity}
            else:
                 # Снятие с экипировки
                 if character.armor_inv_item_id == inv_item.id: character.armor_inv_item_id = None
                 if character.shield_inv_item_id == inv_item.id: character.shield_inv_item_id = None
                 if character.weapon1_inv_item_id == inv_item.id: character.weapon1_inv_item_id = None
                 if character.weapon2_inv_item_id == inv_item.id: character.weapon2_inv_item_id = None
                 db.delete(inv_item)
                 consumed_resources_dict['item'] = {"item_id": item.id, "name": item.name, "consumed": 1, "remaining": 0}

            final_message = f"Предмет '{item.name}' использован."
            result_details = {"roll_details": roll_details, "calculated_value": calculated_value}
            character_update_needed = True

            # Обработка лечения
            if isinstance(item, models.GeneralItem) and item.category == 'Медицина' and calculated_value > 0:
                 current_hp = character.current_hp
                 max_hp = character.max_hp
                 new_hp = min(max_hp, current_hp + calculated_value)
                 healed_for = new_hp - current_hp
                 if healed_for > 0:
                     character.current_hp = new_hp
                     final_message += f" Восстановлено {healed_for} ПЗ ({roll_details}). Текущие ПЗ: {new_hp}/{max_hp}."
                     result_details["healing_done"] = healed_for
                     result_details["new_hp"] = new_hp
                 else:
                     final_message += " Здоровье уже полное."
            elif calculated_value > 0:
                 final_message += f" Результат ({roll_details}): {calculated_value}."

            db.commit()
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

            # --- Поиск экипированного оружия для способности ---
            equipped_weapon: Optional[models.Weapon] = None
            weapon_inv_item_id: Optional[int] = None # ID предмета инвентаря, откуда способность
            if character.equipped_weapon1 and isinstance(character.equipped_weapon1.item, models.Weapon):
                 if ability.id in [a.id for a in character.equipped_weapon1.item.granted_abilities]:
                     equipped_weapon = character.equipped_weapon1.item
                     weapon_inv_item_id = character.weapon1_inv_item_id
            if not equipped_weapon and character.equipped_weapon2 and isinstance(character.equipped_weapon2.item, models.Weapon):
                 if ability.id in [a.id for a in character.equipped_weapon2.item.granted_abilities]:
                     equipped_weapon = character.equipped_weapon2.item
                     weapon_inv_item_id = character.weapon2_inv_item_id

            # --- Расход патронов (без изменений в логике расхода) ---
            ammo_consumed_info: Optional[Dict[str, Any]] = None
            ammo_check_passed = True
            ammo_to_consume = 0
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

            # --- Обработка Базовой Атаки Оружием ---
            if ability.is_weapon_attack:
                attack_skill_name = ability.attack_skill or "Ловкость"
                mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3])
                attack_modifier = getattr(character, mod_attribute_name, 0)

                # --- ИЗМЕНЕНИЕ: Определяем режим броска атаки ---
                attack_roll_mode = determine_roll_mode(character, 'attack_rolls', 'normal') # Базовая атака не дает преим./помеху сама по себе
                # --- КОНЕЦ ИЗМЕНЕНИЯ ---

                # --- ИЗМЕНЕНИЕ: Используем новую функцию броска ---
                attack_roll_base, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(mode=attack_roll_mode)
                attack_roll_total = attack_roll_base + attack_modifier
                # --- ИЗМЕНЕНИЕ: Используем новую функцию форматирования ---
                attack_roll_detail = format_roll_details(kept_dice, all_rolls, attack_modifier, f"Мод.{attack_skill_name[:3]}", used_mode)
                # --- КОНЕЦ ИЗМЕНЕНИЯ ---

                hit = True # ЗАГЛУШКА - TODO: Реализовать проверку попадания (attack_roll_total >= target_AC)
                damage_value = 0
                damage_roll_detail = "Промах или нет формулы"
                damage_type = ability.damage_type or "Неизвестный"

                if hit and ability.damage_formula:
                    # Броски урона пока без advantage/disadvantage
                    if ability.damage_formula.lower() == 'см. оружие':
                        if equipped_weapon:
                            weapon_base_formula = equipped_weapon.damage
                            damage_value, damage_roll_detail = _parse_and_roll(weapon_base_formula, character)
                            damage_type = equipped_weapon.damage_type
                        else: damage_roll_detail = "Не найдено оружие для формулы 'См. оружие'"
                    else: damage_value, damage_roll_detail = _parse_and_roll(ability.damage_formula, character)

                result_message = f"Атака '{ability.name}' ({attack_skill_name}). Бросок атаки: {attack_roll_total} ({attack_roll_detail})."
                if hit: result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали урона: {damage_roll_detail}."
                else: result_message += " Промах."
                if ammo_consumed_info: result_message += f" Потрачено: {ammo_consumed_info['consumed']} {ammo_consumed_info['ammo_name']} (ост: {ammo_consumed_info['remaining']})."

                db.commit()
                action_result = schemas.ActionResultOut(
                    success=True, message=result_message,
                    details={
                        "attack_roll": attack_roll_total,
                        "attack_roll_detail": attack_roll_detail, # Обновлено
                        "roll_mode": used_mode, # Добавляем режим броска
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
                    if not equipped_weapon:
                        action_result = schemas.ActionResultOut(success=False, message="Ошибка: Не найдено оружие для Атаки конусом.", character_update_needed=False)
                        raise ValueError(action_result.message)

                    # Расчет СЛ спасброска (без изменений)
                    # TODO: Возможно, СЛ тоже должна учитывать advantage/disadvantage на бросок характеристики персонажа? Пока нет.
                    save_dc = 8 + character.dexterity_mod # Пример, лучше использовать СЛ Способности персонажа
                    save_attribute = "Ловкость"

                    base_damage_formula = equipped_weapon.damage
                    # Бросок урона без advantage/disadvantage
                    full_damage_value, full_damage_details = _parse_and_roll(base_damage_formula, character)
                    damage_on_fail = max(1, full_damage_value // 2) # В правилах - половина при провале
                    damage_on_success = 0 # В правилах - нет урона при успехе

                    damage_type = equipped_weapon.damage_type
                    final_message = (f"'{character.name}' использует '{ability.name}' из '{equipped_weapon.name}'. "
                                     f"Цели в конусе 5м: Спасбросок {save_attribute} СЛ {save_dc}. "
                                     f"Провал: {damage_on_fail} ({damage_type}) урона. Успех: без урона.")
                    if ammo_consumed_info: final_message += f" Потрачено: {ammo_consumed_info['consumed']} {ammo_consumed_info['ammo_name']} (ост: {ammo_consumed_info['remaining']})."

                    result_details = {
                        "area_effect": "cone_5m",
                        "saving_throw_dc": save_dc,
                        "saving_throw_attribute": save_attribute,
                        "damage_on_fail": damage_on_fail,
                        "damage_on_success": damage_on_success,
                        "damage_type": damage_type,
                        "base_damage_roll_details": full_damage_details # Детали полного урона для справки
                        # TODO: Добавить информацию о целях и результатах их спасбросков, если target_entities переданы
                    }
                    db.commit()
                    action_result = schemas.ActionResultOut(success=True, message=final_message, details=result_details, consumed_resources=consumed_resources_dict if consumed_resources_dict else None, character_update_needed=True)

                # --- Очередь ---
                elif ability.name == "Очередь":
                    if not equipped_weapon:
                        action_result = schemas.ActionResultOut(success=False, message="Ошибка: Не найдено оружие для Очереди.", character_update_needed=False)
                        raise ValueError(action_result.message)

                    attack_skill_name = ability.attack_skill or "Ловкость"
                    mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3])
                    attack_modifier = getattr(character, mod_attribute_name, 0)

                    # --- ИЗМЕНЕНИЕ: Определяем режим броска атаки (Очередь всегда с помехой) ---
                    # Передаем 'disadvantage' как модификатор от способности
                    attack_roll_mode = determine_roll_mode(character, 'attack_rolls', 'disadvantage')
                    # --- КОНЕЦ ИЗМЕНЕНИЯ ---

                    # --- ИЗМЕНЕНИЕ: Используем новую функцию броска ---
                    attack_roll_base, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(mode=attack_roll_mode)
                    attack_roll_total = attack_roll_base + attack_modifier
                    # --- ИЗМЕНЕНИЕ: Используем новую функцию форматирования ---
                    attack_roll_detail = format_roll_details(kept_dice, all_rolls, attack_modifier, f"Мод.{attack_skill_name[:3]}", used_mode)
                    # --- КОНЕЦ ИЗМЕНЕНИЯ ---

                    hit = True # ЗАГЛУШКА

                    damage_value = 0
                    damage_roll_detail = "Промах или нет формулы"
                    damage_type = equipped_weapon.damage_type or "Неизвестный"
                    if hit:
                        base_formula = equipped_weapon.damage
                        dice_match = re.search(r"(\d+)к(\d+)", base_formula)
                        # +1 кость урона при очереди
                        extra_dice_formula = f"1к{dice_match.group(2)}" if dice_match else "1к6"
                        base_damage_val, base_details = _parse_and_roll(base_formula, character)
                        extra_damage_val, extra_details = _parse_and_roll(extra_dice_formula, character)
                        damage_value = base_damage_val + extra_damage_val
                        damage_roll_detail = f"{base_details} + {extra_details}(Очередь)"

                    result_message = f"'{character.name}' стреляет Очередью из '{equipped_weapon.name}'. Атака ({'с помехой' if used_mode == 'disadvantage' else ('с преимуществом' if used_mode == 'advantage' else 'обычная')}): {attack_roll_total} ({attack_roll_detail})."
                    if hit: result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали: {damage_roll_detail}."
                    else: result_message += " Промах."
                    if ammo_consumed_info: result_message += f" Потрачено: {ammo_consumed_info['consumed']} {ammo_consumed_info['ammo_name']} (ост: {ammo_consumed_info['remaining']})."

                    db.commit()
                    action_result = schemas.ActionResultOut(
                        success=True, message=result_message,
                        details={
                            "attack_roll": attack_roll_total,
                            "attack_roll_detail": attack_roll_detail, # Обновлено
                            "roll_mode": used_mode, # Добавляем режим броска
                            "hit": hit,
                            "damage_dealt": damage_value if hit else 0,
                            "damage_roll_detail": damage_roll_detail if hit else "Нет урона",
                            "damage_type": damage_type if hit else None,
                            "attack_modifier": used_mode # Передаем режим как модификатор для UI
                        },
                        consumed_resources=consumed_resources_dict if consumed_resources_dict else None,
                        character_update_needed=True
                    )

                # --- Добавляйте elif для других способностей здесь ---
                # Пример: Способность, дающая преимущество на следующую атаку
                # elif ability.name == "Прицельный Выстрел":
                #     # Логика наложения временного статус-эффекта "Advantage on next attack roll"
                #     # Или модификация состояния персонажа для следующего вызова determine_roll_mode
                #     temp_effect = models.StatusEffect(name="_temp_advantage_attack", roll_modifier_type='advantage', roll_modifier_targets={'attack_rolls': True})
                #     # Добавить эффект к персонажу (требует механизма временных эффектов)
                #     # ...
                #     action_result = schemas.ActionResultOut(success=True, message="Вы прицелились. Следующая атака с преимуществом.", details={}, character_update_needed=True)
                #     db.commit() # Если добавляли эффект

                else:
                    # Если логика не найдена
                    db.rollback()
                    action_result = schemas.ActionResultOut(success=False, message=f"Логика для способности '{ability.name}' пока не реализована.", character_update_needed=False)
                    # Не вызываем исключение, просто логируем предупреждение ниже

        else: # Неизвестный activation_type
            db.rollback()
            action_result = schemas.ActionResultOut(success=False, message="Неизвестный тип активации.", character_update_needed=False)
            raise ValueError(action_result.message)

        # --- УСПЕШНОЕ ЗАВЕРШЕНИЕ (если не было исключения) ---
        if action_result and action_result.success:
            # ... (логирование успеха без изменений) ... [Source: 2399]
            logger.info(f"--- ACTION RESULT (Success) ---")
            logger.info(f"  Character: {character.name} (ID: {character.id})")
            # Определяем имя действия
            action_name = "Неизвестно"
            if activation_type == 'item' and 'item' in locals(): action_name = item.name
            elif activation_type == 'ability' and 'ability' in locals(): action_name = ability.name
            logger.info(f"  Action: {action_name} (Type: {activation_type}, TargetID: {target_id})")
            logger.info(f"  Message: {action_result.message}")
            if action_result.details:
                logger.info(f"  Details: {action_result.details}")
            if action_result.consumed_resources:
                logger.info(f"  Consumed: {action_result.consumed_resources}")
            logger.info(f"-------------------------------")

        # Если action_result не был установлен (например, нереализованная способность без ошибки)
        elif not action_result:
             # ... (логирование нереализованной способности) ... [Source: 2400]
             logger.warning(f"--- ACTION RESULT (Not Implemented) ---")
             logger.warning(f"  Character: {character.name} (ID: {character.id})")
             logger.warning(f"  Ability: {ability.name} (ID: {target_id})")
             logger.warning(f"  Reason: No specific backend logic found.")
             logger.warning(f"------------------------------------")
             # Возвращаем результат, созданный в блоке else
             return schemas.ActionResultOut(success=False, message=f"Логика для способности '{ability.name}' пока не реализована.", character_update_needed=False)

        return action_result # Возвращаем результат

    except Exception as e:
        db.rollback()
        # --- УЛУЧШЕННОЕ ЛОГИРОВАНИЕ ОШИБКИ ---
        error_message = f"Внутренняя ошибка сервера при активации: {e}"
        if action_result and not action_result.success and action_result.message:
            error_message = action_result.message
        # ... (логирование ошибки без изменений) ... [Source: 2401]
        logger.error(f"--- ACTION FAILED ---")
        logger.error(f"  Character: {character.name} (ID: {character.id})")
        logger.error(f"  Action Type: {activation_type}")
        logger.error(f"  Target ID: {target_id}")
        logger.error(f"  Error: {error_message}", exc_info=True if not action_result else False) # Показываем traceback для неожиданных ошибок
        logger.error(f"---------------------")
        return schemas.ActionResultOut(
            success=False,
            message=error_message,
            character_update_needed=False
        )