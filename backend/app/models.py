from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    characters = relationship("Character", back_populates="owner")
    parties = relationship("Party", back_populates="creator")

class Character(Base):
    __tablename__ = "characters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    level = Column(Integer, default=1)
    hp = Column(Integer, default=10)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="characters")

class Party(Base):
    __tablename__ = "parties"
    id = Column(Integer, primary_key=True, index=True)
    lobby_key = Column(String, unique=True, index=True)
    max_players = Column(Integer)
    creator_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User", back_populates="parties")
