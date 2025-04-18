# backend/app/schemas/character.py
from pydantic import BaseModel, Field, root_validator, field_validator, model_validator, ConfigDict
from typing import List, Optional, Dict, Any, Literal

# Импортируем зависимые схемы из других файлов
from .item import CharacterInventoryItemOut, AnyItemOut # AnyItemOut для типа экипировки
from .ability import AbilityOut
from .status_effect import StatusEffectOut

# Импортируем константы (если они нужны для валидации)
# Предполагаем, что XP_THRESHOLDS и VALID_BRANCH_KEYS доступны через models или config
try:
    from ..models import XP_THRESHOLDS # Импорт из models/__init__.py
except ImportError:
    XP_THRESHOLDS = {} # Заглушка, если импорт не удался

# Константа с ключами веток (можно вынести в конфиг или оставить здесь)
VALID_BRANCH_KEYS = {'medic', 'mutant', 'sharpshooter', 'scout', 'technician', 'fighter', 'juggernaut'}


# --- Базовые и Вспомогательные Схемы ---
class CharacterBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

# Схема для начального распределения навыков (при создании)
class InitialSkillDistribution(BaseModel):
    # Используем Field для валидации диапазона 1-8
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

    # Валидатор суммы очков ПРИ СОЗДАНИИ (36 очков сверх базы 1)
    @model_validator(mode='after')
    def check_total_points_on_create(self) -> 'InitialSkillDistribution':
        values = self.__dict__
        total_points_spent = sum(
            (value - 1) for key, value in values.items()
            if key.startswith("skill_") and isinstance(value, int)
        )
        required_points = 36 # 18 навыков * (1 базовая + 2 очка в среднем) = 54 очка, 54 - 18 = 36
        if total_points_spent != required_points:
            raise ValueError(
                f"При создании должно быть потрачено ровно {required_points} очков навыков (свыше 1). "
                f"Потрачено: {total_points_spent}"
            )
        return self

# Схема для заметок (используется при создании и обновлении)
class CharacterNotes(BaseModel):
    appearance_notes: Optional[str] = None
    character_notes: Optional[str] = None
    motivation_notes: Optional[str] = None
    background_notes: Optional[str] = None

# Схема для создания персонажа
class CharacterCreate(CharacterBase):
    initial_skills: InitialSkillDistribution
    # Включаем заметки как часть создания
    appearance_notes: Optional[str] = None
    character_notes: Optional[str] = None
    motivation_notes: Optional[str] = None
    background_notes: Optional[str] = None


# --- Схемы для Вывода Данных ---

# Краткая информация для списка персонажей
class CharacterBriefOut(CharacterBase):
    id: int
    level: int
    current_hp: int
    max_hp: int

    model_config = ConfigDict(from_attributes=True) # Замена class Config


# Модификаторы навыков (для CharacterDetailedOut)
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

# Производные характеристики (для CharacterDetailedOut)
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
    total_ac: int # Рассчитанный КЗ с учетом экипировки
    passive_attention: int
    xp_needed_for_next_level: Optional[int] = None

# Уровни веток (для CharacterDetailedOut)
class CharacterClassBranchLevels(BaseModel):
    medic_branch_level: int
    mutant_branch_level: int
    sharpshooter_branch_level: int
    scout_branch_level: int
    technician_branch_level: int
    fighter_branch_level: int
    juggernaut_branch_level: int

    model_config = ConfigDict(from_attributes=True)


# Основная детальная схема персонажа
class CharacterDetailedOut(
    CharacterBase,
    CharacterDerivedStats,
    CharacterClassBranchLevels,
    CharacterNotes # Включаем заметки
):
    id: int
    level: int
    experience_points: int
    owner_id: int # ID владельца

    # Явно перечисляем все базовые навыки
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

    # Вложенные объекты
    skill_modifiers: CharacterSkillModifiers
    inventory: List[CharacterInventoryItemOut] = []
    equipped_armor: Optional[CharacterInventoryItemOut] = None
    equipped_shield: Optional[CharacterInventoryItemOut] = None
    equipped_weapon1: Optional[CharacterInventoryItemOut] = None
    equipped_weapon2: Optional[CharacterInventoryItemOut] = None
    available_abilities: List[AbilityOut] = []
    active_status_effects: List[StatusEffectOut] = []

    model_config = ConfigDict(from_attributes=True)


