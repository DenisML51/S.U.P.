# backend/app/crud/party.py
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status
from typing import Optional
import random
import string

from ..models.party import Party
from ..models.user import User # Нужна для проверки party.creator
from ..schemas.party import PartyCreate, PartyOut

def create_party(db: Session, user_id: int, party: PartyCreate) -> PartyOut:
    """Создает новую партию и возвращает ее данные в формате PartyOut."""
    # Генерируем уникальный ключ лобби
    while True:
        lobby_key = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        existing_party = db.query(Party.id).filter(Party.lobby_key == lobby_key).first()
        if not existing_party:
            break # Ключ уникален

    db_party = Party(
        lobby_key=lobby_key,
        max_players=party.max_players,
        creator_id=user_id
    )
    db.add(db_party)
    db.commit()
    db.refresh(db_party)

    # Загружаем создателя для формирования ответа PartyOut
    # Используем selectinload для загрузки связи при refresh (если это поддерживается вашей версией SQLAlchemy)
    # или делаем отдельный запрос
    db.refresh(db_party, attribute_names=['creator'])
    # Альтернативно:
    # creator = db.query(models.User).filter(models.User.id == db_party.creator_id).first()

    if not db_party.creator:
         # Это не должно произойти, если user_id корректен
         print(f"ВНИМАНИЕ: Не удалось загрузить создателя для партии ID {db_party.id}")
         creator_username = "Неизвестно"
    else:
         creator_username = db_party.creator.username

    return PartyOut(
        id=db_party.id,
        lobby_key=db_party.lobby_key,
        max_players=db_party.max_players,
        creator_username=creator_username
    )


def get_party_by_lobby_key(db: Session, lobby_key: str) -> Optional[Party]:
    """Находит партию по ключу лобби, загружая создателя."""
    # Сразу загружаем создателя, чтобы он был доступен в вызывающем коде
    return db.query(Party).options(
        selectinload(Party.creator)
    ).filter(Party.lobby_key == lobby_key).first()