# backend/app/crud.py

# Добавлены Type и sqlainspect (если они не были импортированы ранее)
from sqlalchemy.orm import Session, joinedload, contains_eager, selectinload, noload, RelationshipProperty, ColumnProperty
from sqlalchemy import func, and_, inspect as sqlainspect
from . import models, schemas, auth
import random
import string
import math
from fastapi import HTTPException, status
from typing import List, Optional, Any, Type, Tuple

# --- Таблицы Эмоций (Пример, названия должны ТОЧНО совпадать с StatusEffect в БД) ---
NEGATIVE_EMOTIONS = [ "ПУ: Паника", "ПУ: Ярость", "ПУ: Апатия", "ПУ: Паранойя", "ПУ: Слабоумие", "ПУ: Срыв" ]
POSITIVE_EMOTIONS = [ "ПУ: Адреналин", "ПУ: Вдохновение", "ПУ: Спокойствие", "ПУ: Прозрение", "ПУ: Эмпатия", "ПУ: Воля" ]
# ----------------------------------------------------------------------------------


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
    """Обновляет список ДОСТУПНЫХ способностей персонажа (только из веток)."""
    # Запрашиваем только способности, относящиеся к веткам классов
    all_branch_abilities = db.query(models.Ability).filter(models.Ability.branch.in_(schemas.VALID_BRANCH_KEYS)).all()
    current_ability_ids = {ability.id for ability in character.available_abilities}
    abilities_to_add = []
    branch_levels = { "medic": character.medic_branch_level, "mutant": character.mutant_branch_level, "sharpshooter": character.sharpshooter_branch_level, "scout": character.scout_branch_level, "technician": character.technician_branch_level, "fighter": character.fighter_branch_level, "juggernaut": character.juggernaut_branch_level }

    for ability in all_branch_abilities:
        required_level = ability.level_required
        branch_name = ability.branch
        current_branch_level = branch_levels.get(branch_name, 0)
        if current_branch_level >= required_level:
             if ability.id not in current_ability_ids:
                abilities_to_add.append(ability)
    if abilities_to_add:
        character.available_abilities.extend(abilities_to_add)
        db.flush() # Применяем добавление к сессии перед коммитом


# --- User CRUD ---
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    # Можно не грузить все связи пользователя сразу
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    # Используется при логине/аутентификации - не грузим связи
    return db.query(models.User).filter(func.lower(models.User.username) == func.lower(username)).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    # Используем прямой запрос, чтобы избежать ошибки инициализации при get_user_by_username
    existing_user = db.query(models.User.id).filter(func.lower(models.User.username) == func.lower(user.username)).first()
    if existing_user: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким именем уже существует")
    if len(user.password) < 4: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пароль должен быть не менее 4 символов")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user); db.commit(); db.refresh(db_user)
    return db_user

# --- Party CRUD ---
def create_party(db: Session, user_id: int, party: schemas.PartyCreate) -> schemas.PartyOut:
    lobby_key = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    db_party = models.Party(lobby_key=lobby_key, max_players=party.max_players, creator_id=user_id)
    db.add(db_party); db.commit(); db.refresh(db_party)
    # Загружаем создателя после refresh
    creator = db.query(models.User).filter(models.User.id == db_party.creator_id).first()
    return schemas.PartyOut(id=db_party.id, lobby_key=db_party.lobby_key, max_players=db_party.max_players, creator_username=creator.username if creator else "Неизвестно")

def get_party_by_lobby_key(db: Session, lobby_key: str) -> Optional[models.Party]:
    # Загружаем создателя сразу
    return db.query(models.Party).options(selectinload(models.Party.creator)).filter(models.Party.lobby_key == lobby_key).first()


# --- Character CRUD ---
def get_characters_by_user(db: Session, user_id: int) -> List[schemas.CharacterBriefOut]:
    db_chars = db.query(models.Character).filter(models.Character.owner_id == user_id).all()
    return [ schemas.CharacterBriefOut(id=c.id, name=c.name, level=c.level, current_hp=c.current_hp, max_hp=c.max_hp) for c in db_chars ]

