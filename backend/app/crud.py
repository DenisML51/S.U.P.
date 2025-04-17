# backend/app/crud.py

from sqlalchemy.orm import Session, joinedload, contains_eager, selectinload, noload
from sqlalchemy import func, and_
from . import models, schemas, auth
import random
import string
import math
from fastapi import HTTPException, status
from typing import List, Optional, Any


# --- Вспомогательные функции ---
def _get_skill_modifier(skill_level: int) -> int:
    """Рассчитывает модификатор навыка по уровню."""
    if skill_level <= 1: return 0
    if skill_level <= 3: return 1
    if skill_level <= 5: return 2
    if skill_level <= 7: return 3
    if skill_level <= 9: return 4
    return 5 # Для 10

def _calculate_initial_hp(endurance_mod: int) -> int:
    """Рассчитывает начальные ПЗ."""
    return 10 + endurance_mod

def _calculate_base_pu(self_control_mod: int) -> int:
    """Рассчитывает базовую ПУ."""
    return max(1, self_control_mod) # Минимум 1 ПУ

def _get_xp_for_level(level: int) -> Optional[int]:
    """Возвращает общее количество XP, необходимое для достижения уровня."""
    return models.XP_THRESHOLDS.get(level)

def _update_character_available_abilities(db: Session, character: models.Character):
    """Обновляет список доступных способностей персонажа на основе его уровней веток."""
    all_abilities = db.query(models.Ability).all()
    # Используем временный список, чтобы избежать проблем с удалением во время итерации
    current_ability_ids = {ability.id for ability in character.available_abilities}
    abilities_to_add = []

    branch_levels = {
        "medic": character.medic_branch_level,
        "mutant": character.mutant_branch_level,
        "sharpshooter": character.sharpshooter_branch_level,
        "scout": character.scout_branch_level,
        "technician": character.technician_branch_level,
        "fighter": character.fighter_branch_level,
        "juggernaut": character.juggernaut_branch_level,
    }

    for ability in all_abilities:
        required_level = ability.level_required
        branch_name = ability.branch
        current_branch_level = branch_levels.get(branch_name, 0)

        if current_branch_level >= required_level:
             # Добавляем, только если ее еще нет
             if ability.id not in current_ability_ids:
                abilities_to_add.append(ability)

    # Добавляем новые способности (старые не трогаем, clear() убран)
    if abilities_to_add:
        character.available_abilities.extend(abilities_to_add)


# --- User CRUD ---
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    # Этот запрос используется реже, можно оставить selectinload
    return db.query(models.User).options(selectinload('*')).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    # Используется при логине/аутентификации - можно не грузить связи сразу
    return db.query(models.User).filter(func.lower(models.User.username) == func.lower(username)).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    # Используем прямой запрос, чтобы избежать ошибки инициализации при get_user_by_username
    existing_user = db.query(models.User.id).filter(func.lower(models.User.username) == func.lower(user.username)).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким именем уже существует")
    if len(user.password) < 4: # Проверка длины пароля
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пароль должен быть не менее 4 символов")

    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Party CRUD ---
def create_party(db: Session, user_id: int, party: schemas.PartyCreate) -> schemas.PartyOut:
    lobby_key = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    db_party = models.Party(lobby_key=lobby_key, max_players=party.max_players, creator_id=user_id)
    db.add(db_party)
    db.commit()
    db.refresh(db_party)
    # Важно загрузить создателя после коммита
    creator = db_party.creator # Доступ к связи после refresh
    return schemas.PartyOut(
        id=db_party.id,
        lobby_key=db_party.lobby_key,
        max_players=db_party.max_players,
        creator_username=creator.username if creator else "Неизвестно"
    )

def get_party_by_lobby_key(db: Session, lobby_key: str) -> Optional[models.Party]:
    # Загружаем создателя сразу
    return db.query(models.Party).options(selectinload(models.Party.creator)).filter(models.Party.lobby_key == lobby_key).first()


