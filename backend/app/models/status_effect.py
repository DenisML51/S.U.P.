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

    # ... (поля модели StatusEffect как в предыдущем ответе) ...
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=True)
    roll_modifier_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    roll_modifier_targets: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    ac_modifier: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    numeric_modifiers: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    duration_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    action_restrictions: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    saving_throw_modifiers: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)


    # Используем TYPE_CHECKING для аннотации типа Character
    characters: Mapped[List["Character"]] = relationship(
        secondary=character_status_effects, # Теперь должно работать
        back_populates="active_status_effects"
    )

    def __repr__(self):
        return f"<StatusEffect(id={self.id}, name='{self.name}')>"