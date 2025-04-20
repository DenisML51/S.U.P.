# backend/app/models/status_effect.py
from __future__ import annotations
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, Integer, String, ForeignKey, Table, Text, Boolean, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column

from ..db.database import Base
from .association_tables import character_status_effects
# Не импортируем Character напрямую

class StatusEffect(Base):
    __tablename__ = "status_effects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str] = mapped_column(Text)

    roll_modifier_type: Mapped[Optional[str]] = mapped_column(
        String,
        nullable=True,
        comment="Тип модификатора броска: 'advantage', 'disadvantage' или None"
    )
    roll_modifier_targets: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, # Используем JSON для хранения структурированных целей
        nullable=True,
        comment='Словарь/JSON, указывающий на какие типы бросков действует модификатор. Пример: {"attack_rolls": true, "skill_checks": ["dexterity", "strength"], "saving_throws": "all"}'
    )

    # Связь "многие-ко-многим" с Character
    characters: Mapped[List["Character"]] = relationship(
        "Character",
        secondary=character_status_effects,
        back_populates="active_status_effects"
    )