def create_character(db: Session, user_id: int, character_in: schemas.CharacterCreate) -> models.Character:
    skills_data = character_in.initial_skills.model_dump()
    endurance_mod = _get_skill_modifier(skills_data.get('skill_endurance', 1))
    self_control_mod = _get_skill_modifier(skills_data.get('skill_self_control', 1))
    initial_max_hp = _calculate_initial_hp(endurance_mod)
    initial_base_pu = _calculate_base_pu(self_control_mod)
    db_char = models.Character( name=character_in.name, owner_id=user_id, max_hp=initial_max_hp, current_hp=initial_max_hp, base_pu=initial_base_pu, current_pu=initial_base_pu, stamina_points=1, level=1, experience_points=0, speed=10, **skills_data, appearance_notes=character_in.appearance_notes, character_notes=character_in.character_notes, motivation_notes=character_in.motivation_notes, background_notes=character_in.background_notes )
    db.add(db_char); db.commit(); db.refresh(db_char)
    _update_character_available_abilities(db, db_char) # Обновляем способности веток
    db.commit(); db.refresh(db_char) # Коммитим и обновляем
    return db_char

# --- ОБНОВЛЕНО: get_character_details ---
def get_character_details(db: Session, character_id: int, user_id: int) -> Optional[models.Character]:
    """Загружает персонажа со всеми необходимыми связями для детального отображения, включая способности оружия."""
    return db.query(models.Character).options(
        selectinload(models.Character.owner),
        # Загружаем инвентарь и предметы в нем (но без способностей оружия на этом этапе)
        selectinload(models.Character.inventory).selectinload(models.CharacterInventoryItem.item),
        # Загружаем экипировку и способности оружия
        selectinload(models.Character.equipped_armor).selectinload(models.CharacterInventoryItem.item), # Для брони item достаточно
        selectinload(models.Character.equipped_shield).selectinload(models.CharacterInventoryItem.item), # Для щита item достаточно
        selectinload(models.Character.equipped_weapon1)
            .selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon)) # Указываем тип для полиморфной связи item
            .selectinload(models.Weapon.granted_abilities), # Явно загружаем способности этого оружия
        selectinload(models.Character.equipped_weapon2)
            .selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon))
            .selectinload(models.Weapon.granted_abilities), # Явно загружаем способности этого оружия
        # Загружаем изученные способности и активные состояния
        selectinload(models.Character.available_abilities),
        selectinload(models.Character.active_status_effects)
    ).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
# ------------------------------------------

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
        elif armor.armor_type == 'Тяжёлая': ac_from_armor = base_armor_ac
        else: ac_from_armor = base_armor_ac + dex_mod
    total_ac = ac_from_armor
    if character.equipped_shield and isinstance(character.equipped_shield.item, models.Shield):
        total_ac += character.equipped_shield.item.ac_bonus
    return total_ac

