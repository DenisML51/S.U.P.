# backend/app/models.py

# ... (импорты и другие классы остаются без изменений) ...
from typing import Optional, List # Убедитесь, что импорты есть
from sqlalchemy import Column, Integer, String, ForeignKey, Table, Text, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.ext.hybrid import hybrid_property
from .database import Base
import math

# --- Таблица опыта ---
XP_THRESHOLDS = {
    1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500,
    6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000,
}

# --- Вспомогательные таблицы ---
character_abilities = Table(
    'character_abilities', Base.metadata,
    Column('character_id', Integer, ForeignKey('characters.id'), primary_key=True),
    Column('ability_id', Integer, ForeignKey('abilities.id'), primary_key=True)
)

character_status_effects = Table(
    'character_status_effects', Base.metadata,
    Column('character_id', Integer, ForeignKey('characters.id'), primary_key=True),
    Column('status_effect_id', Integer, ForeignKey('status_effects.id'), primary_key=True)
)

# --- Модель Предмета Инвентаря ---
class CharacterInventoryItem(Base):
    __tablename__ = 'character_inventory_items'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    character_id: Mapped[int] = mapped_column(ForeignKey('characters.id')) # Ключ к персонажу
    item_id: Mapped[int] = mapped_column(ForeignKey('items.id'))
    quantity: Mapped[int] = mapped_column(default=1)

    # Связи
    # Связь "многие-к-одному" с Character:
    # ЯВНО указываем SQLAlchemy использовать ТОЛЬКО character_id для этой связи
    character: Mapped["Character"] = relationship(
        back_populates="inventory",
        foreign_keys=[character_id] # <--- ВОТ ИСПРАВЛЕНИЕ
    )
    # Связь "многие-к-одному" с Item (полиморфная)
    item: Mapped["Item"] = relationship(lazy="joined") # Загружаем сразу данные предмета

