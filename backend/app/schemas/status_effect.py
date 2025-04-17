# backend/app/schemas/status_effect.py
from pydantic import BaseModel

class StatusEffectOut(BaseModel):
    id: int
    name: str
    description: str

    class Config:
        from_attributes = True

# Схема для запроса на добавление/удаление статуса
class StatusEffectUpdate(BaseModel):
    status_effect_id: int