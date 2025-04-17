# backend/app/schemas/party.py
from pydantic import BaseModel, Field

class PartyBase(BaseModel):
    max_players: int = Field(..., ge=2, le=10) # Ограничение на 2-10 игроков

class PartyCreate(PartyBase):
    pass # Нет доп. полей при создании

class PartyOut(PartyBase):
    id: int
    lobby_key: str
    creator_username: str # Поле для имени создателя

    class Config:
        from_attributes = True

class PartyJoin(BaseModel):
    lobby_key: str = Field(..., min_length=6, max_length=6)