# backend/app/models/custom_item.py (Новый файл)
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from ..db.database import Base

if TYPE_CHECKING:
    from .character import Character

class CharacterCustomItem(Base):
    __tablename__ = 'character_custom_items'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    character_id: Mapped[int] = mapped_column(ForeignKey('characters.id', ondelete='CASCADE'), index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False) # Ограничим длину имени
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Связь для возможного доступа из Character (optional backref)
    # character: Mapped["Character"] = relationship(back_populates="custom_items")

    def __repr__(self):
        return f"<CustomItem(id={self.id}, name='{self.name}', character_id={self.character_id})>"
