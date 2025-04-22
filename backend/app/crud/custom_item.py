# backend/app/crud/custom_item.py (Новый файл)
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..models.character import Character # Для проверки владельца

def get_character_custom_items(db: Session, character_id: int, user_id: int) -> List[models.CharacterCustomItem]:
    """Получает все произвольные предметы для персонажа пользователя."""
    # Проверка, что персонаж принадлежит пользователю
    character = db.query(models.Character.id).filter(
        models.Character.id == character_id,
        models.Character.owner_id == user_id
    ).first()
    if not character:
        # Можно вернуть пустой список или вызвать исключение
        return []
    return db.query(models.CharacterCustomItem).filter(
        models.CharacterCustomItem.character_id == character_id
    ).order_by(models.CharacterCustomItem.name).all()

def add_custom_item(db: Session, character_id: int, user_id: int, item_in: schemas.CustomItemCreate) -> Optional[models.CharacterCustomItem]:
    """Добавляет произвольный предмет персонажу. Если предмет с таким именем уже есть, увеличивает количество."""
    character = db.query(models.Character.id).filter(
        models.Character.id == character_id,
        models.Character.owner_id == user_id
    ).first()
    if not character:
        return None # Персонаж не найден или не принадлежит пользователю

    # Ищем существующий предмет с таким же именем у этого персонажа
    existing_item = db.query(models.CharacterCustomItem).filter(
        models.CharacterCustomItem.character_id == character_id,
        models.CharacterCustomItem.name == item_in.name
    ).first()

    if existing_item:
        existing_item.quantity += item_in.quantity
        db_item = existing_item
        db.add(db_item) # Нужно добавить в сессию для коммита изменений
    else:
        db_item = models.CharacterCustomItem(
            character_id=character_id,
            **item_in.model_dump()
        )
        db.add(db_item)

    try:
        db.commit()
        db.refresh(db_item)
        return db_item
    except Exception as e:
        db.rollback()
        print(f"Error adding custom item: {e}") # Логирование ошибки
        # Можно выбросить HTTPException или вернуть None
        return None

def remove_custom_item(db: Session, custom_item_id: int, character_id: int, user_id: int, quantity_to_remove: int) -> bool:
    """Удаляет произвольный предмет или уменьшает его количество."""
    custom_item = db.query(models.CharacterCustomItem).join(
        models.Character, models.Character.id == models.CharacterCustomItem.character_id
    ).filter(
        models.CharacterCustomItem.id == custom_item_id,
        models.CharacterCustomItem.character_id == character_id,
        models.Character.owner_id == user_id
    ).first()

    if not custom_item:
        return False # Предмет не найден или не принадлежит пользователю/персонажу

    if custom_item.quantity > quantity_to_remove:
        custom_item.quantity -= quantity_to_remove
        db.add(custom_item) # Добавляем для сохранения изменений
    elif custom_item.quantity <= quantity_to_remove:
        db.delete(custom_item) # Удаляем всю запись
    else:
        # Случай quantity_to_remove=0 или отрицательное? По идее, валидация не пропустит.
        return False

    try:
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error removing custom item: {e}") # Логирование ошибки
        return False

