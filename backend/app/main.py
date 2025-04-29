# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
from typing import Optional # <-- Убедимся, что Optional импортирован

# --- Импорты ---
from .db.database import engine, Base, get_db, SessionLocal
from .core.auth import get_current_user
from .websockets.manager import manager
from .models.user import User
from .models.character import Character
from .crud import character as character_crud
from .schemas import CharacterDetailedOut
from .routers import auth, characters, parties, reference_data, admin
import logging

logger = logging.getLogger(__name__)

# Base.metadata.create_all(bind=engine) # Лучше использовать Alembic

app = FastAPI(title="Осознание API", version="0.4.1") # Обновим версию

# CORS Middleware
origins = ["http://localhost", "http://localhost:3000"]
app.add_middleware( CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"], )

# Роутеры
app.include_router(auth.router)
app.include_router(characters.router)
app.include_router(parties.router)
app.include_router(reference_data.router)
app.include_router(admin.router)

# WebSocket Эндпоинт
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    lobbyKey: str = Query(...),
    masterUsername: str = Query(...),
    maxPlayers: str = Query(...),
    # --- ИЗМЕНЕНИЕ: characterId теперь опциональный ---
    characterId: Optional[int] = Query(None, description="ID персонажа игрока (null/отсутствует для мастера/наблюдателя)")
    # --- КОНЕЦ ИЗМЕНЕНИЯ ---
):
    db: Session = SessionLocal()
    user: Optional[User] = None
    character: Optional[Character] = None # Персонаж может быть None для мастера
    lobby_key_upper = lobbyKey.upper()
    username: Optional[str] = None # Имя пользователя

    try:
        # 1. Аутентификация пользователя
        try:
            user = await get_current_user(token=token, db=db)
            username = user.username
            logger.info(f"WebSocket Auth successful for user: {username}")
        except Exception as e:
            logger.error(f"WebSocket auth error: {e}", exc_info=True)
            reason = "Authentication failed"
            if isinstance(e, HTTPException): reason += f": {e.detail}"
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=reason)
            return

        # 2. Проверка владения персонажем (ТОЛЬКО если characterId передан)
        if characterId is not None:
            character = db.query(Character).filter(Character.id == characterId, Character.owner_id == user.id).first()
            if not character:
                logger.warning(f"User {username} tried to connect with invalid/unowned charId {characterId}")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid character ID or character not owned by user.")
                return
            logger.info(f"User {username} validated for character {characterId}")
        else:
             # Если characterId не передан, проверяем, является ли пользователь мастером этого лобби
             # (Предполагаем, что masterUsername - это имя создателя лобби)
             # TODO: Нужна более надежная проверка мастера, возможно, по ID создателя лобби
             if user.username != masterUsername:
                  logger.warning(f"User {username} tried to connect without characterId but is not master ({masterUsername})")
                  await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Only players select characters, master connects without one.")
                  return
             logger.info(f"Master {username} connecting without specific character ID.")


        # 3. Проверка maxPlayers
        try:
            max_players_int = int(maxPlayers)
            if not (2 <= max_players_int <= 10): raise ValueError("Max players out of range")
        except ValueError as e:
            await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason=f"Invalid maxPlayers format: {e}")
            return

        # 4. Подключение к менеджеру
        # Передаем characterId как есть (может быть None для мастера)
        connected = await manager.connect(websocket, lobby_key_upper, username, characterId)
        if not connected: return # Причина закрытия установлена в manager.connect

        # 5. Отправка обновления списка игроков всем
        await manager.send_players_update(lobby_key_upper, masterUsername, max_players_int)

        # 6. Отправка данных подключившегося персонажа (если это игрок)
        if characterId is not None and user is not None: # Добавили user is not None
            try:
                char_details_schema = character_crud.get_character_details_for_output(db, characterId, user.id)
                if char_details_schema:
                    char_details_dict = char_details_schema.model_dump(mode='json')
                    await manager.broadcast_character_update(lobby_key_upper, char_details_dict)
                else: logger.error(f"Failed to get char details for broadcast. CharID: {characterId}")
            except Exception as e: logger.error(f"Error broadcasting initial char data for CharID {characterId}: {e}", exc_info=True)

        # 7. Цикл обработки сообщений
        try:
            while True:
                data = await websocket.receive_text()
                # Просто пересылаем текстовые сообщения как чат с префиксом имени
                logger.info(f"WS message from {username}: {data}")
                await manager.broadcast(lobby_key_upper, f"{username}: {data}", exclude_websocket=websocket)
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for user {username} (CharID: {characterId}) in lobby {lobby_key_upper}")
        except Exception as e:
            logger.error(f"WebSocket Error in lobby {lobby_key_upper} for user {username} (CharID: {characterId}): {e}", exc_info=True)

    finally:
        # 8. Отключение и обновление списка игроков
        manager.disconnect(websocket, lobby_key_upper)
        try:
             # Используем masterUsername и maxPlayers из параметров эндпоинта
             max_players_int_on_disconnect = int(maxPlayers)
             await manager.send_players_update(lobby_key_upper, masterUsername, max_players_int_on_disconnect)
             logger.info(f"Sent player update after disconnect for lobby {lobby_key_upper}")
        except Exception as update_e:
             logger.error(f"Error sending player update after disconnect: {update_e}", exc_info=True)
        if db: db.close()

