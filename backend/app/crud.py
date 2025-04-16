from sqlalchemy.orm import Session, joinedload, contains_eager, selectinload
from sqlalchemy import func, and_
from . import models, schemas, auth
import random
import string
import math
from fastapi import HTTPException, status
from typing import List, Optional

# --- User CRUD ---

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(func.lower(models.User.username) == func.lower(username)).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Party CRUD ---

def create_party(db: Session, user_id: int, party: schemas.PartyCreate):
    lobby_key = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    db_party = models.Party(lobby_key=lobby_key, max_players=party.max_players, creator_id=user_id)
    db.add(db_party)
    db.commit()
    db.refresh(db_party)
    creator = get_user(db, user_id) # Получаем пользователя для имени
    return schemas.PartyOut(
        id=db_party.id,
        lobby_key=db_party.lobby_key,
        max_players=db_party.max_players,
        creator_username=creator.username if creator else "Неизвестно"
    )

def get_party_by_lobby_key(db: Session, lobby_key: str):
    return db.query(models.Party).options(selectinload(models.Party.creator)).filter(models.Party.lobby_key == lobby_key).first()

# --- Character CRUD ---

def get_characters_by_user(db: Session, user_id: int) -> List[schemas.CharacterBriefOut]:
    db_chars = db.query(models.Character).filter(models.Character.owner_id == user_id).all()
    return [schemas.CharacterBriefOut.from_orm(c) for c in db_chars]


def _calculate_initial_hp(endurance_mod: int) -> int:
    return 10 + endurance_mod

def _calculate_base_pu(self_control_mod: int) -> int:
    return max(1, self_control_mod)

def _get_skill_modifier(skill_level: int) -> int:
    return skill_level // 2


def create_character(db: Session, user_id: int, character_in: schemas.CharacterCreate) -> models.Character:
    skills_data = character_in.initial_skills.dict()
    endurance_mod = _get_skill_modifier(skills_data.get('skill_endurance', 1))
    self_control_mod = _get_skill_modifier(skills_data.get('skill_self_control', 1))

    initial_max_hp = _calculate_initial_hp(endurance_mod)
    initial_base_pu = _calculate_base_pu(self_control_mod)

    db_char = models.Character(
        name=character_in.name,
        owner_id=user_id,
        max_hp=initial_max_hp,
        current_hp=initial_max_hp,
        base_pu=initial_base_pu,
        current_pu=initial_base_pu,
        stamina_points=1, # Начинают с 1 ОС
        level=1,
        experience_points=0,
        # Заполнение навыков из Pydantic модели
        **skills_data,
        # Заполнение заметок
        appearance_notes=character_in.appearance_notes,
        character_notes=character_in.character_notes,
        motivation_notes=character_in.motivation_notes,
        background_notes=character_in.background_notes
    )
    db.add(db_char)
    db.commit()
    db.refresh(db_char)
    return db_char

def get_character_details(db: Session, character_id: int, user_id: int) -> Optional[models.Character]:
    # Загружаем все связи для детального отображения
    return db.query(models.Character).options(
        selectinload(models.Character.owner),
        selectinload(models.Character.inventory).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_armor).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_shield).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_weapon1).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_weapon2).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.available_abilities),
        selectinload(models.Character.active_status_effects)
    ).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()