# --- Character CRUD ---
def get_characters_by_user(db: Session, user_id: int) -> List[schemas.CharacterBriefOut]:
    db_chars = db.query(models.Character).filter(models.Character.owner_id == user_id).all()
    # Собираем CharacterBriefOut вручную, чтобы не тянуть лишние данные
    return [
        schemas.CharacterBriefOut(
            id=c.id,
            name=c.name,
            level=c.level,
            current_hp=c.current_hp,
            max_hp=c.max_hp
        ) for c in db_chars
    ]

def create_character(db: Session, user_id: int, character_in: schemas.CharacterCreate) -> models.Character:
    skills_data = character_in.initial_skills.model_dump()
    endurance_mod = _get_skill_modifier(skills_data.get('skill_endurance', 1))
    self_control_mod = _get_skill_modifier(skills_data.get('skill_self_control', 1))
    initial_max_hp = _calculate_initial_hp(endurance_mod)
    initial_base_pu = _calculate_base_pu(self_control_mod)

    db_char = models.Character(
        name=character_in.name, owner_id=user_id, max_hp=initial_max_hp,
        current_hp=initial_max_hp, base_pu=initial_base_pu, current_pu=initial_base_pu,
        stamina_points=1, level=1, experience_points=0, speed=10,
        **skills_data,
        appearance_notes=character_in.appearance_notes, character_notes=character_in.character_notes,
        motivation_notes=character_in.motivation_notes, background_notes=character_in.background_notes
    )
    db.add(db_char)
    db.commit()
    db.refresh(db_char)
    _update_character_available_abilities(db, db_char) # Обновляем способности
    db.commit() # Коммитим способности
    db.refresh(db_char) # Обновляем состояние объекта
    return db_char

def get_character_details(db: Session, character_id: int, user_id: int) -> Optional[models.Character]:
    """Загружает персонажа со всеми необходимыми связями для детального отображения."""
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
    """Рассчитывает итоговый AC с учетом брони и щита."""
    dex_mod = character.dexterity_mod
    ac_from_armor = 10 + dex_mod
    if character.equipped_armor and isinstance(character.equipped_armor.item, models.Armor):
        armor = character.equipped_armor.item
        base_armor_ac = armor.ac_bonus
        max_dex = 99
        if armor.armor_type == 'Лёгкая' or armor.armor_type == 'Средняя':
             if armor.max_dex_bonus is not None: max_dex = armor.max_dex_bonus
             else:
                if armor.armor_type == 'Лёгкая': max_dex = 99
                if armor.armor_type == 'Средняя': max_dex = 2
             ac_from_armor = base_armor_ac + min(dex_mod, max_dex)
        elif armor.armor_type == 'Тяжёлая':
            ac_from_armor = base_armor_ac
        else:
            ac_from_armor = base_armor_ac + dex_mod
    total_ac = ac_from_armor
    if character.equipped_shield and isinstance(character.equipped_shield.item, models.Shield):
        total_ac += character.equipped_shield.item.ac_bonus
    return total_ac

