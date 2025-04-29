from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Path
from sqlalchemy.orm import Session, selectinload
from typing import List, Any, Optional
import asyncio # <-- Импорт asyncio

# Относительные импорты
from .. import models, schemas
# Импортируем CRUD модули
from ..crud import character as character_crud
from ..crud import item as item_crud
from ..crud import action as action_crud
from ..crud import custom_item as custom_item_crud
from ..crud import character_slots as slots_crud
from ..crud import character_turn as turn_crud
from ..crud.skill_check import perform_skill_check
# Импорт WebSocket менеджера
from ..websockets.manager import manager # <-- Импорт manager
from ..db.database import get_db
from ..core.auth import get_current_user
# Явно импортируем все нужные схемы
from ..schemas import (
    CharacterBriefOut, CharacterCreate, CharacterDetailedOut, CharacterUpdateSkills,
    LevelUpInfo, UpdateCharacterStats, CharacterNotes, HealRequest, ShortRestRequest,
    CharacterInventoryItemOut, AddItemToInventory, EquipItem, StatusEffectUpdate,
    ActionResultOut, CustomItemCreate, CustomItemOut, SkillCheckRequest, SkillCheckResultOut,
    AssignAbilitySlotRequest)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/characters",
    tags=["Characters"],
    dependencies=[Depends(get_current_user)] # Аутентификация для всех
)

async def _broadcast_update_if_needed(lobby_key: Optional[str], character_details: Optional[schemas.CharacterDetailedOut]):
    """Отправляет обновление персонажа через WebSocket, если есть ключ лобби и данные."""
    # --- ДОБАВЛЕНО ЛОГИРОВАНИЕ ВНУТРИ ХЕЛПЕРА ---
    logger.info(f"Broadcast check: lobby_key='{lobby_key}', character_details provided: {bool(character_details)}")
    # --- КОНЕЦ ЛОГИРОВАНИЯ ---
    if lobby_key and character_details:
        try:
            # Используем asyncio.create_task для неблокирующей отправки
            asyncio.create_task(
                 manager.broadcast_character_update(lobby_key, character_details.model_dump(mode='json'))
            )
            logger.info(f"Broadcast task CREATED for char {character_details.id} update in lobby {lobby_key}") # Уточнено сообщение
        except Exception as e:
            logger.error(f"Failed to create broadcast task for char {character_details.id} in lobby {lobby_key}: {e}", exc_info=True)
    # --- ДОБАВЛЕНО ЛОГИРОВАНИЕ: ЕСЛИ УСЛОВИЕ НЕ ВЫПОЛНЕНО ---
    elif not lobby_key:
        logger.warning("Broadcast skipped: lobby_key is missing or None.")
    elif not character_details:
        logger.warning(f"Broadcast skipped for lobby {lobby_key}: character_details is missing or None.")
    # --- КОНЕЦ ЛОГИРОВАНИЯ ---

