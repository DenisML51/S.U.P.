# backend/app/routers/characters.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Path
from sqlalchemy.orm import Session, selectinload # Добавлен selectinload
from typing import List, Any, Optional

# Относительные импорты
from .. import models, schemas
# Импортируем нужные CRUD модули
from ..crud import character as character_crud
from ..crud import item as item_crud
from ..crud import action as action_crud
from ..crud import character_slots as slots_crud
from ..crud import character_turn as turn_crud
from ..db.database import get_db
from ..core.auth import get_current_user, logger
from ..schemas import ( # Импортируем нужные схемы явно
    CharacterBriefOut, CharacterCreate, CharacterDetailedOut, CharacterUpdateSkills,
    LevelUpInfo, UpdateCharacterStats, CharacterNotes, HealRequest, ShortRestRequest,
    CharacterInventoryItemOut, AddItemToInventory, EquipItem, StatusEffectUpdate,
    ActionResultOut, CustomItemCreate, CustomItemOut, SkillCheckRequest, SkillCheckResultOut,
    AssignAbilitySlotRequest # <-- НОВАЯ СХЕМА
)
from ..websockets import manager

try:
    from ..crud import custom_item as custom_item_crud
    from ..schemas import CustomItemCreate, CustomItemOut # Импорт схем
except ImportError:
    # Обработка, если custom_item_crud не создан как отдельный файл
    custom_item_crud = item_crud # Пример, если функции в item_crud
    from ..schemas import CustomItemCreate, CustomItemOut

try:
    # Пытаемся импортировать новую функцию из нового файла
    from ..crud.skill_check import perform_skill_check
    from ..schemas.skill_check import SkillCheckRequest, SkillCheckResultOut
except ImportError:
    # Если вдруг оставили логику в action.py (не рекомендуется)
    from ..crud.action import perform_skill_check
    from ..schemas.action import SkillCheckRequest, SkillCheckResultOut
    print("Warning: Using perform_skill_check from action.py instead of skill_check.py")

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


