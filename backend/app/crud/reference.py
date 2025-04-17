# backend/app/crud/reference.py
from sqlalchemy.orm import Session, selectinload
from typing import List, Type

from ..models.item import Item, Weapon, Armor, Shield, GeneralItem, Ammo
from ..models.ability import Ability
from ..models.status_effect import StatusEffect

def get_all_items(db: Session, item_cls: Type[Item]) -> List[Item]:
    """Получает все предметы указанного класса (Weapon, Armor, etc.)."""
    query = db.query(item_cls)
    # Если это оружие, предзагружаем его способности
    if item_cls == Weapon:
         query = query.options(selectinload(Weapon.granted_abilities))
    return query.order_by(item_cls.name).all()

def get_all_abilities(db: Session) -> List[Ability]:
    """Получает все способности, сортированные по ветке и уровню."""
    # Загружаем связи с оружием сразу, чтобы они были доступны при необходимости
    # (хотя для простого списка это может быть излишне)
    return db.query(Ability).options(
        selectinload(Ability.granted_by_weapons)
    ).order_by(
        Ability.branch,
        Ability.level_required
    ).all()

def get_all_status_effects(db: Session) -> List[StatusEffect]:
    """Получает все статус-эффекты, сортированные по имени."""
    return db.query(StatusEffect).order_by(StatusEffect.name).all()