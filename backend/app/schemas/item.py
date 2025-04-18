# backend/app/schemas/item.py
from pydantic import BaseModel, Field
from typing import List, Optional, Union, Any

# Импортируем зависимую схему
from .ability import AbilityOut

# --- Базовые и Дочерние Схемы Предметов ---
class ItemBase(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    item_type: str # weapon, armor, shield, general, ammo
    category: str
    rarity: str
    weight: float
    # Опциональные поля в базовом классе, т.к. не все предметы их имеют
    strength_requirement: Optional[int] = None
    stealth_disadvantage: Optional[bool] = None

    class Config:
        from_attributes = True


class WeaponOut(ItemBase):
    item_type: str = 'weapon' # Уточняем тип
    damage: str
    damage_type: str
    properties: Optional[str] = None
    range_normal: Optional[int] = None
    range_max: Optional[int] = None
    reload_info: Optional[str] = None
    is_two_handed: bool
    # Переопределяем поля, если они обязательны для оружия
    strength_requirement: int = 0
    stealth_disadvantage: bool = False
    # Добавляем поле для способностей оружия
    granted_abilities: List[AbilityOut] = []


class ArmorOut(ItemBase):
    item_type: str = 'armor'
    armor_type: str
    ac_bonus: int
    max_dex_bonus: Optional[int] = None
    # Обязательные поля для брони
    strength_requirement: int
    stealth_disadvantage: bool
    properties: Optional[str] = None


class ShieldOut(ItemBase):
    item_type: str = 'shield'
    ac_bonus: int
    # Обязательные поля для щита
    strength_requirement: int
    properties: Optional[str] = None
    # stealth_disadvantage наследуется (False)


class GeneralItemOut(ItemBase):
    item_type: str = 'general'
    effect: Optional[str] = None
    uses: Optional[int] = None


class AmmoOut(ItemBase):
    item_type: str = 'ammo'
    ammo_type: str
    effect: Optional[str] = None

# Union для использования в инвентаре и детальной схеме персонажа
# Важно, чтобы дочерние типы шли ПЕРЕД базовым ItemBase
AnyItemOut = Union[WeaponOut, ArmorOut, ShieldOut, GeneralItemOut, AmmoOut, ItemBase]


# --- Схемы для Инвентаря и Экипировки ---

class CharacterInventoryItemOut(BaseModel):
    id: int # ID самой записи в инвентаре
    item: AnyItemOut # Вложенная схема предмета (любого типа)
    quantity: int

    class Config:
        from_attributes = True


class AddItemToInventory(BaseModel):
    item_id: int # ID предмета из справочника (items.id)
    quantity: int = Field(1, gt=0) # Количество добавляемых предметов


class EquipItem(BaseModel):
    inventory_item_id: int # ID записи в инвентаре (character_inventory_items.id)
    slot: str = Field(..., pattern="^(armor|shield|weapon1|weapon2)$") # Валидация слота