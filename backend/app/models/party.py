# backend/app/models/party.py
from __future__ import annotations
from typing import Optional # Добавили Optional
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from ..db.database import Base
# Не импортируем User напрямую, используем строку в relationship

class Party(Base):
    __tablename__ = "parties"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lobby_key: Mapped[str] = mapped_column(String, unique=True, index=True)
    max_players: Mapped[int] = mapped_column(Integer)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    # Связь "многие-к-одному" с User
    creator: Mapped["User"] = relationship("User", back_populates="parties")