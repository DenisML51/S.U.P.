# backend/app/models/__init__.py
# Импортируем все модели для удобства доступа из других модулей
# Важно: убедитесь, что нет циклических зависимостей МЕЖДУ файлами моделей,
# иначе используйте forward references (строки) в relationship

from .user import User
from .party import Party
from .item import Item, Weapon, Armor, Shield, GeneralItem, Ammo
from .ability import Ability
from .status_effect import StatusEffect
from .character import Character, CharacterInventoryItem
from .association_tables import character_abilities, character_status_effects, weapon_granted_abilities

# Константа XP_THRESHOLDS может остаться в character.py или быть вынесена сюда
from .character import XP_THRESHOLDS