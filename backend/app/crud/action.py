# backend/app/crud/action.py
from sqlalchemy.orm import Session, selectinload # Добавим selectinload
from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import random # Нужен для бросков

from .. import models, schemas
from .utils import _parse_and_roll, SKILL_MODIFIER_MAP # Импортируем парсер и карту модов
from .item import get_inventory_item # Пока не удаляем, используется для предметов
# from .character import apply_status_effect # Пока не используем статусы здесь

import logging # Добавляем логирование
logger = logging.getLogger(__name__)

# Функция для броска 3к6
def roll_3d6():
    return random.randint(1, 6) + random.randint(1, 6) + random.randint(1, 6)

def activate_action(
    db: Session,
    character_id: int,
    user_id: int,
    activation_data: schemas.ActivationRequest
) -> Optional[schemas.ActionResultOut]:
    """
    Обрабатывает активацию способности или использование предмета.
    ДОБАВЛЕНА ОБРАБОТКА ОРУЖЕЙНЫХ АТАК.
    """
    # Загружаем персонажа со всеми модификаторами
    character = db.query(models.Character).filter(
        models.Character.id == character_id,
        models.Character.owner_id == user_id
    ).first()

    if not character:
        return schemas.ActionResultOut(success=False, message="Персонаж не найден", character_update_needed=False)

    activation_type = activation_data.activation_type
    target_id = activation_data.target_id

    logger.info(f"--- CRUD: activate_action --- CharID: {character_id}, Type: {activation_type}, TargetID: {target_id}")

    try:
        if activation_type == 'item':
            # --- ЛОГИКА ИСПОЛЬЗОВАНИЯ ПРЕДМЕТА (без изменений) ---
            inv_item = get_inventory_item(db, inventory_item_id=target_id, character_id=character_id, user_id=user_id)
            if not inv_item: return schemas.ActionResultOut(success=False, message="Предмет не найден.", character_update_needed=False)
            item = inv_item.item
            logger.info(f"Activating item: {item.name}")
            if inv_item.quantity <= 0: return schemas.ActionResultOut(success=False, message=f"У предмета '{item.name}' закончились использования.", character_update_needed=False)

            formula = getattr(item, 'effect_dice_formula', None)
            calculated_value = 0
            roll_details = "Нет формулы"
            if formula:
                calculated_value, roll_details = _parse_and_roll(formula, character)
                logger.info(f"  Item formula '{formula}' rolled: {calculated_value} ({roll_details})")
            else:
                logger.warning(f"  No formula for item '{item.name}'.")

            resource_consumed_info = {}
            if inv_item.quantity > 1:
                inv_item.quantity -= 1
                resource_consumed_info = {"item_id": item.id, "name": item.name, "removed": 0, "remaining": inv_item.quantity}
            else:
                if character.armor_inv_item_id == inv_item.id: character.armor_inv_item_id = None
                if character.shield_inv_item_id == inv_item.id: character.shield_inv_item_id = None
                if character.weapon1_inv_item_id == inv_item.id: character.weapon1_inv_item_id = None
                if character.weapon2_inv_item_id == inv_item.id: character.weapon2_inv_item_id = None
                db.delete(inv_item)
                resource_consumed_info = {"item_id": item.id, "name": item.name, "removed": 1, "remaining": 0}

            final_message = f"Предмет '{item.name}' использован."
            result_details = {"roll_details": roll_details, "calculated_value": calculated_value}
            character_update_needed = True # Почти всегда нужно обновить персонажа после исп. предмета

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
                    character_update_needed = False # Если здоровье полное, обновление не нужно? Зависит от фронта.

            elif calculated_value > 0:
                final_message += f" Результат ({roll_details}): {calculated_value}."

            db.commit()
            return schemas.ActionResultOut(
                success=True,
                message=final_message,
                details=result_details,
                consumed_resources=resource_consumed_info,
                character_update_needed=character_update_needed
            )

        elif activation_type == 'ability':
            # --- ЛОГИКА АКТИВАЦИИ СПОСОБНОСТИ ---
            ability = db.query(models.Ability).filter(models.Ability.id == target_id).first()

            if not ability:
                return schemas.ActionResultOut(success=False, message="Способность не найдена.", character_update_needed=False)

            logger.info(f"Activating ability: {ability.name} (ID: {target_id})")

            # TODO: Проверить, изучена ли способность персонажем (если это не is_weapon_attack)
            # TODO: Проверить требования способности (уровень ветки, навыки)
            # TODO: Проверить кулдаун/использования
            # TODO: Проверить стоимость (ОС) и списать ресурс

            # --- Обработка Атаки Оружием ---
            if ability.is_weapon_attack:
                # 1. Определить навык атаки и модификатор
                attack_skill_name = ability.attack_skill or "Сила" # По умолчанию Сила для ближнего? Или Ловкость для дальнего? Уточнить.
                mod_attribute_name = SKILL_MODIFIER_MAP.get(attack_skill_name[:3]) # Берем первые 3 буквы
                attack_modifier = 0
                if mod_attribute_name and hasattr(character, mod_attribute_name):
                    attack_modifier = getattr(character, mod_attribute_name)
                else:
                    logger.warning(f"Could not find modifier attribute for skill '{attack_skill_name}'")

                # 2. Бросок атаки
                attack_roll_base = roll_3d6()
                attack_roll_total = attack_roll_base + attack_modifier
                attack_roll_detail = f"3к6({attack_roll_base}) + {attack_modifier}(Мод.{attack_skill_name[:3]}) = {attack_roll_total}"
                logger.info(f"  Attack roll: {attack_roll_detail}")

                # TODO: Сравнение с AC цели (пока не реализовано)
                hit = True # Пока считаем, что всегда попадаем для теста урона

                # 3. Бросок урона (если попали)
                damage_value = 0
                damage_roll_detail = "Промах или нет формулы"
                damage_type = ability.damage_type or "Неизвестный"

                if hit and ability.damage_formula:
                    if ability.damage_formula.lower() == 'см. оружие':
                         # Если формула "См. оружие", нужно найти оружие, дающее эту способность
                         # ЭТО СЛОЖНО, Т.К. НЕ ЗНАЕМ КАКОЕ ОРУЖИЕ АКТИВИРОВАЛО СПОСОБНОСТЬ
                         # ВРЕМЕННОЕ РЕШЕНИЕ: ищем ЛЮБОЕ экипированное оружие, дающее эту способность
                         equipped_weapon = None
                         if character.equipped_weapon1 and target_id in [a.id for a in character.equipped_weapon1.item.granted_abilities]:
                             equipped_weapon = character.equipped_weapon1.item
                         elif character.equipped_weapon2 and target_id in [a.id for a in character.equipped_weapon2.item.granted_abilities]:
                             equipped_weapon = character.equipped_weapon2.item

                         if equipped_weapon and isinstance(equipped_weapon, models.Weapon):
                             # Используем базовый урон оружия как формулу
                             weapon_base_formula = equipped_weapon.damage # Напр., "1к8"
                             damage_value, damage_roll_detail = _parse_and_roll(weapon_base_formula, character)
                             damage_type = equipped_weapon.damage_type # Берем тип урона оружия
                             logger.info(f"  Damage roll (from weapon '{equipped_weapon.name}' formula '{weapon_base_formula}'): {damage_value} ({damage_roll_detail})")
                         else:
                             logger.warning(f"  Could not find equipped weapon providing ability ID {target_id} to determine base damage.")
                             damage_roll_detail = "Не найдено оружие для формулы 'См. оружие'"
                    else:
                         # Используем формулу из способности
                         damage_value, damage_roll_detail = _parse_and_roll(ability.damage_formula, character)
                         logger.info(f"  Damage roll (from ability formula '{ability.damage_formula}'): {damage_value} ({damage_roll_detail})")

                # 4. Формирование результата
                result_message = f"Атака '{ability.name}' ({attack_skill_name}). Бросок атаки: {attack_roll_total} ({attack_roll_detail})."
                if hit:
                    result_message += f" Попадание! Урон: {damage_value} ({damage_type}). Детали урона: {damage_roll_detail}."
                else:
                    result_message += " Промах."

                # TODO: Расход патронов, если это дальнобойная атака

                # База данных не менялась (пока нет расхода патронов)
                db.rollback() # Откатываем, т.к. изменений не было
                return schemas.ActionResultOut(
                    success=True, # Само действие выполнено (броски сделаны)
                    message=result_message,
                    details={
                        "attack_roll": attack_roll_total,
                        "attack_roll_detail": attack_roll_detail,
                        "hit": hit,
                        "damage_dealt": damage_value if hit else 0,
                        "damage_roll_detail": damage_roll_detail if hit else "Нет урона",
                        "damage_type": damage_type if hit else None
                    },
                    consumed_resources=None, # Пока нет расхода
                    character_update_needed=False # Состояние персонажа не изменилось
                )

            else:
                # --- Обработка Других Способностей (не атаки оружия) ---
                # TODO: Реализовать логику для способностей веток (лечение, баффы, дебаффы, спасброски...)
                logger.warning(f"Ability '{ability.name}' is not a weapon attack - activation logic not implemented.")
                db.rollback()
                return schemas.ActionResultOut(success=False, message=f"Активация способности '{ability.name}' пока не реализована.", character_update_needed=False)

        else:
            db.rollback()
            return schemas.ActionResultOut(success=False, message="Неизвестный тип активации.", character_update_needed=False)

    except Exception as e:
        db.rollback()
        logger.error(f"  ERROR during activation: {e}", exc_info=True)
        # Возвращаем ошибку в формате ActionResultOut
        return schemas.ActionResultOut(
            success=False,
            message=f"Внутренняя ошибка сервера при активации: {e}",
            character_update_needed=False
        )