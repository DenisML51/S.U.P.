# backend/app/crud/action.py
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status
from typing import Optional, Dict, Any, List, Tuple
import random
import re
from .. import models, schemas
from .utils import _parse_and_roll, SKILL_MODIFIER_MAP
from .item import get_inventory_item
import logging

logger = logging.getLogger(__name__)

# --- Вспомогательная функция для расхода патронов (без изменений) ---
def _consume_ammo(
    db: Session,
    character: models.Character,
    weapon: models.Weapon,
    amount: int = 1
) -> Tuple[bool, Optional[Dict[str, Any]]]:
    if not weapon.required_ammo_type:
        # logger.warning(f"Weapon '{weapon.name}' does not require ammo type. Skipping consumption.") # Можно убрать для чистоты лога
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
    # logger.info(f"Consumed {amount} of ammo '{required_type}'. Remaining: {remaining_ammo}")

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
    Включает логику расхода патронов и улучшенное логирование.
    """
    character = db.query(models.Character).options(
        selectinload(models.Character.inventory).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_weapon1).selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon)).selectinload(models.Weapon.granted_abilities),
        selectinload(models.Character.equipped_weapon2).selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon)).selectinload(models.Weapon.granted_abilities),
        selectinload(models.Character.equipped_armor).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_shield).selectinload(models.CharacterInventoryItem.item),
    ).filter(
        models.Character.id == character_id,
        models.Character.owner_id == user_id
    ).first()

    if not character:
        # Логируем ошибку перед выходом
        logger.warning(f"--- ACTION FAILED ---")
        logger.warning(f"  Reason: Character not found (ID: {character_id}, UserID: {user_id})")
        logger.warning(f"---------------------")
        return schemas.ActionResultOut(success=False, message="Персонаж не найден", character_update_needed=False)

    activation_type = activation_data.activation_type
    target_id = activation_data.target_id
    target_entities: List[int] = activation_data.target_entities or []

    # Логируем начало обработки
    logger.info(f"--- ACTION START ---")
    logger.info(f"  Character: {character.name} (ID: {character.id})")
    logger.info(f"  Activation Type: {activation_type}")
    logger.info(f"  Target ID: {target_id}")
    if target_entities:
        logger.info(f"  Target Entities: {target_entities}")
    logger.info(f"--------------------")

    consumed_resources_dict = {}
    action_result: Optional[schemas.ActionResultOut] = None # Для хранения результата

    try:
        # ===========================================
        # === ЛОГИКА ИСПОЛЬЗОВАНИЯ ПРЕДМЕТА (item) ===
        # ===========================================
        if activation_type == 'item':
            inv_item = get_inventory_item(db, inventory_item_id=target_id, character_id=character_id, user_id=user_id)
            if not inv_item:
                 action_result = schemas.ActionResultOut(success=False, message="Предмет не найден в инвентаре.", character_update_needed=False)
                 raise ValueError(action_result.message) # Вызываем исключение для логирования ошибки
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
                # ... (логика лечения без изменений) ...
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

            equipped_weapon: Optional[models.Weapon] = None
            # ... (логика поиска equipped_weapon без изменений) ...
            if character.equipped_weapon1 and ability.id in [a.id for a in character.equipped_weapon1.item.granted_abilities]:
                if isinstance(character.equipped_weapon1.item, models.Weapon): equipped_weapon = character.equipped_weapon1.item
            elif character.equipped_weapon2 and ability.id in [a.id for a in character.equipped_weapon2.item.granted_abilities]:
                 if isinstance(character.equipped_weapon2.item, models.Weapon): equipped_weapon = character.equipped_weapon2.item

            # Расход патронов
            ammo_consumed_info: Optional[Dict[str, Any]] = None
            ammo_check_passed = True
            ammo_to_consume = 0
            if equipped_weapon and equipped_weapon.required_ammo_type:
                if ability.name == "Очередь": ammo_to_consume = 3
                elif ability.name == "Атака конусом (Дробовик)": ammo_to_consume = 1
                elif ability.is_weapon_attack: ammo_to_consume = 1

                if ammo_to_consume > 0:
                    ammo_check_passed, ammo_consumed_info = _consume_ammo(db, character, equipped_weapon, ammo_to_consume)
                    if not ammo_check_passed:
                        db.rollback()
                        action_result = schemas.ActionResultOut(success=False, message=f"Нет патронов типа '{equipped_weapon.required_ammo_type}' для '{ability.name}'.", character_update_needed=False)
                        raise ValueError(action_result.message) # Вызываем ошибку для логирования
                    if ammo_consumed_info:
                        consumed_resources_dict['ammo'] = ammo_consumed_info

            # --- Обработка Базовой Атаки Оружием ---
            if ability.is_weapon_attack:
                # ... (логика атаки и урона без изменений) ...
                attack_skill_name = ability.attack_skill or "Ловкость"
                mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3])
                attack_modifier = getattr(character, mod_attribute_name, 0)
                attack_roll_base = roll_3d6()
                attack_roll_total = attack_roll_base + attack_modifier
                attack_roll_detail = f"3к6({attack_roll_base}) + {attack_modifier}(Мод.{attack_skill_name[:3]}) = {attack_roll_total}"
                hit = True # ЗАГЛУШКА
                damage_value = 0
                damage_roll_detail = "Промах или нет формулы"
                damage_type = ability.damage_type or "Неизвестный"
                if hit and ability.damage_formula:
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
                    details={"attack_roll": attack_roll_total, "attack_roll_detail": attack_roll_detail, "hit": hit, "damage_dealt": damage_value if hit else 0, "damage_roll_detail": damage_roll_detail if hit else "Нет урона", "damage_type": damage_type if hit else None},
                    consumed_resources=consumed_resources_dict if consumed_resources_dict else None,
                    character_update_needed=True
                )
            # --- Обработка Других Способностей ---
            else:
                # --- Атака Конусом ---
                if ability.name == "Атака конусом (Дробовик)":
                    if not equipped_weapon:
                        action_result = schemas.ActionResultOut(success=False, message="Ошибка: Не найдено оружие для Атаки конусом.", character_update_needed=False)
                        raise ValueError(action_result.message)
                    # ... (расчеты save_dc, half_damage_value и т.д. без изменений) ...
                    save_dc = 8 + character.dexterity_mod; save_attribute = "Ловкость"
                    base_damage_formula = equipped_weapon.damage; full_damage_value, full_damage_details = _parse_and_roll(base_damage_formula, character)
                    half_damage_value = max(1, full_damage_value // 2); damage_type = equipped_weapon.damage_type

                    final_message = (f"'{character.name}' использует '{ability.name}' из '{equipped_weapon.name}'. "
                                     f"Цели в конусе 5м: Спасбросок {save_attribute} СЛ {save_dc}. "
                                     f"Провал: {half_damage_value} ({damage_type}) урона. Успех: без урона.")
                    if ammo_consumed_info: final_message += f" Потрачено: {ammo_consumed_info['consumed']} {ammo_consumed_info['ammo_name']} (ост: {ammo_consumed_info['remaining']})."
                    result_details = {"area_effect": "cone_5m", "saving_throw_dc": save_dc, "saving_throw_attribute": save_attribute, "damage_on_fail": half_damage_value, "damage_on_success": 0, "damage_type": damage_type, "base_damage_roll_details": full_damage_details}

                    db.commit()
                    action_result = schemas.ActionResultOut(success=True, message=final_message, details=result_details, consumed_resources=consumed_resources_dict if consumed_resources_dict else None, character_update_needed=True)

                # --- Очередь ---
                elif ability.name == "Очередь":
                    if not equipped_weapon:
                        action_result = schemas.ActionResultOut(success=False, message="Ошибка: Не найдено оружие для Очереди.", character_update_needed=False)
                        raise ValueError(action_result.message)
                    # ... (логика атаки с помехой и доп. уроном без изменений) ...
                    attack_rolls = sorted([random.randint(1, 6) for _ in range(4)])[:3]; attack_roll_base = sum(attack_rolls)
                    attack_skill_name = ability.attack_skill or "Ловкость"; mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3])
                    attack_modifier = getattr(character, mod_attribute_name, 0); attack_roll_total = attack_roll_base + attack_modifier
                    attack_roll_detail = f"4к6к3({attack_roll_base}) + {attack_modifier}(Мод.{attack_skill_name[:3]}) = {attack_roll_total}"
                    hit = True # ЗАГЛУШКА
                    damage_value = 0; damage_roll_detail = "Промах или нет формулы"; damage_type = equipped_weapon.damage_type or "Неизвестный"
                    if hit:
                        base_formula = equipped_weapon.damage; dice_match = re.search(r"(\d+)к(\d+)", base_formula)
                        extra_dice_formula = f"1к{dice_match.group(2)}" if dice_match else "1к6"
                        base_damage_val, base_details = _parse_and_roll(base_formula, character)
                        extra_damage_val, extra_details = _parse_and_roll(extra_dice_formula, character)
                        damage_value = base_damage_val + extra_damage_val; damage_roll_detail = f"{base_details} + {extra_details}(Очередь)"

                    result_message = f"'{character.name}' стреляет Очередью из '{equipped_weapon.name}'. Атака (с помехой): {attack_roll_total} ({attack_roll_detail})."
                    if hit: result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали: {damage_roll_detail}."
                    else: result_message += " Промах."
                    if ammo_consumed_info: result_message += f" Потрачено: {ammo_consumed_info['consumed']} {ammo_consumed_info['ammo_name']} (ост: {ammo_consumed_info['remaining']})."

                    db.commit()
                    action_result = schemas.ActionResultOut(
                        success=True, message=result_message,
                        details={"attack_roll": attack_roll_total, "attack_roll_detail": attack_roll_detail, "hit": hit, "damage_dealt": damage_value if hit else 0, "damage_roll_detail": damage_roll_detail if hit else "Нет урона", "damage_type": damage_type if hit else None, "attack_modifier": "disadvantage"},
                        consumed_resources=consumed_resources_dict if consumed_resources_dict else None,
                        character_update_needed=True
                    )

                # --- Добавляйте elif для других способностей здесь ---

                else:
                    # Если логика не найдена
                    db.rollback() # Откатываем, если были изменения (например, в _consume_ammo, хотя его не должно было быть вызвано)
                    action_result = schemas.ActionResultOut(success=False, message=f"Логика для способности '{ability.name}' пока не реализована.", character_update_needed=False)
                    # Не вызываем исключение, просто логируем предупреждение ниже

        else: # Неизвестный activation_type
            db.rollback()
            action_result = schemas.ActionResultOut(success=False, message="Неизвестный тип активации.", character_update_needed=False)
            raise ValueError(action_result.message) # Вызываем исключение для логирования ошибки

        # --- УСПЕШНОЕ ЗАВЕРШЕНИЕ (если не было исключения) ---
        if action_result and action_result.success:
            logger.info(f"--- ACTION RESULT (Success) ---")
            logger.info(f"  Character: {character.name} (ID: {character.id})")
            logger.info(f"  Action: {item.name if activation_type == 'item' else ability.name} (ID: {target_id})")
            logger.info(f"  Message: {action_result.message}")
            if action_result.details:
                logger.info(f"  Details: {action_result.details}")
            if action_result.consumed_resources:
                logger.info(f"  Consumed: {action_result.consumed_resources}")
            logger.info(f"-------------------------------")
        # Если action_result не был установлен (например, нереализованная способность без ошибки)
        elif not action_result:
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
        # Если у нас есть action_result с сообщением об ошибке, используем его
        if action_result and not action_result.success and action_result.message:
             error_message = action_result.message

        logger.error(f"--- ACTION FAILED ---")
        logger.error(f"  Character: {character.name} (ID: {character.id})")
        logger.error(f"  Action Type: {activation_type}")
        logger.error(f"  Target ID: {target_id}")
        logger.error(f"  Error: {error_message}", exc_info=True if not action_result else False) # Показываем traceback для неожиданных ошибок
        logger.error(f"---------------------")

        # Возвращаем информацию об ошибке
        return schemas.ActionResultOut(
            success=False,
            message=error_message,
            character_update_needed=False
        )

