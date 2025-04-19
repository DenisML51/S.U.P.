# backend/app/models/user.py
from __future__ import annotations # Для Python < 3.11, чтобы работали type hints с "Character", "Party"
from typing import List
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy import String, Integer, Boolean # Импортируем типы

from ..db.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false', nullable=False)


    # Связь "один-ко-многим" с Character
    characters: Mapped[List["Character"]] = relationship(
        "Character", # Используем строку для избежания циклического импорта
        back_populates="owner",
        cascade="all, delete-orphan"
    )
    # Связь "один-ко-многим" с Party (как создатель)
    parties: Mapped[List["Party"]] = relationship(
        "Party", # Используем строку
        back_populates="creator",
        cascade="all, delete-orphan"
    )