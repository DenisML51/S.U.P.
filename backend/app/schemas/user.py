# backend/app/schemas/user.py
from pydantic import BaseModel, Field

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=4)

class UserOut(UserBase):
    id: int
    # Добавляем Config для работы с ORM моделями
    class Config:
        from_attributes = True