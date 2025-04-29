# backend/app/crud/character_slots.py
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status
from typing import Optional
import json # <-- Импортируем json для парсинга требований

from .. import models, schemas
import logging

logger = logging.getLogger(__name__)

# --- НОВОЕ: Словарь для перевода ключей требований в атрибуты модели ---
# (Можно вынести в utils или config, если используется еще где-то)
SKILL_REQ_TO_ATTR = {
    "skill_strength": "skill_strength", "skill_dexterity": "skill_dexterity",
    "skill_endurance": "skill_endurance", "skill_reaction": "skill_reaction",
    "skill_technique": "skill_technique", "skill_adaptation": "skill_adaptation",
    "skill_logic": "skill_logic", "skill_attention": "skill_attention",
    "skill_erudition": "skill_erudition", "skill_culture": "skill_culture",
    "skill_science": "skill_science", "skill_medicine": "skill_medicine",
    "skill_suggestion": "skill_suggestion", "skill_insight": "skill_insight",
    "skill_authority": "skill_authority", "skill_self_control": "skill_self_control",
    "skill_religion": "skill_religion", "skill_flow": "skill_flow",
    # Добавьте другие возможные ключи, если они есть в JSON требований
}
# --- КОНЕЦ НОВОГО ---


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

        # Проверяем, доступна ли она персонажу (изучена)
        available_ids = {ab.id for ab in character.available_abilities if ab}
        if ability_id not in available_ids:
            # (Опционально: можно добавить проверку на оружейные способности, если их можно назначать)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Эта способность не изучена персонажем")

        # Проверяем, что способность не пассивная
        if target_ability.action_type and target_ability.action_type.lower() == "пассивно":
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя назначить пассивную способность в активный слот")

        # --- НОВОЕ: Проверка требований по навыкам ---
        requirements_str = target_ability.skill_requirements
        if requirements_str:
            try:
                requirements = json.loads(requirements_str)
                if isinstance(requirements, dict):
                    missing_reqs = []
                    for req_key, required_value in requirements.items():
                        # Находим соответствующий атрибут в модели Character
                        char_attr = SKILL_REQ_TO_ATTR.get(req_key)
                        if not char_attr or not hasattr(character, char_attr):
                            logger.warning(f"Unknown skill requirement key '{req_key}' for ability '{target_ability.name}'")
                            continue # Пропускаем неизвестные требования

                        current_value = getattr(character, char_attr, 0)
                        if current_value < required_value:
                            # Формируем сообщение о невыполненном требовании
                            skill_name_rus = req_key.replace('skill_', '').capitalize() # Простое преобразование для сообщения
                            missing_reqs.append(f"{skill_name_rus}: нужно {required_value} (есть {current_value})")

                    if missing_reqs:
                        error_detail = f"Не выполнены требования для '{target_ability.name}': {'; '.join(missing_reqs)}."
                        logger.warning(f"Character {character_id} failed skill requirements for ability {ability_id}: {error_detail}")
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_detail)
                else:
                    logger.warning(f"Skill requirements for ability '{target_ability.name}' is not a valid JSON object: {requirements_str}")

            except json.JSONDecodeError:
                logger.error(f"Failed to parse skill_requirements JSON for ability '{target_ability.name}': {requirements_str}")
                # Можно либо проигнорировать ошибку парсинга, либо запретить назначение
                # raise HTTPException(status_code=500, detail="Ошибка в формате требований способности")
            except Exception as e:
                 logger.error(f"Error checking skill requirements for ability '{target_ability.name}': {e}", exc_info=True)
                 # Общая ошибка при проверке
                 # raise HTTPException(status_code=500, detail="Ошибка проверки требований способности")
        # --- КОНЕЦ ПРОВЕРКИ ТРЕБОВАНИЙ ---


        # Проверяем, не занята ли эта способность уже в другом слоте
        for i in range(1, 6):
            if i != slot_number:
                slot_id_attr = f"active_ability_slot_{i}_id"
                if getattr(character, slot_id_attr, None) == ability_id:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Эта способность уже назначена в слот {i}")

    # Находим атрибуты нужного слота
    slot_id_attr_name = f"active_ability_slot_{slot_number}_id"
    slot_cooldown_attr_name = f"active_ability_slot_{slot_number}_cooldown"
    # Добавляем атрибут для total cooldown (если вы его используете для анимации)
    slot_cooldown_total_attr_name = f"active_ability_slot_{slot_number}_cooldown_total"


    # Проверяем, изменилось ли значение, чтобы избежать лишнего коммита
    current_ability_id = getattr(character, slot_id_attr_name, None)
    if current_ability_id == ability_id:
         logger.info(f"Character {character_id}: Slot {slot_number} already has ability ID {ability_id}. No change.")
         # Нужно вернуть полные данные персонажа, даже если нет изменений, т.к. роутер ожидает CharacterDetailedOut
         # Поэтому коммит и рефреш все равно нужны, но можно оптимизировать, если не было изменений
         # return character # Пока оставим коммит/рефреш ниже

    # Устанавливаем значения
    setattr(character, slot_id_attr_name, ability_id) # None если ability_id is None (очистка)
    setattr(character, slot_cooldown_attr_name, 0) # Сбрасываем кулдаун при смене/очистке
    # Сбрасываем total cooldown тоже
    if hasattr(character, slot_cooldown_total_attr_name):
        setattr(character, slot_cooldown_total_attr_name, 0)


    try:
        db.add(character) # Помечаем для сохранения
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
        logger.error(f"Failed to update slot {slot_number} for character {character_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Ошибка базы данных при обновлении слота")