# --- Основные модели ---
class User(Base):
    # ... (без изменений) ...
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)

    characters: Mapped[List["Character"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    parties: Mapped[List["Party"]] = relationship(back_populates="creator", cascade="all, delete-orphan")


class Character(Base):
    # ... (остальная часть класса Character без изменений) ...
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    owner: Mapped["User"] = relationship(back_populates="characters")

    level: Mapped[int] = mapped_column(default=1)
    experience_points: Mapped[int] = mapped_column(default=0)

    # --- Навыки ---
    skill_strength: Mapped[int] = mapped_column(default=1)
    skill_dexterity: Mapped[int] = mapped_column(default=1)
    skill_endurance: Mapped[int] = mapped_column(default=1)
    skill_reaction: Mapped[int] = mapped_column(default=1)
    skill_technique: Mapped[int] = mapped_column(default=1)
    skill_adaptation: Mapped[int] = mapped_column(default=1)
    skill_logic: Mapped[int] = mapped_column(default=1)
    skill_attention: Mapped[int] = mapped_column(default=1)
    skill_erudition: Mapped[int] = mapped_column(default=1)
    skill_culture: Mapped[int] = mapped_column(default=1)
    skill_science: Mapped[int] = mapped_column(default=1)
    skill_medicine: Mapped[int] = mapped_column(default=1)
    skill_suggestion: Mapped[int] = mapped_column(default=1)
    skill_insight: Mapped[int] = mapped_column(default=1)
    skill_authority: Mapped[int] = mapped_column(default=1)
    skill_self_control: Mapped[int] = mapped_column(default=1)
    skill_religion: Mapped[int] = mapped_column(default=1)
    skill_flow: Mapped[int] = mapped_column(default=1)

    # --- Модификаторы ---
    def _get_modifier(self, skill_value: int) -> int:
        if skill_value <= 1: return 0
        if skill_value <= 3: return 1
        if skill_value <= 5: return 2
        if skill_value <= 7: return 3
        if skill_value <= 9: return 4
        return 5
    @hybrid_property
    def strength_mod(self): return self._get_modifier(self.skill_strength)
    @hybrid_property
    def dexterity_mod(self): return self._get_modifier(self.skill_dexterity)
    @hybrid_property
    def endurance_mod(self): return self._get_modifier(self.skill_endurance)
    @hybrid_property
    def reaction_mod(self): return self._get_modifier(self.skill_reaction)
    @hybrid_property
    def technique_mod(self): return self._get_modifier(self.skill_technique)
    @hybrid_property
    def adaptation_mod(self): return self._get_modifier(self.skill_adaptation)
    @hybrid_property
    def logic_mod(self): return self._get_modifier(self.skill_logic)
    @hybrid_property
    def attention_mod(self): return self._get_modifier(self.skill_attention)
    @hybrid_property
    def erudition_mod(self): return self._get_modifier(self.skill_erudition)
    @hybrid_property
    def culture_mod(self): return self._get_modifier(self.skill_culture)
    @hybrid_property
    def science_mod(self): return self._get_modifier(self.skill_science)
    @hybrid_property
    def medicine_mod(self): return self._get_modifier(self.skill_medicine)
    @hybrid_property
    def suggestion_mod(self): return self._get_modifier(self.skill_suggestion)
    @hybrid_property
    def insight_mod(self): return self._get_modifier(self.skill_insight)
    @hybrid_property
    def authority_mod(self): return self._get_modifier(self.skill_authority)
    @hybrid_property
    def self_control_mod(self): return self._get_modifier(self.skill_self_control)
    @hybrid_property
    def religion_mod(self): return self._get_modifier(self.skill_religion)
    @hybrid_property
    def flow_mod(self): return self._get_modifier(self.skill_flow)

    # --- Производные характеристики ---
    max_hp: Mapped[int] = mapped_column(default=10)
    current_hp: Mapped[int] = mapped_column(default=10)
    base_pu: Mapped[int] = mapped_column(default=1)
    current_pu: Mapped[int] = mapped_column(default=1)
    stamina_points: Mapped[int] = mapped_column(default=1)
    exhaustion_level: Mapped[int] = mapped_column(default=0)
    speed: Mapped[int] = mapped_column(default=10)
    @hybrid_property
    def initiative_bonus(self): return self.reaction_mod
    @hybrid_property
    def base_ac(self): return 10 + self.dexterity_mod

    # --- Уровни веток ---
    medic_branch_level: Mapped[int] = mapped_column(default=0)
    mutant_branch_level: Mapped[int] = mapped_column(default=0)
    sharpshooter_branch_level: Mapped[int] = mapped_column(default=0)
    scout_branch_level: Mapped[int] = mapped_column(default=0)
    technician_branch_level: Mapped[int] = mapped_column(default=0)
    fighter_branch_level: Mapped[int] = mapped_column(default=0)
    juggernaut_branch_level: Mapped[int] = mapped_column(default=0)

    # --- Снаряжение и инвентарь ---
    armor_inv_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey('character_inventory_items.id'), nullable=True)
    shield_inv_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey('character_inventory_items.id'), nullable=True)
    weapon1_inv_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey('character_inventory_items.id'), nullable=True)
    weapon2_inv_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey('character_inventory_items.id'), nullable=True)

    inventory: Mapped[List["CharacterInventoryItem"]] = relationship(
        back_populates="character",
        cascade="all, delete-orphan",
        # Указываем primaryjoin чтобы избежать путаницы с FK экипировки
        primaryjoin="Character.id == CharacterInventoryItem.character_id",
        order_by=CharacterInventoryItem.id
    )

    equipped_armor: Mapped[Optional["CharacterInventoryItem"]] = relationship(foreign_keys=[armor_inv_item_id], lazy="joined", post_update=True)
    equipped_shield: Mapped[Optional["CharacterInventoryItem"]] = relationship(foreign_keys=[shield_inv_item_id], lazy="joined", post_update=True)
    equipped_weapon1: Mapped[Optional["CharacterInventoryItem"]] = relationship(foreign_keys=[weapon1_inv_item_id], lazy="joined", post_update=True)
    equipped_weapon2: Mapped[Optional["CharacterInventoryItem"]] = relationship(foreign_keys=[weapon2_inv_item_id], lazy="joined", post_update=True)

    # --- Способности и эффекты ---
    available_abilities: Mapped[List["Ability"]] = relationship(secondary=character_abilities, back_populates="characters")
    active_status_effects: Mapped[List["StatusEffect"]] = relationship(secondary=character_status_effects, back_populates="characters")

    # --- Заметки ---
    appearance_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    character_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    motivation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    background_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Party(Base):
    # ... (без изменений) ...
    __tablename__ = "parties"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lobby_key: Mapped[str] = mapped_column(String, unique=True, index=True)
    max_players: Mapped[int] = mapped_column(Integer)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    creator: Mapped["User"] = relationship(back_populates="parties")

