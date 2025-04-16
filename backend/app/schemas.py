from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class CharacterCreate(BaseModel):
    name: str

class CharacterOut(BaseModel):
    id: int
    name: str
    level: int
    hp: int

    class Config:
        orm_mode = True

class PartyCreate(BaseModel):
    max_players: int

class PartyOut(BaseModel):
    id: int
    lobby_key: str
    max_players: int
    creator_username: str   # Это поле возвращается из эндпоинтов

    class Config:
        orm_mode = True

class PartyJoin(BaseModel):
    lobby_key: str