def get_character_details_for_output(db: Session, character_id: int, user_id: int) -> Optional[schemas.CharacterDetailedOut]:
    """Получает данные персонажа и формирует Pydantic схему для вывода."""
    db_char = get_character_details(db, character_id, user_id) # Теперь загружает способности оружия
    if not db_char: return None

    total_ac = _calculate_total_ac(db_char)
    passive_attention = 10 + db_char.attention_mod
    next_level = db_char.level + 1
    xp_needed = _get_xp_for_level(next_level)

    # Формирование словарей для Pydantic модели
    character_data = {}
    char_mapper = sqlainspect(models.Character)
    for prop in char_mapper.iterate_properties:
         # Копируем только поля, которые есть в схеме вывода CharacterDetailedOut
         if isinstance(prop, ColumnProperty) and prop.key in schemas.CharacterDetailedOut.model_fields:
              character_data[prop.key] = getattr(db_char, prop.key)

    # Добавляем расчетные и связанные данные
    character_data.update({
        "skill_modifiers": {f: getattr(db_char, f) for f in schemas.CharacterSkillModifiers.model_fields.keys()},
        "max_hp": db_char.max_hp, "current_hp": db_char.current_hp,
        "base_pu": db_char.base_pu, "current_pu": db_char.current_pu,
        "stamina_points": db_char.stamina_points, "exhaustion_level": db_char.exhaustion_level,
        "speed": db_char.speed, "initiative_bonus": db_char.initiative_bonus,
        "base_ac": db_char.base_ac, "total_ac": total_ac, "passive_attention": passive_attention,
        "xp_needed_for_next_level": xp_needed,
        # Добавляем уровни веток напрямую, так как они теперь в CharacterDetailedOut
        "medic_branch_level": db_char.medic_branch_level,
        "mutant_branch_level": db_char.mutant_branch_level,
        "sharpshooter_branch_level": db_char.sharpshooter_branch_level,
        "scout_branch_level": db_char.scout_branch_level,
        "technician_branch_level": db_char.technician_branch_level,
        "fighter_branch_level": db_char.fighter_branch_level,
        "juggernaut_branch_level": db_char.juggernaut_branch_level,
        # Добавляем заметки напрямую
        "appearance_notes": db_char.appearance_notes,
        "character_notes": db_char.character_notes,
        "motivation_notes": db_char.motivation_notes,
        "background_notes": db_char.background_notes,
    })

    def get_inventory_item_schema(inv_item: models.CharacterInventoryItem) -> Optional[schemas.CharacterInventoryItemOut]:
        """Преобразует CharacterInventoryItem в Pydantic схему, включая способности оружия."""
        if not inv_item or not inv_item.item: return None
        item_data = inv_item.item
        item_schema: Any = None

        # Преобразуем Item в соответствующую Pydantic схему Out
        if isinstance(item_data, models.Weapon):
            # Важно: используем from_orm, чтобы Pydantic подтянул `granted_abilities`, которые мы загрузили
            item_schema = schemas.WeaponOut.from_orm(item_data)
        elif isinstance(item_data, models.Armor): item_schema = schemas.ArmorOut.from_orm(item_data)
        elif isinstance(item_data, models.Shield): item_schema = schemas.ShieldOut.from_orm(item_data)
        elif isinstance(item_data, models.GeneralItem): item_schema = schemas.GeneralItemOut.from_orm(item_data)
        elif isinstance(item_data, models.Ammo): item_schema = schemas.AmmoOut.from_orm(item_data)
        else: item_schema = schemas.ItemBase.from_orm(item_data) # Fallback

        if item_schema is None: return None
        return schemas.CharacterInventoryItemOut( id=inv_item.id, item=item_schema, quantity=inv_item.quantity )

    inventory_list = [get_inventory_item_schema(inv_item) for inv_item in db_char.inventory if inv_item]
    inventory_list = [item for item in inventory_list if item is not None]

    character_data.update({
        "inventory": inventory_list,
        "equipped_armor": get_inventory_item_schema(db_char.equipped_armor),
        "equipped_shield": get_inventory_item_schema(db_char.equipped_shield),
        "equipped_weapon1": get_inventory_item_schema(db_char.equipped_weapon1), # Получит способности оружия
        "equipped_weapon2": get_inventory_item_schema(db_char.equipped_weapon2), # Получит способности оружия
        "available_abilities": [schemas.AbilityOut.from_orm(ab) for ab in db_char.available_abilities],
        "active_status_effects": [schemas.StatusEffectOut.from_orm(se) for se in db_char.active_status_effects],
    })

    # Создаем Pydantic модель из словаря
    try:
        # Убедимся, что все ключи из character_data есть в CharacterDetailedOut
        # Pydantic v2 должен автоматически обрабатывать лишние ключи, если Config.extra = 'ignore' (по умолчанию)
        # Но лучше убедиться, что все поля совпадают
        required_fields = set(schemas.CharacterDetailedOut.model_fields.keys())
        present_fields = set(character_data.keys())
        if not required_fields.issubset(present_fields):
             missing = required_fields - present_fields
             print(f"Предупреждение: Отсутствуют поля для CharacterDetailedOut: {missing}")
             # Можно добавить логику для установки значений по умолчанию или генерации ошибки

        result_schema = schemas.CharacterDetailedOut(**character_data)
    except Exception as e:
        print(f"Ошибка валидации Pydantic CharacterDetailedOut: {e}")
        print(f"Данные перед валидацией (ключи): {list(character_data.keys())}")
        raise HTTPException(status_code=500, detail=f"Ошибка формирования данных персонажа: {e}")

    return result_schema


