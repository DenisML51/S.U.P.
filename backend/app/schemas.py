# backend/app/schemas.py

from pydantic import BaseModel, Field, root_validator, field_validator, model_validator
from typing import List, Optional, Dict, Any, Union
from .models import XP_THRESHOLDS

# --- Константа с ключами веток ---
VALID_BRANCH_KEYS = {'medic', 'mutant', 'sharpshooter', 'scout', 'technician', 'fighter', 'juggernaut'}

# --- Базовые схемы и схемы аутентификации ---
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=4)

class UserOut(UserBase):
    id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class PartyBase(BaseModel):
    max_players: int = Field(..., ge=2, le=10)

class PartyCreate(PartyBase):
    pass

class PartyOut(PartyBase):
    id: int
    lobby_key: str
    creator_username: str
    class Config:
        from_attributes = True

class PartyJoin(BaseModel):
    lobby_key: str = Field(..., min_length=6, max_length=6)

# --- Схемы Справочников ---
class ItemBase(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    item_type: str
    category: str
    rarity: str
    weight: int
    # Добавляем поля, которые могут быть у дочерних классов, но опциональны здесь
    strength_requirement: Optional[int] = None
    stealth_disadvantage: Optional[bool] = None
    class Config:
        from_attributes = True

class WeaponOut(ItemBase):
    damage: str
    damage_type: str
    properties: Optional[str] = None
    range_normal: Optional[int] = None
    range_max: Optional[int] = None
    reload_info: Optional[str] = None
    is_two_handed: bool
    # Переопределяем как не-опциональные, если они обязательны для Weapon
    strength_requirement: int = 0
    stealth_disadvantage: bool = False

class ArmorOut(ItemBase):
    armor_type: str
    ac_bonus: int
    max_dex_bonus: Optional[int] = None
    strength_requirement: int # Обязательно для брони
    stealth_disadvantage: bool # Обязательно для брони
    properties: Optional[str] = None

class ShieldOut(ItemBase):
    ac_bonus: int
    strength_requirement: int # Обязательно для щитов
    properties: Optional[str] = None
    # stealth_disadvantage тут не нужен

class GeneralItemOut(ItemBase):
    effect: Optional[str] = None
    uses: Optional[int] = None

class AmmoOut(ItemBase):
    ammo_type: str
    effect: Optional[str] = None

class AbilityOut(BaseModel):
    id: int
    name: str
    description: str
    branch: str
    level_required: int
    skill_requirements: Optional[str] = None # Храним как строку (JSON)
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
    class Config:
        from_attributes = True

class StatusEffectOut(BaseModel):
    id: int
    name: str
    description: str
    class Config:
        from_attributes = True

# --- Схемы для Инвентаря Персонажа ---
AnyItemOut = Union[WeaponOut, ArmorOut, ShieldOut, GeneralItemOut, AmmoOut, ItemBase]

class CharacterInventoryItemOut(BaseModel):
    id: int
    item: AnyItemOut
    quantity: int
    class Config:
        from_attributes = True

class AddItemToInventory(BaseModel):
    item_id: int
    quantity: int = Field(1, gt=0)

class EquipItem(BaseModel):
    inventory_item_id: int
    slot: str = Field(..., pattern="^(armor|shield|weapon1|weapon2)$")

# --- Схемы для Персонажа ---
class CharacterBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

# Эта схема используется ТОЛЬКО при создании персонажа
class InitialSkillDistribution(BaseModel):
    skill_strength: int = Field(1, ge=1, le=8)
    skill_dexterity: int = Field(1, ge=1, le=8)
    skill_endurance: int = Field(1, ge=1, le=8)
    skill_reaction: int = Field(1, ge=1, le=8)
    skill_technique: int = Field(1, ge=1, le=8)
    skill_adaptation: int = Field(1, ge=1, le=8)
    skill_logic: int = Field(1, ge=1, le=8)
    skill_attention: int = Field(1, ge=1, le=8)
    skill_erudition: int = Field(1, ge=1, le=8)
    skill_culture: int = Field(1, ge=1, le=8)
    skill_science: int = Field(1, ge=1, le=8)
    skill_medicine: int = Field(1, ge=1, le=8)
    skill_suggestion: int = Field(1, ge=1, le=8)
    skill_insight: int = Field(1, ge=1, le=8)
    skill_authority: int = Field(1, ge=1, le=8)
    skill_self_control: int = Field(1, ge=1, le=8)
    skill_religion: int = Field(1, ge=1, le=8)
    skill_flow: int = Field(1, ge=1, le=8)

    # Валидатор суммы очков ПРИ СОЗДАНИИ
    @model_validator(mode='after')
    def check_total_points_on_create(self):
        values = self.__dict__
        total_points_spent = sum( (value - 1) for key, value in values.items() if key.startswith("skill_") and isinstance(value, int) )
        required_points = 36
        if total_points_spent != required_points: raise ValueError(f"При создании должно быть потрачено ровно 36 очков навыков (свыше 1). Потрачено: {total_points_spent}")
        return self

class CharacterCreate(CharacterBase):
    initial_skills: InitialSkillDistribution # Используем схему с валидатором здесь
    appearance_notes: Optional[str] = None
    character_notes: Optional[str] = None
    motivation_notes: Optional[str] = None
    background_notes: Optional[str] = None

class CharacterBriefOut(CharacterBase):
    id: int
    level: int
    current_hp: int
    max_hp: int
    class Config:
        from_attributes = True

class CharacterSkillModifiers(BaseModel):
    strength_mod: int
    dexterity_mod: int
    endurance_mod: int
    reaction_mod: int
    technique_mod: int
    adaptation_mod: int
    logic_mod: int
    attention_mod: int
    erudition_mod: int
    culture_mod: int
    science_mod: int
    medicine_mod: int
    suggestion_mod: int
    insight_mod: int
    authority_mod: int
    self_control_mod: int
    religion_mod: int
    flow_mod: int

class CharacterDerivedStats(BaseModel):
    max_hp: int
    current_hp: int
    base_pu: int
    current_pu: int
    stamina_points: int
    exhaustion_level: int
    speed: int
    initiative_bonus: int
    base_ac: int
    total_ac: int
    passive_attention: int
    xp_needed_for_next_level: Optional[int] = None

class CharacterClassBranchLevels(BaseModel):
    medic_branch_level: int
    mutant_branch_level: int
    sharpshooter_branch_level: int
    scout_branch_level: int
    technician_branch_level: int
    fighter_branch_level: int
    juggernaut_branch_level: int
    class Config:
        from_attributes = True

class CharacterNotes(BaseModel):
    appearance_notes: Optional[str] = None
    character_notes: Optional[str] = None
    motivation_notes: Optional[str] = None
    background_notes: Optional[str] = None


# --- ИСПРАВЛЕННАЯ СХЕМА CharacterDetailedOut ---
# Убрано наследование от InitialSkillDistribution, поля навыков добавлены явно
class CharacterDetailedOut(CharacterBase, CharacterDerivedStats, CharacterClassBranchLevels, CharacterNotes):
    id: int
    level: int
    experience_points: int
    owner_id: int

    # Явно перечисляем поля навыков (без валидатора суммы от InitialSkillDistribution)
    skill_strength: int
    skill_dexterity: int
    skill_endurance: int
    skill_reaction: int
    skill_technique: int
    skill_adaptation: int
    skill_logic: int
    skill_attention: int
    skill_erudition: int
    skill_culture: int
    skill_science: int
    skill_medicine: int
    skill_suggestion: int
    skill_insight: int
    skill_authority: int
    skill_self_control: int
    skill_religion: int
    skill_flow: int

    skill_modifiers: CharacterSkillModifiers # Модификаторы остаются
    inventory: List[CharacterInventoryItemOut] = []
    equipped_armor: Optional[CharacterInventoryItemOut] = None
    equipped_shield: Optional[CharacterInventoryItemOut] = None
    equipped_weapon1: Optional[CharacterInventoryItemOut] = None
    equipped_weapon2: Optional[CharacterInventoryItemOut] = None
    available_abilities: List[AbilityOut] = []
    active_status_effects: List[StatusEffectOut] = []

    class Config:
        from_attributes = True
# ---------------------------------------------


# --- Схемы для Обновления Персонажа ---
class CharacterUpdateSkills(BaseModel):
    skill_strength: Optional[int] = Field(None, ge=1, le=10)
    skill_dexterity: Optional[int] = Field(None, ge=1, le=10)
    skill_endurance: Optional[int] = Field(None, ge=1, le=10)
    skill_reaction: Optional[int] = Field(None, ge=1, le=10)
    skill_technique: Optional[int] = Field(None, ge=1, le=10)
    skill_adaptation: Optional[int] = Field(None, ge=1, le=10)
    skill_logic: Optional[int] = Field(None, ge=1, le=10)
    skill_attention: Optional[int] = Field(None, ge=1, le=10)
    skill_erudition: Optional[int] = Field(None, ge=1, le=10)
    skill_culture: Optional[int] = Field(None, ge=1, le=10)
    skill_science: Optional[int] = Field(None, ge=1, le=10)
    skill_medicine: Optional[int] = Field(None, ge=1, le=10)
    skill_suggestion: Optional[int] = Field(None, ge=1, le=10)
    skill_insight: Optional[int] = Field(None, ge=1, le=10)
    skill_authority: Optional[int] = Field(None, ge=1, le=10)
    skill_self_control: Optional[int] = Field(None, ge=1, le=10)
    skill_religion: Optional[int] = Field(None, ge=1, le=10)
    skill_flow: Optional[int] = Field(None, ge=1, le=10)

# Валидаторы в LevelUpInfo проверяют только свои поля
class LevelUpInfo(BaseModel):
    hp_roll: int = Field(..., ge=1, le=10)
    branch_point_spent: str # Ожидаем ключ: 'medic', 'mutant', и т.д.
    skill_points_spent: Dict[str, int] # Ожидаем словарь {"skill_name": points_added}

    @field_validator('branch_point_spent')
    @classmethod
    def check_branch_name(cls, v: str):
        # Сравниваем с допустимыми КЛЮЧАМИ веток
        if v not in VALID_BRANCH_KEYS:
             raise ValueError(f"Неверное имя ветки класса: {v}")
        return v

    @model_validator(mode='after')
    def check_skill_points_total(self):
        values = self.__dict__
        points_spent_dict = values.get("skill_points_spent", {})
        if not isinstance(points_spent_dict, dict): raise ValueError("skill_points_spent должен быть словарем")
        if sum(points_spent_dict.values()) != 3: raise ValueError("Должно быть распределено ровно 3 очка навыка")
        valid_skill_keys = InitialSkillDistribution.model_fields.keys() # Используем ключи отсюда для проверки имен
        for skill_key, points in points_spent_dict.items():
            if skill_key not in valid_skill_keys: raise ValueError(f"Неверное имя навыка: {skill_key}")
            if points <= 0: raise ValueError(f"Количество очков для навыка {skill_key} должно быть положительным")
        return self

class UpdateCharacterStats(BaseModel):
    current_hp: Optional[int] = None
    current_pu: Optional[int] = None
    stamina_points: Optional[int] = Field(None, ge=0)
    exhaustion_level: Optional[int] = Field(None, ge=0, le=6)
    experience_points: Optional[int] = Field(None, ge=0)

class StatusEffectUpdate(BaseModel):
    status_effect_id: int