def get_character_details_for_output(db: Session, character_id: int, user_id: int) -> Optional[schemas.CharacterDetailedOut]:
    """Получает данные персонажа и формирует Pydantic схему для вывода."""
    db_char = get_character_details(db, character_id, user_id)
    if not db_char:
        return None

    total_ac = _calculate_total_ac(db_char)
    passive_attention = 10 + db_char.attention_mod
    next_level = db_char.level + 1
    xp_needed = _get_xp_for_level(next_level)

    skills_dict = {f: getattr(db_char, f) for f in schemas.InitialSkillDistribution.model_fields.keys()}
    modifiers_dict = {f: getattr(db_char, f) for f in schemas.CharacterSkillModifiers.model_fields.keys()}
    derived_stats_dict = schemas.CharacterDerivedStats(
        max_hp=db_char.max_hp, current_hp=db_char.current_hp,
        base_pu=db_char.base_pu, current_pu=db_char.current_pu,
        stamina_points=db_char.stamina_points, exhaustion_level=db_char.exhaustion_level,
        speed=db_char.speed, initiative_bonus=db_char.initiative_bonus,
        base_ac=db_char.base_ac, total_ac=total_ac, passive_attention=passive_attention,
        xp_needed_for_next_level=xp_needed
    ).model_dump()
    branch_levels_dict = {f: getattr(db_char, f) for f in schemas.CharacterClassBranchLevels.model_fields.keys()}
    notes_dict = {f: getattr(db_char, f) for f in schemas.CharacterNotes.model_fields.keys()}

    def get_equipped_item_schema(equipped_inv_item: Optional[models.CharacterInventoryItem]) -> Optional[schemas.CharacterInventoryItemOut]:
        if not equipped_inv_item: return None
        item_data = equipped_inv_item.item
        item_schema: Any = None
        if isinstance(item_data, models.Weapon): item_schema = schemas.WeaponOut.from_orm(item_data)
        elif isinstance(item_data, models.Armor): item_schema = schemas.ArmorOut.from_orm(item_data)
        elif isinstance(item_data, models.Shield): item_schema = schemas.ShieldOut.from_orm(item_data)
        elif isinstance(item_data, models.GeneralItem): item_schema = schemas.GeneralItemOut.from_orm(item_data)
        elif isinstance(item_data, models.Ammo): item_schema = schemas.AmmoOut.from_orm(item_data)
        else: item_schema = schemas.ItemBase.from_orm(item_data)
        if item_schema is None: return None
        return schemas.CharacterInventoryItemOut(
            id=equipped_inv_item.id, item=item_schema, quantity=equipped_inv_item.quantity
        )

    inventory_list = [get_equipped_item_schema(inv_item) for inv_item in db_char.inventory if inv_item]
    inventory_list = [item for item in inventory_list if item is not None]

    character_data = {
        "id": db_char.id, "name": db_char.name, "level": db_char.level,
        "experience_points": db_char.experience_points, "owner_id": db_char.owner_id,
        **skills_dict, "skill_modifiers": modifiers_dict, **derived_stats_dict,
        **branch_levels_dict, **notes_dict, "inventory": inventory_list,
        "equipped_armor": get_equipped_item_schema(db_char.equipped_armor),
        "equipped_shield": get_equipped_item_schema(db_char.equipped_shield),
        "equipped_weapon1": get_equipped_item_schema(db_char.equipped_weapon1),
        "equipped_weapon2": get_equipped_item_schema(db_char.equipped_weapon2),
        "available_abilities": [schemas.AbilityOut.from_orm(ab) for ab in db_char.available_abilities],
        "active_status_effects": [schemas.StatusEffectOut.from_orm(se) for se in db_char.active_status_effects],
    }

    try:
        result_schema = schemas.CharacterDetailedOut(**character_data)
    except Exception as e:
        print(f"Ошибка валидации Pydantic CharacterDetailedOut: {e}")
        print(f"Данные: {character_data}")
        raise HTTPException(status_code=500, detail="Ошибка формирования данных персонажа")

    return result_schema


def update_character_skills(db: Session, character_id: int, user_id: int, skill_updates: schemas.CharacterUpdateSkills) -> Optional[models.Character]:
    db_char = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not db_char: return None
    updated = False
    for skill_name, new_value in skill_updates.model_dump(exclude_unset=True).items():
        if new_value is not None and hasattr(db_char, skill_name):
            if not (1 <= new_value <= 10): raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Навык {skill_name} должен быть между 1 и 10")
            setattr(db_char, skill_name, new_value)
            updated = True
    if updated:
        db_char.base_pu = _calculate_base_pu(db_char.self_control_mod)
        db.commit()
        db.refresh(db_char)
    return db_char

