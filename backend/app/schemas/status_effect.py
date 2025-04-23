# backend/app/schemas/status_effect.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Union, Literal # Добавлены Dict, Any, List, Union


class StatusEffectOut(BaseModel):
    id: int
    name: str
    description: str

    roll_modifier_type: Optional[str] = None
    roll_modifier_targets: Optional[Dict[str, Any]] = None

    ac_modifier: Optional[int] = None
    attack_roll_modifier: Optional[int] = None
    duration_type: Optional[str] = None # Добавлено для информации

    class Config:
        from_attributes = True

# Схема для запроса на добавление/удаление статуса
class StatusEffectUpdate(BaseModel):
    status_effect_id: int


class StatusEffectBase(BaseModel):
    name: str
    description: str
    roll_modifier_type: Optional[Literal['advantage', 'disadvantage']] = Field(None, description="Тип модификатора броска") # Используем Literal
    # Валидация формата целей
    roll_modifier_targets: Optional[Dict[str, Union[bool, str, List[str]]]] = Field(None, description="Цели модификатора")

    ac_modifier: Optional[int] = None
    attack_roll_modifier: Optional[int] = None
    duration_type: Optional[str] = None # Добавлено для информации

class StatusEffectCreate(StatusEffectBase):
    pass

class StatusEffectUpdateAdmin(StatusEffectBase):
    name: Optional[str] = None # Позволяем менять имя
    description: Optional[str] = None
    # Поля модификаторов тоже опциональны при обновлении
    # (можно передать null для сброса)