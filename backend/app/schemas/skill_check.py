# backend/app/schemas/skill_check.py
from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Dict, Any

# Определяем RollMode здесь или импортируем
RollMode = Literal['normal', 'advantage', 'disadvantage']

class SkillCheckRequest(BaseModel):
    """ Схема запроса для проверки навыка """
    skill_name: str = Field(..., description="Точное название навыка (напр., 'Ловкость', 'Медицина')")
    # dc: Optional[int] = Field(None, description="Сложность проверки (если есть)")
    # situational_modifier: int = Field(0, description="Доп. модификатор от ситуации (+/-)")

class SkillCheckResultOut(BaseModel):
    """ Схема ответа для проверки навыка """
    success: bool # Успешность выполнения самого действия (не проверки против СЛ)
    message: str # Сообщение для пользователя
    skill_name: str
    modifier_used: int # Модификатор от характеристики
    roll_mode: RollMode
    base_roll: int # Сумма костей (3к6 или лучшие/худшие 3 из 4к6)
    dice_kept: List[int] # Список костей, которые пошли в сумму
    dice_all: List[int] # Список всех брошенных костей (для 4к6)
    numeric_mod_from_effects: int # Сумма числовых модов от эффектов (из JSON)
    roll_total: int # Итоговый результат = base_roll + modifier_used + numeric_mod_from_effects
    roll_detail_str: str # Детальная строка броска
    # dc: Optional[int] = None
    # check_success: Optional[bool] = None

    class Config:
         from_attributes = True # или model_config = ConfigDict(from_attributes=True)