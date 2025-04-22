# backend/app/schemas/custom_item.py
from pydantic import BaseModel, Field
from typing import Optional

class CustomItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Название произвольного предмета")
    description: Optional[str] = Field(None, max_length=1000, description="Описание произвольного предмета") # Увеличим длину описания
    quantity: int = Field(1, ge=1, description="Количество")

class CustomItemCreate(CustomItemBase):
    pass # Нет дополнительных полей при создании

class CustomItemOut(CustomItemBase):
    id: int
    character_id: int

    class Config:
        from_attributes = True # Для работы с ORM моделью