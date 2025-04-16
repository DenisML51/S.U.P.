from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import jwt, JWTError
import uvicorn
from typing import List, Optional

from . import models, schemas, crud, auth
from .database import engine, SessionLocal, Base
from .websocket_manager import manager

# Создание таблиц при запуске (если их нет)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Осознание API", description="API для управления персонажами и партиями в игре Осознание")

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
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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

@app.post("/register", response_model=schemas.UserOut, tags=["Auth"])
async def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Регистрация нового пользователя."""
    if crud.get_user_by_username(db, username=user_in.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким именем уже существует")
    user = crud.create_user(db, user_in)
    return user

@app.post("/login", response_model=schemas.Token, tags=["Auth"])
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Вход пользователя и получение JWT токена."""
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный логин или пароль")
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserOut, tags=["Users"])
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    """Получение информации о текущем пользователе."""
    return current_user

# --- Эндпоинты Персонажей ---

@app.post("/characters", response_model=schemas.CharacterBriefOut, status_code=status.HTTP_201_CREATED, tags=["Characters"])
async def create_new_character(character_in: schemas.CharacterCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_char = crud.create_character(db, current_user.id, character_in)
    return schemas.CharacterBriefOut.from_orm(db_char)

@app.get("/characters", response_model=List[schemas.CharacterBriefOut], tags=["Characters"])
async def get_my_characters(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка краткой информации о персонажах текущего пользователя."""
    return crud.get_characters_by_user(db, current_user.id)


@app.get("/characters/{character_id}", response_model=schemas.CharacterDetailedOut, tags=["Characters"])
async def get_character_details(
    character_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение детальной информации о конкретном персонаже пользователя."""
    character = crud.get_character_details_for_output(db, character_id, current_user.id)
    if character is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return character

@app.put("/characters/{character_id}/skills", response_model=schemas.CharacterDetailedOut, tags=["Characters"])
async def update_character_skills_endpoint(
    character_id: int,
    skill_updates: schemas.CharacterUpdateSkills,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновление навыков персонажа."""
    updated_char = crud.update_character_skills(db, character_id, current_user.id, skill_updates)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    # Возвращаем обновленные полные данные
    return crud.get_character_details_for_output(db, character_id, current_user.id)


@app.post("/characters/{character_id}/levelup", response_model=schemas.CharacterDetailedOut, tags=["Characters"])
async def level_up_character_endpoint(
    character_id: int,
    level_up_data: schemas.LevelUpInfo,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Повышение уровня персонажа."""
    # TODO: Добавить проверку, достаточно ли у персонажа XP для левел-апа
    leveled_up_char = crud.level_up_character(db, character_id, current_user.id, level_up_data)
    if leveled_up_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return crud.get_character_details_for_output(db, character_id, current_user.id)


@app.put("/characters/{character_id}/stats", response_model=schemas.CharacterDetailedOut, tags=["Characters"])
async def update_character_stats_endpoint(
    character_id: int,
    stats_update: schemas.UpdateCharacterStats,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновление текущих статов персонажа (HP, PU, OS, XP, Exhaustion)."""
    updated_char = crud.update_character_stats(db, character_id, current_user.id, stats_update)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return crud.get_character_details_for_output(db, character_id, current_user.id)


@app.put("/characters/{character_id}/notes", response_model=schemas.CharacterDetailedOut, tags=["Characters"])
async def update_character_notes_endpoint(
    character_id: int,
    notes_update: schemas.CharacterNotes,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновление описательных заметок персонажа."""
    updated_char = crud.update_character_notes(db, character_id, current_user.id, notes_update)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return crud.get_character_details_for_output(db, character_id, current_user.id)


# --- Эндпоинты Инвентаря ---

@app.post("/characters/{character_id}/inventory", response_model=schemas.CharacterInventoryItemOut, status_code=status.HTTP_201_CREATED, tags=["Inventory"])
async def add_item_to_character_inventory(
    character_id: int,
    item_add: schemas.AddItemToInventory,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Добавление предмета в инвентарь персонажа."""
    inv_item = crud.add_item_to_inventory(db, character_id, current_user.id, item_add)
    if inv_item is None:
         # crud вернет None если персонаж не найден/не принадлежит юзеру
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")

    # Формируем ответный Pydantic объект
    item_data = inv_item.item # Загруженный Item (с полиморфизмом)
    item_schema = None
    if isinstance(item_data, models.Weapon): item_schema = schemas.WeaponOut.from_orm(item_data)
    elif isinstance(item_data, models.Armor): item_schema = schemas.ArmorOut.from_orm(item_data)
    elif isinstance(item_data, models.Shield): item_schema = schemas.ShieldOut.from_orm(item_data)
    elif isinstance(item_data, models.GeneralItem): item_schema = schemas.GeneralItemOut.from_orm(item_data)
    elif isinstance(item_data, models.Ammo): item_schema = schemas.AmmoOut.from_orm(item_data)
    else: item_schema = schemas.ItemBase.from_orm(item_data)

    return schemas.CharacterInventoryItemOut(id=inv_item.id, item=item_schema, quantity=inv_item.quantity)


@app.delete("/characters/{character_id}/inventory/{inventory_item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Inventory"])
async def remove_item_from_character_inventory(
    character_id: int,
    inventory_item_id: int,
    quantity: int = Query(1, ge=1), # По умолчанию удаляем 1
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удаление предмета (или его части) из инвентаря персонажа."""
    success = crud.remove_item_from_inventory(db, inventory_item_id, character_id, current_user.id, quantity)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет инвентаря не найден или не принадлежит персонажу")
    return None # 204 No Content


@app.put("/characters/{character_id}/equipment", response_model=schemas.CharacterDetailedOut, tags=["Inventory"])
async def equip_item_for_character(
    character_id: int,
    equip_data: schemas.EquipItem,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Экипировка предмета из инвентаря в указанный слот."""
    updated_char = crud.equip_item(db, character_id, current_user.id, equip_data)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return crud.get_character_details_for_output(db, character_id, current_user.id)


@app.delete("/characters/{character_id}/equipment/{slot}", response_model=schemas.CharacterDetailedOut, tags=["Inventory"])
async def unequip_item_for_character(
    character_id: int,
    slot: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Снятие предмета с указанного слота экипировки."""
    if slot not in ["armor", "shield", "weapon1", "weapon2"]:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный слот экипировки")
    updated_char = crud.unequip_item(db, character_id, current_user.id, slot)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return crud.get_character_details_for_output(db, character_id, current_user.id)


# --- Эндпоинты Статус-Эффектов ---

@app.post("/characters/{character_id}/status_effects", response_model=schemas.CharacterDetailedOut, tags=["Status Effects"])
async def apply_status_effect_to_character(
    character_id: int,
    status_update: schemas.StatusEffectUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Применение статус-эффекта к персонажу."""
    updated_char = crud.apply_status_effect(db, character_id, current_user.id, status_update)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return crud.get_character_details_for_output(db, character_id, current_user.id)


@app.delete("/characters/{character_id}/status_effects/{status_effect_id}", response_model=schemas.CharacterDetailedOut, tags=["Status Effects"])
async def remove_status_effect_from_character(
    character_id: int,
    status_effect_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Снятие статус-эффекта с персонажа."""
    updated_char = crud.remove_status_effect(db, character_id, current_user.id, status_effect_id)
    if updated_char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден или не принадлежит вам")
    return crud.get_character_details_for_output(db, character_id, current_user.id)


# --- Эндпоинты Справочников ---

@app.get("/data/weapons", response_model=List[schemas.WeaponOut], tags=["Reference Data"])
def get_all_weapons(db: Session = Depends(get_db)):
    """Получение списка всего доступного оружия."""
    items = crud.get_all_items(db, models.Weapon)
    return [schemas.WeaponOut.from_orm(item) for item in items]

@app.get("/data/armor", response_model=List[schemas.ArmorOut], tags=["Reference Data"])
def get_all_armor(db: Session = Depends(get_db)):
    """Получение списка всей доступной брони."""
    items = crud.get_all_items(db, models.Armor)
    return [schemas.ArmorOut.from_orm(item) for item in items]

@app.get("/data/shields", response_model=List[schemas.ShieldOut], tags=["Reference Data"])
def get_all_shields(db: Session = Depends(get_db)):
    """Получение списка всех доступных щитов."""
    items = crud.get_all_items(db, models.Shield)
    return [schemas.ShieldOut.from_orm(item) for item in items]

@app.get("/data/general_items", response_model=List[schemas.GeneralItemOut], tags=["Reference Data"])
def get_all_general_items(db: Session = Depends(get_db)):
    """Получение списка всего доступного общего снаряжения."""
    items = crud.get_all_items(db, models.GeneralItem)
    return [schemas.GeneralItemOut.from_orm(item) for item in items]

@app.get("/data/ammo", response_model=List[schemas.AmmoOut], tags=["Reference Data"])
def get_all_ammo(db: Session = Depends(get_db)):
    """Получение списка всех доступных типов боеприпасов."""
    items = crud.get_all_items(db, models.Ammo)
    return [schemas.AmmoOut.from_orm(item) for item in items]

@app.get("/data/abilities", response_model=List[schemas.AbilityOut], tags=["Reference Data"])
def get_all_abilities(db: Session = Depends(get_db)):
    """Получение списка всех доступных способностей."""
    abilities = crud.get_all_abilities(db)
    return [schemas.AbilityOut.from_orm(ab) for ab in abilities]

@app.get("/data/status_effects", response_model=List[schemas.StatusEffectOut], tags=["Reference Data"])
def get_all_status_effects(db: Session = Depends(get_db)):
    """Получение списка всех доступных статус-эффектов."""
    effects = crud.get_all_status_effects(db)
    return [schemas.StatusEffectOut.from_orm(eff) for eff in effects]


# --- Эндпоинты Партий (Лобби) ---

@app.post("/parties", response_model=schemas.PartyOut, tags=["Parties"])
async def create_new_party(
    party_in: schemas.PartyCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание новой партии (лобби)."""
    party = crud.create_party(db, current_user.id, party_in)
    return party # crud.create_party уже возвращает PartyOut

@app.post("/parties/join", response_model=schemas.PartyOut, tags=["Parties"])
async def join_existing_party(
    join_data: schemas.PartyJoin,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Присоединение к существующей партии по ключу лобби."""
    party = crud.get_party_by_lobby_key(db, join_data.lobby_key)
    if party is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Лобби не найдено")

    # Проверка на максимальное количество игроков (если нужно)
    # players_in_lobby = manager.get_lobby_user_count(party.lobby_key)
    # if players_in_lobby >= party.max_players:
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Лобби заполнено")

    if not party.creator: # Проверка на случай, если создатель был удален
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Не найден создатель лобби")

    return schemas.PartyOut(
        id=party.id,
        lobby_key=party.lobby_key,
        max_players=party.max_players,
        creator_username=party.creator.username
    )


# --- WebSocket Эндпоинт ---

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    lobbyKey: str = Query(...),
    masterUsername: str = Query(...), # Получаем от клиента при подключении
    maxPlayers: str = Query(...)    # Получаем от клиента при подключении
):
    """WebSocket эндпоинт для обмена сообщениями и обновлениями в лобби."""
    # Проверка токена
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username = payload.get("sub")
        if username is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Проверка maxPlayers
    try:
        max_players_int = int(maxPlayers)
    except ValueError:
        await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA)
        return

    # Подключение к менеджеру
    await manager.connect(websocket, lobbyKey, username)
    # Отправка начального состояния лобби всем участникам
    await manager.send_players_update(lobbyKey, masterUsername, max_players_int)

    try:
        while True:
            # Прием и трансляция сообщений чата
            data = await websocket.receive_text()
            # TODO: Добавить обработку структурированных сообщений (например, броски кубиков, использование способностей)
            await manager.broadcast(lobbyKey, f"{username}: {data}") # Простой чат
    except WebSocketDisconnect:
        manager.disconnect(websocket, lobbyKey)
        # Оповещение об отключении и обновление списка игроков
        await manager.broadcast(lobbyKey, f"Система: {username} отключился")
        await manager.send_players_update(lobbyKey, masterUsername, max_players_int)
    except Exception as e:
        # Логгирование ошибок вебсокета
        print(f"WebSocket Error in lobby {lobbyKey} for user {username}: {e}")
        manager.disconnect(websocket, lobbyKey)
        await manager.send_players_update(lobbyKey, masterUsername, max_players_int)


# --- Запуск приложения (если запускается напрямую) ---
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)