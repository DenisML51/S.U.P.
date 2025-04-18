# backend/app/models/item.py
from __future__ import annotations
from typing import Optional, List
from sqlalchemy import Column, Integer, String, ForeignKey, Table, Text, Boolean, Float
from sqlalchemy.orm import relationship, Mapped, mapped_column

from ..db.database import Base
from .association_tables import weapon_granted_abilities
from .ability import Ability

class Item(Base):
    __tablename__ = "items"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    item_type: Mapped[str] = mapped_column(String(50))
    category: Mapped[str] = mapped_column(String(50), default='Простое')
    rarity: Mapped[str] = mapped_column(String(50), default='Обычная')
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    # Базовые определения, которые будут наследоваться
    strength_requirement: Mapped[int] = mapped_column(Integer, default=0)
    stealth_disadvantage: Mapped[bool] = mapped_column(Boolean, default=False)

    __mapper_args__ = {'polymorphic_identity': 'item', 'polymorphic_on': "item_type"}

class Weapon(Item):
    __tablename__ = "weapons"
    id: Mapped[int] = mapped_column(ForeignKey('items.id'), primary_key=True)
    damage: Mapped[str] = mapped_column(String)
    damage_type: Mapped[str] = mapped_column(String)
    properties: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    range_normal: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    range_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reload_info: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_two_handed: Mapped[bool] = mapped_column(Boolean, default=False)
    granted_abilities: Mapped[List["Ability"]] = relationship("Ability", secondary=weapon_granted_abilities, back_populates="granted_by_weapons", lazy="selectin")
    __mapper_args__ = {'polymorphic_identity': 'weapon'}

class Armor(Item):
    __tablename__ = "armors"
    id: Mapped[int] = mapped_column(ForeignKey('items.id'), primary_key=True)
    armor_type: Mapped[str] = mapped_column(String)
    ac_bonus: Mapped[int] = mapped_column(Integer, default=0)
    max_dex_bonus: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # --- УБИРАЕМ ПОВТОРНЫЕ ОПРЕДЕЛЕНИЯ ---
    # strength_requirement: Mapped[int] = mapped_column(Integer) # Убрано
    # stealth_disadvantage: Mapped[bool] = mapped_column(Boolean) # Убрано
    properties: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    __mapper_args__ = {'polymorphic_identity': 'armor'}
    # Примечание: Если для Armor/Shield нужны ДРУГИЕ значения по умолчанию или ограничения,
    # чем в Item, нужно использовать более сложные техники SQLAlchemy,
    # но для данного случая наследования достаточно.

class Shield(Item):
    __tablename__ = "shields"
    id: Mapped[int] = mapped_column(ForeignKey('items.id'), primary_key=True)
    ac_bonus: Mapped[int] = mapped_column(Integer, default=1)
    # --- УБИРАЕМ ПОВТОРНЫЕ ОПРЕДЕЛЕНИЯ ---
    # strength_requirement: Mapped[int] = mapped_column(Integer) # Убрано
    properties: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    __mapper_args__ = {'polymorphic_identity': 'shield'}

class GeneralItem(Item):
    __tablename__ = "general_items"
    id: Mapped[int] = mapped_column(ForeignKey('items.id'), primary_key=True)
    effect: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    uses: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    __mapper_args__ = {'polymorphic_identity': 'general'}

class Ammo(Item):
    __tablename__ = "ammos"
    id: Mapped[int] = mapped_column(ForeignKey('items.id'), primary_key=True)
    ammo_type: Mapped[str] = mapped_column(String)
    effect: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    __mapper_args__ = {'polymorphic_identity': 'ammo'}