@router.post("/{character_id}/heal", response_model=schemas.CharacterDetailedOut, summary="Выполнить лечение персонажа")
async def heal_character_endpoint(
    character_id: int,
    heal_request: schemas.HealRequest, # Используем новую схему запроса
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Применяет лечение к персонажу от указанного источника (medkit, short_rest_die).
    Броски кубиков выполняются на бэкенде.
    """
    # Вызываем новую CRUD функцию
    updated_char_model = character_crud.heal_character(
        db=db,
        character_id=character_id,
        user_id=current_user.id,
        heal_request=heal_request
    )

    # heal_character выбрасывает исключения при ошибках,
    # но на всякий случай проверим, если он вернет None (хотя не должен)
    if updated_char_model is None:
        # Эта ветка не должна достигаться при текущей логике heal_character
        raise HTTPException(status_code=500, detail="Неожиданная ошибка при обработке лечения")

    # Возвращаем обновленные полные данные персонажа
    # Используем существующую функцию для форматирования ответа
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None:
         # Это тоже маловероятно, если персонаж только что был обновлен
         raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные персонажа после лечения")

    return character_details


@router.post("/{character_id}/short_rest", response_model=schemas.CharacterDetailedOut, tags=["Rest"], summary="Выполнить короткий отдых")
async def take_short_rest(
    character_id: int,
    rest_request: schemas.ShortRestRequest, # Используем новую схему
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Персонаж тратит указанное количество Очков Стойкости (ОС) для восстановления
    ПЗ (d10 + Мод.Вын за каждое ОС) и ПУ (1d4).
    """
    updated_char = character_crud.perform_short_rest(
        db=db,
        character_id=character_id,
        user_id=current_user.id,
        request=rest_request
    )
    # CRUD функция выбрасывает исключения при ошибках
    # Возвращаем полные обновленные данные
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None:
         raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные персонажа после короткого отдыха")
    return character_details


@router.post("/{character_id}/long_rest", response_model=schemas.CharacterDetailedOut, tags=["Rest"], summary="Выполнить длительный отдых")
async def take_long_rest(
    character_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Персонаж выполняет длительный отдых: восстанавливает все ПЗ и ОС,
    сбрасывает ПУ до базового, снижает Истощение на 1.
    """
    updated_char = character_crud.perform_long_rest(
        db=db,
        character_id=character_id,
        user_id=current_user.id
    )
    # CRUD функция выбрасывает исключения при ошибках
    # Возвращаем полные обновленные данные
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None:
         raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные персонажа после длительного отдыха")
    return character_details


@router.post("/{character_id}/activate", response_model=schemas.ActionResultOut, tags=["Actions"], summary="Активировать способность или использовать предмет")
async def activate_character_action_endpoint(
    character_id: int = Path(..., title="ID персонажа"),
    activation_data: schemas.ActivationRequest = Body(...),
    lobby_key: Optional[str] = Query(None, description="Ключ лобби (для отправки обновления через WebSocket)"), # <-- НОВЫЙ ПАРАМЕТР
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Эндпоинт для выполнения действий персонажа: использование предмета или активация способности.
    Возвращает результат действия. Если указан lobby_key, отправляет обновление персонажа через WS.
    """
    result = action_crud.activate_action( # Используем функцию из crud/action.py
        db=db,
        character_id=character_id,
        user_id=current_user.id,
        activation_data=activation_data
    )
    # action_crud.activate_action теперь выбрасывает HTTPException при ошибках

    # --- НОВОЕ: Отправка обновления через WebSocket, если нужно ---
    if result and result.success and result.character_update_needed and lobby_key:
        logger.info(f"Action successful, broadcasting update to lobby '{lobby_key}'...")
        # Получаем актуальные данные персонажа ПОСЛЕ действия
        updated_character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
        if updated_character_details:
            try:
                # Используем model_dump() для Pydantic v2+
                await manager.broadcast_character_update(lobby_key, updated_character_details.model_dump(mode='json'))
                logger.info(f"Broadcast successful for char {character_id} in lobby {lobby_key}.")
            except Exception as e:
                logger.error(f"Failed to broadcast character update after action for char {character_id} in lobby {lobby_key}: {e}", exc_info=True)
                # Не прерываем HTTP ответ из-за ошибки сокета
        else:
             logger.error(f"Could not get updated character details for broadcast after action. CharID: {character_id}")
    # --- КОНЕЦ НОВОГО ---

    return result # Возвращаем результат самого действия


@router.post(
    "/{character_id}/custom_items",
    response_model=schemas.CustomItemOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Inventory"], # Можно добавить тег "Custom Items"
    summary="Добавить произвольный предмет в инвентарь"
)
async def add_character_custom_item(
    character_id: int,
    item_in: schemas.CustomItemCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Добавляет новый произвольный предмет или увеличивает количество существующего с тем же именем."""
    db_item = custom_item_crud.add_custom_item(db, character_id, current_user.id, item_in)
    if db_item is None:
        # Ошибка могла быть из-за ненахождения персонажа или ошибки БД
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Не удалось добавить предмет")
    return db_item

@router.delete(
    "/{character_id}/custom_items/{custom_item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Inventory"],
    summary="Удалить произвольный предмет из инвентаря"
)
async def delete_character_custom_item(
    character_id: int,
    custom_item_id: int,
    quantity: int = Query(1, ge=1, description="Количество удаляемых предметов"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удаляет указанное количество произвольного предмета или всю запись, если количество >= текущему."""
    success = custom_item_crud.remove_custom_item(db, custom_item_id, character_id, current_user.id, quantity)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Произвольный предмет не найден или не принадлежит вам")
    return None # Возвращаем пустой ответ 204


@router.post("/{character_id}/skill_check",
             response_model=SkillCheckResultOut,
             tags=["Skill Checks"],
             summary="Выполнить проверку навыка")
async def perform_character_skill_check(
    character_id: int,
    request: SkillCheckRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Выполняет проверку навыка, учитывая моды, эффекты и бонусы от предметов.
    """
    # --- ИЗМЕНЕНИЕ: Добавляем загрузку инвентаря ---
    character = db.query(models.Character).options(
         selectinload(models.Character.active_status_effects),
         selectinload(models.Character.inventory).selectinload(models.CharacterInventoryItem.item) # <-- ЗАГРУЖАЕМ ИНВЕНТАРЬ
    ).filter(
        models.Character.id == character_id,
        models.Character.owner_id == current_user.id
    ).first()
    # --- КОНЕЦ ИЗМЕНЕНИЯ ---

    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден")

    # Вызываем функцию логики
    result = perform_skill_check(db=db, character=character, skill_name=request.skill_name)

    if not result.success:
        # ... (обработка ошибок как была) ...
        if "Неизвестный навык" in result.message: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.message)
        else: raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result.message)

    return result


@router.put(
    "/{character_id}/active_abilities/{slot_number}",
    response_model=schemas.CharacterDetailedOut, # Возвращаем обновленного персонажа
    tags=["Abilities & Slots"],
    summary="Назначить или очистить способность в активном слоте"
)
async def set_character_ability_slot(
    character_id: int = Path(..., title="ID персонажа"),
    slot_number: int = Path(..., title="Номер слота", ge=1, le=5),
    assignment_data: schemas.AssignAbilitySlotRequest = Body(...), # Принимаем ID способности в теле
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Назначает способность (по ID) в указанный активный слот (1-5) персонажа.
    Если в теле запроса передать `ability_id: null` или не передать его, слот будет очищен.
    """
    # Вызываем CRUD функцию, передавая ability_id из тела запроса
    updated_char = slots_crud.assign_ability_to_slot(
        db=db,
        character_id=character_id,
        user_id=current_user.id,
        slot_number=slot_number,
        ability_id=assignment_data.ability_id # Передаем ID или None
    )
    # Возвращаем полные обновленные данные (требует доработки get_character_details_for_output)
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None:
        # Это маловероятно, но на всякий случай
        raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные персонажа после изменения слота")
    return character_details

@router.post(
    "/{character_id}/end_turn",
    response_model=schemas.CharacterDetailedOut, # Возвращаем обновленного персонажа
    tags=["Actions"],
    summary="Завершить ход персонажа (уменьшить кулдауны)"
)
async def end_character_turn_endpoint(
    character_id: int = Path(..., title="ID персонажа"),
    current_user: models.User = Depends(get_current_user),
    lobby_key: Optional[str] = Query(None, description="Ключ лобби (если действие происходит в лобби)"),
    db: Session = Depends(get_db)
):
    """
    Завершает ход персонажа, уменьшая на 1 все активные кулдауны способностей в слотах.
    """
    updated_char = turn_crud.end_character_turn(
        db=db,
        character_id=character_id,
        user_id=current_user.id
    )
    # Возвращаем полные обновленные данные (требует доработки get_character_details_for_output)
    character_details = character_crud.get_character_details_for_output(db, character_id, current_user.id)
    if character_details is None:
        raise HTTPException(status_code=404, detail="Не удалось получить обновленные данные персонажа после завершения хода")

    if lobby_key:
        try:
            await manager.broadcast_character_update(lobby_key, character_details.model_dump(mode='json'))
        except Exception as e:
            logger.error(f"Failed to broadcast character update for char {character_id} in lobby {lobby_key}: {e}", exc_info=True)
            # Не прерываем основной ответ из-за ошибки сокета
    # --- КОНЕЦ НОВОГО ---
    return character_details