def update_character_skills(db: Session, character_id: int, user_id: int, skill_updates: schemas.CharacterUpdateSkills) -> Optional[models.Character]:
    # ... без изменений ...
    db_char = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not db_char: return None
    updated = False
    for skill_name, new_value in skill_updates.model_dump(exclude_unset=True).items():
        if new_value is not None and hasattr(db_char, skill_name):
            if not (1 <= new_value <= 10): raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Навык {skill_name} должен быть между 1 и 10")
            setattr(db_char, skill_name, new_value); updated = True
    if updated:
        db_char.base_pu = _calculate_base_pu(db_char.self_control_mod); db.commit(); db.refresh(db_char)
    return db_char

def level_up_character(db: Session, character_id: int, user_id: int, level_up_data: schemas.LevelUpInfo) -> Optional[models.Character]:
    # ... без изменений ...
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
    total_points_to_spend = 3; spent_points = 0
    for skill_name, points_to_add in level_up_data.skill_points_spent.items():
        if points_to_add <= 0: continue
        if hasattr(db_char, skill_name):
            current_skill_level = getattr(db_char, skill_name)
            new_level = current_skill_level + points_to_add
            if new_level > 10: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Нельзя повысить навык {skill_name} выше 10")
            setattr(db_char, skill_name, new_level); spent_points += points_to_add
        else: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Неверное имя навыка: {skill_name}")
    if spent_points != total_points_to_spend: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Должно быть распределено ровно {total_points_to_spend} очка навыка")
    db_char.stamina_points += 1
    db_char.base_pu = _calculate_base_pu(db_char.self_control_mod)
    _update_character_available_abilities(db, db_char)
    db.commit(); db.refresh(db_char)
    return db_char


def update_character_stats(db: Session, character_id: int, user_id: int, stats_update: schemas.UpdateCharacterStats) -> Optional[models.Character]:
    # ... без изменений ...
    db_char = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not db_char: return None
    updated = False
    if stats_update.current_hp is not None: db_char.current_hp = max(0, min(stats_update.current_hp, db_char.max_hp)); updated = True
    if stats_update.current_pu is not None: db_char.current_pu = stats_update.current_pu; updated = True
    if stats_update.stamina_points is not None: db_char.stamina_points = max(0, stats_update.stamina_points); updated = True
    if stats_update.exhaustion_level is not None: db_char.exhaustion_level = max(0, min(stats_update.exhaustion_level, 6)); updated = True
    if stats_update.experience_points is not None: db_char.experience_points = max(0, stats_update.experience_points); updated = True
    if updated: db.commit(); db.refresh(db_char)
    return db_char


def update_character_notes(db: Session, character_id: int, user_id: int, notes_update: schemas.CharacterNotes) -> Optional[models.Character]:
     # ... без изменений ...
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
    """Получает конкретный предмет инвентаря персонажа с его предметом."""
    return db.query(models.CharacterInventoryItem).join(
        models.Character, models.Character.id == models.CharacterInventoryItem.character_id
    ).filter(
        models.CharacterInventoryItem.id == inventory_item_id,
        models.CharacterInventoryItem.character_id == character_id,
        models.Character.owner_id == user_id
    ).options(
        # --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
        # Просто загружаем связь item. Полиморфизм и подзагрузка
        # способностей оружия должны обрабатываться настройками lazy/relationship в моделях.
        selectinload(models.CharacterInventoryItem.item)
        # --------------------------
    ).first()

