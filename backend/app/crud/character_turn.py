# backend/app/crud/character_turn.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional

from .. import models
import logging

logger = logging.getLogger(__name__)

def end_character_turn(
    db: Session,
    character_id: int,
    user_id: int
) -> models.Character:
    """
    Обрабатывает завершение хода персонажа:
    - Уменьшает активные кулдауны способностей в слотах.
    - Сбрасывает флаги использованных действий (основное, бонусное, реакция).
    """
    character = db.query(models.Character).filter(
        models.Character.id == character_id,
        models.Character.owner_id == user_id
    ).first()

    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")

    something_changed = False # Общий флаг изменений

    # Уменьшаем кулдауны
    for i in range(1, 6):
        cooldown_attr = f"active_ability_slot_{i}_cooldown"
        current_cooldown = getattr(character, cooldown_attr, 0)
        if current_cooldown > 0:
            setattr(character, cooldown_attr, current_cooldown - 1)
            something_changed = True
            logger.debug(f"Character {character_id}: Slot {i} cooldown reduced to {current_cooldown - 1}")

    # Сброс флагов действий
    if character.has_used_main_action:
        character.has_used_main_action = False
        something_changed = True
        logger.debug(f"Character {character_id}: Main action reset.")
    if character.has_used_bonus_action:
        character.has_used_bonus_action = False
        something_changed = True
        logger.debug(f"Character {character_id}: Bonus action reset.")
    # Реакция сбрасывается в начале следующего хода персонажа, а не в конце текущего
    # if character.has_used_reaction:
    #     character.has_used_reaction = False
    #     something_changed = True
    #     logger.debug(f"Character {character_id}: Reaction reset.")
    # ПРИМЕЧАНИЕ: Правила D&D 5e (на которые часто ориентируются) гласят, что реакция восстанавливается
    # в НАЧАЛЕ вашего следующего хода. Поэтому сброс флага реакции здесь может быть некорректным.
    # Оставляю закомментированным. Если ваша система работает иначе, раскомментируйте.

    if something_changed:
        try:
            db.add(character) # Помечаем для сохранения
            db.commit()
            db.refresh(character)
            logger.info(f"Character {character_id}: Turn ended, cooldowns/actions updated.")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to update cooldowns/actions on turn end for char {character_id}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Ошибка базы данных при завершении хода")
    else:
        logger.info(f"Character {character_id}: Turn ended, no active cooldowns or used actions to reset.")

    return character
