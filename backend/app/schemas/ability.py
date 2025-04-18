# backend/app/schemas/ability.py
from pydantic import BaseModel
from typing import Optional

class AbilityOut(BaseModel):
    id: int
    name: str
    description: str
    branch: str
    level_required: int
    skill_requirements: Optional[str] = None # Оставляем строкой для простоты
    action_type: str
    cooldown: Optional[str] = None
    range: Optional[str] = None
    target: Optional[str] = None
    duration: Optional[str] = None
    concentration: bool
    saving_throw_attribute: Optional[str] = None
    saving_throw_dc_formula: Optional[str] = None
    effect_on_save_fail: Optional[str] = None
    effect_on_save_success: Optional[str] = None

    is_weapon_attack: bool = False # Добавляем значение по умолчанию
    attack_skill: Optional[str] = None
    damage_formula: Optional[str] = None
    damage_type: Optional[str] = None

    class Config:
        from_attributes = True