def add_item_to_inventory(db: Session, character_id: int, user_id: int, item_add: schemas.AddItemToInventory) -> Optional[models.CharacterInventoryItem]:
    # ... без изменений ...
    character = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not character: return None
    item = db.query(models.Item).filter(models.Item.id == item_add.item_id).first()
    if not item: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет не найден")
    is_stackable = isinstance(item, models.Ammo) or isinstance(item, models.GeneralItem)
    db_inv_item = None
    if is_stackable:
        existing_inv_item = db.query(models.CharacterInventoryItem).filter( models.CharacterInventoryItem.character_id == character_id, models.CharacterInventoryItem.item_id == item_add.item_id ).first()
        if existing_inv_item: existing_inv_item.quantity += item_add.quantity; db_inv_item = existing_inv_item
    if db_inv_item is None:
        db_inv_item = models.CharacterInventoryItem(character_id=character_id, item_id=item_add.item_id, quantity=item_add.quantity); db.add(db_inv_item)
    db.commit(); db.refresh(db_inv_item); db.refresh(db_inv_item, attribute_names=['item'])
    return db_inv_item

def remove_item_from_inventory(db: Session, inventory_item_id: int, character_id: int, user_id: int, quantity: int = 1) -> bool:
    # ... без изменений ...
    inv_item = get_inventory_item(db, inventory_item_id, character_id, user_id)
    if not inv_item: return False
    character = db.query(models.Character).filter(models.Character.id == character_id).first() # Загружаем персонажа
    if not character: return False
    if inv_item.quantity > quantity: inv_item.quantity -= quantity
    else:
        if character.armor_inv_item_id == inv_item.id: character.armor_inv_item_id = None
        if character.shield_inv_item_id == inv_item.id: character.shield_inv_item_id = None
        if character.weapon1_inv_item_id == inv_item.id: character.weapon1_inv_item_id = None
        if character.weapon2_inv_item_id == inv_item.id: character.weapon2_inv_item_id = None
        db.delete(inv_item)
    db.commit()
    return True

def equip_item(db: Session, character_id: int, user_id: int, equip_data: schemas.EquipItem) -> Optional[models.Character]:
    # ... без изменений ...
    inv_item = get_inventory_item(db, equip_data.inventory_item_id, character_id, user_id)
    if not inv_item or inv_item.quantity == 0: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Предмет инвентаря не найден или количество 0")
    character = db.query(models.Character).options( selectinload(models.Character.equipped_armor).selectinload(models.CharacterInventoryItem.item), selectinload(models.Character.equipped_shield).selectinload(models.CharacterInventoryItem.item), selectinload(models.Character.equipped_weapon1).selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon)), selectinload(models.Character.equipped_weapon2).selectinload(models.CharacterInventoryItem.item.of_type(models.Weapon)) ).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not character: return None
    item = inv_item.item
    slot = equip_data.slot
    # Проверки
    if slot == "armor" and not isinstance(item, models.Armor): raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя надеть как броню")
    if slot == "shield" and not isinstance(item, models.Shield): raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя взять как щит")
    if (slot == "weapon1" or slot == "weapon2") and not isinstance(item, models.Weapon): raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот предмет нельзя взять как оружие")
    if isinstance(item, (models.Armor, models.Shield)) and item.strength_requirement > character.skill_strength: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Недостаточно силы ({character.skill_strength}) для ношения (требуется {item.strength_requirement})")
    is_two_handed = isinstance(item, models.Weapon) and item.is_two_handed
    weapon1_equipped_item = character.equipped_weapon1; weapon2_equipped_item = character.equipped_weapon2; shield_equipped_item = character.equipped_shield
    if is_two_handed:
        if shield_equipped_item: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя взять двуручное оружие со щитом")
        other_slot_key = "weapon2" if slot == "weapon1" else "weapon1"; other_weapon_item = weapon2_equipped_item if slot == "weapon1" else weapon1_equipped_item
        if other_weapon_item: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Сначала снимите оружие из слота {other_slot_key}")
        setattr(character, f"{other_slot_key}_inv_item_id", None); character.shield_inv_item_id = None
    elif slot == "shield":
        if weapon1_equipped_item and isinstance(weapon1_equipped_item.item, models.Weapon) and weapon1_equipped_item.item.is_two_handed: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Сначала снимите двуручное оружие из слота 1")
        if weapon2_equipped_item and isinstance(weapon2_equipped_item.item, models.Weapon) and weapon2_equipped_item.item.is_two_handed: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Сначала снимите двуручное оружие из слота 2")
        if weapon1_equipped_item and weapon2_equipped_item: character.weapon2_inv_item_id = None
    elif (slot == "weapon1" or slot == "weapon2"): # Экипируем одноручное оружие
        other_slot_key = "weapon2" if slot == "weapon1" else "weapon1"; other_weapon_item = weapon2_equipped_item if slot == "weapon1" else weapon1_equipped_item
        if other_weapon_item and isinstance(other_weapon_item.item, models.Weapon) and other_weapon_item.item.is_two_handed: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Сначала снимите двуручное оружие из слота {other_slot_key}")
        if shield_equipped_item and other_weapon_item: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя взять второе оружие со щитом")
    setattr(character, f"{slot}_inv_item_id", inv_item.id)
    db.commit(); db.refresh(character)
    return character

