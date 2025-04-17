# backend/app/routers/characters.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload # Добавлен selectinload
from typing import List, Any

# Относительные импорты
from .. import models, schemas
# Импортируем нужные CRUD модули
from ..crud import character as character_crud
from ..crud import item as item_crud
from ..db.database import get_db
from ..core.auth import get_current_user

router = APIRouter(
    prefix="/characters",
    tags=["Characters"],
    dependencies=[Depends(get_current_user)] # Аутентификация для всех
)

@router.post("", response_model=schemas.CharacterBriefOut, status_code=status.HTTP_201_CREATED, summary="Создать нового персонажа")
async def create_new_character(
    character_in: schemas.CharacterCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_char = character_crud.create_character(db=db, user_id=current_user.id, character_in=character_in)
    return schemas.CharacterBriefOut.from_orm(db_char)


@router.get("", response_model=List[schemas.CharacterBriefOut], summary="Получить список своих персонажей")
async def get_my_characters(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return character_crud.get_characters_by_user(db=db, user_id=current_user.id)


@router.get("/{character_id}", response_model=schemas.CharacterDetailedOut, summary="Получить детали персонажа")
async def get_character_details_endpoint(
    character_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    character = character_crud.get_character_details_for_output(db=db, character_id=character_id, user_id=current_user.id)
    if character is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return character


@router.put("/{character_id}/skills", response_model=schemas.CharacterDetailedOut, summary="Обновить навыки персонажа")
async def update_character_skills_endpoint(
    character_id: int,
    skill_updates: schemas.CharacterUpdateSkills,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated_char = character_crud.update_character_skills(db=db, character_id=character_id, user_id=current_user.id, skill_updates=skill_updates)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    # Возвращаем обновленные полные данные
    return character_crud.get_character_details_for_output(db, character_id, current_user.id)


@router.post("/{character_id}/levelup", response_model=schemas.CharacterDetailedOut, summary="Повысить уровень персонажа")
async def level_up_character_endpoint(
    character_id: int,
    level_up_data: schemas.LevelUpInfo,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    leveled_up_char = character_crud.level_up_character(db=db, character_id=character_id, user_id=current_user.id, level_up_data=level_up_data)
    if leveled_up_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    # Возвращаем обновленные полные данные
    return character_crud.get_character_details_for_output(db, character_id, current_user.id)


@router.put("/{character_id}/stats", response_model=schemas.CharacterDetailedOut, summary="Обновить текущие статы персонажа")
async def update_character_stats_endpoint(
    character_id: int,
    stats_update: schemas.UpdateCharacterStats,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated_char, triggered_emotion_name = character_crud.update_character_stats(
        db=db, character_id=character_id, user_id=current_user.id, stats_update=stats_update
    )
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")

    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None:
         raise HTTPException(status_code=500, detail="Не удалось получить детали персонажа после обновления статов")
    print(f"Update stats endpoint finished. Triggered emotion: {triggered_emotion_name}") # Лог для отладки
    return character_details


@router.put("/{character_id}/notes", response_model=schemas.CharacterDetailedOut, summary="Обновить заметки персонажа")
async def update_character_notes_endpoint(
    character_id: int,
    notes_update: schemas.CharacterNotes,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated_char = character_crud.update_character_notes(db=db, character_id=character_id, user_id=current_user.id, notes_update=notes_update)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return character_crud.get_character_details_for_output(db, character_id, current_user.id)


# --- Эндпоинты Инвентаря (используют item_crud) ---
@router.post("/{character_id}/inventory", response_model=schemas.CharacterInventoryItemOut, status_code=status.HTTP_201_CREATED, tags=["Inventory"], summary="Добавить предмет в инвентарь")
async def add_item_to_character_inventory(
    character_id: int,
    item_add: schemas.AddItemToInventory,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inv_item = item_crud.add_item_to_inventory(db=db, character_id=character_id, user_id=current_user.id, item_add=item_add)
    if inv_item is None:
        # Эта ошибка теперь обрабатывается внутри crud.add_item_to_inventory, если персонаж не найден
        # Но оставим на всякий случай проверку, если вернется None по другой причине
        # Либо если item не найден (хотя там 404)
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж или предмет не найден")


    # Формируем ответный Pydantic объект
    item_data = inv_item.item # Должен быть загружен в crud
    item_schema: Any = None
    if isinstance(item_data, models.Weapon): item_schema = schemas.WeaponOut.from_orm(item_data)
    elif isinstance(item_data, models.Armor): item_schema = schemas.ArmorOut.from_orm(item_data)
    elif isinstance(item_data, models.Shield): item_schema = schemas.ShieldOut.from_orm(item_data)
    elif isinstance(item_data, models.GeneralItem): item_schema = schemas.GeneralItemOut.from_orm(item_data)
    elif isinstance(item_data, models.Ammo): item_schema = schemas.AmmoOut.from_orm(item_data)
    else: item_schema = schemas.ItemBase.from_orm(item_data)

    if item_schema is None:
        raise HTTPException(status_code=500, detail="Не удалось определить тип добавленного предмета")

    return schemas.CharacterInventoryItemOut(id=inv_item.id, item=item_schema, quantity=inv_item.quantity)


@router.delete("/{character_id}/inventory/{inventory_item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Inventory"], summary="Удалить предмет из инвентаря")
async def remove_item_from_character_inventory(
    character_id: int,
    inventory_item_id: int,
    quantity: int = Query(1, ge=1, description="Количество удаляемых предметов"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    success = item_crud.remove_item_from_inventory(db=db, inventory_item_id=inventory_item_id, character_id=character_id, user_id=current_user.id, quantity=quantity)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет инвентаря не найден или не принадлежит персонажу")
    return None


@router.put("/{character_id}/equipment", response_model=schemas.CharacterDetailedOut, tags=["Inventory"], summary="Экипировать предмет")
async def equip_item_for_character(
    character_id: int,
    equip_data: schemas.EquipItem,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated_char_model = item_crud.equip_item(db=db, character_id=character_id, user_id=current_user.id, equip_data=equip_data)
    if updated_char_model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return character_crud.get_character_details_for_output(db, character_id, current_user.id)


@router.delete("/{character_id}/equipment/{slot}", response_model=schemas.CharacterDetailedOut, tags=["Inventory"], summary="Снять предмет с экипировки")
async def unequip_item_for_character(
    character_id: int,
    slot: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated_char_model = item_crud.unequip_item(db=db, character_id=character_id, user_id=current_user.id, slot=slot)
    if updated_char_model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return character_crud.get_character_details_for_output(db, character_id, current_user.id)


# --- Эндпоинты Статус-Эффектов (используют character_crud) ---
@router.post("/{character_id}/status_effects", response_model=schemas.CharacterDetailedOut, tags=["Status Effects"], summary="Применить статус-эффект")
async def apply_status_effect_to_character(
    character_id: int,
    status_update: schemas.StatusEffectUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_char = db.query(models.Character).options(
        selectinload(models.Character.active_status_effects)
    ).filter(
        models.Character.id == character_id,
        models.Character.owner_id == current_user.id
    ).first()

    if not db_char:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")

    status_effect_id_to_apply = status_update.status_effect_id
    added_effect_name = character_crud.apply_status_effect(db, db_char, status_effect_id_to_apply)

    if added_effect_name is not None:
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Ошибка БД при сохранении статус-эффекта: {e}")

    updated_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if updated_details is None:
        raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные персонажа")
    return updated_details


@router.delete("/{character_id}/status_effects/{status_effect_id}", response_model=schemas.CharacterDetailedOut, tags=["Status Effects"], summary="Снять статус-эффект")
async def remove_status_effect_from_character(
    character_id: int,
    status_effect_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated_char_model = character_crud.remove_status_effect(db, character_id, current_user.id, status_effect_id)
    if updated_char_model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж или статус-эффект не найден, или эффект не применен к этому персонажу")
    return character_crud.get_character_details_for_output(db, character_id, current_user.id)