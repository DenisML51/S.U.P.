# backend/app/schemas/action.py
from pydantic import BaseModel, Field
# --- ДОБАВЛЕНО: Literal ---
from typing import List, Optional, Literal, Any, Dict
# --- КОНЕЦ ДОБАВЛЕНИЯ ---

RollMode = Literal['advantage', 'disadvantage', 'normal'] # Определяем тип для RollMode

class ActivationRequest(BaseModel):
    activation_type: Literal['ability', 'item'] = Field(..., description="Тип активируемого объекта")
    target_id: int = Field(..., description="ID активируемой способности или предмета инвентаря")
    target_entities: Optional[List[int]] = Field(None, description="Список ID целей действия")

class ActionResultOut(BaseModel):
    """ Результат активации действия (способности или предмета) """
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None # Детали (урон, попадание, исцеление и т.д.)
    consumed_resources: Optional[Dict[str, Any]] = None # Потраченные ресурсы (патроны, заряды)
    character_update_needed: bool = False # Флаг для фронтенда, нужно ли обновить данные персонажа

    # --- ДОБАВЛЕНО (Для атак) ---
    # Возвращаем суммарный числ. мод от эффектов, примененный к этому броску атаки (если был)
    numeric_mod_from_effects: Optional[int] = Field(None, description="Сумма числовых модификаторов к броску от эффектов")
    # --- КОНЕЦ ---
    # Примечание: roll_mode для атаки теперь будет внутри поля details

    class Config:
        from_attributes = True