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
    success: bool = Field(..., description="Успешно ли выполнено действие (прошли проверки)?")
    message: str = Field(..., description="Текстовое описание результата")
    details: Optional[Dict[str, Any]] = Field(None, description="Дополнительные структурированные данные (урон, лечение, детали броска, режим броска и т.д.)") # <-- Обновлено описание
    consumed_resources: Optional[Dict[str, Any]] = Field(None, description="Потраченные ресурсы (заряды, ОС, патроны)")
    character_update_needed: bool = Field(True, description="Нужно ли фронтенду обновить данные персонажа?")
    targets_update_needed: Optional[List[int]] = Field(None, description="ID целей, чьи данные нужно обновить")

    # Пример возможной структуры details для атаки:
    # {
    #     "attack_roll": 15,
    #     "attack_roll_detail": "4к6в3 (4+5+6)=15 +2(Мод.Лов) = 17",
    #     "roll_mode": "advantage", # <--- ДОБАВЛЕНО
    #     "hit": true,
    #     "damage_dealt": 8,
    #     "damage_roll_detail": "1к10(5) +3(Мод.Лов) = 8",
    #     "damage_type": "Колющий"
    # }

    class Config:
        from_attributes = True