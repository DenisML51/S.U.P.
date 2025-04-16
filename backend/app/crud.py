from sqlalchemy.orm import Session
from . import models, schemas, auth
import random
import string

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_characters_by_user(db: Session, user_id: int):
    return db.query(models.Character).filter(models.Character.owner_id == user_id).all()

def create_character(db: Session, user_id: int, character: schemas.CharacterCreate):
    db_char = models.Character(name=character.name, owner_id=user_id)
    db.add(db_char)
    db.commit()
    db.refresh(db_char)
    return db_char

def create_party(db: Session, user_id: int, party: schemas.PartyCreate):
    lobby_key = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    db_party = models.Party(lobby_key=lobby_key, max_players=party.max_players, creator_id=user_id)
    db.add(db_party)
    db.commit()
    db.refresh(db_party)
    return db_party

def get_party_by_lobby_key(db: Session, lobby_key: str):
    return db.query(models.Party).filter(models.Party.lobby_key == lobby_key).first()