def level_up_character(db: Session, character_id: int, user_id: int, level_up_data: schemas.LevelUpInfo) -> Optional[models.Character]:
    db_char = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not db_char: return None
    xp_needed = _get_xp_for_level(db_char.level + 1)
    if xp_needed is None or db_char.experience_points < xp_needed: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недостаточно опыта для повышения уровня")

    db_char.level += 1
    db_char.max_hp += level_up_data.hp_roll + db_char.endurance_mod
    branch_attr = f"{level_up_data.branch_point_spent}_branch_level"
    if hasattr(db_char, branch_attr):
        current_branch_level = getattr(db_char, branch_attr)
        if current_branch_level < 10: setattr(db_char, branch_attr, current_branch_level + 1)
    else: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Неверное имя ветки класса: {level_up_data.branch_point_spent}")

    total_points_to_spend = 3
    spent_points = 0
    for skill_name, points_to_add in level_up_data.skill_points_spent.items():
        if points_to_add <= 0: continue
        if hasattr(db_char, skill_name):
            current_skill_level = getattr(db_char, skill_name)
            new_level = current_skill_level + points_to_add
            if new_level > 10: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Нельзя повысить навык {skill_name} выше 10")
            setattr(db_char, skill_name, new_level)
            spent_points += points_to_add
        else: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Неверное имя навыка: {skill_name}")
    if spent_points != total_points_to_spend: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Должно быть распределено ровно {total_points_to_spend} очка навыка")

    db_char.stamina_points += 1
    db_char.base_pu = _calculate_base_pu(db_char.self_control_mod)
    _update_character_available_abilities(db, db_char)
    db.commit()
    db.refresh(db_char)
    return db_char


def update_character_stats(db: Session, character_id: int, user_id: int, stats_update: schemas.UpdateCharacterStats) -> Optional[models.Character]:
    db_char = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not db_char: return None
    updated = False
    if stats_update.current_hp is not None:
        db_char.current_hp = max(0, min(stats_update.current_hp, db_char.max_hp)); updated = True
    if stats_update.current_pu is not None:
        db_char.current_pu = stats_update.current_pu; updated = True
    if stats_update.stamina_points is not None:
        db_char.stamina_points = max(0, stats_update.stamina_points); updated = True
    if stats_update.exhaustion_level is not None:
        db_char.exhaustion_level = max(0, min(stats_update.exhaustion_level, 6)); updated = True
    if stats_update.experience_points is not None:
        db_char.experience_points = max(0, stats_update.experience_points); updated = True
    if updated:
        db.commit(); db.refresh(db_char)
    return db_char


def update_character_notes(db: Session, character_id: int, user_id: int, notes_update: schemas.CharacterNotes) -> Optional[models.Character]:
     db_char = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
     if not db_char: return None
     updated = False
     if notes_update.appearance_notes is not None: db_char.appearance_notes = notes_update.appearance_notes; updated = True
     if notes_update.character_notes is not None: db_char.character_notes = notes_update.character_notes; updated = True
     if notes_update.motivation_notes is not None: db_char.motivation_notes = notes_update.motivation_notes; updated = True
     if notes_update.background_notes is not None: db_char.background_notes = notes_update.background_notes; updated = True
     if updated: db.commit(); db.refresh(db_char)
     return db_char

# --- Inventory CRUD ---

def get_inventory_item(db: Session, inventory_item_id: int, character_id: int, user_id: int) -> Optional[models.CharacterInventoryItem]:
    """Получает конкретный предмет инвентаря персонажа."""
    # Явно указываем условие соединения (onclause) для join
    return db.query(models.CharacterInventoryItem).join(
        models.Character, models.Character.id == models.CharacterInventoryItem.character_id
    ).filter(
        models.CharacterInventoryItem.id == inventory_item_id,
        models.CharacterInventoryItem.character_id == character_id,
        models.Character.owner_id == user_id
    ).options(
        joinedload(models.CharacterInventoryItem.item) # Загружаем сам предмет
    ).first()


