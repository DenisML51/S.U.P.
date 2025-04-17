# backend/app/models/status_effect.py
from __future__ import annotations
from typing import Optional, List
from sqlalchemy import Column, Integer, String, ForeignKey, Table, Text, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column

from ..db.database import Base
from .association_tables import character_status_effects
# Не импортируем Character напрямую

class StatusEffect(Base):
    __tablename__ = "status_effects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str] = mapped_column(Text)

    # Связь "многие-ко-многим" с Character
    characters: Mapped[List["Character"]] = relationship(
        "Character",
        secondary=character_status_effects,
        back_populates="active_status_effects"
    )