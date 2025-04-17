# backend/app/models/association_tables.py
from sqlalchemy import Table, Column, Integer, ForeignKey

# Импортируем Base из db.database
from ..db.database import Base

# Таблица связи Персонаж <-> Способности
character_abilities = Table(
    'character_abilities', Base.metadata,
    Column('character_id', Integer, ForeignKey('characters.id', ondelete='CASCADE'), primary_key=True),
    Column('ability_id', Integer, ForeignKey('abilities.id', ondelete='CASCADE'), primary_key=True)
)

# Таблица связи Персонаж <-> Статус-Эффекты
character_status_effects = Table(
    'character_status_effects', Base.metadata,
    Column('character_id', Integer, ForeignKey('characters.id', ondelete='CASCADE'), primary_key=True),
    Column('status_effect_id', Integer, ForeignKey('status_effects.id', ondelete='CASCADE'), primary_key=True)
)

# Таблица связи Оружие <-> Способности
weapon_granted_abilities = Table(
    'weapon_granted_abilities', Base.metadata,
    Column('weapon_id', Integer, ForeignKey('weapons.id', ondelete='CASCADE'), primary_key=True),
    Column('ability_id', Integer, ForeignKey('abilities.id', ondelete='CASCADE'), primary_key=True)
)