# --- Эндпоинты для создания, получения списка, деталей персонажа ---
@router.post("", response_model=schemas.CharacterBriefOut, status_code=status.HTTP_201_CREATED, summary="Создать нового персонажа")
async def create_new_character(character_in: schemas.CharacterCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_char = character_crud.create_character(db=db, user_id=current_user.id, character_in=character_in)
    # При создании не шлем broadcast, т.к. персонаж еще не в лобби
    return schemas.CharacterBriefOut.model_validate(db_char) # Используем model_validate для Pydantic v2+

@router.get("", response_model=List[schemas.CharacterBriefOut], summary="Получить список своих персонажей")
async def get_my_characters(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return character_crud.get_characters_by_user(db=db, user_id=current_user.id)

@router.get("/{character_id}", response_model=schemas.CharacterDetailedOut, summary="Получить детали персонажа")
async def get_character_details_endpoint(character_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    character_details = character_crud.get_character_details_for_output(db=db, character_id=character_id, user_id=current_user.id)
    if character_details is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return character_details

# --- Эндпоинты для обновления статов, навыков, заметок ---
@router.put("/{character_id}/skills", response_model=schemas.CharacterDetailedOut, summary="Обновить навыки персонажа")
async def update_character_skills_endpoint(
    character_id: int,
    skill_updates: schemas.CharacterUpdateSkills,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    updated_char = character_crud.update_character_skills(db=db, character_id=character_id, user_id=current_user.id, skill_updates=skill_updates)
    if updated_char is None: raise HTTPException(status_code=404, detail="Персонаж не найден")
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные") # Should not happen
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return character_details

@router.post("/{character_id}/levelup", response_model=schemas.CharacterDetailedOut, summary="Повысить уровень персонажа")
async def level_up_character_endpoint(
    character_id: int,
    level_up_data: schemas.LevelUpInfo,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    leveled_up_char = character_crud.level_up_character(db=db, character_id=character_id, user_id=current_user.id, level_up_data=level_up_data)
    if leveled_up_char is None: raise HTTPException(status_code=404, detail="Персонаж не найден")
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные")
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return character_details

@router.put("/{character_id}/stats", response_model=schemas.CharacterDetailedOut, summary="Обновить текущие статы персонажа")
async def update_character_stats_endpoint(
    character_id: int,
    stats_update: schemas.UpdateCharacterStats,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    updated_char, triggered_emotion_name = character_crud.update_character_stats(db=db, character_id=character_id, user_id=current_user.id, stats_update=stats_update)
    if updated_char is None: raise HTTPException(status_code=404, detail="Персонаж не найден")
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=500, detail="Не удалось получить детали персонажа после обновления статов")
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    # TODO: Consider broadcasting triggered_emotion_name separately if needed
    return character_details

@router.put("/{character_id}/notes", response_model=schemas.CharacterDetailedOut, summary="Обновить заметки персонажа")
async def update_character_notes_endpoint(
    character_id: int,
    notes_update: schemas.CharacterNotes,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    updated_char = character_crud.update_character_notes(db=db, character_id=character_id, user_id=current_user.id, notes_update=notes_update)
    if updated_char is None: raise HTTPException(status_code=404, detail="Персонаж не найден")
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные")
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return character_details

# --- Эндпоинты Инвентаря (добавление/удаление/экипировка) ---
@router.post("/{character_id}/inventory", response_model=schemas.CharacterInventoryItemOut, status_code=status.HTTP_201_CREATED, tags=["Inventory"], summary="Добавить предмет в инвентарь")
async def add_item_to_character_inventory(
    character_id: int,
    item_add: schemas.AddItemToInventory,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    inv_item = item_crud.add_item_to_inventory(db=db, character_id=character_id, user_id=current_user.id, item_add=item_add)
    if inv_item is None: raise HTTPException(status_code=404, detail="Персонаж или предмет не найден")
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    # Format response (existing logic)
    item_data = inv_item.item; item_schema: Any = None
    if isinstance(item_data, models.Weapon): item_schema = schemas.WeaponOut.model_validate(item_data)
    elif isinstance(item_data, models.Armor): item_schema = schemas.ArmorOut.model_validate(item_data)
    elif isinstance(item_data, models.Shield): item_schema = schemas.ShieldOut.model_validate(item_data)
    elif isinstance(item_data, models.GeneralItem): item_schema = schemas.GeneralItemOut.model_validate(item_data)
    elif isinstance(item_data, models.Ammo): item_schema = schemas.AmmoOut.model_validate(item_data)
    else: item_schema = schemas.ItemBase.model_validate(item_data)
    if item_schema is None: raise HTTPException(status_code=500, detail="Не удалось определить тип добавленного предмета")
    return schemas.CharacterInventoryItemOut(id=inv_item.id, item=item_schema, quantity=inv_item.quantity)

@router.delete("/{character_id}/inventory/{inventory_item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Inventory"], summary="Удалить предмет из инвентаря")
async def remove_item_from_character_inventory(
    character_id: int,
    inventory_item_id: int,
    quantity: int = Query(1, ge=1),
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    success = item_crud.remove_item_from_inventory(db=db, inventory_item_id=inventory_item_id, character_id=character_id, user_id=current_user.id, quantity=quantity)
    if not success: raise HTTPException(status_code=404, detail="Предмет инвентаря не найден")
    # --- Broadcast Logic ---
    # Fetch details *after* potential deletion/update
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return None # Return 204 No Content

@router.put("/{character_id}/equipment", response_model=schemas.CharacterDetailedOut, tags=["Inventory"], summary="Экипировать предмет")
async def equip_item_for_character(
    character_id: int,
    equip_data: schemas.EquipItem,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    updated_char_model = item_crud.equip_item(db=db, character_id=character_id, user_id=current_user.id, equip_data=equip_data)
    if updated_char_model is None: raise HTTPException(status_code=404, detail="Персонаж не найден")
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные")
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return character_details

@router.delete("/{character_id}/equipment/{slot}", response_model=schemas.CharacterDetailedOut, tags=["Inventory"], summary="Снять предмет с экипировки")
async def unequip_item_for_character(
    character_id: int,
    slot: str = Path(..., description="Слот для снятия: armor, shield, weapon1, weapon2"), # Use Path for slot
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    updated_char_model = item_crud.unequip_item(db=db, character_id=character_id, user_id=current_user.id, slot=slot)
    if updated_char_model is None: raise HTTPException(status_code=404, detail="Персонаж не найден")
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные")
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return character_details

# --- Эндпоинты Кастомных Предметов ---
@router.post("/{character_id}/custom_items", response_model=schemas.CustomItemOut, status_code=status.HTTP_201_CREATED, tags=["Inventory"], summary="Добавить произвольный предмет")
async def add_character_custom_item(
    character_id: int,
    item_in: schemas.CustomItemCreate,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    db_item = custom_item_crud.add_custom_item(db, character_id, current_user.id, item_in)
    if db_item is None: raise HTTPException(status_code=400, detail="Не удалось добавить предмет")
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return db_item # Return the created/updated custom item

@router.delete("/{character_id}/custom_items/{custom_item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Inventory"], summary="Удалить произвольный предмет")
async def delete_character_custom_item(
    character_id: int,
    custom_item_id: int,
    quantity: int = Query(1, ge=1),
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    success = custom_item_crud.remove_custom_item(db, custom_item_id, character_id, current_user.id, quantity)
    if not success: raise HTTPException(status_code=404, detail="Произвольный предмет не найден")
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return None

# --- Эндпоинты Статус-Эффектов ---
@router.post("/{character_id}/status_effects", response_model=schemas.CharacterDetailedOut, tags=["Status Effects"], summary="Применить статус-эффект")
async def apply_status_effect_to_character(
    character_id: int,
    status_update: schemas.StatusEffectUpdate,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    # Fetch character with effects preloaded for modification
    db_char = db.query(models.Character).options(selectinload(models.Character.active_status_effects)).filter(models.Character.id == character_id, models.Character.owner_id == current_user.id).first()
    if not db_char: raise HTTPException(status_code=404, detail="Персонаж не найден")

    added_effect_name = character_crud.apply_status_effect(db, db_char, status_update.status_effect_id)

    if added_effect_name is not None:
        try:
            db.commit() # Commit the change
        except Exception as e:
            db.rollback()
            logger.error(f"DB Error applying status effect {status_update.status_effect_id} to char {character_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Ошибка БД при применении статуса: {e}")

    # Fetch updated details *after* commit
    updated_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if updated_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные после применения статуса")

    # --- Broadcast Logic ---
    await _broadcast_update_if_needed(lobby_key, updated_details) # <-- Broadcast
    # --- End Broadcast ---

    return updated_details

@router.delete("/{character_id}/status_effects/{status_effect_id}", response_model=schemas.CharacterDetailedOut, tags=["Status Effects"], summary="Снять статус-эффект")
async def remove_status_effect_from_character(
    character_id: int,
    status_effect_id: int,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    updated_char_model = character_crud.remove_status_effect(db, character_id, current_user.id, status_effect_id)
    if updated_char_model is None: raise HTTPException(status_code=404, detail="Персонаж или статус-эффект не найден")
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные")
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return character_details

# --- Эндпоинты Лечения и Отдыха ---
@router.post("/{character_id}/heal", response_model=schemas.CharacterDetailedOut, summary="Выполнить лечение персонажа")
async def heal_character_endpoint(
    character_id: int,
    heal_request: schemas.HealRequest,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    # heal_character already commits changes internally
    updated_char_model = character_crud.heal_character(db=db, character_id=character_id, user_id=current_user.id, heal_request=heal_request)
    if updated_char_model is None: raise HTTPException(status_code=500, detail="Неожиданная ошибка при лечении") # Should not happen if char exists
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные после лечения")
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return character_details

@router.post("/{character_id}/short_rest", response_model=schemas.CharacterDetailedOut, tags=["Rest"], summary="Выполнить короткий отдых")
async def take_short_rest(
    character_id: int,
    rest_request: schemas.ShortRestRequest,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    # perform_short_rest commits changes
    updated_char = character_crud.perform_short_rest(db=db, character_id=character_id, user_id=current_user.id, request=rest_request)
    if updated_char is None: raise HTTPException(status_code=404, detail="Персонаж не найден") # Should be handled by crud
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные после короткого отдыха")
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return character_details

@router.post("/{character_id}/long_rest", response_model=schemas.CharacterDetailedOut, tags=["Rest"], summary="Выполнить длительный отдых")
async def take_long_rest(
    character_id: int,
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    # perform_long_rest commits changes
    updated_char = character_crud.perform_long_rest(db=db, character_id=character_id, user_id=current_user.id)
    if updated_char is None: raise HTTPException(status_code=404, detail="Персонаж не найден") # Should be handled by crud
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные после длительного отдыха")
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return character_details

# --- Эндпоинты Действий и Проверок ---
@router.post("/{character_id}/activate", response_model=schemas.ActionResultOut, tags=["Actions"], summary="Активировать способность или использовать предмет")
async def activate_character_action_endpoint(
    character_id: int = Path(..., title="ID персонажа"),
    activation_data: schemas.ActivationRequest = Body(...),
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Already has lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    # activate_action handles commit and refresh internally
    result = action_crud.activate_action(db=db, character_id=character_id, user_id=current_user.id, activation_data=activation_data)

    # --- Broadcast Logic (already partially present) ---
    # Broadcast only if the action indicated an update is needed
    if result and result.success and result.character_update_needed:
        # Fetch fresh details AFTER the action's commit
        updated_character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
        await _broadcast_update_if_needed(lobby_key, updated_character_details) # <-- Broadcast
    # --- End Broadcast ---

    # Return the action result (which might contain details but not necessarily the full character state)
    return result

@router.post("/{character_id}/skill_check", response_model=SkillCheckResultOut, tags=["Skill Checks"], summary="Выполнить проверку навыка")
async def perform_character_skill_check(
    character_id: int,
    request: SkillCheckRequest,
    # lobby_key: Optional[str] = Query(None), # Skill checks usually don't change state to broadcast
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)):
    # Preload necessary relations for the check
    character = db.query(models.Character).options(
        selectinload(models.Character.active_status_effects),
        selectinload(models.Character.inventory).selectinload(models.CharacterInventoryItem.item)
    ).filter(models.Character.id == character_id, models.Character.owner_id == current_user.id).first()
    if not character: raise HTTPException(status_code=404, detail="Персонаж не найден")

    result = perform_skill_check(db=db, character=character, skill_name=request.skill_name)
    # No broadcast needed for a simple check result
    if not result.success:
        if "Неизвестный навык" in result.message: raise HTTPException(status_code=400, detail=result.message)
        else: raise HTTPException(status_code=500, detail=result.message)
    return result

# --- Эндпоинты Управления Слотами Способностей ---
@router.put("/{character_id}/active_abilities/{slot_number}", response_model=schemas.CharacterDetailedOut, tags=["Abilities & Slots"], summary="Назначить/очистить способность в слоте")
async def set_character_ability_slot(
    character_id: int = Path(...),
    slot_number: int = Path(..., ge=1, le=5),
    assignment_data: schemas.AssignAbilitySlotRequest = Body(...),
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Добавлен lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    # assign_ability_to_slot commits changes
    updated_char = slots_crud.assign_ability_to_slot(db=db, character_id=character_id, user_id=current_user.id, slot_number=slot_number, ability_id=assignment_data.ability_id)
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные после назначения слота")
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return character_details

# --- Эндпоинт Завершения Хода ---
@router.post("/{character_id}/end_turn", response_model=schemas.CharacterDetailedOut, tags=["Actions"], summary="Завершить ход персонажа")
async def end_character_turn_endpoint(
    character_id: int = Path(...),
    lobby_key: Optional[str] = Query(None, description="Ключ лобби для WebSocket broadcast"), # <-- Already has lobby_key
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    # end_character_turn commits changes
    updated_char = turn_crud.end_character_turn(db=db, character_id=character_id, user_id=current_user.id)
    # --- Broadcast Logic ---
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None: raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные после завершения хода")
    await _broadcast_update_if_needed(lobby_key, character_details) # <-- Broadcast
    # --- End Broadcast ---
    return character_details

