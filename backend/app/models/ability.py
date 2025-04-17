# backend/app/models/ability.py
from __future__ import annotations
from typing import Optional, List
from sqlalchemy import Column, Integer, String, ForeignKey, Table, Text, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column

from ..db.database import Base
# Импортируем таблицу связи
from .association_tables import weapon_granted_abilities, character_abilities
# Не импортируем Character, Weapon напрямую

class Ability(Base):
    __tablename__ = "abilities"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str] = mapped_column(Text)
    branch: Mapped[str] = mapped_column(String) # medic, mutant, weapon, general, etc.
    level_required: Mapped[int] = mapped_column(Integer, default=1)
    skill_requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON string? e.g., '{"skill_logic": 5, "skill_technique": 3}'
    action_type: Mapped[str] = mapped_column(String, default="Действие") # Действие, Бонусное действие, Реакция, Пассивно
    cooldown: Mapped[Optional[str]] = mapped_column(String, nullable=True) # "1 ход", "3 хода", "Короткий отдых", "Нет"
    range: Mapped[Optional[str]] = mapped_column(String, nullable=True) # "Касание", "10 метров", "Себя"
    target: Mapped[Optional[str]] = mapped_column(String, nullable=True) # "Одно существо", "Область", "Себя"
    duration: Mapped[Optional[str]] = mapped_column(String, nullable=True) # "1 раунд", "1 минута", "Мгновенно"
    concentration: Mapped[bool] = mapped_column(Boolean, default=False)
    saving_throw_attribute: Mapped[Optional[str]] = mapped_column(String, nullable=True) # Сила, Ловкость, Самообладание etc.
    saving_throw_dc_formula: Mapped[Optional[str]] = mapped_column(String, nullable=True) # "8+Поток+Проф?", "СЛ Способности"
    effect_on_save_fail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    effect_on_save_success: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Связь "многие-ко-многим" с Character (изучившие способность)
    characters: Mapped[List["Character"]] = relationship(
        "Character",
        secondary=character_abilities,
        back_populates="available_abilities"
    )

    # Связь "многие-ко-многим" с Weapon (оружие, дающее эту способность)
    granted_by_weapons: Mapped[List["Weapon"]] = relationship(
        "Weapon", # Используем строку
        secondary=weapon_granted_abilities,
        back_populates="granted_abilities"
    )