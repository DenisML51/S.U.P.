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
    Обрабатывает завершение хода персонажа, уменьшая активные кулдауны способностей в слотах.
    """
    character = db.query(models.Character).filter(
        models.Character.id == character_id,
        models.Character.owner_id == user_id
    ).first()

    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")

    cooldowns_updated = False
    for i in range(1, 6):
        cooldown_attr = f"active_ability_slot_{i}_cooldown"
        current_cooldown = getattr(character, cooldown_attr, 0)
        if current_cooldown > 0:
            setattr(character, cooldown_attr, current_cooldown - 1)
            cooldowns_updated = True
            logger.debug(f"Character {character_id}: Slot {i} cooldown reduced to {current_cooldown - 1}")

    if cooldowns_updated:
        try:
            db.commit()
            db.refresh(character)
            logger.info(f"Character {character_id}: Turn ended, cooldowns updated.")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to update cooldowns on turn end for character {character_id}: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Ошибка базы данных при завершении хода")
    else:
        logger.info(f"Character {character_id}: Turn ended, no active cooldowns to reduce.")

    return character