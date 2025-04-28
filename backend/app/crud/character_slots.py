# backend/app/crud/character_slots.py
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status
from typing import Optional

from .. import models, schemas
import logging

logger = logging.getLogger(__name__)

def assign_ability_to_slot(
    db: Session,
    character_id: int,
    user_id: int,
    slot_number: int,
    ability_id: Optional[int] # Может быть None для очистки
) -> models.Character:
    """Назначает или очищает способность в указанном активном слоте персонажа."""

    if not (1 <= slot_number <= 5):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный номер слота (должен быть от 1 до 5)")

    # Загружаем персонажа со списком доступных способностей
    character = db.query(models.Character).options(
        selectinload(models.Character.available_abilities)
    ).filter(
        models.Character.id == character_id,
        models.Character.owner_id == user_id
    ).first()

    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")

    target_ability: Optional[models.Ability] = None
    if ability_id is not None:
        # Находим способность в БД
        target_ability = db.query(models.Ability).filter(models.Ability.id == ability_id).first()
        if not target_ability:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Указанная способность не найдена")

        # Проверяем, доступна ли она персонажу
        available_ids = {ab.id for ab in character.available_abilities}
        if ability_id not in available_ids:
            # Дополнительно проверим, не является ли она способностью от оружия
            # (Хотя обычно оружейные способности не должны назначаться в слоты)
             is_weapon_granted = False
             if character.equipped_weapon1 and character.equipped_weapon1.item and isinstance(character.equipped_weapon1.item, models.Weapon):
                 if ability_id in {ab.id for ab in character.equipped_weapon1.item.granted_abilities}:
                     is_weapon_granted = True
             if not is_weapon_granted and character.equipped_weapon2 and character.equipped_weapon2.item and isinstance(character.equipped_weapon2.item, models.Weapon):
                  if ability_id in {ab.id for ab in character.equipped_weapon2.item.granted_abilities}:
                     is_weapon_granted = True

             if not is_weapon_granted: # Если она не изучена И не от оружия
                 raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Эта способность недоступна персонажу для назначения в слот")

        # Проверяем, что способность не пассивная
        if target_ability.action_type == "Пассивно":
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя назначить пассивную способность в активный слот")

        # Проверяем, не занята ли эта способность уже в другом слоте
        for i in range(1, 6):
            if i != slot_number:
                slot_id_attr = f"active_ability_slot_{i}_id"
                if getattr(character, slot_id_attr) == ability_id:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Эта способность уже назначена в слот {i}")

    # Находим атрибуты нужного слота
    slot_id_attr_name = f"active_ability_slot_{slot_number}_id"
    slot_cooldown_attr_name = f"active_ability_slot_{slot_number}_cooldown"

    # Устанавливаем значения
    setattr(character, slot_id_attr_name, ability_id) # None если ability_id is None (очистка)
    setattr(character, slot_cooldown_attr_name, 0) # Сбрасываем кулдаун при смене/очистке

    try:
        db.commit()
        db.refresh(character)
        # Обновим конкретные связи для слотов, чтобы они подтянулись
        db.refresh(character, attribute_names=[
            'active_ability_1', 'active_ability_2', 'active_ability_3',
            'active_ability_4', 'active_ability_5'
        ])
        logger.info(f"Character {character_id}: Slot {slot_number} updated with ability ID {ability_id}")
        return character
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update slot {slot_number} for character {character_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Ошибка базы данных при обновлении слота")

# Функция clear_ability_slot теперь не нужна, т.к. assign_ability_to_slot(ability_id=None) делает то же самое.