# backend/scripts/seed_db.py
import sys
import os
import json
import logging
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import create_engine, inspect as sqlainspect


# --- Настройка Логирования ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Настройка Пути ---
# Определяем корень проекта относительно текущего файла
# Предполагается, что seed_db.py находится в backend/scripts/
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Добавляем директорию 'backend' в sys.path, чтобы импорты работали
backend_dir = os.path.join(project_root, 'backend')
if backend_dir not in sys.path:
    sys.path.append(backend_dir)
logger.info(f"Backend directory added to sys.path: {backend_dir}")

# --- Импорты Моделей и БД ---
try:
    from app.db.database import engine, Base, SessionLocal
    from app.models import (
        User, Party, Item, Weapon, Armor, Shield, GeneralItem, Ammo,
        Ability, StatusEffect, Character, CharacterInventoryItem,
        character_abilities, character_status_effects, weapon_granted_abilities
    )
    from app.core.auth import get_password_hash # Импорт функции хэширования
    from app.crud import user as user_crud
    from app.schemas import UserCreate # Импорт схемы для создания пользователя

    logger.info("Models and DB session imported successfully.")
except ImportError as e:
    logger.error(f"Error importing modules: {e}", exc_info=True)
    logger.error("Please ensure the script is run from the 'backend' directory or adjust sys.path.")
    sys.exit(1)
except Exception as e:
    logger.error(f"An unexpected error occurred during imports: {e}", exc_info=True)
    sys.exit(1)


# --- ДАННЫЕ ДЛЯ ЗАПОЛНЕНИЯ ---