def unequip_item(db: Session, character_id: int, user_id: int, slot: str) -> Optional[models.Character]:
    # ... без изменений ...
    character = db.query(models.Character).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not character: return None
    valid_slots = ["armor", "shield", "weapon1", "weapon2"]
    if slot not in valid_slots: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный слот")
    setattr(character, f"{slot}_inv_item_id", None)
    db.commit(); db.refresh(character)
    return character

# --- Status Effects CRUD ---
def apply_status_effect(db: Session, character: models.Character, status_effect_id: int) -> Optional[str]:
    """Применяет статус-эффект к персонажу и возвращает имя эффекта или None."""
    status_effect = db.query(models.StatusEffect).filter(models.StatusEffect.id == status_effect_id).first()
    if not status_effect:
        print(f"Предупреждение: Статус-эффект с ID {status_effect_id} не найден.")
        # raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статус-эффект не найден")
        return None # Просто возвращаем None, если эффект не найден

    # Проверяем, нет ли уже такого эффекта у персонажа
    has_effect = any(eff.id == status_effect_id for eff in character.active_status_effects)

    if not has_effect:
        character.active_status_effects.append(status_effect)
        # Не делаем commit/refresh здесь, это произойдет в вызывающей функции (update_character_stats)
        print(f"Добавлен эффект '{status_effect.name}' для персонажа ID {character.id}")
        return status_effect.name # Возвращаем имя добавленного эффекта
    else:
        print(f"Эффект '{status_effect.name}' уже есть у персонажа ID {character.id}")
        return None # Эффект уже есть

