# backend/app/core/auth.py
from __future__ import annotations
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..models.user import User as UserModel # Импортируем модель User
import logging

# Импортируем зависимости из новых мест
# Используем try-except для обработки потенциальных циклических импортов при инициализации
try:
    from ..db.database import get_db
    from ..crud import user as user_crud
    from ..models import user as user_model # Импортируем конкретную модель
except ImportError:
    # Обработка случая, когда модули еще не полностью загружены
    pass


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SECRET_KEY = "your_super_secret_key" # ВАЖНО: Вынести в переменные окружения!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Указываем новый путь к эндпоинту логина
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> user_model.User:
    # --- ДОБАВЛЕНО ЛОГИРОВАНИЕ ---
    logger.info(f"Attempting to get current user with token starting: {token[:10]}...")
    # --- КОНЕЦ ЛОГИРОВАНИЯ ---

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверные данные аутентификации",
        headers={"WWW-Authenticate": "Bearer"},
    )
    username: str | None = None # Объявляем переменную заранее
    try:
        # Импорты внутри функции
        from ..crud import user as user_crud
        from ..models import user as user_model

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            # --- ДОБАВЛЕНО ЛОГИРОВАНИЕ ---
            logger.warning("Token payload does not contain 'sub' (username).")
            # --- КОНЕЦ ЛОГИРОВАНИЯ ---
            raise credentials_exception
        # --- ДОБАВЛЕНО ЛОГИРОВАНИЕ ---
        logger.info(f"Token decoded successfully for username: {username}")
        # --- КОНЕЦ ЛОГИРОВАНИЯ ---

    except JWTError as e:
        # --- ДОБАВЛЕНО ЛОГИРОВАНИЕ ---
        logger.warning(f"JWTError during token decoding: {e}")
        # --- КОНЕЦ ЛОГИРОВАНИЯ ---
        raise credentials_exception
    except Exception as e: # Ловим другие возможные ошибки декодирования
        logger.error(f"Unexpected error during token decoding: {e}")
        raise credentials_exception

    # Ищем пользователя в БД
    user = user_crud.get_user_by_username(db, username=username)
    if user is None:
        # --- ДОБАВЛЕНО ЛОГИРОВАНИЕ ---
        logger.warning(f"User '{username}' found in token but not in DB.")
        # --- КОНЕЦ ЛОГИРОВАНИЯ ---
        raise credentials_exception

    # --- ДОБАВЛЕНО ЛОГИРОВАНИЕ ---
    logger.info(f"User {user.username} authenticated successfully.")
    # --- КОНЕЦ ЛОГИРОВАНИЯ ---
    return user

async def get_current_admin_user(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """
    Зависимость, которая проверяет, является ли текущий пользователь администратором.
    Вызывает HTTPException 403, если пользователь не админ.
    """
    if not current_user.is_admin:
        logger.warning(f"User '{current_user.username}' (ID: {current_user.id}) attempted to access admin-only route.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have administrative privileges"
        )
    logger.info(f"Admin access granted for user '{current_user.username}' (ID: {current_user.id}).")
    return current_user