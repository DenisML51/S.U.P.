# backend/app/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

# Импортируем зависимости и схемы
from ..db.database import get_db
from ..core import auth # Для зависимости get_current_admin_user
# --- ИЗМЕНЕНИЕ: Импортируем UserOut (или ваше правильное имя схемы) ---
# Попробуйте сначала так:
try:
    from ..schemas import UserOut as UserSchema
except ImportError:
    # Если не сработало, возможно, она в подмодуле:
    try:
        from ..schemas.user import UserOut as UserSchema # <--- Или другое имя файла/схемы
    except ImportError:
        # Если и это не сработало, нужно проверить структуру ваших схем
        # Заглушка, чтобы код не падал полностью, но эндпоинт /users не будет работать корректно
        print("WARNING: Could not import User output schema (e.g., UserOut) from app.schemas or app.schemas.user. Admin /users endpoint might fail.")
        UserSchema = None # Или базовая модель Pydantic, если хотите
# --- КОНЕЦ ИЗМЕНЕНИЯ ---
from ..models import User as UserModel # Импортируем модель User для type hint

router = APIRouter(
    prefix="/admin", # Префикс для всех путей в этом роутере
    tags=["Admin"], # Тег для документации Swagger/OpenAPI
    dependencies=[Depends(auth.get_current_admin_user)], # ВСЕ пути здесь требуют админа
    responses={
        403: {"description": "Operation forbidden. Admin privileges required."},
        401: {"description": "Not authenticated"} # Добавим ответ 401
    },
)

@router.get("/dashboard", response_model=dict)
async def read_admin_dashboard(
    current_admin: UserModel = Depends(auth.get_current_admin_user) # Подтверждаем админа еще раз (хотя уже есть в router.dependencies)
):
    """
    Пример защищенного эндпоинта для админ-панели.
    Доступен только пользователям с флагом is_admin=True.
    """
    return {"message": f"Добро пожаловать в админ-панель, {current_admin.username}!"}

# Пример другого эндпоинта (например, список всех пользователей)
# Используем List[UserSchema] если UserSchema был успешно импортирован
@router.get("/users", response_model=List[UserSchema] if UserSchema else List)
async def list_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(auth.get_current_admin_user) # Зависимость для получения админа
):
    """
    Получает список всех пользователей (только для администраторов).
    """
    if not UserSchema:
         raise HTTPException(status_code=500, detail="Admin user schema not loaded correctly.")
    users = db.query(UserModel).offset(skip).limit(limit).all()
    return users

# Добавляйте сюда другие эндпоинты, специфичные для администратора

