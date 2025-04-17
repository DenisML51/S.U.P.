from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, selectinload
from datetime import timedelta
from jose import jwt, JWTError
import uvicorn
from typing import List, Optional


from . import models, schemas, crud, auth
from .database import engine, SessionLocal, Base
from .websocket_manager import manager # Предполагаем, что он есть

# Создание таблиц при запуске (если их нет)
# Используйте Alembic для миграций в продакшене
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Осознание API",
    description="API для управления персонажами и партиями в игре Осознание",
    version="0.2.0" # Обновим версию
)

# Настройка CORS
origins = [
    "http://localhost",
    "http://localhost:3000", # Стандартный порт для React dev server
    # Добавьте другие источники (frontend URL) при необходимости
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Схема аутентификации
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login") # Эндпоинт для получения токена

# Зависимость для получения сессии базы данных
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Зависимость для получения текущего пользователя
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверные данные аутентификации",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

# --- Эндпоинты Аутентификации ---

@app.post("/register", response_model=schemas.UserOut, tags=["Auth"], summary="Регистрация нового пользователя")
async def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Регистрирует нового пользователя в системе."""
    return crud.create_user(db, user_in)

@app.post("/login", response_model=schemas.Token, tags=["Auth"], summary="Вход пользователя")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Аутентифицирует пользователя и возвращает JWT токен."""
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, # Используем 401 для неверных данных
            detail="Неверный логин или пароль"
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserOut, tags=["Users"], summary="Получить информацию о себе")
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    """Возвращает информацию о текущем аутентифицированном пользователе."""
    return current_user

# --- Эндпоинты Персонажей ---