# --- Модели справочников (Item и подклассы) ---
class Item(Base):
    # ... (без изменений) ...
    __tablename__ = "items"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    item_type: Mapped[str] = mapped_column(String(50))
    category: Mapped[str] = mapped_column(String(50), default='Простое')
    rarity: Mapped[str] = mapped_column(String(50), default='Обычная')
    weight: Mapped[int] = mapped_column(default=1)
    __mapper_args__ = {'polymorphic_identity': 'item', 'polymorphic_on': "item_type"}

class Weapon(Item):
    # ... (без изменений) ...
    __tablename__ = "weapons"
    id: Mapped[int] = mapped_column(ForeignKey('items.id'), primary_key=True)
    damage: Mapped[str] = mapped_column(String)
    damage_type: Mapped[str] = mapped_column(String)
    properties: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    range_normal: Mapped[Optional[int]] = mapped_column(nullable=True)
    range_max: Mapped[Optional[int]] = mapped_column(nullable=True)
    reload_info: Mapped[Optional[str]] = mapped_column(nullable=True)
    is_two_handed: Mapped[bool] = mapped_column(default=False)
    __mapper_args__ = {'polymorphic_identity': 'weapon'}

class Armor(Item):
    # ... (без изменений) ...
    __tablename__ = "armors"
    id: Mapped[int] = mapped_column(ForeignKey('items.id'), primary_key=True)
    armor_type: Mapped[str] = mapped_column(String)
    ac_bonus: Mapped[int] = mapped_column(default=0)
    max_dex_bonus: Mapped[Optional[int]] = mapped_column(nullable=True)
    strength_requirement: Mapped[int] = mapped_column(default=0)
    stealth_disadvantage: Mapped[bool] = mapped_column(default=False)
    properties: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    __mapper_args__ = {'polymorphic_identity': 'armor'}

class Shield(Item):
    # ... (без изменений) ...
    __tablename__ = "shields"
    id: Mapped[int] = mapped_column(ForeignKey('items.id'), primary_key=True)
    ac_bonus: Mapped[int] = mapped_column(default=1)
    strength_requirement: Mapped[int] = mapped_column(default=0)
    properties: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    __mapper_args__ = {'polymorphic_identity': 'shield'}

class GeneralItem(Item):
    # ... (без изменений) ...
    __tablename__ = "general_items"
    id: Mapped[int] = mapped_column(ForeignKey('items.id'), primary_key=True)
    effect: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    uses: Mapped[Optional[int]] = mapped_column(nullable=True)
    __mapper_args__ = {'polymorphic_identity': 'general'}

class Ammo(Item):
    # ... (без изменений) ...
    __tablename__ = "ammos"
    id: Mapped[int] = mapped_column(ForeignKey('items.id'), primary_key=True)
    ammo_type: Mapped[str] = mapped_column(String)
    effect: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    __mapper_args__ = {'polymorphic_identity': 'ammo'}

class Ability(Base):
    # ... (без изменений) ...
    __tablename__ = "abilities"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str] = mapped_column(Text)
    branch: Mapped[str] = mapped_column(String)
    level_required: Mapped[int] = mapped_column(default=1)
    skill_requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    action_type: Mapped[str] = mapped_column(String, default="Действие")
    cooldown: Mapped[Optional[str]] = mapped_column(nullable=True)
    range: Mapped[Optional[str]] = mapped_column(nullable=True)
    target: Mapped[Optional[str]] = mapped_column(nullable=True)
    duration: Mapped[Optional[str]] = mapped_column(nullable=True)
    concentration: Mapped[bool] = mapped_column(default=False)
    saving_throw_attribute: Mapped[Optional[str]] = mapped_column(nullable=True)
    saving_throw_dc_formula: Mapped[Optional[str]] = mapped_column(nullable=True)
    effect_on_save_fail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    effect_on_save_success: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    characters: Mapped[List["Character"]] = relationship(secondary=character_abilities, back_populates="available_abilities")

class StatusEffect(Base):
    # ... (без изменений) ...
    __tablename__ = "status_effects"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str] = mapped_column(Text)
    characters: Mapped[List["Character"]] = relationship(secondary=character_status_effects, back_populates="active_status_effects")