def add_item_to_inventory(db: Session, character_id: int, user_id: int, item_add: schemas.AddItemToInventory) -> Optional[models.CharacterInventoryItem]:
    character = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not character: return None
    item = db.query(models.Item).filter(models.Item.id == item_add.item_id).first()
    if not item: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден")
    # Расширяем стакаемость на GeneralItem
    is_stackable = isinstance(item, models.Ammo) or isinstance(item, models.GeneralItem)
    db_inv_item = None
    if is_stackable:
        existing_inv_item = db.query(models.CharacterInventoryItem).filter(
            models.CharacterInventoryItem.character_id == character_id,
            models.CharacterInventoryItem.item_id == item_add.item_id
        ).first()
        if existing_inv_item:
            existing_inv_item.quantity += item_add.quantity
            db_inv_item = existing_inv_item
    if db_inv_item is None:
        db_inv_item = models.CharacterInventoryItem(
            character_id=character_id, item_id=item_add.item_id, quantity=item_add.quantity
        )
        db.add(db_inv_item)
    db.commit()
    db.refresh(db_inv_item)
    # Загружаем предмет для корректного ответа (если он не был загружен ранее)
    db.refresh(db_inv_item, attribute_names=['item'])
    return db_inv_item

def remove_item_from_inventory(db: Session, inventory_item_id: int, character_id: int, user_id: int, quantity: int = 1) -> bool:
    inv_item = get_inventory_item(db, inventory_item_id, character_id, user_id)
    if not inv_item: return False
    # Загружаем персонажа с его экипировкой перед модификацией
    # Это важно, чтобы избежать DetachedInstanceError при обращении к character.equipped_...
    character = db.query(models.Character).options(
         selectinload(models.Character.equipped_armor),
         selectinload(models.Character.equipped_shield),
         selectinload(models.Character.equipped_weapon1),
         selectinload(models.Character.equipped_weapon2)
    ).filter(models.Character.id == character_id).first()

    if not character: return False # На всякий случай

    if inv_item.quantity > quantity:
        inv_item.quantity -= quantity
    else:
        # Сначала снимаем экипировку, если этот предмет был надет
        if character.armor_inv_item_id == inv_item.id: character.armor_inv_item_id = None
        if character.shield_inv_item_id == inv_item.id: character.shield_inv_item_id = None
        if character.weapon1_inv_item_id == inv_item.id: character.weapon1_inv_item_id = None
        if character.weapon2_inv_item_id == inv_item.id: character.weapon2_inv_item_id = None
        # Удаляем сам предмет инвентаря
        db.delete(inv_item)
    db.commit()
    return True

