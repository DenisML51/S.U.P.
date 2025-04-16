from sqlalchemy import Column, Integer, String, ForeignKey, Table, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from .database import Base  # Импорт единственного Base из database.py

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
    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey('characters.id'), nullable=False)
    item_id = Column(Integer, ForeignKey('items.id'), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)

    # Явно указываем внешние ключи для связи
    character = relationship("Character", back_populates="inventory", foreign_keys=[character_id])
    item = relationship("Item")  # Полиморфная связь для загрузки нужного подкласса


# --- Основные модели ---

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    characters = relationship("Character", back_populates="owner", cascade="all, delete-orphan")
    parties = relationship("Party", back_populates="creator", cascade="all, delete-orphan")


class Character(Base):
    __tablename__ = "characters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="characters")

    level = Column(Integer, default=1, nullable=False)
    experience_points = Column(Integer, default=0, nullable=False)

    # --- Навыки (Физиология) ---
    skill_strength = Column(Integer, default=1, nullable=False)
    skill_dexterity = Column(Integer, default=1, nullable=False)
    skill_endurance = Column(Integer, default=1, nullable=False)
    skill_reaction = Column(Integer, default=1, nullable=False)
    skill_technique = Column(Integer, default=1, nullable=False)
    skill_adaptation = Column(Integer, default=1, nullable=False)

    # --- Навыки (Интеллект) ---
    skill_logic = Column(Integer, default=1, nullable=False)
    skill_attention = Column(Integer, default=1, nullable=False)
    skill_erudition = Column(Integer, default=1, nullable=False)
    skill_culture = Column(Integer, default=1, nullable=False)
    skill_science = Column(Integer, default=1, nullable=False)
    skill_medicine = Column(Integer, default=1, nullable=False)

    # --- Навыки (Ментальность) ---
    skill_suggestion = Column(Integer, default=1, nullable=False)
    skill_insight = Column(Integer, default=1, nullable=False)
    skill_authority = Column(Integer, default=1, nullable=False)
    skill_self_control = Column(Integer, default=1, nullable=False)
    skill_religion = Column(Integer, default=1, nullable=False)
    skill_flow = Column(Integer, default=1, nullable=False)

    # --- Расчетные Модификаторы (гетерогенные свойства) ---
    @hybrid_property
    def strength_mod(self):
        return self.skill_strength // 2

    @hybrid_property
    def dexterity_mod(self):
        return self.skill_dexterity // 2

    @hybrid_property
    def endurance_mod(self):
        return self.skill_endurance // 2

    @hybrid_property
    def reaction_mod(self):
        return self.skill_reaction // 2

    @hybrid_property
    def technique_mod(self):
        return self.skill_technique // 2

    @hybrid_property
    def adaptation_mod(self):
        return self.skill_adaptation // 2

    @hybrid_property
    def logic_mod(self):
        return self.skill_logic // 2

    @hybrid_property
    def attention_mod(self):
        return self.skill_attention // 2

    @hybrid_property
    def erudition_mod(self):
        return self.skill_erudition // 2

    @hybrid_property
    def culture_mod(self):
        return self.skill_culture // 2

    @hybrid_property
    def science_mod(self):
        return self.skill_science // 2

    @hybrid_property
    def medicine_mod(self):
        return self.skill_medicine // 2

    @hybrid_property
    def suggestion_mod(self):
        return self.skill_suggestion // 2

    @hybrid_property
    def insight_mod(self):
        return self.skill_insight // 2

    @hybrid_property
    def authority_mod(self):
        return self.skill_authority // 2

    @hybrid_property
    def self_control_mod(self):
        return self.skill_self_control // 2

    @hybrid_property
    def religion_mod(self):
        return self.skill_religion // 2

    @hybrid_property
    def flow_mod(self):
        return self.skill_flow // 2

    # --- Производные Характеристики ---
    max_hp = Column(Integer, default=10, nullable=False)
    current_hp = Column(Integer, default=10, nullable=False)
    base_pu = Column(Integer, default=1, nullable=False)
    current_pu = Column(Integer, default=1, nullable=False)
    stamina_points = Column(Integer, default=1, nullable=False)
    exhaustion_level = Column(Integer, default=0, nullable=False)
    speed = Column(Integer, default=10, nullable=False)

    # --- Уровни Веток Классов ---
    medic_branch_level = Column(Integer, default=0, nullable=False)
    mutant_branch_level = Column(Integer, default=0, nullable=False)
    sharpshooter_branch_level = Column(Integer, default=0, nullable=False)
    scout_branch_level = Column(Integer, default=0, nullable=False)
    technician_branch_level = Column(Integer, default=0, nullable=False)
    fighter_branch_level = Column(Integer, default=0, nullable=False)
    juggernaut_branch_level = Column(Integer, default=0, nullable=False)

    # --- Снаряжение и инвентарь ---
    equipped_armor_id = Column(Integer, ForeignKey('character_inventory_items.id'), nullable=True)
    equipped_shield_id = Column(Integer, ForeignKey('character_inventory_items.id'), nullable=True)
    equipped_weapon1_id = Column(Integer, ForeignKey('character_inventory_items.id'), nullable=True)
    equipped_weapon2_id = Column(Integer, ForeignKey('character_inventory_items.id'), nullable=True)

    inventory = relationship(
        "CharacterInventoryItem",
        primaryjoin="Character.id == CharacterInventoryItem.character_id",
        back_populates="character",
        cascade="all, delete-orphan"
    )
    equipped_armor = relationship("CharacterInventoryItem", foreign_keys=[equipped_armor_id], post_update=True,
                                  lazy="joined")
    equipped_shield = relationship("CharacterInventoryItem", foreign_keys=[equipped_shield_id], post_update=True,
                                   lazy="joined")
    equipped_weapon1 = relationship("CharacterInventoryItem", foreign_keys=[equipped_weapon1_id], post_update=True,
                                    lazy="joined")
    equipped_weapon2 = relationship("CharacterInventoryItem", foreign_keys=[equipped_weapon2_id], post_update=True,
                                    lazy="joined")

    # --- Способности и эффекты ---
    available_abilities = relationship("Ability", secondary=character_abilities, back_populates="characters")
    active_status_effects = relationship("StatusEffect", secondary=character_status_effects,
                                         back_populates="characters")

    # --- Дополнительные поля для описания персонажа ---
    appearance_notes = Column(Text, nullable=True)
    character_notes = Column(Text, nullable=True)
    motivation_notes = Column(Text, nullable=True)
    background_notes = Column(Text, nullable=True)

    @hybrid_property
    def initiative_bonus(self):
        return self.reaction_mod

    @hybrid_property
    def base_ac(self):
        return 10 + self.dexterity_mod