def _calculate_total_ac(character: models.Character) -> int:
    base_ac = 10 + character.dexterity_mod
    armor_ac = 0
    shield_ac = 0
    dex_bonus = character.dexterity_mod

    if character.equipped_armor and isinstance(character.equipped_armor.item, models.Armor):
        armor = character.equipped_armor.item
        if armor.max_dex_bonus is not None:
            dex_bonus = min(dex_bonus, armor.max_dex_bonus)
        # AC от брони определяется ее базовым значением + модификатор Ловкости (с капом)
        # Формула из книги: 11 + Ловкость(макс +2) для легкой, 14 + Ловкость(макс +2) для средней и т.д.
        # Проще использовать AC бонус брони и добавлять декс
        if armor.armor_type == 'Лёгкая':
             armor_ac = armor.ac_bonus + dex_bonus # Базовый AC уже включает 10 + Dex
        elif armor.armor_type == 'Средняя':
             armor_ac = armor.ac_bonus + min(dex_bonus, 2) # Обычно кап +2 для средней
        elif armor.armor_type == 'Тяжёлая':
             armor_ac = armor.ac_bonus # Тяжелая не добавляет бонус ловкости
        else: # Если тип брони не стандартный или не указан
             armor_ac = armor.ac_bonus + dex_bonus # По умолчанию добавляем ловкость

    if character.equipped_shield and isinstance(character.equipped_shield.item, models.Shield):
        shield = character.equipped_shield.item
        shield_ac = shield.ac_bonus

    # Если нет брони, AC = 10 + Dex Mod + Shield Bonus
    if armor_ac == 0:
        return base_ac + shield_ac
    # Если есть броня, AC = AC от брони + Shield Bonus
    else:
        # Перепроверяем логику. СЛ Защиты в таблице УЖЕ включает бонус Ловкости (с капом)
        # Лёгкая: 11 + Ловкость(макс +2) -> Базовый AC = 11, макс декс бонус = 2? Нет.
        # Это СЛ ЗАЩИТЫ, а не бонус.
        # Правильная логика:
        total_ac = 10 # База
        if character.equipped_armor and isinstance(character.equipped_armor.item, models.Armor):
            armor = character.equipped_armor.item
            ac_from_armor_formula = 0
            current_dex_mod = character.dexterity_mod
            if armor.armor_type == 'Лёгкая':
                 # Пример: Укрепленная одежда 11 + Ловкость(макс +2). Нелогично.
                 # Скорее, сама броня дает +1/+2/+3 к AC, и к этому добавляется мод. ловкости с капом или без.
                 # Будем считать, что `ac_bonus` в модели Armor это ДОПОЛНИТЕЛЬНЫЙ бонус К БАЗЕ 10.
                 # И `max_dex_bonus` ограничивает модификатор ловкости.
                 limit = armor.max_dex_bonus if armor.max_dex_bonus is not None else 100 # No limit if null
                 total_ac = 10 + armor.ac_bonus + min(current_dex_mod, limit)

            elif armor.armor_type == 'Средняя':
                 limit = armor.max_dex_bonus if armor.max_dex_bonus is not None else 2 # Default cap 2 for medium
                 total_ac = 10 + armor.ac_bonus + min(current_dex_mod, limit)
            elif armor.armor_type == 'Тяжёлая':
                 total_ac = 10 + armor.ac_bonus # No dex bonus for heavy
            else: # Неизвестный тип
                 total_ac = 10 + armor.ac_bonus + current_dex_mod # Add full dex by default
        else:
             # Нет брони
             total_ac = 10 + character.dexterity_mod

        # Добавляем щит
        if character.equipped_shield and isinstance(character.equipped_shield.item, models.Shield):
             total_ac += character.equipped_shield.item.ac_bonus

        return total_ac


