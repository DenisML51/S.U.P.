# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Импорты из новых мест
from .db.database import engine, Base, get_db
from .core.auth import get_current_user
from .websockets.manager import manager
# Импортируем модели (возможно, только User нужен для WebSocket?)
from .models.user import User

# Импортируем созданные роутеры
from .routers import auth, characters, parties, reference_data

# Создание таблиц при запуске
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Осознание API",
    description="API для управления персонажами и партиями в игре Осознание",
    version="0.3.0"
)

# CORS Middleware
origins = ["http://localhost", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(auth.router)
app.include_router(characters.router)
app.include_router(parties.router)
app.include_router(reference_data.router)


# WebSocket Эндпоинт
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    lobbyKey: str = Query(...),
    masterUsername: str = Query(...),
    maxPlayers: str = Query(...)
):
    db_session: Session | None = None
    try:
        db_session = next(get_db())
        user: User = await get_current_user(token=token, db=db_session) # Явно указываем тип
        username = user.username
    except HTTPException as e:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Authentication failed: {e.detail}")
        return
    except Exception as e:
        print(f"WebSocket auth error: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Server error during authentication")
        return
    finally:
        if db_session: db_session.close()

    try:
        max_players_int = int(maxPlayers)
        if not (2 <= max_players_int <= 10): raise ValueError("Max players out of range")
    except ValueError as e:
        await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason=f"Invalid maxPlayers format: {e}")
        return

    lobby_key_upper = lobbyKey.upper()
    connected = await manager.connect(websocket, lobby_key_upper, username)
    if not connected: return

    await manager.send_players_update(lobby_key_upper, masterUsername, max_players_int)

    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(lobby_key_upper, f"{username}: {data}")
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user {username} in lobby {lobby_key_upper}")
    except Exception as e:
        print(f"WebSocket Error in lobby {lobby_key_upper} for user {username}: {e}")
    finally:
         manager.disconnect(websocket, lobby_key_upper)
         try:
              await manager.send_players_update(lobby_key_upper, masterUsername, max_players_int)
         except Exception as update_e:
              print(f"Error sending player update after WebSocket error/disconnect: {update_e}")