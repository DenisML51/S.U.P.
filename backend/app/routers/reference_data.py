# backend/app/routers/reference_data.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

# Относительные импорты
from .. import models, schemas # Нужны для response_model и типов
from ..crud import reference as reference_crud # Используем CRUD для справочников
from ..db.database import get_db

router = APIRouter(
    prefix="/data",
    tags=["Reference Data"]
    # Обычно не требует аутентификации
)

@router.get("/weapons", response_model=List[schemas.WeaponOut], summary="Список всего оружия")
def get_all_weapons_endpoint(db: Session = Depends(get_db)):
    items = reference_crud.get_all_items(db, models.Weapon)
    return items

@router.get("/armor", response_model=List[schemas.ArmorOut], summary="Список всей брони")
def get_all_armor_endpoint(db: Session = Depends(get_db)):
    items = reference_crud.get_all_items(db, models.Armor)
    return items

@router.get("/shields", response_model=List[schemas.ShieldOut], summary="Список всех щитов")
def get_all_shields_endpoint(db: Session = Depends(get_db)):
    items = reference_crud.get_all_items(db, models.Shield)
    return items

@router.get("/general_items", response_model=List[schemas.GeneralItemOut], summary="Список общих предметов")
def get_all_general_items_endpoint(db: Session = Depends(get_db)):
    items = reference_crud.get_all_items(db, models.GeneralItem)
    return items

@router.get("/ammo", response_model=List[schemas.AmmoOut], summary="Список типов боеприпасов")
def get_all_ammo_endpoint(db: Session = Depends(get_db)):
    items = reference_crud.get_all_items(db, models.Ammo)
    return items

@router.get("/abilities", response_model=List[schemas.AbilityOut], summary="Список всех способностей")
def get_all_abilities_endpoint(db: Session = Depends(get_db)):
    abilities = reference_crud.get_all_abilities(db)
    return abilities

@router.get("/status_effects", response_model=List[schemas.StatusEffectOut], summary="Список всех статус-эффектов")
def get_all_status_effects_endpoint(db: Session = Depends(get_db)):
    effects = reference_crud.get_all_status_effects(db)
    return effects