class Party(Base):
    __tablename__ = "parties"
    id = Column(Integer, primary_key=True, index=True)
    lobby_key = Column(String, unique=True, index=True, nullable=False)
    max_players = Column(Integer, nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="parties")


# --- Модели справочников (предметов) ---

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    item_type = Column(String(50))  # 'weapon', 'armor', 'shield', 'general', 'ammo'
    category = Column(String(50), default='Простое')
    rarity = Column(String(50), default='Обычная')
    weight = Column(Integer, default=1)
    __mapper_args__ = {
        'polymorphic_identity': 'item',
        'polymorphic_on': item_type
    }


class Weapon(Item):
    __tablename__ = "weapons"
    id = Column(Integer, ForeignKey('items.id'), primary_key=True)
    damage = Column(String, nullable=False)
    damage_type = Column(String, nullable=False)
    properties = Column(Text, nullable=True)
    range_normal = Column(Integer, nullable=True)
    range_max = Column(Integer, nullable=True)
    reload_info = Column(String, nullable=True)
    __mapper_args__ = {
        'polymorphic_identity': 'weapon',
    }


class Armor(Item):
    __tablename__ = "armors"
    id = Column(Integer, ForeignKey('items.id'), primary_key=True)
    armor_type = Column(String, nullable=False)
    ac_bonus = Column(Integer, default=0)
    max_dex_bonus = Column(Integer, nullable=True)
    strength_requirement = Column(Integer, default=0)
    stealth_disadvantage = Column(Boolean, default=False)
    properties = Column(Text, nullable=True)
    __mapper_args__ = {
        'polymorphic_identity': 'armor',
    }


class Shield(Item):
    __tablename__ = "shields"
    id = Column(Integer, ForeignKey('items.id'), primary_key=True)
    ac_bonus = Column(Integer, default=1)
    strength_requirement = Column(Integer, default=0)
    properties = Column(Text, nullable=True)
    __mapper_args__ = {
        'polymorphic_identity': 'shield',
    }


class GeneralItem(Item):
    __tablename__ = "general_items"
    id = Column(Integer, ForeignKey('items.id'), primary_key=True)
    effect = Column(Text, nullable=True)
    uses = Column(Integer, nullable=True)
    __mapper_args__ = {
        'polymorphic_identity': 'general',
    }


class Ammo(Item):
    __tablename__ = "ammos"
    id = Column(Integer, ForeignKey('items.id'), primary_key=True)
    ammo_type = Column(String, nullable=False)
    effect = Column(Text, nullable=True)
    __mapper_args__ = {
        'polymorphic_identity': 'ammo',
    }


class Ability(Base):
    __tablename__ = "abilities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=False)
    branch = Column(String, nullable=False)
    level_required = Column(Integer, default=1, nullable=False)
    skill_requirements = Column(Text, nullable=True)
    action_type = Column(String, default="Действие")
    cooldown = Column(String, nullable=True)
    range = Column(String, nullable=True)
    target = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    concentration = Column(Boolean, default=False)
    saving_throw_attribute = Column(String, nullable=True)
    saving_throw_dc_formula = Column(String, nullable=True)
    characters = relationship("Character", secondary=character_abilities, back_populates="available_abilities")


class StatusEffect(Base):
    __tablename__ = "status_effects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=False)
    characters = relationship("Character", secondary=character_status_effects, back_populates="active_status_effects")
