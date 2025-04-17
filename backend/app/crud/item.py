# backend/app/crud/item.py
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status
from typing import Optional

from ..models.character import Character, CharacterInventoryItem
from ..models.item import Item, Weapon, Armor, Shield, GeneralItem, Ammo
from ..schemas.item import AddItemToInventory, EquipItem

# --- Inventory Operations ---

def get_inventory_item(db: Session, inventory_item_id: int, character_id: int, user_id: int) -> Optional[CharacterInventoryItem]:
    """
    Получает конкретный предмет инвентаря персонажа с загруженным объектом Item.
    Проверяет принадлежность персонажа пользователю.
    """
    return db.query(CharacterInventoryItem).join(
        Character, Character.id == CharacterInventoryItem.character_id
    ).options(
        # Загружаем связанный объект Item (полиморфизм сработает автоматически)
        selectinload(CharacterInventoryItem.item)
    ).filter(
        CharacterInventoryItem.id == inventory_item_id,
        CharacterInventoryItem.character_id == character_id,
        Character.owner_id == user_id # Проверка владельца персонажа
    ).first()


def add_item_to_inventory(db: Session, character_id: int, user_id: int, item_add: AddItemToInventory) -> Optional[CharacterInventoryItem]:
    """Добавляет предмет в инвентарь персонажа, обрабатывает стаки."""
    # Проверяем, существует ли персонаж и принадлежит ли он пользователю
    character = db.query(Character.id).filter(
        Character.id == character_id,
        Character.owner_id == user_id
    ).first()
    if not character:
        # Не выбрасываем исключение, а возвращаем None, чтобы API мог вернуть 404
        return None

    # Проверяем, существует ли сам предмет в справочнике
    item = db.query(Item).filter(Item.id == item_add.item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден в справочнике")

    # Определяем, стакается ли предмет (Патроны и Общие)
    is_stackable = isinstance(item, (Ammo, GeneralItem))

    db_inv_item: Optional[CharacterInventoryItem] = None

    if is_stackable:
        # Ищем существующий стак этого предмета в инвентаре персонажа
        existing_inv_item = db.query(CharacterInventoryItem).filter(
            CharacterInventoryItem.character_id == character_id,
            CharacterInventoryItem.item_id == item_add.item_id
        ).first()

        if existing_inv_item:
            existing_inv_item.quantity += item_add.quantity
            db_inv_item = existing_inv_item # Работаем с существующей записью
            print(f"Увеличено количество предмета '{item.name}' для персонажа ID {character_id}")

    # Если предмет не стакается ИЛИ стак не найден, создаем новую запись
    if db_inv_item is None:
        db_inv_item = CharacterInventoryItem(
            character_id=character_id,
            item_id=item_add.item_id,
            quantity=item_add.quantity if is_stackable else 1 # Нестакающиеся всегда добавляются по 1 шт.
        )
        db.add(db_inv_item)
        print(f"Добавлен новый предмет '{item.name}' для персонажа ID {character_id}")


    try:
        db.commit()
        db.refresh(db_inv_item)
        # Явно обновляем связь с item, чтобы она была доступна в возвращаемом объекте
        db.refresh(db_inv_item, attribute_names=['item'])
        return db_inv_item
    except Exception as e:
        db.rollback()
        print(f"Ошибка commit при добавлении предмета ID {item_add.item_id} персонажу ID {character_id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка базы данных при добавлении предмета")


def remove_item_from_inventory(db: Session, inventory_item_id: int, character_id: int, user_id: int, quantity: int = 1) -> bool:
    """Удаляет предмет из инвентаря (уменьшает количество или удаляет запись). Возвращает True при успехе."""
    # Получаем запись инвентаря с проверкой владельца
    inv_item = get_inventory_item(db, inventory_item_id, character_id, user_id)
    if not inv_item:
        return False # Предмет не найден или не принадлежит персонажу

    # Загружаем персонажа, чтобы снять предмет с экипировки, если удаляется последняя единица
    character = db.query(Character).filter(Character.id == character_id).first()
    if not character:
        return False # Неожиданная ошибка, персонаж должен существовать

    success = False
    if inv_item.quantity > quantity:
        inv_item.quantity -= quantity
        print(f"Уменьшено количество предмета ID {inventory_item_id} на {quantity}")
        success = True
    elif inv_item.quantity <= quantity: # Удаляем всю запись
        print(f"Удаляется запись инвентаря ID {inventory_item_id}")
        # Проверяем, не экипирован ли этот предмет, и снимаем его
        if character.armor_inv_item_id == inv_item.id: character.armor_inv_item_id = None
        if character.shield_inv_item_id == inv_item.id: character.shield_inv_item_id = None
        if character.weapon1_inv_item_id == inv_item.id: character.weapon1_inv_item_id = None
        if character.weapon2_inv_item_id == inv_item.id: character.weapon2_inv_item_id = None
        # Удаляем саму запись из инвентаря
        db.delete(inv_item)
        success = True

    if success:
        try:
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Ошибка commit при удалении предмета ID {inventory_item_id} у персонажа ID {character_id}: {e}")
            return False # Возвращаем False при ошибке коммита
    else:
         return False # Если не было изменений


# --- Equipment Operations ---

def equip_item(db: Session, character_id: int, user_id: int, equip_data: EquipItem) -> Optional[Character]:
    """Экипирует предмет из инвентаря в указанный слот."""
    # Получаем предмет инвентаря для экипировки (с проверкой владельца)
    inv_item = get_inventory_item(db, equip_data.inventory_item_id, character_id, user_id)
    if not inv_item or inv_item.quantity == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет инвентаря не найден или количество 0")

    # Получаем персонажа с загруженной экипировкой для проверок
    # Загружаем через selectinload для проверок, хотя можно было бы и через backref, если настроено
    character = db.query(Character).options(
        selectinload(Character.equipped_armor).selectinload(CharacterInventoryItem.item),
        selectinload(Character.equipped_shield).selectinload(CharacterInventoryItem.item),
        selectinload(Character.equipped_weapon1).selectinload(CharacterInventoryItem.item.of_type(Weapon)), # Важно для проверки is_two_handed
        selectinload(Character.equipped_weapon2).selectinload(CharacterInventoryItem.item.of_type(Weapon))
    ).filter(
        Character.id == character_id,
        Character.owner_id == user_id
    ).first()

    if not character:
        # Эта проверка дублируется в get_inventory_item, но для надежности
        return None # Персонаж не найден

    item_to_equip = inv_item.item
    slot = equip_data.slot

    # --- Проверки ---
    # 1. Соответствие типа предмета слоту
    if slot == "armor" and not isinstance(item_to_equip, Armor):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя надеть как броню")
    if slot == "shield" and not isinstance(item_to_equip, Shield):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя взять как щит")
    if (slot == "weapon1" or slot == "weapon2") and not isinstance(item_to_equip, Weapon):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя взять как оружие")

    # 2. Требования по силе (для брони и щитов)
    if isinstance(item_to_equip, (Armor, Shield)):
        if item_to_equip.strength_requirement > character.skill_strength:
             raise HTTPException(
                 status_code=status.HTTP_400_BAD_REQUEST,
                 detail=f"Недостаточно силы ({character.skill_strength}) для ношения (требуется {item_to_equip.strength_requirement})"
             )

    # 3. Конфликты слотов
    is_two_handed = isinstance(item_to_equip, Weapon) and item_to_equip.is_two_handed
    weapon1_equipped_item = character.equipped_weapon1
    weapon2_equipped_item = character.equipped_weapon2
    shield_equipped_item = character.equipped_shield

    # Пытаемся экипировать двуручное оружие
    if is_two_handed and (slot == "weapon1" or slot == "weapon2"):
        if shield_equipped_item:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя взять двуручное оружие со щитом. Сначала снимите щит.")
        # Проверяем, не занят ли *другой* оружейный слот
        other_slot_key = "weapon2" if slot == "weapon1" else "weapon1"
        other_weapon_item = weapon2_equipped_item if slot == "weapon1" else weapon1_equipped_item
        if other_weapon_item:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Нельзя взять двуручное оружие, пока занят слот {other_slot_key}. Сначала снимите другое оружие.")
        # Если все ок, освобождаем слоты щита и второго оружия
        character.shield_inv_item_id = None
        setattr(character, f"{other_slot_key}_inv_item_id", None)

    # Пытаемся экипировать щит
    elif slot == "shield":
        # Нельзя со щитом, если уже есть двуручное оружие в любом слоте
        if weapon1_equipped_item and isinstance(weapon1_equipped_item.item, Weapon) and weapon1_equipped_item.item.is_two_handed:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Сначала снимите двуручное оружие из слота 1.")
        if weapon2_equipped_item and isinstance(weapon2_equipped_item.item, Weapon) and weapon2_equipped_item.item.is_two_handed:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Сначала снимите двуручное оружие из слота 2.")
        # Если уже есть два одноручных оружия, нужно снять второе
        if weapon1_equipped_item and weapon2_equipped_item:
             print("Снимаем оружие из слота 2 при экипировке щита...")
             character.weapon2_inv_item_id = None

    # Пытаемся экипировать одноручное оружие
    elif (slot == "weapon1" or slot == "weapon2") and not is_two_handed:
         other_slot_key = "weapon2" if slot == "weapon1" else "weapon1"
         other_weapon_item = weapon2_equipped_item if slot == "weapon1" else weapon1_equipped_item
         # Нельзя, если в другом слоте уже двуручное
         if other_weapon_item and isinstance(other_weapon_item.item, Weapon) and other_weapon_item.item.is_two_handed:
              raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Сначала снимите двуручное оружие из слота {other_slot_key}.")
         # Нельзя второе оружие, если уже есть щит
         if shield_equipped_item and other_weapon_item:
              raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя взять второе оружие со щитом. Сначала снимите щит или другое оружие.")

    # Если все проверки пройдены, устанавливаем ID предмета в нужный слот
    setattr(character, f"{slot}_inv_item_id", inv_item.id)
    print(f"Предмет ID {inv_item.id} экипирован в слот {slot} для персонажа ID {character_id}")

    try:
        db.commit()
        db.refresh(character) # Обновляем объект персонажа
        return character
    except Exception as e:
        db.rollback()
        print(f"Ошибка commit при экипировке предмета ID {inv_item.id} в слот {slot}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка базы данных при экипировке предмета")


def unequip_item(db: Session, character_id: int, user_id: int, slot: str) -> Optional[Character]:
    """Снимает предмет с указанного слота экипировки."""
    # Проверяем владельца
    character = db.query(Character).filter(
        Character.id == character_id,
        Character.owner_id == user_id
    ).first()

    if not character:
        return None # Персонаж не найден

    valid_slots = ["armor", "shield", "weapon1", "weapon2"]
    if slot not in valid_slots:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный слот для снятия экипировки")

    slot_attr = f"{slot}_inv_item_id"

    # Проверяем, есть ли что снимать
    if getattr(character, slot_attr) is None:
        print(f"Слот {slot} уже пуст для персонажа ID {character_id}")
        # Можно вернуть персонажа без изменений или None/ошибку, если это не ожидаемо
        return character # Возвращаем без изменений

    # Снимаем предмет (устанавливаем ID в None)
    setattr(character, slot_attr, None)
    print(f"Предмет снят со слота {slot} для персонажа ID {character_id}")

    try:
        db.commit()
        db.refresh(character)
        return character
    except Exception as e:
        db.rollback()
        print(f"Ошибка commit при снятии предмета со слота {slot}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка базы данных при снятии экипировки")