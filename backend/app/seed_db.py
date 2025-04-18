import sys
import os
import json
import logging
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, inspect as sqlainspect

# --- Настройка Логирования ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Настройка Пути ---
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)
logger.info(f"Project root added to sys.path: {project_root}")

# --- Импорты Моделей и БД ---
try:
    from app.db.database import engine, Base, SessionLocal
    from app.models import (
        User, Party, Item, Weapon, Armor, Shield, GeneralItem, Ammo,
        Ability, StatusEffect, Character, CharacterInventoryItem,
        character_abilities, character_status_effects, weapon_granted_abilities
    )
    logger.info("Models and DB session imported successfully.")
except ImportError as e:
    logger.error(f"Error importing modules: {e}", exc_info=True)
    logger.error("Please ensure the script is run from the 'backend' directory or adjust sys.path.")
    sys.exit(1)
except Exception as e:
    logger.error(f"An unexpected error occurred during imports: {e}", exc_info=True)
    sys.exit(1)

# --- ДАННЫЕ ДЛЯ ЗАПОЛНЕНИЯ ---

# Оружейные
weapons_data = [
    # Ближний бой
    { "name": "Нож", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "1к4", "damage_type": "Колющий", "properties": "Легкое, Фехтовальное, Дистанция Броска (6/18)", "is_two_handed": False },
    { "name": "Боевой нож", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "1к4", "damage_type": "Колющий", "properties": "Легкое, Фехтовальное, Дистанция Броска (6/18)", "is_two_handed": False },
    { "name": "Дубинка", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к6", "damage_type": "Дробящий", "properties": None, "is_two_handed": False },
    { "name": "Обломок трубы", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к6", "damage_type": "Дробящий", "properties": None, "is_two_handed": False },
    { "name": "Монтировка", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к6", "damage_type": "Дробящий", "properties": "Особое (Преимущество на проверки Силы для взлома)", "is_two_handed": False },
    { "name": "Топор", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 3, "damage": "1к8", "damage_type": "Рубящий", "properties": None, "is_two_handed": False },
    { "name": "Мачете", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 3, "damage": "1к8", "damage_type": "Рубящий", "properties": None, "is_two_handed": False },
    { "name": "Меч", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 3, "damage": "1к8", "damage_type": "Рубящий", "properties": "Фехтовальное", "is_two_handed": False },
    { "name": "Катана", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 3, "damage": "1к8", "damage_type": "Рубящий", "properties": "Фехтовальное", "is_two_handed": False },
    { "name": "Рапира", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 2, "damage": "1к8", "damage_type": "Колющий", "properties": "Фехтовальное", "is_two_handed": False },
    { "name": "Молот", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 10, "damage": "1к10", "damage_type": "Дробящий", "properties": "Двуручное", "is_two_handed": True },
    { "name": "Тяжелая дубина", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 8, "damage": "1к10", "damage_type": "Дробящий", "properties": "Двуручное", "is_two_handed": True },
    { "name": "Двуручный меч", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 6, "damage": "1к12", "damage_type": "Рубящий", "properties": "Двуручное, Тяжелое", "is_two_handed": True },
    { "name": "Двуручный топор", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 7, "damage": "1к12", "damage_type": "Рубящий", "properties": "Двуручное, Тяжелое", "is_two_handed": True },
    { "name": "Цепной Меч", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 6, "damage": "1к10", "damage_type": "Рубящий", "properties": "Двуручное ИЛИ Одноручное (с Силой 13+), Разрывное, Шумное", "is_two_handed": True },
    { "name": "Силовой Меч", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 3, "damage": "1к8", "damage_type": "Энерг./Рубящий", "properties": "Фехтовальное, Пробивание", "is_two_handed": False },
    { "name": "Силовой Молот", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 12, "damage": "2к10", "damage_type": "Энерг./Дроб.", "properties": "Двуручное, Тяжелое, Пробивание", "is_two_handed": True },
    { "name": "Кастет", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "1к4", "damage_type": "Дробящий", "properties": "Легкое", "is_two_handed": False },
    { "name": "Укрепленные перчатки", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "1к4", "damage_type": "Дробящий", "properties": "Легкое", "is_two_handed": False },
    { "name": "Безоружный удар", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 0, "damage": "1", "damage_type": "Дробящий", "properties": "Легкое", "is_two_handed": False },
    { "name": "Пистолет (легкий, 9мм)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к8", "damage_type": "Колющий", "properties": "Боеприпасы", "range_normal": 15, "range_max": 45, "reload_info": "12 выстр./Бонусное д.", "is_two_handed": False },
    { "name": "Револьвер (тяжелый)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 3, "damage": "1к10", "damage_type": "Колющий", "properties": "Боеприпасы", "range_normal": 20, "range_max": 60, "reload_info": "6 выстр./Действие", "is_two_handed": False },
    { "name": "Обрез", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 5, "damage": "2к6", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное", "range_normal": 8, "range_max": 20, "reload_info": "2 выстр./Бонусное д.", "is_two_handed": True },
    { "name": "Легкий дробовик", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 6, "damage": "2к6", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное", "range_normal": 8, "range_max": 20, "reload_info": "2 выстр./Бонусное д.", "is_two_handed": True },
    { "name": "Дробовик (помповый)", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 7, "damage": "2к8", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Особое (атака конусом)", "range_normal": 15, "range_max": 40, "reload_info": "5 выстр./Действие", "is_two_handed": True },
    { "name": "Дробовик (авто)", "item_type": "weapon", "category": "Воинское", "rarity": "Редкая", "weight": 8, "damage": "2к8", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Особое (атака конусом)", "range_normal": 15, "range_max": 40, "reload_info": "8 выстр./Действие", "is_two_handed": True },
    { "name": "Автомат", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 8, "damage": "1к10", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Очередь", "range_normal": 40, "range_max": 120, "reload_info": "30 выстр./Действие", "is_two_handed": True },
    { "name": "Штурмовая винтовка", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 9, "damage": "1к10", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Очередь", "range_normal": 40, "range_max": 120, "reload_info": "30 выстр./Действие", "is_two_handed": True },
    { "name": "Снайперская Винтовка", "item_type": "weapon", "category": "Воинское", "rarity": "Редкая", "weight": 10, "damage": "1к12", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Тяжелое, Точное", "range_normal": 100, "range_max": 300, "reload_info": "5 выстр./Действие", "is_two_handed": True },
    { "name": "Ржавый Мушкет", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 10, "damage": "1к12", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Шумное, Ненадежное", "range_normal": 15, "range_max": 40, "reload_info": "1 выстр./Действие x2", "is_two_handed": True },
    { "name": "Старинное ружье", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 10, "damage": "1к12", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Шумное, Ненадежное", "range_normal": 15, "range_max": 40, "reload_info": "1 выстр./Действие x2", "is_two_handed": True },
    { "name": "Лазерный Пистолет", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 1, "damage": "1к6", "damage_type": "Энерг.", "properties": "Боеприпасы (заряд)", "range_normal": 25, "range_max": 75, "reload_info": "40 выстр./Бонусное д.", "is_two_handed": False },
    { "name": "Лазерная Винтовка", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 3, "damage": "1к8", "damage_type": "Энерг.", "properties": "Боеприпасы (заряд), Двуручное", "range_normal": 50, "range_max": 150, "reload_info": "60 выстр./Действие", "is_two_handed": True },
    { "name": "Болт-Пистолет", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 4, "damage": "1к10", "damage_type": "Взрывной", "properties": "Боеприпасы, Шумное, Разрывное", "range_normal": 15, "range_max": 40, "reload_info": "10 выстр./Действие", "is_two_handed": False },
    { "name": "Болтер", "item_type": "weapon", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 12, "damage": "2к6", "damage_type": "Взрывной", "properties": "Боеприпасы, Двуручное, Шумное, Разрывное", "range_normal": 30, "range_max": 90, "reload_info": "20 выстр./Действие", "is_two_handed": True },
    { "name": "Термо-Пистолет", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 5, "damage": "2к8", "damage_type": "Огненный", "properties": "Боеприпасы (заряд), Пробивание", "range_normal": 5, "range_max": 10, "reload_info": "3 выстр./Действие", "is_two_handed": False },
    { "name": "Термо-Ружье", "item_type": "weapon", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 10, "damage": "4к8", "damage_type": "Огненный", "properties": "Боеприпасы (заряд), Двуручное, Пробивание", "range_normal": 10, "range_max": 20, "reload_info": "1 выстр./Действие", "is_two_handed": True },
    { "name": "Огнемет", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 15, "damage": "2к6", "damage_type": "Огненный", "properties": "Боеприпасы (топливо), Двуручное, Взрыв (конус 5м)", "range_normal": 5, "range_max": 5, "reload_info": "5 исп./Действие", "is_two_handed": True },
    { "name": "Граната (Осколочная)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "3к6", "damage_type": "Оскол.", "properties": "Взрыв (Радиус 5м), Одноразовая, Дистанция Броска (10/20)", "range_normal": 10, "range_max": 20, "is_two_handed": False },
    { "name": "Граната (Светошумовая)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "-", "damage_type": "Эффект", "properties": "Взрыв (Радиус 5м), Одноразовая, Дистанция Броска (10/20), Особое (Оглушение)", "range_normal": 10, "range_max": 20, "is_two_handed": False },
    { "name": "Плазменный пистолет", "item_type": "weapon", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 3, "damage": "2к6", "damage_type": "Энерг./Огонь", "properties": "Боеприпасы (заряд), Перегрев?", "range_normal": 20, "range_max": 60, "reload_info": "10 выстр./Действие", "is_two_handed": False },
]

# БРОНЯ
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

# ЩИТЫ
shields_data = [
    { "name": "Легкий щит", "item_type": "shield", "category": "Простое", "rarity": "Обычная", "weight": 2, "ac_bonus": 1, "strength_requirement": 0, "properties": None },
    { "name": "Баклер", "item_type": "shield", "category": "Простое", "rarity": "Обычная", "weight": 2, "ac_bonus": 1, "strength_requirement": 0, "properties": None },
    { "name": "Средний щит", "item_type": "shield", "category": "Воинское", "rarity": "Необычная", "weight": 6, "ac_bonus": 2, "strength_requirement": 0, "properties": None },
    { "name": "Боевой щит", "item_type": "shield", "category": "Воинское", "rarity": "Необычная", "weight": 6, "ac_bonus": 2, "strength_requirement": 0, "properties": None },
    { "name": "Тяжелый штурмовой щит", "item_type": "shield", "category": "Воинское", "rarity": "Редкая", "weight": 12, "ac_bonus": 3, "strength_requirement": 6, "properties": "Укрытие 1/2 (Бонусное д.)" },
    { "name": "Энергетический щит", "item_type": "shield", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 4, "ac_bonus": 2, "strength_requirement": 0, "properties": "+4 AC vs Энерг., Требует заряд" },
]

# ОБЩИЕ ПРЕДМЕТЫ
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

# СПЕЦ. БОЕПРИПАСЫ
ammo_data = [
    { "name": "Бронебойные патроны (AP)", "item_type": "ammo", "category": "Спец.", "rarity": "Редкая", "weight": 0, "ammo_type": "Баллистическое", "effect": "Игнорирует часть AC от брони / Дает Пробивание." },
    { "name": "Экспансивные/Разрывные", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0, "ammo_type": "Баллистическое", "effect": "Спасбросок Выносливости (СЛ 12) или Кровотечение (1к4)." },
    { "name": "Зажигательные патроны", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0, "ammo_type": "Баллист./Дробовик", "effect": "Спасбросок Ловкости (СЛ 10) или Горение (1к4)." },
    { "name": "ЭDM-заряды", "item_type": "ammo", "category": "Спец.", "rarity": "Редкая", "weight": 0, "ammo_type": "Энергетическое", "effect": "Урон/2, Отключение техники/щитов (Спас Техники СЛ 13)." },
    { "name": "Транквилизаторы", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0, "ammo_type": "Пистолет/Винтовка", "effect": "Нелетальный урон, цель Без сознания при 0 ПЗ." },
    { "name": "Благословленные/Пси-снаряды", "item_type": "ammo", "category": "Спец.", "rarity": "Очень Редкая", "weight": 0, "ammo_type": "Любое", "effect": "Урон магический/психический, доп. эффекты." },
]

# --- СПОСОБНОСТИ (Ветки + Атаки Оружия) ---
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
    # Медик (Ключевой стат: Медицина/Интеллект -> Мод.Мед)
    { "name": "Первая Помощь", "branch": "medic", "level_required": 1, "action_type": "Действие", "range": "5 метров", "target": "Союзник", "description": "Стабилизация союзника с 0 ПЗ или восстановление 1к4 + Мод.Мед ПЗ.", "damage_formula": "1к4+Мод.Мед", "damage_type": "Лечение" },
    { "name": "Лечение Союзника", "branch": "medic", "level_required": 2, "skill_requirements": '{"medicine": 3}', "action_type": "Действие", "range": "Касание", "target": "Одно существо", "cooldown": "1 ход", "description": "Восстанавливает цели 2к8 + Мод.Мед ПЗ. Усиление: Мед 5+ -> 3к8+Мед; Мед 7+ -> 4к8+Мед.", "damage_formula": "2к8+Мод.Мед", "damage_type": "Лечение" },
    { "name": "Очищение", "branch": "medic", "level_required": 3, "skill_requirements": '{"medicine": 4}', "action_type": "Действие", "range": "Касание", "target": "Одно существо", "cooldown": "Короткий отдых", "description": "Снимает одну болезнь или состояние Отравлен." },
    { "name": "Полевой Хирург", "branch": "medic", "level_required": 4, "skill_requirements": '{"medicine": 5}', "action_type": "Действие", "range": "Касание", "target": "Союзник с 0 ПЗ", "cooldown": "Короткий отдых", "description": "Союзник восстанавливает 1 ПЗ и получает преимущество на следующий спасбросок от смерти." },
    { "name": "Массовое Лечение", "branch": "medic", "level_required": 5, "skill_requirements": '{"medicine": 6}', "action_type": "Действие", "range": "10 метров", "target": "До 6 союзников в радиусе", "cooldown": "Длительный отдых", "description": "Каждая цель восстанавливает 3к8 + Мод.Мед ПЗ.", "damage_formula": "3к8+Мод.Мед", "damage_type": "Лечение" },
    { "name": "Реанимация", "branch": "medic", "level_required": 6, "skill_requirements": '{"medicine": 7}', "action_type": "1 минута", "range": "Касание", "target": "Существо, умершее < 1 мин", "cooldown": "Длительный отдых", "description": "Возвращает цель к жизни с 1 ПЗ. Цель получает 4 уровня Истощения." },
    { "name": "Аура Исцеления", "branch": "medic", "level_required": 7, "skill_requirements": '{"medicine": 8}', "action_type": "Действие", "range": "Себя (аура 10м)", "target": "Союзники в ауре", "duration": "1 мин (Конц.)", "concentration": True, "cooldown": "Длительный отдых", "description": "Союзники (включая вас), начинающие ход в ауре, восстанавливают 1к6 ПЗ.", "damage_formula": "1к6", "damage_type": "Лечение"},

    # Мутант (Ключевой стат: Адаптация/Выносливость -> Мод.Ада / Мод.Вын)
    { "name": "Когти Мутанта", "branch": "mutant", "level_required": 1, "action_type": "Пассивно", "description": "Ваши безоружные удары наносят 1к6 рубящего урона." },
    { "name": "Шкура Мутанта", "branch": "mutant", "level_required": 1, "action_type": "Пассивно", "description": "Вы получаете +1 к СЛ Защиты, если не носите тяжелую броню." },
    { "name": "Чутье Мутанта", "branch": "mutant", "level_required": 1, "action_type": "Пассивно", "description": "Вы получаете преимущество на проверки Внимательности (слух/обоняние)." },
    { "name": "Едкая Кровь", "branch": "mutant", "level_required": 2, "skill_requirements": '{"adaptation": 3}', "action_type": "Реакция", "trigger": "При получении урона от атаки ближнего боя (1.5м)", "range": "1.5м", "target": "Атакующий", "cooldown": "Короткий отдых", "description": "Атакующий получает 2к6 урона Кислотой.", "damage_formula": "2к6", "damage_type": "Кислота" },
    { "name": "Регенерация", "branch": "mutant", "level_required": 3, "skill_requirements": '{"adaptation": 4}', "action_type": "Бонусное действие", "range": "Себя", "target": "Себя", "cooldown": "Короткий отдых", "description": "Вы восстанавливаете 1к8 + Мод.Ада ПЗ.", "damage_formula": "1к8+Мод.Ада", "damage_type": "Лечение" },
    { "name": "Дополнительная Конечность", "branch": "mutant", "level_required": 4, "skill_requirements": '{"adaptation": 5}', "action_type": "Пассивно", "description": "Отрастает доп. конечность для взаимодействия с предметами." },
    { "name": "Адаптация к Среде", "branch": "mutant", "level_required": 5, "skill_requirements": '{"adaptation": 6}', "action_type": "Действие", "range": "Себя", "target": "Себя", "duration": "1 час", "cooldown": "Длительный отдых", "description": "Выберите тип урона (Кислота/Холод/Огонь/Электричество/Яд). Вы получаете сопротивление к нему на 1 час." },
    { "name": "Изменение Формы", "branch": "mutant", "level_required": 6, "skill_requirements": '{"adaptation": 7}', "action_type": "Действие", "range": "Себя", "target": "Себя", "duration": "1 час (Конц.)", "concentration": True, "cooldown": "Длительный отдых", "description": "Вы превращаетесь в зверя с CR <= Ур.Мутанта/3. Характеристики заменяются, кроме Инт/Про/Сам." },
    { "name": "Выброс Адреналина", "branch": "mutant", "level_required": 7, "skill_requirements": '{"adaptation": 8}', "action_type": "Реакция", "trigger": "Здоровье < 1/2", "range": "Себя", "target": "Себя", "duration": "1 минута", "cooldown": "Длительный отдых", "description": "Вы получаете врем. ПЗ = УровеньМутанта x 2. На 1 мин: преим. на спасбр/проверки Силы, сопротивление физ. урону." },

    # Снайпер (Ключевой стат: Внимательность -> Мод.Вни)
    { "name": "Верный Глаз", "branch": "sharpshooter", "level_required": 1, "action_type": "Пассивно", "description": "Игнорируете укрытие 1/2 и 3/4. +1 к атакам дальнобойным оружием." },
    { "name": "Прицельный Выстрел", "branch": "sharpshooter", "level_required": 2, "skill_requirements": '{"attention": 3}', "action_type": "Бонусное действие", "range": "Себя", "target": "Себя", "description": "Следующая атака дальноб. оружием в этом ходу совершается с преимуществом." },
    { "name": "Быстрая Перезарядка", "branch": "sharpshooter", "level_required": 3, "skill_requirements": '{"attention": 4}', "action_type": "Бонусное действие", "description": "Вы можете перезарядить оружие со свойством 'Боеприпасы'." },
    { "name": "Снайперский Выстрел", "branch": "sharpshooter", "level_required": 4, "skill_requirements": '{"attention": 5}', "action_type": "Действие", "range": "См. оружие x2", "target": "Одна цель", "description": "Атака дальноб. оружием с удвоенной дальностью. +1к8 урона при попадании. Нельзя двигаться в этот ход.", "damage_formula": "1к8", "damage_type": "Дополнительный" },
    { "name": "Пробивающий Выстрел", "branch": "sharpshooter", "level_required": 5, "skill_requirements": '{"attention": 6}', "action_type": "Действие", "range": "См. оружие", "target": "Линия", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "8+Мод.Вни", "description": "Атака по основной цели. При попадании: цель и существа на линии за ней совершают спасбросок Ловкости. Провал - полный урон оружия, успех - половина." },
    { "name": "Подавляющий Огонь", "branch": "sharpshooter", "level_required": 6, "skill_requirements": '{"attention": 7}', "action_type": "Действие", "range": "См. оружие", "target": "Зона (куб 3м)", "saving_throw_attribute": "Самообладание", "saving_throw_dc_formula": "8+Мод.Вни", "description": "Выберите точку. Существа в кубе 3м совершают спасбросок Самообладания. При провале - помеха на атаки и проверки до конца их след. хода." },
    { "name": "Смертельный Выстрел", "branch": "sharpshooter", "level_required": 7, "skill_requirements": '{"attention": 8}', "action_type": "Действие", "range": "См. оружие", "target": "Одна цель", "cooldown": "Длительный отдых", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "8+Мод.Вни", "description": "Атака дальноб. оружием. При попадании цель совершает спасбросок Выносливости. Провал - ПЗ=0. Успех - доп. урон 6к10.", "damage_formula": "6к10", "damage_type": "Дополнительный" },

    # Скаут (Ключевой стат: Реакция -> Мод.Реа)
    { "name": "Скрытое Передвижение", "branch": "scout", "level_required": 1, "action_type": "Пассивно", "description": "Преим. на Скрытность при движении <= полскорости. Действие 'Спрятаться' - бонусным действием." },
    { "name": "Быстрый Удар", "branch": "scout", "level_required": 2, "skill_requirements": '{"reaction": 3}', "action_type": "Бонусное действие", "trigger": "После действия 'Рывок'", "description": "После 'Рывка' можно совершить одну атаку оружием бонусным действием." },
    { "name": "Неожиданная Атака", "branch": "scout", "level_required": 3, "skill_requirements": '{"reaction": 4}', "action_type": "Пассивно", "description": "В 1й раунд боя преим. на атаку против существ, еще не действовавших." },
    { "name": "Мастер Засад", "branch": "scout", "level_required": 4, "skill_requirements": '{"reaction": 5}', "action_type": "Пассивно", "trigger": "При попадании атакой из скрытности", "saving_throw_attribute": "Самообладание", "saving_throw_dc_formula": "8+Мод.Реа", "description": "При попадании атакой из скрытности цель совершает спасбросок Самообладания или получает 'Страх' на 1 мин." },
    { "name": "Ускользание", "branch": "scout", "level_required": 5, "skill_requirements": '{"reaction": 6}', "action_type": "Реакция", "trigger": "При спасброске Ловкости от AoE-эффекта с уроном в половину при успехе", "description": "При успехе спасброска Ловкости от AoE - урон 0, при провале - половина." },
    { "name": "Слепая Зона", "branch": "scout", "level_required": 6, "skill_requirements": '{"reaction": 7}', "action_type": "Пассивно", "description": "Атаки по вам совершаются с помехой, если рядом (1.5м) нет ваших союзников." },
    { "name": "Удар из Тени", "branch": "scout", "level_required": 7, "skill_requirements": '{"reaction": 8}', "action_type": "Бонусное действие", "trigger": "После попадания атакой из скрытности", "description": "Наносит цели доп. урон 3к6 типа оружия.", "damage_formula": "3к6", "damage_type": "Тип оружия" },

    # Техник (Ключевой стат: Логика -> Мод.Лог)
    { "name": "Ремонт", "branch": "technician", "level_required": 1, "action_type": "Действие", "range": "Касание", "target": "Механизм/Объект", "description": "Восстанавливает 1к8 + Мод.Тех ПЗ механизму.", "damage_formula": "1к8+Мод.Тех", "damage_type": "Ремонт" },
    { "name": "Взлом Систем", "branch": "technician", "level_required": 2, "skill_requirements": '{"logic": 3}', "action_type": "Действие", "range": "10м / Касание", "target": "Устройство/Сеть", "description": "Попытка взлома (проверка Техники против СЛ)." },
    { "name": "Улучшение Снаряжения", "branch": "technician", "level_required": 3, "skill_requirements": '{"logic": 4}', "action_type": "Действие (Время)", "description": "Во время простоя можно временно улучшить 1 предмет (+1 атака/урон или +1 AC)." },
    { "name": "Создание Устройства", "branch": "technician", "level_required": 4, "skill_requirements": '{"logic": 5}', "action_type": "Действие (Время)", "description": "Во время простоя можно создать простое одноразовое устройство (ЭМИ, маячок)." },
    { "name": "Перегрузка Систем", "branch": "technician", "level_required": 5, "skill_requirements": '{"logic": 6}', "action_type": "Действие", "range": "15 метров", "target": "Механизм/Устройство", "saving_throw_attribute": "Интеллект", "saving_throw_dc_formula": "8+Мод.Лог", "description": "Спасбросок Интеллекта цели. Провал - 'Отключение' на 1 раунд." },
    { "name": "Дистанционное Управление", "branch": "technician", "level_required": 6, "skill_requirements": '{"logic": 7}', "action_type": "Действие", "range": "30 метров", "target": "Устройство/Механизм", "duration": "1 мин (Конц.)", "concentration": True, "description": "Получение контроля над простым устройством (дверь, камера)." },
    { "name": "Техно-мастерство", "branch": "technician", "level_required": 7, "skill_requirements": '{"logic": 8}', "action_type": "Пассивно", "description": "Удвоенный бонус мастерства (или преимущество?) для проверок Техники." },

    # Боец (Ключевой стат: Сила/Ловкость - зависит от стиля)
    { "name": "Второе Дыхание", "branch": "fighter", "level_required": 1, "action_type": "Бонусное действие", "range": "Себя", "cooldown": "Короткий отдых", "description": "Восстанавливает 1к10 + Ур.Бойца ПЗ.", "damage_formula": "1к10+Уровень", "damage_type": "Лечение" },
    { "name": "Всплеск Действий", "branch": "fighter", "level_required": 2, "action_type": "Без действия", "range": "Себя", "cooldown": "Короткий отдых", "description": "Можно совершить одно доп. Основное Действие." },
    { "name": "Стиль Боя: Дуэлянт", "branch": "fighter", "level_required": 3, "action_type": "Пассивно", "description": "+2 к урону оружием в одной руке, если вторая свободна." },
    { "name": "Стиль Боя: Защита", "branch": "fighter", "level_required": 3, "action_type": "Пассивно", "description": "+1 к СЛ Защиты при ношении брони." },
    { "name": "Стиль Боя: Двуручное", "branch": "fighter", "level_required": 3, "action_type": "Пассивно", "description": "Переброс 1 или 2 на кубиках урона двуручным оружием ближ. боя (один раз)." },
    { "name": "Стиль Боя: Стрельба", "branch": "fighter", "level_required": 3, "action_type": "Пассивно", "description": "+2 к атакам дальнобойным оружием." },
    { "name": "Стиль Боя: Оборона", "branch": "fighter", "level_required": 3, "action_type": "Реакция", "trigger": "Существо атакует цель (не вас) в 1.5м от вас", "description": "Реакцией создать помеху на бросок атаки." },
    { "name": "Дополнительная Атака", "branch": "fighter", "level_required": 4, "action_type": "Пассивно", "description": "Можно атаковать дважды действием Атака." },
    { "name": "Несокрушимость", "branch": "fighter", "level_required": 5, "action_type": "Пассивно", "trigger": "ПЗ опускаются до 0, но не убит", "cooldown": "Длительный отдых", "description": "Вместо 0 ПЗ остается 1 ПЗ." },
    { "name": "Улучшенный Критический Удар", "branch": "fighter", "level_required": 6, "action_type": "Пассивно", "description": "Атаки оружием критуют на 16-18 (3к6)." }, # Уточнил механику критов
    { "name": "Третья Атака", "branch": "fighter", "level_required": 7, "action_type": "Пассивно", "description": "Можно атаковать трижды действием Атака." },

    # Джаггернаут (Ключевой стат: Выносливость/Сила -> Мод.Вын / Мод.Сил)
    { "name": "Несгибаемый", "branch": "juggernaut", "level_required": 1, "action_type": "Пассивно", "description": "Макс. ПЗ + Ур.Джаггернаута. Преим. на спасбр. от Яда/Болезней." },
    { "name": "Провокация", "branch": "juggernaut", "level_required": 2, "skill_requirements": '{"authority": 3}', "action_type": "Бонусное действие", "range": "10 метров", "target": "Существо (видит/слышит)", "saving_throw_attribute": "Самообладание", "saving_throw_dc_formula": "8+Мод.Авт", "description": "Спасбросок Самообладания цели. Провал - помеха на атаки по другим до конца вашего след. хода." },
    { "name": "Таран", "branch": "juggernaut", "level_required": 3, "skill_requirements": '{"strength": 4}', "action_type": "Действие", "trigger": "После перемещения >=5м по прямой к цели", "range": "1.5м", "target": "Одно существо", "description": "Атака оружием ближ. боя. При попадании: состязание Силы (Атлетика) против Силы/Ловкости цели. При победе - оттолкнуть на 3м и/или сбить с ног." },
    { "name": "Стойкость", "branch": "juggernaut", "level_required": 4, "skill_requirements": '{"endurance": 5}', "action_type": "Пассивно", "description": "При ношении тяж. брони сопротивление физ. урону от немагич. оружия (? или уменьшение урона?)." }, # Уточнил описание
    { "name": "Неудержимость", "branch": "juggernaut", "level_required": 5, "skill_requirements": '{"strength": 6}', "action_type": "Бонусное действие", "range": "Себя", "cooldown": "Короткий отдых", "description": "Автоматически освободиться от состояний Схвачен/Опутан/Парализован." },
    { "name": "Контратака", "branch": "juggernaut", "level_required": 6, "skill_requirements": '{"reaction": 7}', "action_type": "Реакция", "trigger": "Существо попадает по вам атакой ближ. боя", "range": "1.5м", "target": "Атакующий", "description": "Реакцией совершить одну атаку оружием ближ. боя против атакующего." },
    { "name": "Живой Щит", "branch": "juggernaut", "level_required": 7, "skill_requirements": '{"endurance": 8}', "action_type": "Реакция", "trigger": "Союзник в 1.5м атакован", "range": "1.5м", "target": "Вы", "description": "Вы становитесь целью этой атаки вместо союзника." },
]

# СОСТОЯНИЯ
status_effects_data = [
    # ... (Полный список status_effects_data из предыдущей версии) ...
    { "name": "При смерти (Unconscious)", "description": "Недееспособен, не может двигаться/говорить, роняет предметы. Атаки по нему с преим., вблизи - крит. Провал спасбр. Сил/Лов. Восстанавливается при лечении >0 ПЗ или стабилизации." },
    { "name": "Горение (Burning)", "description": "Урон огнем (1к4/1к6) в начале хода. Действие на тушение (СЛ Лов 10)." },
    { "name": "Глухота (Deafened)", "description": "Не может слышать, провал проверок на слух." },
    { "name": "Дружественный (Charmed/Friendly)", "description": "Считает источник другом, не атакует его. Преим. на соц. проверки у источника. Может закончиться при вреде." },
    { "name": "Замедление (Slowed)", "description": "Скорость / 2 (или -X). Не может исп. Реакции перемещения." },
    { "name": "Застигнут врасплох (Surprised)", "description": "Не может двигаться/действовать/реагировать в 1й ход боя." },
    { "name": "Истощение (Exhaustion)", "description": "Уровни 1-6: 1:Помеха проверки; 2:Скор/2; 3:Помеха атаки/спасбр; 4:ПЗmax/2; 5:Скор=0; 6:Смерть. -1 за Длит. отдых." },
    { "name": "Кровотечение (Bleeding)", "description": "Урон (1к4) в начале хода. Требует Действия и Медицины/Лечения для остановки." },
    { "name": "Лежа (Prone)", "description": "Скор. ползком / 2. Помеха на атаки. Атаки по нему: ближ. с преим., дальн. с помехой. Встать = полскорости." },
    { "name": "Невидимость (Invisible)", "description": "Не видно без спец. средств. Атаки по существу с помехой, его атаки с преим." },
    { "name": "Немота (Silenced)", "description": "Не может говорить. Техно: не может исп. голосовые/звуковые комп." },
    { "name": "Обезоружен (Disarmed)", "description": "Роняет 1 предмет (оружие)." },
    { "name": "Оглушение (Stunned)", "description": "Недееспособен, не двиг., говорит запинаясь. Провал спасбр. Сил/Лов. Атаки по нему с преим." },
    { "name": "Ослепление (Blinded)", "description": "Не видит, провал проверок на зрение. Атаки по нему с преим., его атаки с помехой." },
    { "name": "Отравление (Poisoned)", "description": "Помеха на броски атаки и проверки навыков." },
    { "name": "Отключение (Disabled)", "description": "Для техники. Недееспособен, не двиг./действ. (аналог Оглушения)." },
    { "name": "Ошеломление (Dazed)", "description": "Может исп. либо Действие, либо Бонусное действие (не оба). Не может исп. Реакции." },
    { "name": "Паралич (Paralyzed)", "description": "Недееспособен (не двиг./действ.). Провал спасбр. Сил/Лов. Атаки по нему с преим. Атака вблизи - крит." },
    { "name": "Подавление (Suppressed)", "description": "Помеха на атаки и проверки Внимательности." },
    { "name": "Схвачен (Grappled)", "description": "Скор = 0. Заканчивается, если источник недееспособен или цель вырвалась." },
    { "name": "Страх (Frightened)", "description": "Помеха на атаки/проверки, пока виден источник. Не может двиг. к источнику." },
    { "name": "Шок (Shocked)", "description": "Не может использовать Реакции." },
    { "name": "ПУ: Паника", "description": "Помеха на атаки/проверки, должен бежать от опасности (1 мин)." },
    { "name": "ПУ: Ярость", "description": "Преим. на атаки ближ. боя (Сил), -2 AC. Атакует ближайшее существо (1 мин)." },
    { "name": "ПУ: Апатия", "description": "Помеха проверки/спасбр, скор/2, нет Бонусн.д./Реакций (1 мин)." },
    { "name": "ПУ: Паранойя", "description": "Помеха соц. проверки. Считает всех подозрительными (10 мин)." },
    { "name": "ПУ: Слабоумие", "description": "Действует иррационально по идее Мастера. Помеха на др. действия (10 мин)." },
    { "name": "ПУ: Срыв", "description": "Оглушение (1 раунд), затем Ошеломление (1 мин)." },
    { "name": "ПУ: Адреналин", "description": "Доп. Действие или Бонусн. действие в след. ход." },
    { "name": "ПУ: Вдохновение", "description": "Преим. на атаки ИЛИ спасбр. (на выбор) до конца след. хода." },
    { "name": "ПУ: Спокойствие", "description": "+2 AC, Преим. на спасбр. Самообл. до конца след. хода." },
    { "name": "ПУ: Прозрение", "description": "Преим. на след. проверку Вним./Логики/Прониц." },
    { "name": "ПУ: Эмпатия", "description": "Преим. на след. проверку Мед./неагрессив. Внуш./Прониц." },
    { "name": "ПУ: Воля", "description": "Автоуспех след. спасбр. от Страха/Внуш. + 1к6 временных ПЗ." },
]
# -------------------------------------------------------

# Функция для парсинга имен типа "A / B"
def split_names(name):
    return [n.strip() for n in name.split('/') if n.strip()]

# Основная функция заполнения
def seed_data():
    db = SessionLocal()
    try:
        # --- Этап 1: Создание всех Способностей и Эффектов ---
        logger.info("--- Seeding Stage 1: Abilities and Status Effects ---")
        ability_map = {} # Словарь для хранения созданных объектов Ability по имени
        logger.info("Seeding Abilities...")
        for data in abilities_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy(); data_copy["name"] = name
                exists = db.query(Ability.id).filter(Ability.name == name).first()
                if not exists:
                    # Проверка JSON требований
                    reqs = data_copy.get("skill_requirements")
                    if isinstance(reqs, str):
                        try: json.loads(reqs)
                        except json.JSONDecodeError: logger.warning(f"Invalid JSON in skill_reqs for '{name}'"); data_copy["skill_requirements"] = None
                    # Очистка полей и установка дефолтов
                    ability_fields_cleaned = {k: v for k, v in data_copy.items() if hasattr(Ability, k)}
                    ability_fields_cleaned.setdefault('is_weapon_attack', False)
                    ability_fields_cleaned.setdefault('concentration', False)
                    ability_fields_cleaned.setdefault('action_type', 'Действие')
                    # Создание объекта
                    try:
                        ability = Ability(**ability_fields_cleaned)
                        db.add(ability); db.flush(); ability_map[name] = ability
                        # logger.info(f"  Added Ability template: {name} (ID: {ability.id})") # Убрал детальный лог для краткости
                    except Exception as e: logger.error(f"  ERROR creating Ability '{name}': {e}", exc_info=True); logger.error(f"    Data: {ability_fields_cleaned}")
                else:
                    # Добавляем существующую способность в карту, если её там еще нет
                    if name not in ability_map:
                        existing_ability = db.query(Ability).filter(Ability.name == name).first()
                        if existing_ability: ability_map[name] = existing_ability

        logger.info(f"Total abilities prepared in map: {len(ability_map)}")

        logger.info("Seeding Status Effects...")
        for data in status_effects_data:
             names_to_add = split_names(data["name"])
             for name in names_to_add:
                 data_copy = data.copy(); data_copy["name"] = name
                 if not db.query(StatusEffect.id).filter(StatusEffect.name == name).first():
                     status_fields_cleaned = {k: v for k, v in data_copy.items() if hasattr(StatusEffect, k)}
                     try: db.add(StatusEffect(**status_fields_cleaned)); # logger.info(f"  Added Status Effect: {name}")
                     except Exception as e: logger.error(f"  ERROR creating StatusEffect '{name}': {e}")

        # --- Коммит способностей и эффектов ПЕРЕД предметами ---
        db.commit()
        logger.info("Abilities and Status Effects committed.")

        # --- Этап 2: Создание Предметов и Привязка Способностей к Оружию ---
        logger.info("--- Seeding Stage 2: Items and Weapon Ability Links ---")
        logger.info("Seeding Weapons and linking abilities...")
        for data in weapons_data:
            names_to_add = split_names(data["name"])
            base_weapon_name = names_to_add[0]
            properties_str = data.get("properties", "") or ""

            # --- Логика определения способностей для привязки ---
            granted_ability_names = set()
            # 1. Атака Ближнего Боя
            melee_attack_name = f"Удар {base_weapon_name}".replace("Удар Безоружный удар", "Безоружный удар")
            if melee_attack_name in ability_map: granted_ability_names.add(melee_attack_name)
            # 2. Метание
            is_throwable = "Дистанция Броска" in properties_str
            if is_throwable:
                throw_ability_name = None
                if base_weapon_name.lower().startswith("граната"): throw_ability_name = "Бросок гранаты"
                elif "нож" in base_weapon_name.lower() or "Нож" in base_weapon_name.lower(): throw_ability_name = f"Бросок {base_weapon_name.lower().replace('боевой ','')}"
                if throw_ability_name and throw_ability_name in ability_map: granted_ability_names.add(throw_ability_name)
                elif throw_ability_name: logger.warning(f" Throw ability '{throw_ability_name}' not found for '{base_weapon_name}'")
            # 3. Атака Дальнего Боя и Спец. Режимы
            has_range_normal = data.get("range_normal") is not None
            is_grenade_no_dmg = data.get("damage") == "-"
            is_flamethrower = "Взрыв (конус 5м)" in properties_str and data.get("damage_type") == "Огненный"
            is_cone_shotgun = "Особое (атака конусом)" in properties_str
            has_burst = "Очередь" in properties_str
            is_throwable_only = is_throwable and not has_range_normal

            if is_flamethrower: granted_ability_names.add("Струя огня (Огнемет)")
            elif is_cone_shotgun:
                granted_ability_names.add("Атака конусом (Дробовик)")
                granted_ability_names.add("Одиночный выстрел")
            elif has_range_normal and not is_grenade_no_dmg and not is_throwable_only:
                granted_ability_names.add("Одиночный выстрел")
                if has_burst: granted_ability_names.add("Очередь")
            # Для гранат уже добавили "Бросок гранаты", другие не нужны
            # Метательные ножи уже получили "Бросок..." и "Удар..."

            logger.info(f"  Abilities determined for '{base_weapon_name}': {list(granted_ability_names)}")
            # --- Конец логики ---

            # Создаем записи оружия и линкуем
            for name in names_to_add:
                data_copy = data.copy(); data_copy["name"] = name
                if not db.query(Item.id).filter(Item.name == name).first():
                    weapon_abilities_to_link = []
                    for ability_name in granted_ability_names:
                        ability_obj = ability_map.get(ability_name)
                        if ability_obj:
                            ability_in_session = db.merge(ability_obj)
                            weapon_abilities_to_link.append(ability_in_session)
                        else: logger.warning(f"    Ability '{ability_name}' object not found for linking to '{name}'.")

                    data_copy.pop('granted_abilities', None)
                    item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                    weapon_defaults = {"strength_requirement": 0, "stealth_disadvantage": False, "range_normal": None, "range_max": None, "reload_info": None, "is_two_handed": False}
                    data_with_defaults = {**item_defaults, **weapon_defaults, **data_copy}
                    weapon_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Weapon, k)}
                    try:
                        item = Weapon(**weapon_fields_cleaned)
                        if weapon_abilities_to_link: item.granted_abilities = weapon_abilities_to_link
                        db.add(item); # logger.info(f"  Added Weapon: {name}")
                    except Exception as e: logger.error(f"  ERROR creating Weapon '{name}': {e}", exc_info=True); logger.error(f"    Data: {weapon_fields_cleaned}")

        # Создание Брони, Щитов, Общих предметов, Патронов
        logger.info("Seeding Armor...")
        for data in armors_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                 data_copy = data.copy(); data_copy["name"] = name
                 if not db.query(Item.id).filter(Item.name == name).first():
                     item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                     armor_defaults = {"strength_requirement": 0, "stealth_disadvantage": False, "max_dex_bonus": None, "properties": None}
                     data_with_defaults = {**item_defaults, **armor_defaults, **data_copy}
                     armor_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Armor, k)}
                     try: db.add(Armor(**armor_fields_cleaned)); # logger.info(f"  Added Armor: {name}")
                     except Exception as e: logger.error(f"  ERROR creating Armor '{name}': {e}")

        logger.info("Seeding Shields...")
        for data in shields_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                 data_copy = data.copy(); data_copy["name"] = name
                 if not db.query(Item.id).filter(Item.name == name).first():
                     item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                     shield_defaults = {"strength_requirement": 0, "properties": None}
                     data_with_defaults = {**item_defaults, **shield_defaults, **data_copy}
                     shield_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Shield, k)}
                     try: db.add(Shield(**shield_fields_cleaned)); # logger.info(f"  Added Shield: {name}")
                     except Exception as e: logger.error(f"  ERROR creating Shield '{name}': {e}")

        logger.info("Seeding General Items...")
        for data in general_items_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                 data_copy = data.copy(); data_copy["name"] = name
                 if not db.query(Item.id).filter(Item.name == name).first():
                     item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                     general_defaults = {"uses": None, "effect": None, "effect_dice_formula": None}
                     data_with_defaults = {**item_defaults, **general_defaults, **data_copy}
                     general_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(GeneralItem, k)}
                     try: db.add(GeneralItem(**general_fields_cleaned)); # logger.info(f"  Added General Item: {name}")
                     except Exception as e: logger.error(f"  ERROR creating General Item '{name}': {e}")

        logger.info("Seeding Ammo...")
        for data in ammo_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                 data_copy = data.copy(); data_copy["name"] = name
                 if not db.query(Item.id).filter(Item.name == name).first():
                     item_defaults = {"category": "Спец.", "rarity": "Необычная", "weight": 0}
                     ammo_defaults = {"effect": None}
                     data_with_defaults = {**item_defaults, **ammo_defaults, **data_copy}
                     ammo_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Ammo, k)}
                     try: db.add(Ammo(**ammo_fields_cleaned)); # logger.info(f"  Added Ammo: {name}")
                     except Exception as e: logger.error(f"  ERROR creating Ammo '{name}': {e}")

        # Финальный коммит для всех предметов
        db.commit()
        logger.info("Items committed.")

    except Exception as e:
        logger.error(f"An error occurred during database seeding: {e}", exc_info=True)
        db.rollback()
    finally:
        if db: db.close()
        logger.info("Database session closed.")

# --- Запуск Сидера ---
if __name__ == "__main__":
    logger.info("Running database seeder...")
    # --- Создание таблиц ---
    try:
        logger.info("Creating database tables...")
        from app.db.database import Base, engine
        from app.models.user import User
        from app.models.party import Party
        from app.models.item import Item, Weapon, Armor, Shield, GeneralItem, Ammo
        from app.models.ability import Ability
        from app.models.status_effect import StatusEffect
        from app.models.character import Character, CharacterInventoryItem
        from app.models.association_tables import character_abilities, character_status_effects, weapon_granted_abilities
        Base.metadata.create_all(bind=engine)
        logger.info("Tables created successfully (if they didn't exist).")
    except Exception as table_creation_error:
        logger.error(f"ERROR creating tables: {table_creation_error}", exc_info=True)
        sys.exit(1)

    # --- Запуск заполнения данными ---
    seed_data()
    logger.info("Seeding process finished.")