from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import jwt, JWTError
import uvicorn
from . import models, schemas, crud, auth
from .database import engine, SessionLocal, Base
from .websocket_manager import manager

Base.metadata.create_all(bind=engine)
app = FastAPI()

origins = ["http://localhost", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_db():
    db = SessionLocal()
    try:
         yield db
    finally:
         db.close()

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

@app.post("/register", response_model=schemas.UserOut)
async def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_username(db, username=user_in.username):
         raise HTTPException(status_code=400, detail="Пользователь уже существует")
    user = crud.create_user(db, user_in)
    return user

@app.post("/login", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
         raise HTTPException(status_code=400, detail="Неверный логин или пароль")
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/", response_model=dict)
async def dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    chars = crud.get_characters_by_user(db, current_user.id)
    char_list = [schemas.CharacterOut.from_orm(c) for c in chars]
    return {"message": f"Добро пожаловать, {current_user.username}!", "characters": char_list, "username": current_user.username}

@app.post("/characters", response_model=schemas.CharacterOut)
async def create_character(character_in: schemas.CharacterCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    char = crud.create_character(db, current_user.id, character_in)
    return char

@app.post("/parties", response_model=schemas.PartyOut)
async def create_party(
    party_in: schemas.PartyCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    party = crud.create_party(db, current_user.id, party_in)
    # Возвращаем объект с полем creator_username
    return {
        "id": party.id,
        "lobby_key": party.lobby_key,
        "max_players": party.max_players,
        "creator_username": current_user.username  # Здесь берём логин мастера
    }

@app.post("/parties/join", response_model=schemas.PartyOut)
async def join_party(
    join_data: schemas.PartyJoin,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    party = crud.get_party_by_lobby_key(db, join_data.lobby_key)
    if party is None:
         raise HTTPException(status_code=404, detail="Лобби не найдено")
    # Получаем мастера через связь по creator_id
    master_user = db.query(models.User).filter(models.User.id == party.creator_id).first()
    if not master_user:
         raise HTTPException(status_code=404, detail="Не найден создатель лобби")
    return {
        "id": party.id,
        "lobby_key": party.lobby_key,
        "max_players": party.max_players,
        "creator_username": master_user.username
    }

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = None,
    lobbyKey: str = None,
    masterUsername: str = None,
    maxPlayers: str = None
):
    if not token or not lobbyKey or not masterUsername or not maxPlayers:
         await websocket.close(code=1008)
         return
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username = payload.get("sub")
        if username is None:
            await websocket.close(code=1008)
            return
    except JWTError:
        await websocket.close(code=1008)
        return

    try:
        max_players_int = int(maxPlayers)
    except ValueError:
        max_players_int = 0

    await manager.connect(websocket, lobbyKey, username)
    await manager.send_players_update(lobbyKey, masterUsername, max_players_int)

    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(lobbyKey, f"{username}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, lobbyKey)
        await manager.broadcast(lobbyKey, f"{username} отключился")
        await manager.send_players_update(lobbyKey, masterUsername, max_players_int)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