@app.post("/characters", response_model=schemas.CharacterBriefOut, status_code=status.HTTP_201_CREATED, tags=["Characters"], summary="Создать нового персонажа")
async def create_new_character(
    character_in: schemas.CharacterCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создает нового персонажа для текущего пользователя."""
    db_char = crud.create_character(db, current_user.id, character_in)
    # Возвращаем краткую информацию после создания
    return schemas.CharacterBriefOut.from_orm(db_char)

@app.get("/characters", response_model=List[schemas.CharacterBriefOut], tags=["Characters"], summary="Получить список своих персонажей")
async def get_my_characters(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Возвращает список краткой информации о персонажах текущего пользователя."""
    return crud.get_characters_by_user(db, current_user.id)

@app.get("/characters/{character_id}", response_model=schemas.CharacterDetailedOut, tags=["Characters"], summary="Получить детали персонажа")
async def get_character_details_endpoint( # Переименовано для ясности
    character_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Возвращает детальную информацию о конкретном персонаже пользователя."""
    character = crud.get_character_details_for_output(db, character_id, current_user.id)
    if character is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return character

@app.put("/characters/{character_id}/skills", response_model=schemas.CharacterDetailedOut, tags=["Characters"], summary="Обновить навыки персонажа")
async def update_character_skills_endpoint(
    character_id: int,
    skill_updates: schemas.CharacterUpdateSkills,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновляет базовые значения навыков персонажа (1-10)."""
    updated_char = crud.update_character_skills(db, character_id, current_user.id, skill_updates)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    # Возвращаем обновленные полные данные
    return crud.get_character_details_for_output(db, character_id, current_user.id)

@app.post("/characters/{character_id}/levelup", response_model=schemas.CharacterDetailedOut, tags=["Characters"], summary="Повысить уровень персонажа")
async def level_up_character_endpoint(
    character_id: int,
    level_up_data: schemas.LevelUpInfo,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Повышает уровень персонажа на 1, распределяет полученные очки и обновляет способности."""
    # Проверка на возможность повышения уровня (например, по XP) должна быть сделана ДО вызова этого эндпоинта
    leveled_up_char = crud.level_up_character(db, character_id, current_user.id, level_up_data)
    if leveled_up_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    # Возвращаем обновленные полные данные
    return crud.get_character_details_for_output(db, character_id, current_user.id)


@app.put("/characters/{character_id}/stats", response_model=schemas.CharacterDetailedOut, tags=["Characters"], summary="Обновить текущие статы персонажа")
async def update_character_stats_endpoint(
    character_id: int,
    stats_update: schemas.UpdateCharacterStats,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновляет текущие изменяемые характеристики персонажа (HP, PU, OS, XP, Exhaustion)."""
    updated_char = crud.update_character_stats(db, character_id, current_user.id, stats_update)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return crud.get_character_details_for_output(db, character_id, current_user.id)

@app.put("/characters/{character_id}/notes", response_model=schemas.CharacterDetailedOut, tags=["Characters"], summary="Обновить заметки персонажа")
async def update_character_notes_endpoint(
    character_id: int,
    notes_update: schemas.CharacterNotes,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновляет описательные заметки персонажа (внешность, характер и т.д.)."""
    updated_char = crud.update_character_notes(db, character_id, current_user.id, notes_update)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return crud.get_character_details_for_output(db, character_id, current_user.id)

# --- Эндпоинты Инвентаря ---

@app.post("/characters/{character_id}/inventory", response_model=schemas.CharacterInventoryItemOut, status_code=status.HTTP_201_CREATED, tags=["Inventory"], summary="Добавить предмет в инвентарь")
async def add_item_to_character_inventory(
    character_id: int,
    item_add: schemas.AddItemToInventory,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Добавляет предмет (по ID из справочника) в инвентарь персонажа."""
    inv_item = crud.add_item_to_inventory(db, character_id, current_user.id, item_add)
    if inv_item is None:
         # crud вернет None если персонаж не найден/не принадлежит юзеру
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")

    # Нужно снова загрузить предмет для корректного ответа с полиморфизмом
    db.refresh(inv_item, attribute_names=['item'])

    # Формируем ответный Pydantic объект
    item_data = inv_item.item # Загруженный Item
    item_schema: Any = None # Используем Any для Union
    if isinstance(item_data, models.Weapon): item_schema = schemas.WeaponOut.from_orm(item_data)
    elif isinstance(item_data, models.Armor): item_schema = schemas.ArmorOut.from_orm(item_data)
    elif isinstance(item_data, models.Shield): item_schema = schemas.ShieldOut.from_orm(item_data)
    elif isinstance(item_data, models.GeneralItem): item_schema = schemas.GeneralItemOut.from_orm(item_data)
    elif isinstance(item_data, models.Ammo): item_schema = schemas.AmmoOut.from_orm(item_data)
    else: item_schema = schemas.ItemBase.from_orm(item_data)

    if item_schema is None: # Обработка случая, если тип не определился
        raise HTTPException(status_code=500, detail="Не удалось определить тип добавленного предмета")


    return schemas.CharacterInventoryItemOut(id=inv_item.id, item=item_schema, quantity=inv_item.quantity)

@app.delete("/characters/{character_id}/inventory/{inventory_item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Inventory"], summary="Удалить предмет из инвентаря")
async def remove_item_from_character_inventory(
    character_id: int,
    inventory_item_id: int,
    quantity: int = Query(1, ge=1, description="Количество удаляемых предметов"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удаляет предмет (или его часть по ID записи инвентаря) из инвентаря персонажа."""
    success = crud.remove_item_from_inventory(db, inventory_item_id, character_id, current_user.id, quantity)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет инвентаря не найден или не принадлежит персонажу")
    # При успехе возвращаем 204 No Content, тело ответа не нужно
    return None

@app.put("/characters/{character_id}/equipment", response_model=schemas.CharacterDetailedOut, tags=["Inventory"], summary="Экипировать предмет")
async def equip_item_for_character(
    character_id: int,
    equip_data: schemas.EquipItem,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Экипирует предмет из инвентаря (по ID записи инвентаря) в указанный слот (armor, shield, weapon1, weapon2)."""
    updated_char_model = crud.equip_item(db, character_id, current_user.id, equip_data)
    if updated_char_model is None:
        # Эта проверка дублируется внутри equip_item, но оставим для ясности
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    # Возвращаем обновленные полные данные
    return crud.get_character_details_for_output(db, character_id, current_user.id)


@app.delete("/characters/{character_id}/equipment/{slot}", response_model=schemas.CharacterDetailedOut, tags=["Inventory"], summary="Снять предмет с экипировки")
async def unequip_item_for_character(
    character_id: int,
    slot: str, # FastAPI автоматически проверит enum из пути, если он определен в Pydantic
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Снимает предмет с указанного слота экипировки (armor, shield, weapon1, weapon2)."""
    # Валидация слота происходит в crud.unequip_item
    updated_char_model = crud.unequip_item(db, character_id, current_user.id, slot)
    if updated_char_model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    # Возвращаем обновленные полные данные
    return crud.get_character_details_for_output(db, character_id, current_user.id)

# --- Эндпоинты Статус-Эффектов ---

@app.post("/characters/{character_id}/status_effects", response_model=schemas.CharacterDetailedOut, tags=["Status Effects"], summary="Применить статус-эффект")
async def apply_status_effect_to_character(
    character_id: int,
    status_update: schemas.StatusEffectUpdate, # Pydantic модель, содержащая status_effect_id
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Применяет статус-эффект (по ID из справочника) к персонажу."""

    # 1. Получить объект персонажа (загружаем связь со статусами, т.к. crud.apply_status_effect ее проверяет)
    # Используем selectinload для эффективности загрузки списка эффектов
    db_char = db.query(models.Character).options(
        selectinload(models.Character.active_status_effects)
    ).filter(
        models.Character.id == character_id,
        models.Character.owner_id == current_user.id
    ).first()

    # Проверка, найден ли персонаж и принадлежит ли он пользователю
    if not db_char:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")

    # 2. Извлечь ID эффекта из Pydantic модели
    status_effect_id_to_apply = status_update.status_effect_id

    # 3. Вызвать CRUD-функцию с правильными аргументами
    # Эта функция вернет имя эффекта, если он был успешно добавлен, иначе None
    added_effect_name = crud.apply_status_effect(
        db=db,
        character=db_char, # Передаем объект персонажа
        status_effect_id=status_effect_id_to_apply # Передаем ID эффекта
    )

    # 4. Сохранить изменения, если эффект был добавлен
    if added_effect_name is not None:
        try:
            db.commit()
            print(f"Статус-эффект '{added_effect_name}' успешно применен и сохранен для персонажа ID {character_id}")
             # Не обязательно делать refresh здесь, т.к. get_character_details_for_output ниже все равно запросит свежие данные
        except Exception as e:
            db.rollback()
            print(f"Ошибка при сохранении статус-эффекта для персонажа ID {character_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка базы данных при применении эффекта: {e}")
    else:
         # Если эффект не был добавлен (уже есть или не найден), коммит не нужен.
         # Можно добавить логирование или специфический ответ, если нужно.
         print(f"Статус-эффект ID {status_effect_id_to_apply} не был добавлен для персонажа ID {character_id} (возможно, уже есть или не найден).")


    # 5. Вернуть обновленные полные данные персонажа
    # Эта функция заново запросит данные из БД, включая только что добавленный статус (если был commit)
    updated_character_details = crud.get_character_details_for_output(db, character_id, current_user.id)

    # Дополнительная проверка на случай, если get_character_details_for_output вернет None
    # (хотя это маловероятно, если персонаж был найден на шаге 1)
    if updated_character_details is None:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не удалось получить обновленные данные персонажа после применения эффекта")

    return updated_character_details


@app.delete("/characters/{character_id}/status_effects/{status_effect_id}", response_model=schemas.CharacterDetailedOut, tags=["Status Effects"], summary="Снять статус-эффект")
async def remove_status_effect_from_character(
    character_id: int,
    status_effect_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Снимает статус-эффект (по ID) с персонажа."""
    # В crud.remove_status_effect уже есть логика поиска персонажа и эффекта,
    # а также commit при успешном удалении.
    updated_char_model = crud.remove_status_effect(db, character_id, current_user.id, status_effect_id)

    # crud.remove_status_effect возвращает обновленный Character или None
    if updated_char_model is None:
        # Либо персонаж не найден, либо эффект не был найден/применен к нему
         # Можно добавить более точную обработку ошибок, если crud.remove_status_effect будет их различать,
         # но пока достаточно базовой 404.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж или статус-эффект не найден, или эффект не применен к этому персонажу")

    # Возвращаем обновленные полные данные, используя ту же функцию, что и везде
    return crud.get_character_details_for_output(db, character_id, current_user.id)


# --- Эндпоинты Справочников (Reference Data) ---
# Оборачиваем функции crud в эндпоинты

@app.get("/data/weapons", response_model=List[schemas.WeaponOut], tags=["Reference Data"], summary="Список всего оружия")
def get_all_weapons_endpoint(db: Session = Depends(get_db)):
    items = crud.get_all_items(db, models.Weapon)
    return items # Pydantic автоматически преобразует

@app.get("/data/armor", response_model=List[schemas.ArmorOut], tags=["Reference Data"], summary="Список всей брони")
def get_all_armor_endpoint(db: Session = Depends(get_db)):
    items = crud.get_all_items(db, models.Armor)
    return items

@app.get("/data/shields", response_model=List[schemas.ShieldOut], tags=["Reference Data"], summary="Список всех щитов")
def get_all_shields_endpoint(db: Session = Depends(get_db)):
    items = crud.get_all_items(db, models.Shield)
    return items

@app.get("/data/general_items", response_model=List[schemas.GeneralItemOut], tags=["Reference Data"], summary="Список общих предметов")
def get_all_general_items_endpoint(db: Session = Depends(get_db)):
    items = crud.get_all_items(db, models.GeneralItem)
    return items

@app.get("/data/ammo", response_model=List[schemas.AmmoOut], tags=["Reference Data"], summary="Список типов боеприпасов")
def get_all_ammo_endpoint(db: Session = Depends(get_db)):
    items = crud.get_all_items(db, models.Ammo)
    return items

@app.get("/data/abilities", response_model=List[schemas.AbilityOut], tags=["Reference Data"], summary="Список всех способностей")
def get_all_abilities_endpoint(db: Session = Depends(get_db)):
    abilities = crud.get_all_abilities(db)
    return abilities

@app.get("/data/status_effects", response_model=List[schemas.StatusEffectOut], tags=["Reference Data"], summary="Список всех статус-эффектов")
def get_all_status_effects_endpoint(db: Session = Depends(get_db)):
    effects = crud.get_all_status_effects(db)
    return effects

# --- Эндпоинты Партий (Лобби) ---

@app.post("/parties", response_model=schemas.PartyOut, tags=["Parties"], summary="Создать новую партию")
async def create_new_party(
    party_in: schemas.PartyCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создает новую партию (лобби) и возвращает ее данные, включая ключ."""
    party = crud.create_party(db, current_user.id, party_in)
    return party # crud.create_party уже возвращает PartyOut

@app.post("/parties/join", response_model=schemas.PartyOut, tags=["Parties"], summary="Присоединиться к партии")
async def join_existing_party(
    join_data: schemas.PartyJoin,
    current_user: models.User = Depends(get_current_user), # Текущий пользователь тоже нужен
    db: Session = Depends(get_db)
):
    """Позволяет пользователю присоединиться к существующей партии по ключу лобби."""
    party = crud.get_party_by_lobby_key(db, join_data.lobby_key.upper()) # Приводим ключ к верхнему регистру
    if party is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Лобби не найдено")

    # TODO: Добавить проверку на максимальное количество игроков, если используется WebSocket менеджер
    # players_in_lobby = manager.get_lobby_user_count(party.lobby_key)
    # if players_in_lobby >= party.max_players:
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Лобби заполнено")

    if not party.creator: # Проверка, если создатель был удален
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не найден создатель лобби")

    return schemas.PartyOut(
        id=party.id,
        lobby_key=party.lobby_key,
        max_players=party.max_players,
        creator_username=party.creator.username
    )

# --- WebSocket Эндпоинт ---
# (Код WebSocket остается без изменений, если не требуется передавать специфичные для персонажа данные)
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    lobbyKey: str = Query(...),
    masterUsername: str = Query(...),
    maxPlayers: str = Query(...)
):
    """WebSocket эндпоинт для обмена сообщениями в реальном времени внутри лобби."""
    # Проверка токена
    try:
        user = await get_current_user(token=token, db=next(get_db())) # Получаем пользователя
        username = user.username
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return
    except Exception: # Ловим другие ошибки при получении пользователя
         await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Server error during authentication")
         return

    # Проверка maxPlayers
    try:
        max_players_int = int(maxPlayers)
    except ValueError:
        await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason="Invalid maxPlayers format")
        return

    # Подключение к менеджеру
    await manager.connect(websocket, lobbyKey.upper(), username)
    # Отправка начального состояния лобби всем участникам
    await manager.send_players_update(lobbyKey.upper(), masterUsername, max_players_int)

    try:
        while True:
            data = await websocket.receive_text()
            # TODO: Добавить обработку структурированных сообщений
            # (броски кубиков, использование способностей, обновление статов и т.д.)
            # Сейчас просто транслируем как чат
            await manager.broadcast(lobbyKey.upper(), f"{username}: {data}")
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user {username} in lobby {lobbyKey.upper()}")
        manager.disconnect(websocket, lobbyKey.upper())
        # Оповещение об отключении и обновление списка игроков
        await manager.broadcast(lobbyKey.upper(), f"Система: {username} отключился")
        await manager.send_players_update(lobbyKey.upper(), masterUsername, max_players_int)
    except Exception as e:
        # Логгирование других ошибок вебсокета
        print(f"WebSocket Error in lobby {lobbyKey.upper()} for user {username}: {e}")
        manager.disconnect(websocket, lobbyKey.upper())
        # Попытка обновить список игроков даже при ошибке
        try:
            await manager.send_players_update(lobbyKey.upper(), masterUsername, max_players_int)
        except Exception as update_e:
             print(f"Error sending player update after WebSocket error: {update_e}")
        # Можно закрыть соединение с кодом ошибки, если WebSocket еще активен
        # await websocket.close(code=status.WS_1011_INTERNAL_ERROR)


# --- Запуск приложения (если запускается напрямую) ---
# if __name__ == "__main__":
#     uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)