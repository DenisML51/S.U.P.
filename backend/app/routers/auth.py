# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

# Относительные импорты из новых мест
from .. import models, schemas
from ..crud import user as user_crud # Используем CRUD для пользователей
from ..core import auth # Импортируем модуль auth из core
from ..db.database import get_db

router = APIRouter(
    tags=["Auth"],
    prefix="/auth" # Префикс для этого роутера
)

@router.post("/register", response_model=schemas.UserOut, summary="Регистрация нового пользователя")
async def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Регистрирует нового пользователя в системе."""
    # Используем CRUD функцию из user_crud
    return user_crud.create_user(db=db, user=user_in)

@router.post("/login", response_model=schemas.Token, summary="Вход пользователя")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Аутентифицирует пользователя и возвращает JWT токен."""
    # Используем CRUD функцию
    user = user_crud.get_user_by_username(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Используем функцию создания токена из модуля auth
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/users/me", response_model=schemas.UserOut, summary="Получить информацию о себе")
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)): # Зависимость из модуля auth
    """Возвращает информацию о текущем аутентифицированном пользователе."""
    return current_user