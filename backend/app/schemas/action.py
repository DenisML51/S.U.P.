# backend/app/schemas/action.py
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Any, Dict

class ActivationRequest(BaseModel):
    activation_type: Literal['ability', 'item'] = Field(..., description="Тип активируемого объекта")
    # ID способности (abilities.id) или ID ЗАПИСИ инвентаря (character_inventory_items.id)
    target_id: int = Field(..., description="ID активируемой способности или предмета инвентаря")
    # Опционально: ID целей (других персонажей, NPC). Пока не используем в логике.
    target_entities: Optional[List[int]] = Field(None, description="Список ID целей действия")
    # Опционально: режим броска (пока не используем)
    # roll_mode: Optional[Literal['auto', 'manual']] = 'auto'

class ActionResultOut(BaseModel):
    success: bool = Field(..., description="Успешно ли выполнено действие (прошли проверки)?")
    message: str = Field(..., description="Текстовое описание результата (напр., 'Вы попали Ударом Меча на 8 урона')")
    details: Optional[Dict[str, Any]] = Field(None, description="Дополнительные структурированные данные (урон, лечение, наложенные эффекты и т.д.)")
    consumed_resources: Optional[Dict[str, Any]] = Field(None, description="Потраченные ресурсы (заряды, ОС, патроны)")
    character_update_needed: bool = Field(True, description="Нужно ли фронтенду обновить данные персонажа?")
    targets_update_needed: Optional[List[int]] = Field(None, description="ID целей, чьи данные нужно обновить")

    class Config:
        from_attributes = True # Если создается из объекта