def get_character_details_for_output(db: Session, character_id: int, user_id: int) -> Optional[schemas.CharacterDetailedOut]:
    db_char = get_character_details(db, character_id, user_id)
    if not db_char:
        return None

    total_ac = _calculate_total_ac(db_char)
    passive_attention = 10 + db_char.attention_mod

    # Сбор навыков из начального распределения
    skills_dict = {field: getattr(db_char, field) for field in schemas.InitialSkillDistribution.__fields__}
    # Сбор модификаторов – ключи совпадают с определёнными в CharacterSkillModifiers
    modifiers_dict = {field: getattr(db_char, field) for field in schemas.CharacterSkillModifiers.__fields__}

    derived_stats_dict = {
        "max_hp": db_char.max_hp,
        "current_hp": db_char.current_hp,
        "base_pu": db_char.base_pu,
        "current_pu": db_char.current_pu,
        "stamina_points": db_char.stamina_points,
        "exhaustion_level": db_char.exhaustion_level,
        "speed": db_char.speed,
        "initiative_bonus": db_char.initiative_bonus,
        "base_ac": db_char.base_ac,
        "total_ac": total_ac,
        "passive_attention": passive_attention
    }

    branch_levels_dict = {field: getattr(db_char, field) for field in schemas.CharacterClassBranchLevels.__fields__}
    notes_dict = {field: getattr(db_char, field) for field in schemas.CharacterNotes.__fields__}

    # Обработка инвентаря, экипировки, способностей и статус-эффектов (этот код может быть таким же, как был)
    inventory_list = []
    for inv_item in db_char.inventory:
        item_schema = None
        if isinstance(inv_item.item, models.Weapon):
            item_schema = schemas.WeaponOut.from_orm(inv_item.item)
        elif isinstance(inv_item.item, models.Armor):
            item_schema = schemas.ArmorOut.from_orm(inv_item.item)
        elif isinstance(inv_item.item, models.Shield):
            item_schema = schemas.ShieldOut.from_orm(inv_item.item)
        elif isinstance(inv_item.item, models.GeneralItem):
            item_schema = schemas.GeneralItemOut.from_orm(inv_item.item)
        elif isinstance(inv_item.item, models.Ammo):
            item_schema = schemas.AmmoOut.from_orm(inv_item.item)
        else:
            item_schema = schemas.ItemBase.from_orm(inv_item.item)
        if item_schema:
            inventory_list.append(schemas.CharacterInventoryItemOut(id=inv_item.id, item=item_schema, quantity=inv_item.quantity))

    def get_equipped_item_schema(equipped_relation):
        if not equipped_relation:
            return None
        inv_item = equipped_relation
        item_schema = None
        if isinstance(inv_item.item, models.Weapon):
            item_schema = schemas.WeaponOut.from_orm(inv_item.item)
        elif isinstance(inv_item.item, models.Armor):
            item_schema = schemas.ArmorOut.from_orm(inv_item.item)
        elif isinstance(inv_item.item, models.Shield):
            item_schema = schemas.ShieldOut.from_orm(inv_item.item)
        else:
            return None
        return schemas.CharacterInventoryItemOut(id=inv_item.id, item=item_schema, quantity=inv_item.quantity)

    character_data = {
        "id": db_char.id,
        "name": db_char.name,
        "level": db_char.level,
        "experience_points": db_char.experience_points,
        "owner_id": db_char.owner_id,
        **skills_dict,
        "skill_modifiers": modifiers_dict,
        **derived_stats_dict,
        **branch_levels_dict,
        **notes_dict,
        "inventory": inventory_list,
        "equipped_armor": get_equipped_item_schema(db_char.equipped_armor),
        "equipped_shield": get_equipped_item_schema(db_char.equipped_shield),
        "equipped_weapon1": get_equipped_item_schema(db_char.equipped_weapon1),
        "equipped_weapon2": get_equipped_item_schema(db_char.equipped_weapon2),
        "available_abilities": [schemas.AbilityOut.from_orm(ab) for ab in db_char.available_abilities],
        "active_status_effects": [schemas.StatusEffectOut.from_orm(se) for se in db_char.active_status_effects],
    }
    return schemas.CharacterDetailedOut(**character_data)


def update_character_skills(db: Session, character_id: int, user_id: int, skill_updates: schemas.CharacterUpdateSkills) -> Optional[models.Character]:
    db_char = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not db_char:
        return None

    updated = False
    current_skills = {f: getattr(db_char, f) for f in schemas.InitialSkillDistribution.__fields__}

    for skill_name, new_value in skill_updates.dict(exclude_unset=True).items():
        if new_value is not None and hasattr(db_char, skill_name):
            # Проверка, чтобы навык не превысил 10
            if new_value > 10:
                 raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Навык {skill_name} не может быть больше 10")
            setattr(db_char, skill_name, new_value)
            updated = True

    if updated:
        # Пересчитать производные характеристики, зависящие от навыков
        db_char.base_pu = _calculate_base_pu(db_char.self_control_mod)
        # HP пересчитывается только при level up
        # AC и Инициатива - гибридные свойства, пересчитываются сами
        db.commit()
        db.refresh(db_char)
    return db_char


def level_up_character(db: Session, character_id: int, user_id: int, level_up_data: schemas.LevelUpInfo) -> Optional[models.Character]:
    db_char = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not db_char:
        return None

    # 1. Увеличить уровень
    db_char.level += 1

    # 2. Увеличить Максимум ПЗ
    db_char.max_hp += level_up_data.hp_roll + db_char.endurance_mod
    # Опционально: восстановить текущие HP до максимума? По правилам - нет.

    # 3. Добавить Очко Ветки Класса
    branch_attr = f"{level_up_data.branch_point_spent}_branch_level"
    if hasattr(db_char, branch_attr):
        current_branch_level = getattr(db_char, branch_attr)
        if current_branch_level < 10:
            setattr(db_char, branch_attr, current_branch_level + 1)
        else:
            # Можно вернуть ошибку или просто не повышать
            pass # Пока просто игнорируем, если ветка уже на макс. уровне
    else:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Неверное имя ветки класса: {level_up_data.branch_point_spent}")


    # 4. Распределить Очки Навыка
    for skill_name, points_to_add in level_up_data.skill_points_spent.items():
        if hasattr(db_char, skill_name):
            current_skill_level = getattr(db_char, skill_name)
            new_level = current_skill_level + points_to_add
            if new_level > 10:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Нельзя повысить навык {skill_name} выше 10")
            setattr(db_char, skill_name, new_level)
        else:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Неверное имя навыка: {skill_name}")


    # 5. Добавить Очко Стойкости (ОС)
    db_char.stamina_points += 1

    # Пересчитать base_pu, если изменилось самообладание
    db_char.base_pu = _calculate_base_pu(db_char.self_control_mod)

    # TODO: Обновить список доступных способностей персонажа
    # _update_character_available_abilities(db, db_char)


    db.commit()
    db.refresh(db_char)
    return db_char


