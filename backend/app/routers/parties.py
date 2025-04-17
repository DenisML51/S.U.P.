# backend/app/routers/parties.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
# Убрали List, т.к. не используется в этом файле напрямую
# from typing import List

# Относительные импорты
from .. import models, schemas # Нужны для response_model и типов
from ..crud import party as party_crud # Используем CRUD для партий
from ..db.database import get_db
from ..core.auth import get_current_user

router = APIRouter(
    prefix="/parties",
    tags=["Parties"],
    dependencies=[Depends(get_current_user)]
)

@router.post("", response_model=schemas.PartyOut, summary="Создать новую партию")
async def create_new_party(
    party_in: schemas.PartyCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    party = party_crud.create_party(db=db, user_id=current_user.id, party=party_in)
    return party

@router.post("/join", response_model=schemas.PartyOut, summary="Присоединиться к партии")
async def join_existing_party(
    join_data: schemas.PartyJoin,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    party = party_crud.get_party_by_lobby_key(db=db, lobby_key=join_data.lobby_key.upper())
    if party is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Лобби не найдено")

    # TODO: Добавить проверку на max_players, возможно, обратившись к websocket_manager

    if not party.creator:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не найден создатель лобби")

    return schemas.PartyOut(
        id=party.id,
        lobby_key=party.lobby_key,
        max_players=party.max_players,
        creator_username=party.creator.username
    )