# --- ОБНОВЛЕННАЯ ЛОГИКА update_character_stats ---
def update_character_stats(db: Session, character_id: int, user_id: int, stats_update: schemas.UpdateCharacterStats) -> Tuple[Optional[models.Character], Optional[str]]:
    """Обновляет статы, проверяет триггеры ПУ и возвращает персонажа и имя сработавшей эмоции."""
    # Загружаем персонажа с необходимыми связями
    character = db.query(models.Character).options(
        selectinload(models.Character.active_status_effects)
    ).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()

    if not character:
        return None, None

    updated = False
    triggered_emotion_name: Optional[str] = None # Для хранения сработавшей эмоции

    # Обновление других статов (HP, OS, Exhaustion, XP)
    if stats_update.current_hp is not None:
        character.current_hp = max(0, min(stats_update.current_hp, character.max_hp)); updated = True
    if stats_update.stamina_points is not None:
        character.stamina_points = max(0, stats_update.stamina_points); updated = True
    if stats_update.exhaustion_level is not None:
        character.exhaustion_level = max(0, min(stats_update.exhaustion_level, 6)); updated = True
    if stats_update.experience_points is not None:
        character.experience_points = max(0, stats_update.experience_points); updated = True

    # --- Обработка ПУ ---
    if stats_update.current_pu is not None:
        new_pu = stats_update.current_pu
        check_result = stats_update.check_result # 'success', 'failure' или None

        print(f"Updating PU for Char ID {character_id}: Current={character.current_pu}, Target={new_pu}, Base={character.base_pu}, Result='{check_result}'") # Отладка

        # 1. Ограничиваем новое значение ПУ (0-10)
        new_pu_clamped = max(0, min(new_pu, 10)) # Предполагаем максимум 10

        # 2. Проверяем триггеры ДО изменения character.current_pu
        emotion_type_to_trigger: Optional[str] = None
        if new_pu_clamped <= 0 and check_result == 'failure':
             print(f"!!! Negative Emotion Triggered for Char ID {character_id}")
             emotion_type_to_trigger = 'negative'
        elif new_pu_clamped >= 10 and check_result == 'success': # Используем 10 как границу
             print(f"!!! Positive Emotion Triggered for Char ID {character_id}")
             emotion_type_to_trigger = 'positive'

        # 3. Применяем новое значение ПУ (или сбрасываем, если триггер сработал)
        if emotion_type_to_trigger:
            character.current_pu = character.base_pu # Сброс до базового
            print(f"    PU reset to base: {character.current_pu}")

            # 4. Определяем и применяем эмоцию
            roll = random.randint(1, 6)
            print(f"    d6 Roll for emotion: {roll}")
            if emotion_type_to_trigger == 'negative' and roll <= len(NEGATIVE_EMOTIONS):
                emotion_name = NEGATIVE_EMOTIONS[roll-1]
            elif emotion_type_to_trigger == 'positive' and roll <= len(POSITIVE_EMOTIONS):
                emotion_name = POSITIVE_EMOTIONS[roll-1]
            else:
                emotion_name = None # На случай, если списки неполные

            if emotion_name:
                print(f"    Selected Emotion: {emotion_name}")
                # Ищем эффект в БД по имени
                effect_to_apply = db.query(models.StatusEffect).filter(models.StatusEffect.name == emotion_name).first()
                if effect_to_apply:
                    # Используем внутреннюю функцию добавления эффекта
                    added_effect_name = apply_status_effect(db, character, effect_to_apply.id)
                    if added_effect_name:
                         triggered_emotion_name = added_effect_name # Сохраняем имя для возврата
                else:
                    print(f"    Warning: StatusEffect '{emotion_name}' not found in DB!")
            else:
                 print(f"    Warning: Could not determine emotion for roll {roll} and type '{emotion_type_to_trigger}'")

        else:
            # Если триггер не сработал, просто обновляем ПУ до new_pu_clamped
            if character.current_pu != new_pu_clamped:
                 character.current_pu = new_pu_clamped
                 print(f"    PU updated to: {character.current_pu}")


        updated = True # Помечаем, что были изменения

    # Применяем изменения в БД, если они были
    if updated:
        try:
            db.commit()
            db.refresh(character) # Обновляем объект из БД
             # Дополнительно обновляем связи, которые могли измениться (статусы)
            db.refresh(character, attribute_names=['active_status_effects'])
            print(f"Character ID {character_id} stats updated. Triggered emotion: {triggered_emotion_name}")
        except Exception as e:
            db.rollback()
            print(f"Error during commit/refresh for char ID {character_id}: {e}")
            raise HTTPException(status_code=500, detail="Ошибка сохранения изменений персонажа")

    return character, triggered_emotion_name # Возвращаем кортеж

def remove_status_effect(db: Session, character_id: int, user_id: int, status_effect_id: int) -> Optional[models.Character]:
    # ... без изменений ...
    character = db.query(models.Character).options(selectinload(models.Character.active_status_effects)).filter(models.Character.id == character_id, models.Character.owner_id == user_id).first()
    if not character: return None
    status_effect = db.query(models.StatusEffect).filter(models.StatusEffect.id == status_effect_id).first()
    if not status_effect: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статус-эффект не найден")
    if status_effect in character.active_status_effects: character.active_status_effects.remove(status_effect); db.commit(); db.refresh(character)
    return character

# --- Reference Data Getters ---
def get_all_items(db: Session, item_cls: Type[models.Item]) -> List[models.Item]: return db.query(item_cls).all()
def get_all_abilities(db: Session) -> List[models.Ability]:
    # Загружаем связи с оружием сразу, чтобы они были доступны
    return db.query(models.Ability).options(selectinload(models.Ability.granted_by_weapons)).order_by(models.Ability.branch, models.Ability.level_required).all()
def get_all_status_effects(db: Session) -> List[models.StatusEffect]:
    return db.query(models.StatusEffect).order_by(models.StatusEffect.name).all()