weapons_data = [
    # Ближний бой
    { "name": "Нож", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "1к4", "damage_type": "Колющий", "properties": "Легкое, Фехтовальное, Дистанция Броска (6/18)", "is_two_handed": False, "manual_ability_names_json": '["Удар Ножом", "Бросок ножа"]', "required_ammo_type": None },
    { "name": "Боевой нож", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "1к4", "damage_type": "Колющий", "properties": "Легкое, Фехтовальное, Дистанция Броска (6/18)", "is_two_handed": False, "manual_ability_names_json": '["Удар Боевым ножом", "Бросок боевого ножа"]', "required_ammo_type": None },
    { "name": "Дубинка", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к6", "damage_type": "Дробящий", "properties": None, "is_two_handed": False, "manual_ability_names_json": '["Удар Дубинкой"]', "required_ammo_type": None },
    { "name": "Обломок трубы", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к6", "damage_type": "Дробящий", "properties": None, "is_two_handed": False, "manual_ability_names_json": '["Удар Обломком трубы"]', "required_ammo_type": None },
    { "name": "Монтировка", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к6", "damage_type": "Дробящий", "properties": "Особое (Преимущество на проверки Силы для взлома)", "is_two_handed": False, "manual_ability_names_json": '["Удар Монтировкой"]', "required_ammo_type": None },
    { "name": "Топор", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 3, "damage": "1к8", "damage_type": "Рубящий", "properties": None, "is_two_handed": False, "manual_ability_names_json": '["Удар Топором"]', "required_ammo_type": None },
    { "name": "Мачете", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 3, "damage": "1к8", "damage_type": "Рубящий", "properties": None, "is_two_handed": False, "manual_ability_names_json": '["Удар Мачете"]', "required_ammo_type": None },
    { "name": "Меч", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 3, "damage": "1к8", "damage_type": "Рубящий", "properties": "Фехтовальное", "is_two_handed": False, "manual_ability_names_json": '["Удар Мечом"]', "required_ammo_type": None },
    { "name": "Катана", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 3, "damage": "1к8", "damage_type": "Рубящий", "properties": "Фехтовальное", "is_two_handed": False, "manual_ability_names_json": '["Удар Катаной"]', "required_ammo_type": None },
    { "name": "Рапира", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 2, "damage": "1к8", "damage_type": "Колющий", "properties": "Фехтовальное", "is_two_handed": False, "manual_ability_names_json": '["Удар Рапирой"]', "required_ammo_type": None },
    { "name": "Молот", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 10, "damage": "1к10", "damage_type": "Дробящий", "properties": "Двуручное", "is_two_handed": True, "manual_ability_names_json": '["Удар Молотом"]', "required_ammo_type": None },
    { "name": "Тяжелая дубина", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 8, "damage": "1к10", "damage_type": "Дробящий", "properties": "Двуручное", "is_two_handed": True, "manual_ability_names_json": '["Удар Тяжелой дубиной"]', "required_ammo_type": None },
    { "name": "Двуручный меч", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 6, "damage": "1к12", "damage_type": "Рубящий", "properties": "Двуручное, Тяжелое", "is_two_handed": True, "manual_ability_names_json": '["Удар Двуручным мечом"]', "required_ammo_type": None },
    { "name": "Двуручный топор", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 7, "damage": "1к12", "damage_type": "Рубящий", "properties": "Двуручное, Тяжелое", "is_two_handed": True, "manual_ability_names_json": '["Удар Двуручным топором"]', "required_ammo_type": None },
    { "name": "Цепной Меч", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 6, "damage": "1к10", "damage_type": "Рубящий", "properties": "Двуручное ИЛИ Одноручное (с Силой 13+), Разрывное, Шумное", "is_two_handed": True, "manual_ability_names_json": '["Удар Цепным Мечом"]', "required_ammo_type": None },
    { "name": "Силовой Меч", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 3, "damage": "1к8", "damage_type": "Энерг./Рубящий", "properties": "Фехтовальное, Пробивание", "is_two_handed": False, "manual_ability_names_json": '["Удар Силовым Мечом"]', "required_ammo_type": None },
    { "name": "Силовой Молот", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 12, "damage": "2к10", "damage_type": "Энерг./Дроб.", "properties": "Двуручное, Тяжелое, Пробивание", "is_two_handed": True, "manual_ability_names_json": '["Удар Силовым Молотом"]', "required_ammo_type": None },
    { "name": "Кастет", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "1к4", "damage_type": "Дробящий", "properties": "Легкое", "is_two_handed": False, "manual_ability_names_json": '["Удар Кастетом"]', "required_ammo_type": None },
    { "name": "Укрепленные перчатки", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "1к4", "damage_type": "Дробящий", "properties": "Легкое", "is_two_handed": False, "manual_ability_names_json": '["Удар Укрепленными перчатками"]', "required_ammo_type": None },
    { "name": "Безоружный удар", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 0, "damage": "1", "damage_type": "Дробящий", "properties": "Легкое", "is_two_handed": False, "manual_ability_names_json": '["Безоружный удар"]', "required_ammo_type": None },

    # Дальнобойное
    { "name": "Пистолет (легкий, 9мм)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к8", "damage_type": "Колющий", "properties": "Боеприпасы", "range_normal": 15, "range_max": 45, "reload_info": "12 выстр./Бонусное д.", "is_two_handed": False, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Пистолетные 9мм" },
    { "name": "Револьвер (тяжелый)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 3, "damage": "1к10", "damage_type": "Колющий", "properties": "Боеприпасы", "range_normal": 20, "range_max": 60, "reload_info": "6 выстр./Действие", "is_two_handed": False, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Револьверные" },
    { "name": "Обрез", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 5, "damage": "2к6", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное", "range_normal": 8, "range_max": 20, "reload_info": "2 выстр./Бонусное д.", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел", "Атака конусом (Дробовик)"]', "required_ammo_type": "Дробовик 12к" },
    { "name": "Легкий дробовик", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 6, "damage": "2к6", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное", "range_normal": 8, "range_max": 20, "reload_info": "2 выстр./Бонусное д.", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел", "Атака конусом (Дробовик)"]', "required_ammo_type": "Дробовик 12к" },
    { "name": "Дробовик (помповый)", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 7, "damage": "2к8", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Особое (атака конусом)", "range_normal": 15, "range_max": 40, "reload_info": "5 выстр./Действие", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел", "Атака конусом (Дробовик)"]', "required_ammo_type": "Дробовик 12к" },
    { "name": "Дробовик (авто)", "item_type": "weapon", "category": "Воинское", "rarity": "Редкая", "weight": 8, "damage": "2к8", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Особое (атака конусом)", "range_normal": 15, "range_max": 40, "reload_info": "8 выстр./Действие", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел", "Атака конусом (Дробовик)"]', "required_ammo_type": "Дробовик 12к" },
    { "name": "Автомат", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 8, "damage": "1к10", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Очередь", "range_normal": 40, "range_max": 120, "reload_info": "30 выстр./Действие", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел", "Очередь"]', "required_ammo_type": "Винтовочные 5.56" },
    { "name": "Штурмовая винтовка", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 9, "damage": "1к10", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Очередь", "range_normal": 40, "range_max": 120, "reload_info": "30 выстр./Действие", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел", "Очередь"]', "required_ammo_type": "Винтовочные 5.56" },
    { "name": "Снайперская Винтовка", "item_type": "weapon", "category": "Воинское", "rarity": "Редкая", "weight": 10, "damage": "1к12", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Тяжелое, Точное", "range_normal": 100, "range_max": 300, "reload_info": "5 выстр./Действие", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Винтовочные (крупн.)" }, # Пример другого типа
    { "name": "Ржавый Мушкет", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 10, "damage": "1к12", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Шумное, Ненадежное", "range_normal": 15, "range_max": 40, "reload_info": "1 выстр./Действие x2", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Мушкетные заряды" }, # Пример другого типа
    { "name": "Старинное ружье", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 10, "damage": "1к12", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Шумное, Ненадежное", "range_normal": 15, "range_max": 40, "reload_info": "1 выстр./Действие x2", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Мушкетные заряды" }, # Пример другого типа
    { "name": "Лазерный Пистолет", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 1, "damage": "1к6", "damage_type": "Энерг.", "properties": "Боеприпасы (заряд)", "range_normal": 25, "range_max": 75, "reload_info": "40 выстр./Бонусное д.", "is_two_handed": False, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Энергоячейка (малая)" },
    { "name": "Лазерная Винтовка", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 3, "damage": "1к8", "damage_type": "Энерг.", "properties": "Боеприпасы (заряд), Двуручное", "range_normal": 50, "range_max": 150, "reload_info": "60 выстр./Действие", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Энергоячейка (станд.)" },
    { "name": "Болт-Пистолет", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 4, "damage": "1к10", "damage_type": "Взрывной", "properties": "Боеприпасы, Шумное, Разрывное", "range_normal": 15, "range_max": 40, "reload_info": "10 выстр./Действие", "is_two_handed": False, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Болты (пистолетные)" }, # Пример другого типа
    { "name": "Болтер", "item_type": "weapon", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 12, "damage": "2к6", "damage_type": "Взрывной", "properties": "Боеприпасы, Двуручное, Шумное, Разрывное", "range_normal": 30, "range_max": 90, "reload_info": "20 выстр./Действие", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Болты (стандартные)" }, # Пример другого типа
    { "name": "Термо-Пистолет", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 5, "damage": "2к8", "damage_type": "Огненный", "properties": "Боеприпасы (заряд), Пробивание", "range_normal": 5, "range_max": 10, "reload_info": "3 выстр./Действие", "is_two_handed": False, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Термо-заряд (малый)" }, # Пример другого типа
    { "name": "Термо-Ружье", "item_type": "weapon", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 10, "damage": "4к8", "damage_type": "Огненный", "properties": "Боеприпасы (заряд), Двуручное, Пробивание", "range_normal": 10, "range_max": 20, "reload_info": "1 выстр./Действие", "is_two_handed": True, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Термо-заряд (станд.)" }, # Пример другого типа
    { "name": "Огнемет", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 15, "damage": "2к6", "damage_type": "Огненный", "properties": "Боеприпасы (топливо), Двуручное, Взрыв (конус 5м)", "range_normal": 5, "range_max": 5, "reload_info": "5 исп./Действие", "is_two_handed": True, "manual_ability_names_json": '["Струя огня (Огнемет)"]', "required_ammo_type": "Топливо (огнемет)" }, # Пример другого типа
    { "name": "Граната (Осколочная)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "3к6", "damage_type": "Оскол.", "properties": "Взрыв (Радиус 5м), Одноразовая, Дистанция Броска (10/20)", "range_normal": 10, "range_max": 20, "is_two_handed": False, "manual_ability_names_json": '["Бросок гранаты"]', "required_ammo_type": None }, # Гранаты не требуют патронов
    { "name": "Граната (Светошумовая)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "-", "damage_type": "Эффект", "properties": "Взрыв (Радиус 5м), Одноразовая, Дистанция Броска (10/20), Особое (Оглушение)", "range_normal": 10, "range_max": 20, "is_two_handed": False, "manual_ability_names_json": '["Бросок гранаты"]', "required_ammo_type": None },
    { "name": "Плазменный пистолет", "item_type": "weapon", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 3, "damage": "2к6", "damage_type": "Энерг./Огонь", "properties": "Боеприпасы (заряд), Перегрев?", "range_normal": 20, "range_max": 60, "reload_info": "10 выстр./Действие", "is_two_handed": False, "manual_ability_names_json": '["Одиночный выстрел"]', "required_ammo_type": "Плазма-ячейка (малая)" }, # Пример другого типа
]

# БРОНЯ (без изменений)
armors_data = [
    { "name": "Укрепленная одежда", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 4, "armor_type": "Лёгкая", "ac_bonus": 11, "max_dex_bonus": None, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Ряса", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 4, "armor_type": "Лёгкая", "ac_bonus": 11, "max_dex_bonus": None, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Кожаная куртка", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 6, "armor_type": "Лёгкая", "ac_bonus": 12, "max_dex_bonus": None, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Комбинезон", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 6, "armor_type": "Лёгкая", "ac_bonus": 12, "max_dex_bonus": None, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Легкий бронежилет", "item_type": "armor", "category": "Воинское", "rarity": "Необычная", "weight": 10, "armor_type": "Лёгкая", "ac_bonus": 13, "max_dex_bonus": None, "strength_requirement": 0, "stealth_disadvantage": False, "properties": "Сопротивление (Дробящий от взрывов)" },
    { "name": "Кольчуга", "item_type": "armor", "category": "Воинское", "rarity": "Необычная", "weight": 40, "armor_type": "Средняя", "ac_bonus": 14, "max_dex_bonus": 2, "strength_requirement": 4, "stealth_disadvantage": True, "properties": None },
    { "name": "Чешуйчатый доспех", "item_type": "armor", "category": "Воинское", "rarity": "Необычная", "weight": 45, "armor_type": "Средняя", "ac_bonus": 14, "max_dex_bonus": 2, "strength_requirement": 4, "stealth_disadvantage": True, "properties": None },
    { "name": "Тяжелый бронежилет", "item_type": "armor", "category": "Воинское", "rarity": "Редкая", "weight": 25, "armor_type": "Средняя", "ac_bonus": 15, "max_dex_bonus": 2, "strength_requirement": 5, "stealth_disadvantage": True, "properties": "Сопротивление (Колющий от баллистики)" },
    { "name": "Карапас", "item_type": "armor", "category": "Воинское", "rarity": "Редкая", "weight": 30, "armor_type": "Средняя", "ac_bonus": 15, "max_dex_bonus": 2, "strength_requirement": 5, "stealth_disadvantage": True, "properties": "Сопротивление (Колющий от баллистики)" },
    { "name": "Сегментная броня", "item_type": "armor", "category": "Воинское", "rarity": "Редкая", "weight": 40, "armor_type": "Средняя", "ac_bonus": 16, "max_dex_bonus": 2, "strength_requirement": 6, "stealth_disadvantage": True, "properties": None },
    { "name": "Полулаты", "item_type": "armor", "category": "Воинское", "rarity": "Редкая", "weight": 40, "armor_type": "Средняя", "ac_bonus": 16, "max_dex_bonus": 2, "strength_requirement": 6, "stealth_disadvantage": True, "properties": None },
    { "name": "Латный доспех", "item_type": "armor", "category": "Экзотика", "rarity": "Редкая", "weight": 65, "armor_type": "Тяжёлая", "ac_bonus": 17, "max_dex_bonus": 0, "strength_requirement": 7, "stealth_disadvantage": True, "properties": "Уязвимость (Электричество?)" },
    { "name": "Тяжелая пехотная броня", "item_type": "armor", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 50, "armor_type": "Тяжёлая", "ac_bonus": 18, "max_dex_bonus": 0, "strength_requirement": 8, "stealth_disadvantage": True, "properties": "Модульность" },
    { "name": "Силовая Броня", "item_type": "armor", "category": "Экзотика", "rarity": "Легендарная", "weight": 100, "armor_type": "Тяжёлая", "ac_bonus": 19, "max_dex_bonus": 0, "strength_requirement": 9, "stealth_disadvantage": True, "properties": "Треб. Владение, +2 Сила, Интегр. системы" },
]
# ЩИТЫ (без изменений)
shields_data = [
    { "name": "Легкий щит", "item_type": "shield", "category": "Простое", "rarity": "Обычная", "weight": 2, "ac_bonus": 1, "strength_requirement": 0, "properties": None },
    { "name": "Баклер", "item_type": "shield", "category": "Простое", "rarity": "Обычная", "weight": 2, "ac_bonus": 1, "strength_requirement": 0, "properties": None },
    { "name": "Средний щит", "item_type": "shield", "category": "Воинское", "rarity": "Необычная", "weight": 6, "ac_bonus": 2, "strength_requirement": 0, "properties": None },
    { "name": "Боевой щит", "item_type": "shield", "category": "Воинское", "rarity": "Необычная", "weight": 6, "ac_bonus": 2, "strength_requirement": 0, "properties": None },
    { "name": "Тяжелый штурмовой щит", "item_type": "shield", "category": "Воинское", "rarity": "Редкая", "weight": 12, "ac_bonus": 3, "strength_requirement": 6, "properties": "Укрытие 1/2 (Бонусное д.)" },
    { "name": "Энергетический щит", "item_type": "shield", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 4, "ac_bonus": 2, "strength_requirement": 0, "properties": "+4 AC vs Энерг., Требует заряд" },
]
# ОБЩИЕ ПРЕДМЕТЫ (без изменений)
general_items_data = [
    { "name": "Мультитул", "item_type": "general", "category": "Инструменты", "rarity": "Обычная", "weight": 1, "description": "Набор отверток, ключей, пассатижей.", "effect": "Преимущество на Технику (ремонт).", "uses": None, "effect_dice_formula": None },
    { "name": "Набор для взлома (Мех.)", "item_type": "general", "category": "Инструменты", "rarity": "Необычная", "weight": 1, "description": "Отмычки, щупы.", "effect": "Позволяет вскрывать мех. замки (Ловкость).", "uses": None, "effect_dice_formula": None },
    { "name": "Набор для взлома (Эл.)", "item_type": "general", "category": "Инструменты", "rarity": "Необычная", "weight": 1, "description": "Кабели, скребки данных.", "effect": "Позволяет взламывать эл. замки/системы (Техника).", "uses": None, "effect_dice_formula": None },
    { "name": "Лом", "item_type": "general", "category": "Инструменты", "rarity": "Обычная", "weight": 5, "description": "Тяжелый металлический рычаг.", "effect": "Преимущество на Силу (взлом). Можно использовать как Дубинку.", "uses": None, "effect_dice_formula": None },
    { "name": "Аптечка", "item_type": "general", "category": "Медицина", "rarity": "Обычная", "weight": 3, "description": "Бинты, антисептики.", "effect": "Позволяет стабилизировать (Первая Помощь) или лечить.", "uses": 3, "effect_dice_formula": "1к8+Мод.Мед" },
    { "name": "Медпак", "item_type": "general", "category": "Медицина", "rarity": "Обычная", "weight": 3, "description": "Улучшенная аптечка.", "effect": "Позволяет стабилизировать или лечить.", "uses": 5, "effect_dice_formula": "1к8+Мод.Мед" },
    { "name": "Стимулятор (Стим)", "item_type": "general", "category": "Медицина", "rarity": "Необычная", "weight": 0.1, "description": "Инъектор с бодрящим веществом.", "effect": "Бонусное Действие: +2к4 временных ПЗ ИЛИ снять 1 ур. Истощения.", "uses": 1, "effect_dice_formula": "2к4" },
    { "name": "Антидот / Противоядие", "item_type": "general", "category": "Медицина", "rarity": "Необычная", "weight": 0.1, "description": "Универсальное противоядие.", "effect": "Действие: Снимает эффект Отравления.", "uses": 1, "effect_dice_formula": None },
    { "name": "Фонарик", "item_type": "general", "category": "Снаряжение", "rarity": "Обычная", "weight": 1, "description": "Источник света.", "effect": "Освещает конус 10м/тускло +10м.", "uses": None, "effect_dice_formula": None },
    { "name": "Химсвет", "item_type": "general", "category": "Снаряжение", "rarity": "Обычная", "weight": 0.2, "description": "Химический источник света.", "effect": "Сломать: свет 5-10м на 1 час.", "uses": 1, "effect_dice_formula": None },
    { "name": "Сканер", "item_type": "general", "category": "Снаряжение", "rarity": "Необычная", "weight": 2, "description": "Ручной сканер.", "effect": "Действие: анализ окружения (Техника/Внимание).", "uses": None, "effect_dice_formula": None },
    { "name": "Ауспик", "item_type": "general", "category": "Снаряжение", "rarity": "Редкая", "weight": 2, "description": "Продвинутый сканер.", "effect": "Действие: детальный анализ окружения (Техника/Внимание).", "uses": None, "effect_dice_formula": None },
    { "name": "Датапад / Планшет", "item_type": "general", "category": "Снаряжение", "rarity": "Обычная", "weight": 1, "description": "Портативный компьютер.", "effect": "Хранение информации, интерфейс (Техника для взлома).", "uses": None, "effect_dice_formula": None },
    { "name": "Комм-линк", "item_type": "general", "category": "Снаряжение", "rarity": "Обычная", "weight": 0.5, "description": "Устройство связи.", "effect": "Радиосвязь (короткие дистанции).", "uses": None, "effect_dice_formula": None },
    { "name": "Вокс-кастер", "item_type": "general", "category": "Снаряжение", "rarity": "Необычная", "weight": 3, "description": "Мощное устройство связи.", "effect": "Радиосвязь (большие дистанции), шифрование.", "uses": None, "effect_dice_formula": None },
    { "name": "Респиратор", "item_type": "general", "category": "Снаряжение", "rarity": "Обычная", "weight": 1, "description": "Защита дыхания.", "effect": "Преимущество на спасброски от газов/ядов в воздухе.", "uses": None, "effect_dice_formula": None },
    { "name": "Противогаз", "item_type": "general", "category": "Снаряжение", "rarity": "Обычная", "weight": 2, "description": "Полная защита дыхания и лица.", "effect": "Иммунитет к газам, запас воздуха.", "uses": None, "effect_dice_formula": None },
    { "name": "ЭDM-граната", "item_type": "general", "category": "Снаряжение", "rarity": "Редкая", "weight": 1, "description": "Электромагнитная граната.", "effect": "Действие: импульс 5-10м. Спасбросок Техники/Выносливости для техники или Отключение 1к4 раунда. Снимает энергощиты.", "uses": 1, "effect_dice_formula": None },
    { "name": "Веревка (15м)", "item_type": "general", "category": "Снаряжение", "rarity": "Обычная", "weight": 3, "description": "Прочная веревка.", "effect": "Для лазания, связывания и т.д.", "uses": None, "effect_dice_formula": None },
    { "name": "Набор для выживания", "item_type": "general", "category": "Снаряжение", "rarity": "Необычная", "weight": 5, "description": "Труд, огниво, фильтр, инструменты.", "effect": "Преимущество на проверки Адаптации (выживание).", "uses": None, "effect_dice_formula": None },
    { "name": "Бинокль", "item_type": "general", "category": "Снаряжение", "rarity": "Обычная", "weight": 1, "description": "Оптический прибор.", "effect": "Детальное наблюдение удаленных объектов.", "uses": None, "effect_dice_formula": None },
    { "name": "Наручники", "item_type": "general", "category": "Снаряжение", "rarity": "Обычная", "weight": 1, "description": "Металлические/пластиковые.", "effect": "Сковывание (требует проверки Ловкости/Силы).", "uses": None, "effect_dice_formula": None },
    { "name": "Святая вода (Ампула)", "item_type": "general", "category": "Снаряжение", "rarity": "Необычная", "weight": 0.2, "description": "Освященная жидкость.", "effect": "Метательное. 2к6 урона Светом.", "uses": 1, "effect_dice_formula": "2к6" }, # Указали тип урона в effect
    { "name": "Кислота (Ампула)", "item_type": "general", "category": "Снаряжение", "rarity": "Необычная", "weight": 0.2, "description": "Едкая жидкость.", "effect": "Метательное. 2к6 урона Кислотой.", "uses": 1, "effect_dice_formula": "2к6" }, # Указали тип урона в effect
]
# СПЕЦ. БОЕПРИПАСЫ (добавьте ammo_type для всех)
ammo_data = [
    { "name": "Пистолетные патроны 9мм", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Обычная", "weight": 0.02, "ammo_type": "Пистолетные 9мм", "effect": None },
    { "name": "Револьверные патроны", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Обычная", "weight": 0.03, "ammo_type": "Револьверные", "effect": None },
    { "name": "Патроны для дробовика 12к", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Обычная", "weight": 0.05, "ammo_type": "Дробовик 12к", "effect": None },
    { "name": "Винтовочные патроны 5.56", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Обычная", "weight": 0.03, "ammo_type": "Винтовочные 5.56", "effect": None },
    { "name": "Винтовочные патроны (крупн.)", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Необычная", "weight": 0.04, "ammo_type": "Винтовочные (крупн.)", "effect": None },
    { "name": "Мушкетные заряды", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Обычная", "weight": 0.06, "ammo_type": "Мушкетные заряды", "effect": None },
    { "name": "Энергоячейка (малая)", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Обычная", "weight": 0.1, "ammo_type": "Энергоячейка (малая)", "effect": "Заряд для лаз. пистолетов" },
    { "name": "Энергоячейка (станд.)", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Обычная", "weight": 0.3, "ammo_type": "Энергоячейка (станд.)", "effect": "Заряд для лаз. винтовок" },
    { "name": "Болты (пистолетные)", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Редкая", "weight": 0.08, "ammo_type": "Болты (пистолетные)", "effect": None },
    { "name": "Болты (стандартные)", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Редкая", "weight": 0.1, "ammo_type": "Болты (стандартные)", "effect": None },
    { "name": "Термо-заряд (малый)", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Редкая", "weight": 0.2, "ammo_type": "Термо-заряд (малый)", "effect": None },
    { "name": "Термо-заряд (станд.)", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Редкая", "weight": 0.5, "ammo_type": "Термо-заряд (станд.)", "effect": None },
    { "name": "Топливо (огнемет)", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Необычная", "weight": 1.0, "ammo_type": "Топливо (огнемет)", "effect": None },
    { "name": "Плазма-ячейка (малая)", "item_type": "ammo", "category": "Боеприпасы", "rarity": "Очень Редкая", "weight": 0.4, "ammo_type": "Плазма-ячейка (малая)", "effect": None },
    # --- Спец боеприпасы ---
    { "name": "Бронебойные патроны (AP) 5.56", "item_type": "ammo", "category": "Спец.", "rarity": "Редкая", "weight": 0.03, "ammo_type": "Винтовочные 5.56", "effect": "Игнорирует часть AC от брони / Дает Пробивание." },
    { "name": "Экспансивные патроны 9мм", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0.02, "ammo_type": "Пистолетные 9мм", "effect": "Спасбросок Выносливости (СЛ 12) или Кровотечение (1к4)." },
    { "name": "Зажигательные патроны 12к", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0.05, "ammo_type": "Дробовик 12к", "effect": "Спасбросок Ловкости (СЛ 10) или Горение (1к4)." },
    { "name": "ЭDM-заряды (малые)", "item_type": "ammo", "category": "Спец.", "rarity": "Редкая", "weight": 0.1, "ammo_type": "Энергоячейка (малая)", "effect": "Урон/2, Отключение техники/щитов (Спас Техники СЛ 13)." },
    { "name": "Транквилизаторы 9мм", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0.02, "ammo_type": "Пистолетные 9мм", "effect": "Нелетальный урон, цель Без сознания при 0 ПЗ." },
]

# СПОСОБНОСТИ (без изменений)
abilities_data = [
    # --- Атаки Оружием (Специфичные) ---
    { "name": "Удар Ножом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака ножом в ближнем бою.", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к4+Мод.Лов", "damage_type": "Колющий" },
    { "name": "Удар Боевым ножом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака боевым ножом в ближнем бою.", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к4+Мод.Лов", "damage_type": "Колющий" },
    { "name": "Удар Дубинкой", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака дубинкой.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к6+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Удар Обломком трубы", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака обломком трубы.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к6+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Удар Монтировкой", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака монтировкой.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к6+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Удар Топором", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака топором.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к8+Мод.Сил", "damage_type": "Рубящий" },
    { "name": "Удар Мачете", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака мачете.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к8+Мод.Сил", "damage_type": "Рубящий" },
    { "name": "Удар Мечом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака мечом.", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к8+Мод.Лов", "damage_type": "Рубящий" },
    { "name": "Удар Катаной", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака катаной.", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к8+Мод.Лов", "damage_type": "Рубящий" },
    { "name": "Удар Рапирой", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака рапирой.", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к8+Мод.Лов", "damage_type": "Колющий" },
    { "name": "Удар Молотом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака молотом.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к10+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Удар Тяжелой дубиной", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака тяжелой дубиной.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к10+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Удар Двуручным мечом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака двуручным мечом.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к12+Мод.Сил", "damage_type": "Рубящий" },
    { "name": "Удар Двуручным топором", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака двуручным топором.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к12+Мод.Сил", "damage_type": "Рубящий" },
    { "name": "Удар Цепным Мечом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака цепным мечом.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к10+Мод.Сил", "damage_type": "Рубящий" },
    { "name": "Удар Силовым Мечом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака силовым мечом.", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к8+Мод.Лов", "damage_type": "Энерг./Рубящий" },
    { "name": "Удар Силовым Молотом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака силовым молотом.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "2к10+Мод.Сил", "damage_type": "Энерг./Дроб." },
    { "name": "Удар Кастетом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака кастетом.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к4+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Удар Укрепленными перчатками", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака укрепленными перчатками.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к4+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Безоружный удар", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака кулаком или ногой.", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Бросок ножа", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Метание ножа.", "range": "6/18м", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к4+Мод.Лов", "damage_type": "Колющий" },
    { "name": "Бросок боевого ножа", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Метание боевого ножа.", "range": "6/18м", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к4+Мод.Лов", "damage_type": "Колющий" },
    { "name": "Бросок гранаты", "branch": "weapon", "level_required": 0, "action_type": "Действие", "description": "Метание гранаты.", "range": "10/20м", "target": "Точка", "is_weapon_attack": False, "attack_skill": "Ловкость", "damage_formula": "См. гранату", "damage_type": "См. гранату", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "8+Мод.Лов"},
    { "name": "Атака конусом (Дробовик)", "branch": "weapon", "level_required": 0, "action_type": "Действие", "description": "Выстрел дробью в конус 5м. Спасбросок Ловкости (СЛ 8+Мод.Лов) для половинного урона.", "range": "Конус 5м", "target": "Зона", "is_weapon_attack": False, "attack_skill": None, "damage_formula": "Половина урона", "damage_type": "Колющий", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "8+Мод.Лов"},
    { "name": "Струя огня (Огнемет)", "branch": "weapon", "level_required": 0, "action_type": "Действие", "description": "Выпуск струи огня в конус 5м. Спасбросок Ловкости (СЛ 8+Мод.Лов) для половинного урона.", "range": "Конус 5м", "target": "Зона", "is_weapon_attack": False, "attack_skill": None, "damage_formula": "2к6", "damage_type": "Огненный", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "8+Мод.Лов"},
    # Общие способности оружия
    { "name": "Одиночный выстрел", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Стандартный выстрел из дальнобойного оружия. Урон и тип зависят от оружия.", "range": "См. оружие", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "См. оружие", "damage_type": "См. оружие" },
    { "name": "Очередь", "branch": "weapon", "level_required": 0, "action_type": "Атака (Действие)", "description": "Трата 3-5 патронов. Атака с помехой, +1 кубик урона при попадании. Альтернативно: атака до 3 целей в 3м с помехой по каждой.", "range": "См. оружие", "target": "Одна цель / До 3 целей", "is_weapon_attack": False, "attack_skill": "Ловкость", "damage_formula": "См. оружие+1к", "damage_type": "См. оружие" },
    # --- Способности Веток Развития ---
    # === Медик ===
    {
        "name": "Первая Помощь", "branch": "medic", "level_required": 1, "action_type": "Действие",
        "range": "5 метров", "target": "Союзник",
        "description": "Стабилизация союзника с 0 ПЗ (Без сознания) или восстановление 1к4 + Мод.Мед ПЗ.",
        "damage_formula": "1к4+Мод.Мед", "damage_type": "Лечение", "cooldown": None,
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Лечение Союзника", "branch": "medic", "level_required": 2, "action_type": "Действие",
        "skill_requirements": '{"skill_medicine": 4}', # Медицина > 3
        "range": "Касание", "target": "Одно существо", "cooldown": "1 ход",
        "description": "Восстанавливает цели 2к8 + Мод.Мед ПЗ. Усиление: Мед 5+ -> 3к8+Мед; Мед 7+ -> 4к8+Мед.",
        "damage_formula": "2к8+Мод.Мед", "damage_type": "Лечение",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Изготовить Зелье Лечения", "branch": "medic", "level_required": 3, "action_type": "Время (вне боя)",
        "skill_requirements": '{"skill_medicine": 3, "skill_logic": 3, "skill_adaptation": 3}',
        "description": "Используя компоненты и проверку Медицины (СЛ зависит от компонентов), можно создать зелье (2к4+2 ПЗ) или др. препараты.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Тактическое Отступление", "branch": "medic", "level_required": 4, "action_type": "Реакция",
        "skill_requirements": '{"skill_medicine": 4}',
        "trigger": "Союзник в 10м получает урон от атаки видимого врага",
        "range": "10 метров", "target": "Союзник", "cooldown": "2 хода",
        "description": "Реакцией позволить союзнику переместиться на полскорости без провоцирования атаки от атаковавшего.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Спринт к Союзнику", "branch": "medic", "level_required": 5, "action_type": "Бонусное действие",
        "skill_requirements": '{"skill_medicine": 5}',
        "range": "20 метров", "target": "Раненый союзник (< 1/2 ПЗ)", "cooldown": "1 ход",
        "description": "Бонусным действием переместиться на свою скорость к раненому союзнику.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Реанимация", "branch": "medic", "level_required": 6, "action_type": "1 минута",
        "skill_requirements": '{"skill_medicine": 6}',
        "range": "Касание", "target": "Существо, умершее < 1 мин", "cooldown": "Длительный отдых",
        "description": "Возвращает цель к жизни с 20% макс. ПЗ, но дает 1 ур. Истощения. Требует реанимационный комплект.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Защита от Смерти", "branch": "medic", "level_required": 7, "action_type": "Действие",
        "skill_requirements": '{"skill_medicine": 7}',
        "range": "Касание", "target": "Одно существо", "duration": "1 минута", "cooldown": "3 хода",
        "description": "Цель получает 1к10 + Мод.Мед временных ПЗ. Пока они есть, ПЗ цели не могут опуститься ниже 1 от урона.",
        "damage_formula": "1к10+Мод.Мед", "damage_type": "Временные ПЗ",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Очищение", "branch": "medic", "level_required": 8, "action_type": "Действие",
        "skill_requirements": '{"skill_medicine": 8, "skill_science": 4}',
        "range": "Касание", "target": "Одно существо", "cooldown": "2 хода",
        "description": "Снимает один эффект: Отравление, Болезнь, Оглушение, Паралич, Слепота, Глухота, Страх. Цель получает преим. на след. спасбросок против снятого эффекта (1 мин).",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Массовое Лечение", "branch": "medic", "level_required": 9, "action_type": "Действие",
        "skill_requirements": '{"skill_medicine": 9}',
        "range": "15 метров", "target": "До 6 существ в сфере 10м", "cooldown": "5 ходов",
        "description": "Каждая цель восстанавливает 3к8 + Мод.Мед ПЗ.",
        "damage_formula": "3к8+Мод.Мед", "damage_type": "Лечение",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Полевой Госпиталь", "branch": "medic", "level_required": 10, "action_type": "Действие",
        "skill_requirements": '{"skill_medicine": 10}',
        "range": "Себя (аура 10м)", "target": "Союзники в ауре", "duration": "1 мин (Конц.)", "concentration": True, "cooldown": "Длительный отдых",
        "description": "В начале вашего хода союзники в ауре восстанавливают 1к6 ПЗ и могут совершить спасбросок с преим. против одного негативного эффекта (из списка Очищения).",
        "damage_formula": "1к6", "damage_type": "Лечение",
        "is_weapon_attack": False
    },

    # === Мутант ===
    {
        "name": "Психический Толчок", "branch": "mutant", "level_required": 1, "action_type": "Действие",
        "range": "10 метров", "target": "Одно существо", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "СЛ Способности",
        "description": "Спасбросок Силы. Провал: оттолкнуть на 3м, 1к6 дробящего урона. Провал на 5+: цель Ошеломлена до конца ее след. хода.",
        "damage_formula": "1к6", "damage_type": "Дробящий", "effect_on_save_fail": "Отталкивание 3м, Ошеломление (при провале на 5+)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Предчувствие Опасности", "branch": "mutant", "level_required": 2, "action_type": "Пассивно/Реакция",
        "skill_requirements": '{"skill_flow": 3}', "cooldown": "1 ход (Реакция)",
        "description": "+2 к СЛ Защиты против атак, о которых не подозревали. Реакция: наложить помеху на бросок атаки по вам.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Выбить Оружие", "branch": "mutant", "level_required": 3, "action_type": "Действие",
        "skill_requirements": '{"skill_strength": 4, "skill_flow": 4}', # Условие ИЛИ сложно представить в JSON, используем оба
        "range": "5 метров", "target": "Существо с предметом", "saving_throw_attribute": "Сила/Ловкость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "2 хода",
        "description": "Спасбросок Силы или Ловкости (выбор цели). Провал: роняет 1 предмет (Обезоружен).",
        "effect_on_save_fail": "Обезоружен (1 предмет)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Аура Исцеления", "branch": "mutant", "level_required": 4, "action_type": "Действие",
        "skill_requirements": '{"skill_medicine": 5, "skill_flow": 5}',
        "range": "Себя (радиус 5м)", "target": "Вы и союзники в ауре", "duration": "1 мин (Конц.)", "concentration": True, "cooldown": "3 хода",
        "description": "При активации вы и союзники в радиусе 5м восстанавливаете 1к6 + Мод.Пот ПЗ. Пока активна, дает +1 к спасброскам от Страха и Отравления.",
        "damage_formula": "1к6+Мод.Пот", "damage_type": "Лечение",
        "is_weapon_attack": False
    },
    {
        "name": "Воодушевление", "branch": "mutant", "level_required": 5, "action_type": "Действие",
        "skill_requirements": '{"skill_authority": 5}',
        "range": "15 метров", "target": "До 3 союзников", "duration": "1 минута", "cooldown": "3 хода",
        "description": "Выбранные союзники получают +1к4 к броскам атаки и спасброскам на 1 минуту.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Приказ: Подчинись!", "branch": "mutant", "level_required": 6, "action_type": "Действие",
        "skill_requirements": '{"skill_suggestion": 7}',
        "range": "10 метров", "target": "Гуманоид (слышит/понимает)", "saving_throw_attribute": "Самообладание", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "4 хода",
        "description": "Спасбросок Самообладания. Провал: подчиняется простому не-самоубийственному приказу в след. ход. Повторный спасбросок в конце хода цели.",
        "effect_on_save_fail": "Подчиняется приказу (1 ход)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Завербовать Противника", "branch": "mutant", "level_required": 7, "action_type": "Действие",
        "skill_requirements": '{"skill_suggestion": 8, "skill_authority": 6}',
        "range": "10 метров", "target": "Гуманоид (< 1/2 ПЗ, видит/слышит)", "saving_throw_attribute": "Самообладание", "saving_throw_dc_formula": "СЛ Способности", "duration": "1 час", "cooldown": "Длительный отдых",
        "description": "Спасбросок Самообладания. Провал: цель становится Дружественной на 1 час, сражается за вас (не самоубийственно). Эффект прерывается при уроне от вас/союзников.",
        "effect_on_save_fail": "Дружественный (1 час)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Конвертация Жизни в Действие", "branch": "mutant", "level_required": 8, "action_type": "Бонусное действие",
        "skill_requirements": '{"skill_endurance": 6}',
        "range": "Себя", "target": "Себя", "cooldown": "3 хода",
        "description": "Получить доп. Основное Действие ценой 30% текущих ПЗ (мин. 5, нельзя уменьшить).",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Ментальный Щит", "branch": "mutant", "level_required": 9, "action_type": "Реакция",
        "skill_requirements": '{"skill_flow": 8}',
        "trigger": "Вы или союзник в 10м цель атаки/спасбр. Инт/Сам/Пот",
        "range": "10 метров", "target": "Вы или союзник", "cooldown": "2 хода",
        "description": "Реакцией наложить помеху на атаку противника ИЛИ дать цели преимущество на спасбросок.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Спрятать в Потоке", "branch": "mutant", "level_required": 10, "action_type": "Действие",
        "skill_requirements": '{"skill_flow": 9}',
        "range": "Касание", "target": "Себя или согласное существо", "duration": "1 мин (Конц.)", "concentration": True, "cooldown": "4 хода",
        "description": "Цель становится Невидимой на 1 мин. Прерывается атакой, вред. способностью, ярким светом или потерей концентрации.",
        "is_weapon_attack": False
    },

    # === Стрелок ===
    {
        "name": "Точный Выстрел", "branch": "sharpshooter", "level_required": 1, "action_type": "Бонусное действие",
        "range": "Себя", "target": "Себя", "cooldown": "1 ход",
        "description": "Следующий бросок атаки дальнобойным оружием в этот ход совершается с преимуществом.",
        "is_weapon_attack": False, "concentration": False
        # Примечание: само преимущество будет применено логикой determine_roll_mode
    },
    {
        "name": "Подавляющий Огонь", "branch": "sharpshooter", "level_required": 2, "action_type": "Действие",
        "skill_requirements": '{"skill_attention": 3}',
        "range": "Дистанция оружия", "target": "Зона (куб 3м или конус 5м)", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "8+Мод.Лов", "cooldown": "1 ход",
        "description": "Спасбросок Ловкости. Провал: скорость / 2 и состояние Подавлен до конца их след. хода.",
        "effect_on_save_fail": "Скорость / 2, Подавлен (1 ход)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Авто-Прицеливание", "branch": "sharpshooter", "level_required": 3, "action_type": "Действие",
        "skill_requirements": '{"skill_technique": 4}',
        "range": "Дистанция оружия", "target": "1-2 цели в 5м друг от друга", "cooldown": "2 хода",
        "description": "Отдельная атака дальнобойным оружием по каждой цели с половиной урона.",
        "damage_formula": "Урон оружия / 2", # Указываем модификацию урона
        "is_weapon_attack": True, "attack_skill": "Ловкость" # Это все еще атака оружием
    },
    {
        "name": "Снайперский Выстрел в Глаз", "branch": "sharpshooter", "level_required": 4, "action_type": "Действие",
        "skill_requirements": '{"skill_attention": 6}',
        "range": "Дистанция оружия", "target": "Одна цель", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "3 хода",
        "description": "Атака дальнобойным оружием с помехой. При попадании = крит. попадание. Если крит, цель спасбросок Выносливости или Ослеплена на 1 раунд.",
        "effect_on_save_fail": "Ослеплен (1 раунд, если атака была критом)",
        "is_weapon_attack": True, "attack_skill": "Ловкость" # Это атака, но с особыми правилами
        # Примечание: Помеха должна быть применена в `determine_roll_mode` при активации этой способности
    },
    {
        "name": "Отталкивающий Выстрел", "branch": "sharpshooter", "level_required": 5, "action_type": "Действие",
        "skill_requirements": '{"skill_strength": 3}', # Указано требование Силы
        "range": "Дистанция оружия", "target": "Одно существо", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "1 ход",
        "description": "Атака дальнобойным оружием. При попадании, цель спасбросок Силы или отталкивается на 3 метра.",
        "effect_on_save_fail": "Отталкивание 3м",
        "is_weapon_attack": True, "attack_skill": "Ловкость"
    },
    {
        "name": "Плечевая Турель", "branch": "sharpshooter", "level_required": 6, "action_type": "Бонусное действие (активация/атака)",
        "skill_requirements": '{"skill_technique": 5}',
        "range": "20 метров (атака турели)", "target": "Цель атаки турели", "duration": "1 минута", "cooldown": "4 хода",
        "description": "Активация (БД). В след. ходы: БД -> атака турели (3к6+УрСтр/2+Лов vs AC, урон 1к6+Лов). Турель: 10 ПЗ, 12 AC.",
        "damage_formula": "1к6+Мод.Лов", "damage_type": "Энерг./Кинетич.", # Урон самой турели
        "is_weapon_attack": False # Атакует турель, а не персонаж
    },
    {
        "name": "Ассистирование", "branch": "sharpshooter", "level_required": 7, "action_type": "Реакция",
        "skill_requirements": '{"skill_attention": 5}',
        "trigger": "Союзник в 15м промахивается атакой по видимому врагу",
        "range": "15 метров", "target": "Союзник", "cooldown": "2 хода",
        "description": "Реакцией дать союзнику +2 к промахнувшемуся броску атаки.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Разрывная Ракета", "branch": "sharpshooter", "level_required": 8, "action_type": "Действие",
        "skill_requirements": '{"skill_science": 5}',
        "range": "30 метров", "target": "Точка (взрыв 5м)", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "5 ходов",
        "description": "Взрыв в точке. Спасбросок Ловкости в радиусе 5м. Провал: 6к6 урона (огонь/осколки) и Горение (1к4). Успех: половина урона, без горения.",
        "damage_formula": "6к6", "damage_type": "Огонь/Осколки", "effect_on_save_fail": "Горение (1к4)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Скан на Уязвимости", "branch": "sharpshooter", "level_required": 9, "action_type": "Бонусное действие",
        "skill_requirements": '{"skill_attention": 8, "skill_technique": 4}',
        "range": "20 метров", "target": "Одно существо", "duration": "1 минута", "cooldown": "3 хода",
        "description": "Следующая атака по цели в течение 1 мин наносит +2к6 урона и имеет увеличенный шанс крита.",
        "damage_formula": "2к6", "damage_type": "Дополнительный", # Урон добавляется к следующей атаке
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Шквал Огня", "branch": "sharpshooter", "level_required": 10, "action_type": "Действие",
        "skill_requirements": '{"skill_reaction": 7}',
        "range": "Дистанция оружия", "target": "До 4 врагов в 10м от основной цели", "cooldown": "5 ходов",
        "description": "Одна атака дальнобойным оружием с помехой по каждой выбранной цели (макс. 4).",
        "is_weapon_attack": True, "attack_skill": "Ловкость"
        # Примечание: Помеха должна быть применена в `determine_roll_mode`
    },

    # === Разведчик ===
    {
        "name": "Скрытность", "branch": "scout", "level_required": 1, "action_type": "Бонусное действие",
        "range": "Себя", "target": "Себя",
        "description": "Попытка спрятаться (проверка Ловкость(Скрытность) vs пассивное Внимание). Успех = Скрыт.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Трекинг Цели", "branch": "scout", "level_required": 2, "action_type": "Действие",
        "skill_requirements": '{"skill_attention": 4, "skill_adaptation": 3}',
        "range": "Видимость", "target": "Одна цель", "duration": "До конца след. хода", "cooldown": "2 хода (боевой)",
        "description": "Вне боя: выслеживание (Внимание). В бою: узнать точное местоположение цели, первая атака по ней с преимуществом.",
        "is_weapon_attack": False, "concentration": False
        # Примечание: Преимущество на атаку должно быть обработано в `determine_roll_mode`
    },
    {
        "name": "Удар в Спину / Скрытая Атака", "branch": "scout", "level_required": 3, "action_type": "Пассивно (1 раз/ход)",
        "description": "При попадании атакой (дальн./легк./фехт.) с преимуществом ИЛИ если союзник рядом с целью: +2к6 урона. Урон растет: +3к6 (ур.6), +4к6 (ур.9). Крит = Кровотечение (1к4).",
        "damage_formula": "2к6 / 3к6 / 4к6", "damage_type": "Тип оружия", # Урон добавляется к атаке
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Голограмма-Приманка", "branch": "scout", "level_required": 4, "action_type": "Действие",
        "skill_requirements": '{"skill_technique": 3}',
        "range": "15 метров", "target": "Точка", "duration": "1 минута", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "3 хода",
        "description": "Создает иллюзорную копию (AC 10, 1 ПЗ). Распознается проверкой Логики (СЛ Способности). При уничтожении вспышка: спасбросок Выносливости или Ослепление (1 раунд).",
        "effect_on_save_fail": "Ослеплен (1 раунд, при уничтожении голограммы)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Оружейный Гоп-Стоп / Обезоруживание", "branch": "scout", "level_required": 5, "action_type": "Действие",
        "skill_requirements": '{"skill_dexterity": 6}',
        "range": "1.5 метра", "target": "Одно существо", "saving_throw_attribute": "Сила/Ловкость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "2 хода",
        "description": "Атака (без урона). При попадании цель спасбросок Силы/Ловкости или роняет предмет (Обезоружен).",
        "effect_on_save_fail": "Обезоружен (1 предмет)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Добивающий Удар", "branch": "scout", "level_required": 6, "action_type": "Бонусное действие",
        "trigger": "В ваш ход вы нанесли крит. удар ИЛИ снизили ПЗ врага до 0 атакой",
        "range": "Дистанция/досягаемость оружия", "target": "Другая цель",
        "description": "После крита или убийства атакой, можно совершить доп. атаку оружием Бонусным Действием по другой цели.",
        "is_weapon_attack": True # Это дополнительная атака оружием
    },
    {
        "name": "Удар с Вертушки / Вихрь Клинков", "branch": "scout", "level_required": 7, "action_type": "Действие",
        "skill_requirements": '{"skill_dexterity": 7}',
        "range": "1.5 метра", "target": "Все существа в досягаемости", "cooldown": "3 хода",
        "description": "Одна атака оружием ближнего боя против всех выбранных существ в досягаемости (один бросок атаки).",
        "is_weapon_attack": True # Это атака оружием
    },
    {
        "name": "Неуловимость", "branch": "scout", "level_required": 8, "action_type": "Пассивно/Реакция",
        "skill_requirements": '{"skill_dexterity": 8}', "cooldown": "1 ход (Реакция)",
        "description": "Атаки по возможности по вам с помехой. Реакция: когда по вам попадает атака, уменьшить урон вдвое.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Мастер Тени", "branch": "scout", "level_required": 9, "action_type": "Бонусное действие",
        "skill_requirements": '{"skill_dexterity": 9}',
        "range": "Себя", "target": "Себя", "duration": "Пока не атакуете/не используете способность/не выйдете на свет", "cooldown": "2 хода",
        "description": "В тусклом свете/темноте Бонусным Действием стать Невидимым.",
        "is_weapon_attack": False, "concentration": True # Неявная концентрация
    },
    {
        "name": "Удар Смерти", "branch": "scout", "level_required": 10, "action_type": "Действие",
        "trigger": "Атака по Застигнутому врасплох или не видящему вас врагу",
        "range": "Дистанция/досягаемость оружия", "target": "Одна цель", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "5 ходов",
        "description": "Атака оружием. При попадании цель спасбросок Выносливости. Провал: урон атаки удваивается. Успех: обычный урон.",
        "is_weapon_attack": True # Это атака оружием
    },

    # === Техник ===
    {
        "name": "Анализ Механизма", "branch": "technician", "level_required": 1, "action_type": "Бонусное действие",
        "skill_requirements": '{"skill_logic": 3}',
        "range": "10 метров", "target": "Механизм/Робот/Киборг/Тех. объект",
        "description": "Узнать примерные ПЗ, уязвимости/сопротивления цели.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Электронный Замок / Взлом", "branch": "technician", "level_required": 2, "action_type": "Действие",
        "skill_requirements": '{"skill_technique": 3}',
        "range": "5 метров (бой) / Касание (вне боя)", "target": "Устройство/Сеть/Кибернетика врага", "saving_throw_attribute": "Техника/Выносливость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "3 хода (боевой)",
        "description": "Вне боя: взлом (Техника vs СЛ). В бою: цель спасбросок Техники/Выносливости или ее кибернетика/оружие Отключено на 1 раунд.",
        "effect_on_save_fail": "Отключение (1 раунд, боевой эффект)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Блокировка Систем", "branch": "technician", "level_required": 3, "action_type": "Действие",
        "range": "15 метров", "target": "Механизм/Киборг", "saving_throw_attribute": "Техника/Интеллект", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "3 хода",
        "description": "Спасбросок Техники/Интеллекта. Провал: цель не может исп. особые способности/действия (кроме базовых) в след. ход (Немота технол.).",
        "effect_on_save_fail": "Немота (технологическая, 1 ход)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Улучшение Брони", "branch": "technician", "level_required": 4, "action_type": "Действие",
        "skill_requirements": '{"skill_science": 3}',
        "range": "Касание", "target": "Одно согласное существо", "duration": "10 минут",
        "description": "Цель получает +1 к СЛ Защиты и сопротивление одному типу урона (физ., огонь, холод, электр.) на 10 минут.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Установка Мины", "branch": "technician", "level_required": 5, "action_type": "Действие",
        "range": "1.5 метра (установка)", "target": "Точка (взрыв 2м)", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "1 ход (установка)",
        "description": "Установка скрытой мины (Внимание vs СЛ Способности). Взрыв при контакте/дист. активации (БД). Спасбросок Ловкости в радиусе 2м. Провал: 3к6 урона. Успех: половина.",
        "damage_formula": "3к6", "damage_type": "Осколки/Другой", "effect_on_save_success": "Половина урона",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Электромагнитный Разряд", "branch": "technician", "level_required": 6, "action_type": "Действие",
        "skill_requirements": '{"skill_science": 5}',
        "range": "Линия 10м x 1.5м / Конус 5м", "target": "Зона", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "4 хода",
        "description": "Спасбросок Ловкости в зоне. Провал: 4к8 урона электричеством, нет Реакций до конца след. хода (Шок). Механизмы: помеха на спасбросок, при провале + Отключение (1 раунд).",
        "damage_formula": "4к8", "damage_type": "Электричество", "effect_on_save_fail": "Шок (1 ход), Отключение (1 раунд, для механизмов)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Гравитационная Ловушка / Стяжка", "branch": "technician", "level_required": 7, "action_type": "Действие",
        "skill_requirements": '{"skill_science": 6}',
        "range": "20 метров", "target": "Точка (зона 5м)", "duration": "1 раунд", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "4 хода",
        "description": "Создает поле стягивания (5м) на 1 раунд. Существа в зоне/входящие в нее: спасбросок Силы. Провал: скорость=0 до начала их след. хода, притянуты на 3м к центру.",
        "effect_on_save_fail": "Скорость=0 (1 ход), Притягивание 3м",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Стан-Граната / Импульс", "branch": "technician", "level_required": 8, "action_type": "Действие",
        "range": "15 метров (бросок)", "target": "Точка (взрыв 5м)", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "4 хода",
        "description": "Взрыв в точке. Существа в радиусе 5м: спасбросок Выносливости. Провал: Оглушены до конца вашего след. хода. Механизмы: вместо Оглушения - Отключение (1 раунд) + 2к6 урона.",
        "damage_formula": "2к6", "damage_type": "Электр./Сила (механизмам)", "effect_on_save_fail": "Оглушен (до конца вашего след. хода) / Отключение (1 раунд, механизмам)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Завербовать Механизм", "branch": "technician", "level_required": 9, "action_type": "Действие",
        "skill_requirements": '{"skill_technique": 9}',
        "range": "10 метров", "target": "Механизм/Робот (Инт <= 4)", "saving_throw_attribute": "Техника", "saving_throw_dc_formula": "СЛ Способности", "duration": "1 час", "cooldown": "Длительный отдых",
        "description": "Спасбросок Техники цели. Провал: цель Дружественна к вам и подчиняется простым командам 1 час. Можно контролировать только 1 механизм.",
        "effect_on_save_fail": "Дружественный (1 час), Контроль",
        "is_weapon_attack": False, "concentration": False # Неявная концентрация на контроле
    },
    {
        "name": "Перегрузка Реактора / Самоуничтожение", "branch": "technician", "level_required": 10, "action_type": "Действие",
        "skill_requirements": '{"skill_science": 8}',
        "range": "10 метров", "target": "Механизм/Объект с источником энергии", "saving_throw_attribute": "Техника/Выносливость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "Длительный отдых",
        "description": "Спасбросок Техники/Выносливости цели. Провал: в конце след. хода цели - взрыв (5м, 10к6 урона). Успех: 5к6 урона немедленно.",
        "damage_formula": "10к6 (взрыв) / 5к6 (успех)", "damage_type": "Огонь/Электр./Сила/Радиация",
        "is_weapon_attack": False, "concentration": False
    },

    # === Боец ===
    {
        "name": "Мощный Удар", "branch": "fighter", "level_required": 1, "action_type": "Бонусное действие",
        "range": "Себя", "target": "Себя", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "8+Мод.Сил",
        "description": "Перед атакой ближнего боя: -2 к атаке, +4 к урону. При попадании: цель спасбросок Выносливости (СЛ 8+Сил) или скорость -3м до конца ее след. хода.",
        "effect_on_save_fail": "Скорость -3м (1 ход)",
        "is_weapon_attack": False, "concentration": False
        # Примечание: Штраф к атаке и бонус к урону применяются в логике активации
    },
    {
        "name": "Второе Дыхание", "branch": "fighter", "level_required": 2, "action_type": "Бонусное действие",
        "skill_requirements": '{"skill_endurance": 4}',
        "range": "Себя", "target": "Себя", "cooldown": "3 хода", # Изменено с Короткого отдыха на 3 хода для большей динамики
        "description": "Восстановить 1к10 + Мод.Вын ПЗ.", # Убрано Ур.Бойца, используется Мод.Вын
        "damage_formula": "1к10+Мод.Вын", "damage_type": "Лечение",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Атака по Области / Рассекающий Удар", "branch": "fighter", "level_required": 3, "action_type": "Действие",
        "skill_requirements": '{"skill_strength": 5}',
        "range": "1.5 метра (досягаемость)", "target": "Все существа в досягаемости", "cooldown": "2 хода",
        "description": "Одна атака оружием ближнего боя против всех выбранных существ в досягаемости (один бросок атаки).",
        "is_weapon_attack": True # Это атака оружием
    },
    {
        "name": "Захват", "branch": "fighter", "level_required": 4, "action_type": "Действие / Замена Атаки",
        "skill_requirements": '{"skill_strength": 4}',
        "range": "1.5 метра", "target": "Существо (размер <= ваш)",
        "description": "Проверка Силы(Атлетика) против Силы(Атлетика)/Ловкости(Акробатика) цели. Успех = Схвачен.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Жестокая Расправа", "branch": "fighter", "level_required": 4, "action_type": "Реакция / Часть Захвата", # Добавили Реакцию
        "trigger": "ПЗ схваченной вами цели <= 20% ИЛИ цель получает урон, опускающий ПЗ <= 20%",
        "range": "Касание", "target": "Схваченная цель (<= 20% ПЗ)", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "СЛ Способности",
        "description": "Попытка убить схваченную цель с низким ПЗ. Спасбросок Выносливости. Провал = Смерть.",
        "effect_on_save_fail": "Смерть",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Резня", "branch": "fighter", "level_required": 4, "action_type": "Пассивно (активируется) / Бонусное действие",
        "trigger": "После убийства через Жестокую Расправу", "duration": "1 минута / пока не получите урон", "cooldown": "3 хода (для Бонусного действия)",
        "description": "Активируется на 1 мин после Жестокой Расправы. Пока активна: Бонусным Действием можно попытаться Захватить цель с <= 20% ПЗ.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Афтершок / Землетрясение", "branch": "fighter", "level_required": 5, "action_type": "Действие",
        "skill_requirements": '{"skill_strength": 6}',
        "range": "Себя (радиус 3м)", "target": "Зона", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "3 хода",
        "description": "Удар по земле. Существа в радиусе 3м: спасбросок Ловкости. Провал: 2к6 дробящего урона, сбиты с ног (Лежа). Зона = труднопроходимая (1 ход).",
        "damage_formula": "2к6", "damage_type": "Дробящий", "effect_on_save_fail": "Лежа",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Сближение с Ударом / Рывок Берсерка", "branch": "fighter", "level_required": 6, "action_type": "Действие",
        "range": "10 метров (перемещение)", "target": "Противник в конце перемещения",
        "description": "Перемещение по прямой до 10м к врагу + 1 атака ближнего боя. При попадании: +1к6 урона за каждые 3м пробега (макс +3к6). Провоцирует атаки.",
        "damage_formula": "+1к6/3м", "damage_type": "Дополнительный",
        "is_weapon_attack": True # Это атака оружием
    },
    {
        "name": "Оглушающий Удар", "branch": "fighter", "level_required": 7, "action_type": "Действие",
        "skill_requirements": '{"skill_strength": 7}',
        "range": "Досягаемость оружия", "target": "Одна цель", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "4 хода",
        "description": "Атака оружием ближнего боя. При попадании: цель спасбросок Выносливости или Оглушена до конца вашего след. хода.",
        "effect_on_save_fail": "Оглушен (до конца вашего след. хода)",
        "is_weapon_attack": True # Это атака оружием
    },
    {
        "name": "Перегрев Оружия / Раскаленный Клинок", "branch": "fighter", "level_required": 8, "action_type": "Бонусное действие",
        "skill_requirements": '{"skill_technique": 3, "skill_science": 3}', # Условие ИЛИ
        "range": "Себя", "target": "Оружие ближнего боя", "duration": "1 минута", "cooldown": "4 хода",
        "description": "Атаки выбранным оружием наносят +1к6 урона огнем. При попадании: цель спасбросок Ловкости (СЛ 10) или Горение (1к4).",
        "damage_formula": "+1к6", "damage_type": "Огонь", "effect_on_save_fail": "Горение (1к4, если провален спасбросок Ловкости СЛ 10)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Дополнительная Атака", "branch": "fighter", "level_required": 9, "action_type": "Пассивно / Бонусное действие",
        "skill_requirements": '{"skill_reaction": 6}',
        "trigger": "После использования Действия 'Атака' оружием ближнего боя",
        "description": "Можно совершить одну доп. атаку этим же оружием Бонусным Действием.",
        "is_weapon_attack": True # Это атака оружием
    },
    {
        "name": "Несокрушимость", "branch": "fighter", "level_required": 10, "action_type": "Реакция",
        "skill_requirements": '{"skill_endurance": 8}',
        "trigger": "Урон опускает ПЗ до 0, но не убивает мгновенно",
        "range": "Себя", "target": "Себя", "cooldown": "Длительный отдых",
        "description": "Реакцией остаться с 1 ПЗ вместо 0.",
        "is_weapon_attack": False, "concentration": False
    },

    # === Джаггернаут ===
    {
        "name": "Провокация / Вызов", "branch": "juggernaut", "level_required": 1, "action_type": "Бонусное действие",
        "skill_requirements": '{"skill_authority": 3}',
        "range": "10 метров", "target": "Существо (видит/слышит)", "saving_throw_attribute": "Самообладание", "saving_throw_dc_formula": "СЛ Способности",
        "description": "Спасбросок Самообладания цели. Провал: помеха на атаки по другим (кроме вас) до конца вашего след. хода.",
        "effect_on_save_fail": "Помеха на атаки по другим (1 ход)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Несгибаемость", "branch": "juggernaut", "level_required": 2, "action_type": "Пассивно",
        "skill_requirements": '{"skill_endurance": 5}',
        "description": "Преимущество на спасброски Силы и Ловкости против сбивания с ног или насильного перемещения.",
        "is_weapon_attack": False, "concentration": False
        # Примечание: Преимущество будет применено логикой determine_roll_mode, если цель броска 'saving_throws.strength' или 'saving_throws.dexterity' и эффект связан с перемещением/падением (требует доработки determine_roll_mode).
    },
    {
        "name": "Оглушающий Удар Щитом", "branch": "juggernaut", "level_required": 3, "action_type": "Бонусное действие",
        "skill_requirements": '{"skill_strength": 4}', "trigger": "После атаки Действием (требует щит)",
        "range": "1.5 метра", "target": "Одна цель", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "1 ход",
        "description": "Удар щитом Бонусным Действием. Цель спасбросок Выносливости. Провал: 1к4 дробящего урона, нет Реакций до начала ее след. хода (Шок).",
        "damage_formula": "1к4", "damage_type": "Дробящий", "effect_on_save_fail": "Шок (1 ход)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Рывок и Сбивание", "branch": "juggernaut", "level_required": 4, "action_type": "Действие",
        "skill_requirements": '{"skill_strength": 6}',
        "range": "10 метров (перемещение)", "target": "Существо на пути (размер <= ваш)", "saving_throw_attribute": "Сила/Ловкость", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "3 хода",
        "description": "Перемещение по прямой до 10м. Существо на пути: спасбросок Силы/Ловкости. Провал: 2к8 дробящего урона, Лежа, Ошеломлен до конца его след. хода.",
        "damage_formula": "2к8", "damage_type": "Дробящий", "effect_on_save_fail": "Лежа, Ошеломлен (1 ход)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Таунт / Массовый Вызов", "branch": "juggernaut", "level_required": 5, "action_type": "Действие",
        "skill_requirements": '{"skill_authority": 6}',
        "range": "Себя (радиус 10м)", "target": "Все враги в радиусе (видят/слышат)", "saving_throw_attribute": "Самообладание", "saving_throw_dc_formula": "СЛ Способности", "duration": "1 минута", "cooldown": "4 хода",
        "description": "Спасбросок Самообладания целей. Провал: помеха на атаки по другим (кроме вас) на 1 мин. Повторный спасбросок в конце хода цели.",
        "effect_on_save_fail": "Помеха на атаки по другим (1 мин, повт. спасбр.)",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Отталкивающий Удар / Волна Силы", "branch": "juggernaut", "level_required": 6, "action_type": "Действие",
        "skill_requirements": '{"skill_strength": 7}',
        "range": "Себя (радиус 3м)", "target": "Зона", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "3 хода",
        "description": "Ударная волна. Существа в радиусе 3м: спасбросок Силы. Провал: оттолкнуть на 3м, 2к6 урона (сила/дробящий).",
        "damage_formula": "2к6", "damage_type": "Сила/Дробящий", "effect_on_save_fail": "Отталкивание 3м",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Хук / Притягивание", "branch": "juggernaut", "level_required": 7, "action_type": "Действие",
        "skill_requirements": '{"skill_dexterity": 4, "skill_technique": 4}', # ИЛИ
        "range": "10 метров", "target": "Существо (размер <= ваш)", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "4 хода",
        "description": "Дальнобойная атака (цепь/крюк/гарпун, Сил/Лов). Попадание: 1к8 урона (кол./дроб.), цель спасбросок Силы или притягивается вплотную.",
        "damage_formula": "1к8", "damage_type": "Колющий/Дробящий", "effect_on_save_fail": "Притягивание",
        "is_weapon_attack": True, "attack_skill": "Сила/Ловкость" # Зависит от реализации
    },
    {
        "name": "Непробиваемый Щит", "branch": "juggernaut", "level_required": 8, "action_type": "Реакция",
        "skill_requirements": '{"skill_endurance": 7}', "trigger": "Вы или союзник в 1.5м цель дальнобойной атаки",
        "range": "1.5 метра", "target": "Вы или союзник", "cooldown": "2 хода",
        "description": "Реакция: помеха на атаку. Если атака по союзнику и попала: принять половину урона. Если атака по вам: +5 к СЛ Защиты против этой атаки.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Стойкость Титана", "branch": "juggernaut", "level_required": 9, "action_type": "Пассивно",
        "skill_requirements": '{"skill_endurance": 9}',
        "description": "В начале вашего хода в бою восстанавливаете ПЗ = Мод.Вын (мин 1), если есть >= 1 ПЗ и не Без сознания.",
        "is_weapon_attack": False, "concentration": False
    },
    {
        "name": "Арена / Дуэльная Зона", "branch": "juggernaut", "level_required": 10, "action_type": "Действие",
        "skill_requirements": '{"skill_authority": 8}',
        "range": "10 метров", "target": "Одно существо", "duration": "1 мин (Конц.)", "concentration": True, "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "СЛ Способности", "cooldown": "Длительный отдых",
        "description": "Создает барьер (цилиндр 5м рад.) на 1 мин. Вы и цель не можете выйти (спасбр. Силы). Внутри: преим. на атаки друг по другу. Атаки извне/вовнутрь с помехой.",
        "is_weapon_attack": False
    },
]
# СОСТОЯНИЯ (без изменений)
status_effects_data = [
    # Состояния без прямого влияния на броски (roll_modifier_type = None)
    { "name": "При смерти (Unconscious)", "description": "Недееспособен, не может двигаться/говорить, роняет предметы. Атаки по нему с преим., вблизи - крит. Провал спасбр. Сил/Лов. Восстанавливается при лечении >0 ПЗ или стабилизации.", "roll_modifier_type": None, "roll_modifier_targets": None },
    { "name": "Горение (Burning)", "description": "Урон огнем (1к4/1к6) в начале хода. Действие на тушение (СЛ Лов 10).", "roll_modifier_type": None, "roll_modifier_targets": None },
    { "name": "Глухота (Deafened)", "description": "Не может слышать, провал проверок на слух.", "roll_modifier_type": "disadvantage", "roll_modifier_targets": {"skill_checks": ["attention"]} }, # Пример: Помеха на проверки Внимания (слух)
    { "name": "Дружественный (Charmed/Friendly)", "description": "Считает источник другом, не атакует его. Преим. на соц. проверки у источника. Может закончиться при вреде.", "roll_modifier_type": None, "roll_modifier_targets": None }, # Преимущество у источника, а не у цели
    { "name": "Замедление (Slowed)", "description": "Скорость / 2 (или -X). Не может исп. Реакции перемещения.", "roll_modifier_type": None, "roll_modifier_targets": None }, # Влияет на скорость, не на броски
    { "name": "Застигнут врасплох (Surprised)", "description": "Не может двигаться/действовать/реагировать в 1й ход боя.", "roll_modifier_type": None, "roll_modifier_targets": None }, # Ограничивает действия
    { "name": "Истощение (Exhaustion)", "description": "Уровни 1-6: 1:Помеха проверки; 2:Скор/2; 3:Помеха атаки/спасбр; 4:ПЗmax/2; 5:Скор=0; 6:Смерть. -1 за Длит. отдых.", "roll_modifier_type": None, "roll_modifier_targets": None }, # Сложная логика, лучше обрабатывать отдельно, а не через модификатор
    { "name": "Кровотечение (Bleeding)", "description": "Урон (1к4) в начале хода. Требует Действия и Медицины/Лечения для остановки.", "roll_modifier_type": None, "roll_modifier_targets": None },
    { "name": "Лежа (Prone)", "description": "Скор. ползком / 2. Помеха на атаки. Атаки по нему: ближ. с преим., дальн. с помехой. Встать = полскорости.", "roll_modifier_type": "disadvantage", "roll_modifier_targets": {"attack_rolls": True} }, # Помеха на свои атаки
    { "name": "Невидимость (Invisible)", "description": "Не видно без спец. средств. Атаки по существу с помехой, его атаки с преим.", "roll_modifier_type": "advantage", "roll_modifier_targets": {"attack_rolls": True} }, # Преимущество на свои атаки
    { "name": "Немота (Silenced)", "description": "Не может говорить. Техно: не может исп. голосовые/звуковые комп.", "roll_modifier_type": None, "roll_modifier_targets": None },
    { "name": "Обезоружен (Disarmed)", "description": "Роняет 1 предмет (оружие).", "roll_modifier_type": None, "roll_modifier_targets": None },
    { "name": "Оглушение (Stunned)", "description": "Недееспособен, не двиг., говорит запинаясь. Провал спасбр. Сил/Лов. Атаки по нему с преим.", "roll_modifier_type": None, "roll_modifier_targets": None }, # Провал спасбросков - отдельная логика
    { "name": "Ослепление (Blinded)", "description": "Не видит, провал проверок на зрение. Атаки по нему с преим., его атаки с помехой.", "roll_modifier_type": "disadvantage", "roll_modifier_targets": {"attack_rolls": True, "skill_checks": ["attention"]} }, # Помеха на атаки и проверки Внимания (зрение)
    { "name": "Отравление (Poisoned)", "description": "Помеха на броски атаки и проверки навыков.", "roll_modifier_type": "disadvantage", "roll_modifier_targets": {"attack_rolls": True, "skill_checks": "all"} },
    { "name": "Отключение (Disabled)", "description": "Для техники. Недееспособен, не двиг./действ. (аналог Оглушения).", "roll_modifier_type": None, "roll_modifier_targets": None },
    { "name": "Ошеломление (Dazed)", "description": "Может исп. либо Действие, либо Бонусное действие (не оба). Не может исп. Реакции.", "roll_modifier_type": None, "roll_modifier_targets": None }, # Ограничивает действия
    { "name": "Паралич (Paralyzed)", "description": "Недееспособен (не двиг./действ.). Провал спасбр. Сил/Лов. Атаки по нему с преим. Атака вблизи - крит.", "roll_modifier_type": None, "roll_modifier_targets": None }, # Провал спасбросков - отдельная логика
    { "name": "Подавление (Suppressed)", "description": "Помеха на атаки и проверки Внимательности.", "roll_modifier_type": "disadvantage", "roll_modifier_targets": {"attack_rolls": True, "skill_checks": ["attention"]} },
    { "name": "Схвачен (Grappled)", "description": "Скор = 0. Заканчивается, если источник недееспособен или цель вырвалась.", "roll_modifier_type": None, "roll_modifier_targets": None }, # Влияет на скорость
    { "name": "Страх (Frightened)", "description": "Помеха на атаки/проверки, пока виден источник. Не может двиг. к источнику.", "roll_modifier_type": "disadvantage", "roll_modifier_targets": {"attack_rolls": True, "skill_checks": "all"} }, # Помеха на все проверки, пока виден источник
    { "name": "Шок (Shocked)", "description": "Не может использовать Реакции.", "roll_modifier_type": None, "roll_modifier_targets": None }, # Ограничивает реакции

    # Эмоции ПУ с модификаторами
    { "name": "ПУ: Паника", "description": "Помеха на атаки/проверки, должен бежать от опасности (1 мин).", "roll_modifier_type": "disadvantage", "roll_modifier_targets": {"attack_rolls": True, "skill_checks": "all"} },
    { "name": "ПУ: Ярость", "description": "Преим. на атаки ближ. боя (Сил), -2 AC. Атакует ближайшее существо (1 мин).", "roll_modifier_type": "advantage", "roll_modifier_targets": {"attack_rolls.melee.strength": True} }, # Пример специфичной цели
    { "name": "ПУ: Апатия", "description": "Помеха проверки/спасбр, скор/2, нет Бонусн.д./Реакций (1 мин).", "roll_modifier_type": "disadvantage", "roll_modifier_targets": {"skill_checks": "all", "saving_throws": "all"} },
    { "name": "ПУ: Паранойя", "description": "Помеха соц. проверки. Считает всех подозрительными (10 мин).", "roll_modifier_type": "disadvantage", "roll_modifier_targets": {"skill_checks": ["suggestion", "insight", "authority"]} }, # Пример целей соц. навыков
    { "name": "ПУ: Слабоумие", "description": "Действует иррационально по идее Мастера. Помеха на др. действия (10 мин).", "roll_modifier_type": "disadvantage", "roll_modifier_targets": {"skill_checks": "all", "attack_rolls": True} }, # Помеха на многое
    { "name": "ПУ: Срыв", "description": "Оглушение (1 раунд), затем Ошеломление (1 мин).", "roll_modifier_type": None, "roll_modifier_targets": None }, # Эффекты Оглушения/Ошеломления обрабатываются отдельно

    { "name": "ПУ: Адреналин", "description": "Доп. Действие или Бонусн. действие в след. ход.", "roll_modifier_type": None, "roll_modifier_targets": None }, # Дает действие, не влияет на броски
    { "name": "ПУ: Вдохновение", "description": "Преим. на атаки ИЛИ спасбр. (на выбор) до конца след. хода.", "roll_modifier_type": "advantage", "roll_modifier_targets": {"attack_rolls": True, "saving_throws": True} }, # Дает преимущество на оба типа, игрок выбирает при броске? Или нужен более сложный механизм? Пока так.
    { "name": "ПУ: Спокойствие", "description": "+2 AC, Преим. на спасбр. Самообл. до конца след. хода.", "roll_modifier_type": "advantage", "roll_modifier_targets": {"saving_throws": ["self_control"]} },
    { "name": "ПУ: Прозрение", "description": "Преим. на след. проверку Вним./Логики/Прониц.", "roll_modifier_type": "advantage", "roll_modifier_targets": {"skill_checks": ["attention", "logic", "insight"]} }, # Преимущество на конкретные проверки
    { "name": "ПУ: Эмпатия", "description": "Преим. на след. проверку Мед./неагрессив. Внуш./Прониц.", "roll_modifier_type": "advantage", "roll_modifier_targets": {"skill_checks": ["medicine", "suggestion", "insight"]} }, # Преимущество на конкретные проверки
    { "name": "ПУ: Воля", "description": "Автоуспех след. спасбр. от Страха/Внуш. + 1к6 временных ПЗ.", "roll_modifier_type": None, "roll_modifier_targets": None }, # Автоуспех - не модификатор броска
]
# -------------------------------------------------------

# Функция для парсинга имен типа "A / B"
def split_names(name):
    return [n.strip() for n in name.split('/') if n.strip()]

def seed_admin_user(db: Session):
    """Проверяет и создает пользователя-администратора, если он не существует."""
    # --- ВАЖНО: Замените значения по умолчанию или используйте переменные окружения ---
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "adminpass") # <-- ЗАМЕНИТЕ ЭТОТ ПАРОЛЬ!
    # ----------------------------------------------------------------------------------

    logger.info("--- Seeding Admin User ---")
    admin_user = user_crud.get_user_by_username(db, username=ADMIN_USERNAME)
    if not admin_user:
        logger.warning(f"Admin user '{ADMIN_USERNAME}' not found, creating one.")
        if ADMIN_PASSWORD == "adminpass":
             logger.warning("!!! USING DEFAULT ADMIN PASSWORD - CHANGE THIS IN PRODUCTION OR SET ADMIN_PASSWORD ENV VAR !!!")

        # Хэшируем пароль
        hashed_password = get_password_hash(ADMIN_PASSWORD)

        # Создаем запись пользователя напрямую в БД
        db_admin = User( # Используем модель User напрямую
            username=ADMIN_USERNAME,
            hashed_password=hashed_password,
            is_admin=True # Устанавливаем флаг администратора
        )
        db.add(db_admin)
        db.commit() # Коммитим сразу после добавления админа
        db.refresh(db_admin)
        logger.info(f"Admin user '{ADMIN_USERNAME}' created successfully.")
    else:
        # Проверяем, является ли существующий пользователь админом
        if not admin_user.is_admin:
            logger.warning(f"User '{ADMIN_USERNAME}' exists but is not an admin. Setting admin flag.")
            admin_user.is_admin = True
            db.commit()
            db.refresh(admin_user)
            logger.info(f"Admin flag set for user '{ADMIN_USERNAME}'.")
        else:
            logger.info(f"Admin user '{ADMIN_USERNAME}' already exists and is admin.")

# Основная функция заполнения
def seed_data():
    db = SessionLocal()
    try:
        # --- Этап 1: Создание всех Способностей и Эффектов ---
        logger.info("--- Seeding Stage 1: Abilities and Status Effects ---")
        ability_map = {} # Словарь для хранения созданных объектов Ability по имени
        logger.info("Seeding Abilities...")
        for data in abilities_data:
            # ... (логика добавления способностей остается прежней, но с новыми данными) ...
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(Ability.id).filter(Ability.name == name).first()
                if not exists:
                    reqs = data_copy.get("skill_requirements")
                    if isinstance(reqs, str):
                        try: json.loads(reqs)
                        except json.JSONDecodeError:
                            logger.warning(f"Invalid JSON in skill_reqs for '{name}'")
                            data_copy["skill_requirements"] = None
                    ability_fields_cleaned = {k: v for k, v in data_copy.items() if hasattr(Ability, k)}
                    ability_fields_cleaned.setdefault('is_weapon_attack', False)
                    ability_fields_cleaned.setdefault('concentration', False)
                    ability_fields_cleaned.setdefault('action_type', 'Действие')
                    try:
                        ability = Ability(**ability_fields_cleaned)
                        db.add(ability)
                        db.flush()
                        ability_map[name] = ability
                    except Exception as e:
                        logger.error(f"  ERROR creating Ability '{name}': {e}", exc_info=True)
                        logger.error(f"    Data: {ability_fields_cleaned}")
                else:
                    if name not in ability_map:
                        existing_ability = db.query(Ability).filter(Ability.name == name).first()
                        if existing_ability: ability_map[name] = existing_ability
        logger.info(f"Total abilities prepared in map: {len(ability_map)}")

        logger.info("Seeding Status Effects...")
        for data in status_effects_data:
             names_to_add = split_names(data["name"])
             for name in names_to_add:
                 data_copy = data.copy()
                 data_copy["name"] = name
                 if not db.query(StatusEffect.id).filter(StatusEffect.name == name).first():
                    status_fields_cleaned = {k: v for k, v in data_copy.items() if hasattr(StatusEffect, k)}
                    status_fields_cleaned.setdefault('roll_modifier_type', None)
                    status_fields_cleaned.setdefault('roll_modifier_targets', None)
                    try:
                        db.add(StatusEffect(**status_fields_cleaned))
                        # logger.info(f"  Added Status Effect: {name}")
                    except Exception as e:
                        logger.error(f"  ERROR creating StatusEffect '{name}': {e}")

        # --- Коммит способностей и эффектов ПЕРЕД предметами ---
        db.commit()
        logger.info("Abilities and Status Effects committed.")

        # --- Этап 2: Создание Предметов и Привязка Способностей к Оружию ---
        logger.info("--- Seeding Stage 2: Items and Weapon Ability Links ---")
        logger.info("Seeding Weapons and linking abilities...")
        for data in weapons_data:
            names_to_add = split_names(data["name"])
            granted_ability_names_json = data.get("manual_ability_names_json")
            granted_ability_names = []
            if granted_ability_names_json:
                try:
                    parsed_names = json.loads(granted_ability_names_json)
                    if isinstance(parsed_names, list):
                        granted_ability_names = [name for name in parsed_names if isinstance(name, str)]
                    else:
                        logger.warning(f"  Invalid format in manual_ability_names_json for '{data['name']}'. Expected a list.")
                except json.JSONDecodeError:
                    logger.warning(f"  Failed to parse manual_ability_names_json for '{data['name']}': {granted_ability_names_json}")

            logger.info(f"  Manual abilities determined for '{data['name']}': {granted_ability_names}")

            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                if not db.query(Item.id).filter(Item.name == name).first():
                    weapon_abilities_to_link = []
                    for ability_name in granted_ability_names:
                        ability_obj = ability_map.get(ability_name)
                        if ability_obj:
                            ability_in_session = db.merge(ability_obj)
                            weapon_abilities_to_link.append(ability_in_session)
                        else:
                            logger.warning(f"    Ability '{ability_name}' (from JSON) not found in ability_map for linking to '{name}'.")

                    item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                    weapon_defaults = {"strength_requirement": 0, "stealth_disadvantage": False, "range_normal": None, "range_max": None, "reload_info": None, "is_two_handed": False, "manual_ability_names_json": None, "required_ammo_type": None}
                    data_with_defaults = {**item_defaults, **weapon_defaults, **data_copy}

                    weapon_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Weapon, k)}

                    try:
                        item = Weapon(**weapon_fields_cleaned)
                        if weapon_abilities_to_link:
                            item.granted_abilities = weapon_abilities_to_link
                        db.add(item)
                    except Exception as e:
                        logger.error(f"  ERROR creating Weapon '{name}': {e}", exc_info=True)
                        logger.error(f"    Data: {weapon_fields_cleaned}")
                        logger.error(f"    Abilities to link: {[a.name for a in weapon_abilities_to_link]}")

        # Создание Брони, Щитов, Общих предметов, Патронов (без изменений)
        logger.info("Seeding Armor...")
        for data in armors_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                 data_copy = data.copy()
                 data_copy["name"] = name
                 if not db.query(Item.id).filter(Item.name == name).first():
                     item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                     armor_defaults = {"strength_requirement": 0, "stealth_disadvantage": False, "max_dex_bonus": None, "properties": None}
                     data_with_defaults = {**item_defaults, **armor_defaults, **data_copy}
                     armor_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Armor, k)}
                     try:
                         db.add(Armor(**armor_fields_cleaned))
                         # logger.info(f"  Added Armor: {name}")
                     except Exception as e:
                         logger.error(f"  ERROR creating Armor '{name}': {e}")

        logger.info("Seeding Shields...")
        for data in shields_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                 data_copy = data.copy()
                 data_copy["name"] = name
                 if not db.query(Item.id).filter(Item.name == name).first():
                     item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                     shield_defaults = {"strength_requirement": 0, "properties": None}
                     data_with_defaults = {**item_defaults, **shield_defaults, **data_copy}
                     shield_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Shield, k)}
                     try:
                         db.add(Shield(**shield_fields_cleaned))
                         # logger.info(f"  Added Shield: {name}")
                     except Exception as e:
                         logger.error(f"  ERROR creating Shield '{name}': {e}")

        logger.info("Seeding General Items...")
        for data in general_items_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                 data_copy = data.copy()
                 data_copy["name"] = name
                 if not db.query(Item.id).filter(Item.name == name).first():
                     item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                     general_defaults = {"uses": None, "effect": None, "effect_dice_formula": None}
                     data_with_defaults = {**item_defaults, **general_defaults, **data_copy}
                     general_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(GeneralItem, k)}
                     try:
                         db.add(GeneralItem(**general_fields_cleaned))
                         # logger.info(f"  Added General Item: {name}")
                     except Exception as e:
                         logger.error(f"  ERROR creating General Item '{name}': {e}")

        logger.info("Seeding Ammo...")
        for data in ammo_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                 data_copy = data.copy()
                 data_copy["name"] = name
                 if not db.query(Item.id).filter(Item.name == name).first():
                     item_defaults = {"category": "Боеприпасы", "rarity": "Обычная", "weight": 0} # Уточнил категорию и вес
                     ammo_defaults = {"effect": None}
                     data_with_defaults = {**item_defaults, **ammo_defaults, **data_copy}
                     ammo_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Ammo, k)}
                     try:
                         db.add(Ammo(**ammo_fields_cleaned))
                         # logger.info(f"  Added Ammo: {name}")
                     except Exception as e:
                         logger.error(f"  ERROR creating Ammo '{name}': {e}")

        # Финальный коммит для всех предметов
        db.commit()
        logger.info("Items committed.")

    except Exception as e:
        logger.error(f"An error occurred during database seeding: {e}", exc_info=True)
        db.rollback()
    finally:
        if db:
            db.close()
        logger.info("Database session closed.")

# --- Запуск Сидера ---
if __name__ == "__main__":
    logger.info("Running database seeder...")
    # --- Создание таблиц ---
    try:
        logger.info("Creating database tables...")
        # Импорты моделей уже сделаны выше
        Base.metadata.create_all(bind=engine)
        logger.info("Tables created successfully (if they didn't exist).")
    except Exception as table_creation_error:
        logger.error(f"ERROR creating tables: {table_creation_error}", exc_info=True)
        sys.exit(1)

    # --- Запуск заполнения данными ---
    db = SessionLocal()
    seed_admin_user(db)
    seed_data()
    logger.info("Seeding process finished.")