def update_character_stats(db: Session, character_id: int, user_id: int, stats_update: schemas.UpdateCharacterStats) -> Optional[models.Character]:
    db_char = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not db_char:
        return None

    updated = False
    if stats_update.current_hp is not None:
        db_char.current_hp = max(0, min(stats_update.current_hp, db_char.max_hp)) # Не ниже 0 и не выше max_hp
        updated = True
    if stats_update.current_pu is not None:
         # ПУ может быть и отрицательным? Правила говорят 0 ПУ -> НЭ, 10 ПУ -> ПЭ.
         # Не будем ограничивать сверху/снизу жестко, но можно добавить логику триггеров эмоций.
         db_char.current_pu = stats_update.current_pu
         updated = True
    if stats_update.stamina_points is not None:
         db_char.stamina_points = max(0, stats_update.stamina_points)
         updated = True
    if stats_update.exhaustion_level is not None:
         db_char.exhaustion_level = max(0, min(stats_update.exhaustion_level, 6))
         updated = True
    if stats_update.experience_points is not None:
         db_char.experience_points = max(0, stats_update.experience_points)
         # TODO: Добавить проверку на достижение нового уровня по таблице опыта
         updated = True

    if updated:
        db.commit()
        db.refresh(db_char)
    return db_char


def update_character_notes(db: Session, character_id: int, user_id: int, notes_update: schemas.CharacterNotes) -> Optional[models.Character]:
     db_char = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
     if not db_char:
          return None

     updated = False
     if notes_update.appearance_notes is not None:
         db_char.appearance_notes = notes_update.appearance_notes
         updated = True
     if notes_update.character_notes is not None:
         db_char.character_notes = notes_update.character_notes
         updated = True
     if notes_update.motivation_notes is not None:
         db_char.motivation_notes = notes_update.motivation_notes
         updated = True
     if notes_update.background_notes is not None:
         db_char.background_notes = notes_update.background_notes
         updated = True

     if updated:
          db.commit()
          db.refresh(db_char)
     return db_char

# --- Inventory CRUD ---

def get_inventory_item(db: Session, inventory_item_id: int, character_id: int, user_id: int) -> Optional[models.CharacterInventoryItem]:
     return db.query(models.CharacterInventoryItem).join(models.Character).filter(
         models.CharacterInventoryItem.id == inventory_item_id,
         models.CharacterInventoryItem.character_id == character_id,
         models.Character.owner_id == user_id
     ).first()