def equip_item(db: Session, character_id: int, user_id: int, equip_data: schemas.EquipItem) -> Optional[models.Character]:
    inv_item = get_inventory_item(db, equip_data.inventory_item_id, character_id, user_id)
    if not inv_item or inv_item.quantity == 0: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет инвентаря не найден или количество 0")

    # Загружаем персонажа со всеми связями экипировки перед модификацией
    character = db.query(models.Character).options(
        selectinload(models.Character.equipped_armor).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_shield).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_weapon1).selectinload(models.CharacterInventoryItem.item),
        selectinload(models.Character.equipped_weapon2).selectinload(models.CharacterInventoryItem.item)
    ).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()

    if not character: return None # Маловероятно, но возможно

    item = inv_item.item
    slot = equip_data.slot

    # Проверки
    if slot == "armor" and not isinstance(item, models.Armor): raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя надеть как броню")
    if slot == "shield" and not isinstance(item, models.Shield): raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя взять как щит")
    if (slot == "weapon1" or slot == "weapon2") and not isinstance(item, models.Weapon): raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя взять как оружие")
    if isinstance(item, (models.Armor, models.Shield)) and item.strength_requirement > character.skill_strength: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Недостаточно силы ({character.skill_strength}) для ношения (требуется {item.strength_requirement})")
    is_two_handed = isinstance(item, models.Weapon) and item.is_two_handed
    weapon1_equipped_item = character.equipped_weapon1
    weapon2_equipped_item = character.equipped_weapon2
    shield_equipped_item = character.equipped_shield

    # --- Проверки на конфликты слотов ---
    if is_two_handed:
        if shield_equipped_item: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя взять двуручное оружие со щитом")
        other_slot_key = "weapon2" if slot == "weapon1" else "weapon1"
        other_weapon_item = weapon2_equipped_item if slot == "weapon1" else weapon1_equipped_item
        if other_weapon_item: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Сначала снимите оружие из слота {other_slot_key}")
        # Снимаем экипировку с зависимых слотов
        setattr(character, f"{other_slot_key}_inv_item_id", None)
        character.shield_inv_item_id = None
    elif slot == "shield":
        if weapon1_equipped_item and isinstance(weapon1_equipped_item.item, models.Weapon) and weapon1_equipped_item.item.is_two_handed: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Сначала снимите двуручное оружие из слота 1")
        if weapon2_equipped_item and isinstance(weapon2_equipped_item.item, models.Weapon) and weapon2_equipped_item.item.is_two_handed: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Сначала снимите двуручное оружие из слота 2")
        # Если взяли щит, а в руках два оружия - снимаем оружие из второго слота (weapon2)
        if weapon1_equipped_item and weapon2_equipped_item:
             character.weapon2_inv_item_id = None
    elif (slot == "weapon1" or slot == "weapon2"): # Экипируем одноручное оружие
        other_slot_key = "weapon2" if slot == "weapon1" else "weapon1"
        other_weapon_item = weapon2_equipped_item if slot == "weapon1" else weapon1_equipped_item
        if other_weapon_item and isinstance(other_weapon_item.item, models.Weapon) and other_weapon_item.item.is_two_handed: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Сначала снимите двуручное оружие из слота {other_slot_key}")
        # Если экипирован щит, и мы пытаемся взять оружие во ВТОРОЙ слот (weapon2), или в первый, если второй уже занят
        if shield_equipped_item:
            if slot == "weapon2" or (slot == "weapon1" and weapon2_equipped_item):
                 raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя взять второе оружие при надетом щите")


    setattr(character, f"{slot}_inv_item_id", inv_item.id)
    db.commit()
    db.refresh(character)
    return character


def unequip_item(db: Session, character_id: int, user_id: int, slot: str) -> Optional[models.Character]:
    character = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not character: return None
    valid_slots = ["armor", "shield", "weapon1", "weapon2"]
    if slot not in valid_slots: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный слот")
    setattr(character, f"{slot}_inv_item_id", None)
    db.commit()
    db.refresh(character)
    return character

# --- Status Effects CRUD ---
def apply_status_effect(db: Session, character_id: int, user_id: int, status_update: schemas.StatusEffectUpdate) -> Optional[models.Character]:
    character = db.query(models.Character).options(selectinload(models.Character.active_status_effects)).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not character: return None
    status_effect = db.query(models.StatusEffect).filter(models.StatusEffect.id == status_update.status_effect_id).first()
    if not status_effect: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статус-эффект не найден")
    if status_effect not in character.active_status_effects:
        character.active_status_effects.append(status_effect); db.commit(); db.refresh(character)
    return character

def remove_status_effect(db: Session, character_id: int, user_id: int, status_effect_id: int) -> Optional[models.Character]:
    character = db.query(models.Character).options(selectinload(models.Character.active_status_effects)).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not character: return None
    status_effect = db.query(models.StatusEffect).filter(models.StatusEffect.id == status_effect_id).first()
    if not status_effect: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статус-эффект не найден")
    if status_effect in character.active_status_effects:
        character.active_status_effects.remove(status_effect); db.commit(); db.refresh(character)
    return character

# --- Reference Data Getters ---
def get_all_items(db: Session, item_cls: type) -> List[models.Item]: return db.query(item_cls).all()
def get_all_abilities(db: Session) -> List[models.Ability]: return db.query(models.Ability).order_by(models.Ability.branch, models.Ability.level_required).all()
def get_all_status_effects(db: Session) -> List[models.StatusEffect]: return db.query(models.StatusEffect).order_by(models.StatusEffect.name).all()