# --- Схемы для Обновления Персонажа ---

# Обновление базовых навыков (например, через редактор DM)
class CharacterUpdateSkills(BaseModel):
    # Используем Optional и валидацию диапазона 1-10
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

# Информация для повышения уровня
class LevelUpInfo(BaseModel):
    hp_roll: int = Field(..., ge=1, le=10) # Бросок к10 на здоровье
    branch_point_spent: str # Ключ ветки: 'medic', 'mutant', и т.д.
    skill_points_spent: Dict[str, int] # Словарь {"имя_навыка": добавленные_очки}

    # Валидатор для имени ветки
    @field_validator('branch_point_spent')
    @classmethod
    def check_branch_name(cls, v: str):
        if v not in VALID_BRANCH_KEYS:
            raise ValueError(f"Неверное имя ветки класса: {v}. Допустимые: {VALID_BRANCH_KEYS}")
        return v

    # Валидатор для очков навыков
    @model_validator(mode='after')
    def check_skill_points(self) -> 'LevelUpInfo':
        values = self.__dict__
        points_spent_dict = values.get("skill_points_spent", {})
        if not isinstance(points_spent_dict, dict):
             raise ValueError("skill_points_spent должен быть словарем")

        total_spent = 0
        valid_skill_keys = InitialSkillDistribution.model_fields.keys() # Получаем валидные ключи навыков
        for skill_key, points in points_spent_dict.items():
            if skill_key not in valid_skill_keys:
                 raise ValueError(f"Неверное имя навыка: {skill_key}")
            if not isinstance(points, int) or points <= 0:
                 raise ValueError(f"Количество очков для навыка {skill_key} должно быть положительным целым числом")
            total_spent += points

        if total_spent != 3:
            raise ValueError(f"Должно быть распределено ровно 3 очка навыка (распределено: {total_spent})")

        return self


# Обновление изменяемых статов (HP, PU, ОС, Истощение, XP)
class UpdateCharacterStats(BaseModel):
    current_hp: Optional[int] = None
    current_pu: Optional[int] = None # Может быть любым целым числом, логика обработает
    stamina_points: Optional[int] = Field(None, ge=0) # ОС не < 0
    exhaustion_level: Optional[int] = Field(None, ge=0, le=6) # Истощение 0-6
    experience_points: Optional[int] = Field(None, ge=0) # Опыт не < 0
    # Поле для передачи результата проверки ПУ (для триггера эмоций)
    check_result: Optional[str] = Field(None, pattern="^(success|failure)$") # 'success' или 'failure'


class HealRequest(BaseModel):
    # Источник лечения
    source: Literal['medkit', 'short_rest_die']
    # Количество кубиков ОС для траты (для short_rest_die)
    dice_count: Optional[int] = Field(None, ge=1)
    # ID записи в инвентаре (character_inventory_items.id) для использования предмета
    inventory_item_id: Optional[int] = Field(None, ge=1) # <<<=== ДОБАВЛЕНО ПОЛЕ

    @model_validator(mode='after')
    def check_heal_source_requirements(self) -> 'HealRequest':
        values = self.__dict__
        source = values.get('source')
        dice_count = values.get('dice_count')
        inventory_item_id = values.get('inventory_item_id')

        if source == 'short_rest_die' and (dice_count is None or dice_count <= 0):
            raise ValueError("Для 'short_rest_die' необходимо указать положительное 'dice_count'")
        if source == 'medkit' and inventory_item_id is None:
            raise ValueError("Для 'medkit' необходимо указать 'inventory_item_id'")
        # Не позволяем передавать оба параметра одновременно (хотя схема и так разделит)
        if source == 'short_rest_die' and inventory_item_id is not None:
            raise ValueError("Нельзя указывать 'inventory_item_id' для 'short_rest_die'")
        if source == 'medkit' and dice_count is not None:
             raise ValueError("Нельзя указывать 'dice_count' для 'medkit'")

        return self