def add_item_to_inventory(db: Session, character_id: int, user_id: int, item_add: schemas.AddItemToInventory) -> Optional[models.CharacterInventoryItem]:
    # Проверяем, что персонаж принадлежит пользователю
    character = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not character:
        return None # Или выбросить исключение 404/403

    # Проверяем, существует ли предмет
    item = db.query(models.Item).filter(models.Item.id == item_add.item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден")

    # Проверяем, есть ли уже такой предмет в инвентаре
    existing_inv_item = db.query(models.CharacterInventoryItem).filter(
        models.CharacterInventoryItem.character_id == character_id,
        models.CharacterInventoryItem.item_id == item_add.item_id
    ).first()

    if existing_inv_item:
        # Если предмет стакается (не уникальное оружие/броня?), увеличиваем количество
        # TODO: Добавить логику стакаемости (например, патроны, расходники)
        existing_inv_item.quantity += item_add.quantity
        db_inv_item = existing_inv_item
    else:
        # Создаем новую запись в инвентаре
        db_inv_item = models.CharacterInventoryItem(
            character_id=character_id,
            item_id=item_add.item_id,
            quantity=item_add.quantity
        )
        db.add(db_inv_item)

    db.commit()
    db.refresh(db_inv_item)
    return db_inv_item


def remove_item_from_inventory(db: Session, inventory_item_id: int, character_id: int, user_id: int, quantity: int = 1) -> bool:
    inv_item = get_inventory_item(db, inventory_item_id, character_id, user_id)
    if not inv_item:
        return False # Или 404

    if inv_item.quantity > quantity:
        # Уменьшаем количество
        inv_item.quantity -= quantity
        # Проверяем, не снялся ли этот предмет, если он был экипирован
        character = inv_item.character
        if character.equipped_armor_id == inv_item.id and inv_item.quantity == 0: character.equipped_armor_id = None
        if character.equipped_shield_id == inv_item.id and inv_item.quantity == 0: character.equipped_shield_id = None
        if character.equipped_weapon1_id == inv_item.id and inv_item.quantity == 0: character.equipped_weapon1_id = None
        if character.equipped_weapon2_id == inv_item.id and inv_item.quantity == 0: character.equipped_weapon2_id = None

    else:
        # Удаляем запись полностью
        # Сначала снимаем экипировку, если предмет был надет
        character = inv_item.character
        if character.equipped_armor_id == inv_item.id: character.equipped_armor_id = None
        if character.equipped_shield_id == inv_item.id: character.equipped_shield_id = None
        if character.equipped_weapon1_id == inv_item.id: character.equipped_weapon1_id = None
        if character.equipped_weapon2_id == inv_item.id: character.equipped_weapon2_id = None
        db.delete(inv_item)

    db.commit()
    return True


def equip_item(db: Session, character_id: int, user_id: int, equip_data: schemas.EquipItem) -> Optional[models.Character]:
    inv_item = get_inventory_item(db, equip_data.inventory_item_id, character_id, user_id)
    if not inv_item or inv_item.quantity == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет инвентаря не найден или количество 0")

    character = inv_item.character
    item = inv_item.item
    slot = equip_data.slot

    # Проверки соответствия типа предмета и слота
    if slot == "armor" and not isinstance(item, models.Armor):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя экипировать как броню")
    if slot == "shield" and not isinstance(item, models.Shield):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя экипировать как щит")
    if (slot == "weapon1" or slot == "weapon2") and not isinstance(item, models.Weapon):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя экипировать как оружие")

    # Проверка требований по силе для брони/щитов
    if isinstance(item, (models.Armor, models.Shield)) and item.strength_requirement > character.skill_strength:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Недостаточно силы ({character.skill_strength}) для ношения этого предмета (требуется {item.strength_requirement})")

    # TODO: Проверка на двуручное оружие и занятость слотов

    # Установка ID в соответствующий слот персонажа
    setattr(character, f"equipped_{slot}_id", inv_item.id)

    db.commit()
    db.refresh(character)
    return character


def unequip_item(db: Session, character_id: int, user_id: int, slot: str) -> Optional[models.Character]:
    character = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not character:
        return None

    valid_slots = ["armor", "shield", "weapon1", "weapon2"]
    if slot not in valid_slots:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный слот для снятия экипировки")

    setattr(character, f"equipped_{slot}_id", None)
    db.commit()
    db.refresh(character)
    return character

# --- Status Effects CRUD ---

def apply_status_effect(db: Session, character_id: int, user_id: int, status_update: schemas.StatusEffectUpdate) -> Optional[models.Character]:
    character = get_character_details(db, character_id, user_id) # Загружаем с эффектами
    if not character:
        return None

    status_effect = db.query(models.StatusEffect).filter(models.StatusEffect.id == status_update.status_effect_id).first()
    if not status_effect:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статус-эффект не найден")

    if status_effect not in character.active_status_effects:
        character.active_status_effects.append(status_effect)
        db.commit()
        db.refresh(character)
    return character


def remove_status_effect(db: Session, character_id: int, user_id: int, status_effect_id: int) -> Optional[models.Character]:
    character = get_character_details(db, character_id, user_id) # Загружаем с эффектами
    if not character:
        return None

    status_effect = db.query(models.StatusEffect).filter(models.StatusEffect.id == status_effect_id).first()
    if not status_effect:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статус-эффект не найден")

    if status_effect in character.active_status_effects:
        character.active_status_effects.remove(status_effect)
        db.commit()
        db.refresh(character)
    return character


# --- Reference Data Getters ---

def get_all_items(db: Session, item_cls: type) -> List[models.Item]:
     return db.query(item_cls).all()

def get_all_abilities(db: Session) -> List[models.Ability]:
    return db.query(models.Ability).order_by(models.Ability.branch, models.Ability.level_required).all()

def get_all_status_effects(db: Session) -> List[models.StatusEffect]:
    return db.query(models.StatusEffect).order_by(models.StatusEffect.name).all()