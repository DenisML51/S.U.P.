# backend/app/schemas/status_effect.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

# --- Базовая Схема Статусного Эффекта ---
class StatusEffectBase(BaseModel):
    name: str = Field(..., min_length=1) # Имя обязательно
    description: Optional[str] = "" # Описание опционально

    # Используем model_config для Pydantic v2+
    model_config = ConfigDict(from_attributes=True)
    # Для Pydantic v1:
    # class Config:
    #     orm_mode = True

# --- Схема для Создания Статуса ---
class StatusEffectCreate(StatusEffectBase):
    # Все нужные поля в Base
    pass

# --- Схема для Обновления Статуса ---
class StatusEffectUpdate(BaseModel): # Наследуем от BaseModel, чтобы все поля были Optional по умолчанию
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    # Добавьте другие поля, если они появятся в модели StatusEffect и их можно будет менять

# --- Схема для Отображения Статуса (Out) ---
class StatusEffectOut(StatusEffectBase): # Наследуем от Base
    id: int # Добавляем ID
    # model_config наследуется

# --- Старая схема StatusEffectUpdate удалена, т.к. она не для админки справочника ---
# Если она нужна для применения/снятия статуса с персонажа, ее лучше перенести
# в schemas/character.py или назвать иначе, например CharacterApplyStatus.
# class StatusEffectUpdate(BaseModel):
#     status_effect_id: int
