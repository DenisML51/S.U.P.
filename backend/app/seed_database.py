import sys
import os
import json
import logging # Добавим логирование для отладки
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, inspect as sqlainspect

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Добавляем путь к корневой папке бэкенда
# Убедись, что этот путь корректен для твоей структуры проекта
# Обычно скрипт запускается из папки backend, тогда этот путь будет '.'
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Переход на уровень выше (из scripts в backend)
sys.path.append(project_root)
logger.info(f"Project root added to sys.path: {project_root}")

# --- Импорты моделей и БД ---
try:
    from app.db.database import engine, Base, SessionLocal
    # Импортируем ВСЕ модели, чтобы Base.metadata знал о них
    from app.models import (
        User, Party, Item, Weapon, Armor, Shield, GeneralItem, Ammo,
        Ability, StatusEffect, Character, CharacterInventoryItem,
        character_abilities, character_status_effects, weapon_granted_abilities
    )
    logger.info("Models and DB session imported successfully.")
except ImportError as e:
    logger.error(f"Error importing modules: {e}", exc_info=True)
    logger.error("Please ensure the script is run from the 'backend' directory or the parent directory, or adjust sys.path.")
    sys.exit(1)
except Exception as e:
    logger.error(f"An unexpected error occurred during imports: {e}", exc_info=True)
    sys.exit(1)

logger.info("Starting database seeding...")

# --- ДАННЫЕ ДЛЯ ЗАПОЛНЕНИЯ (Полностью из книги правил) ---

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
    # Дальний бой
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
    { "name": "Термо-Пистолет", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 5, "damage": "2к8", "damage_type": "Огненный", "properties": "Боеприпасы (заряд), Пробивание (vs тяж. броня/техника)", "range_normal": 5, "range_max": 10, "reload_info": "3 выстр./Действие", "is_two_handed": False },
    { "name": "Термо-Ружье", "item_type": "weapon", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 10, "damage": "4к8", "damage_type": "Огненный", "properties": "Боеприпасы (заряд), Двуручное, Пробивание (vs тяж. броня/техника)", "range_normal": 10, "range_max": 20, "reload_info": "1 выстр./Действие", "is_two_handed": True },
    { "name": "Огнемет", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 15, "damage": "2к6", "damage_type": "Огненный", "properties": "Боеприпасы (топливо), Двуручное, Взрыв (конус 5м)", "range_normal": 5, "range_max": 5, "reload_info": "5 исп./Действие", "is_two_handed": True },
    { "name": "Граната (Осколочная)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "3к6", "damage_type": "Оскол.", "properties": "Взрыв (Радиус 5м), Одноразовая, Дистанция Броска (10/20)", "range_normal": 10, "range_max": 20, "is_two_handed": False },
    { "name": "Граната (Светошумовая)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "-", "damage_type": "Эффект", "properties": "Взрыв (Радиус 5м), Одноразовая, Дистанция Броска (10/20), Особое (Оглушение)", "range_normal": 10, "range_max": 20, "is_two_handed": False },
    { "name": "Плазменный пистолет", "item_type": "weapon", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 3, "damage": "2к6", "damage_type": "Энерг./Огонь", "properties": "Боеприпасы (заряд), Перегрев?", "range_normal": 20, "range_max": 60, "reload_info": "10 выстр./Действие", "is_two_handed": False },
]

# БРОНЯ
armors_data = [
    { "name": "Укрепленная одежда", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 4, "armor_type": "Лёгкая", "ac_bonus": 11, "max_dex_bonus": 2, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Ряса", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 4, "armor_type": "Лёгкая", "ac_bonus": 11, "max_dex_bonus": 2, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Кожаная куртка", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 6, "armor_type": "Лёгкая", "ac_bonus": 12, "max_dex_bonus": 2, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Комбинезон", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 6, "armor_type": "Лёгкая", "ac_bonus": 12, "max_dex_bonus": 2, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Легкий бронежилет (Flak Vest)", "item_type": "armor", "category": "Воинское", "rarity": "Необычная", "weight": 10, "armor_type": "Лёгкая", "ac_bonus": 13, "max_dex_bonus": 2, "strength_requirement": 0, "stealth_disadvantage": False, "properties": "Сопротивление (Дробящий урон от взрывов?)" },
    { "name": "Кольчуга", "item_type": "armor", "category": "Воинское", "rarity": "Необычная", "weight": 40, "armor_type": "Средняя", "ac_bonus": 14, "max_dex_bonus": 2, "strength_requirement": 4, "stealth_disadvantage": True, "properties": None },
    { "name": "Чешуйчатый доспех", "item_type": "armor", "category": "Воинское", "rarity": "Необычная", "weight": 45, "armor_type": "Средняя", "ac_bonus": 14, "max_dex_bonus": 2, "strength_requirement": 4, "stealth_disadvantage": True, "properties": None },
    { "name": "Тяжелый бронежилет", "item_type": "armor", "category": "Воинское", "rarity": "Редкая", "weight": 25, "armor_type": "Средняя", "ac_bonus": 15, "max_dex_bonus": 2, "strength_requirement": 5, "stealth_disadvantage": True, "properties": "Сопротивление (Колющий от баллистики?)" },
    { "name": "Карапас", "item_type": "armor", "category": "Воинское", "rarity": "Редкая", "weight": 30, "armor_type": "Средняя", "ac_bonus": 15, "max_dex_bonus": 2, "strength_requirement": 5, "stealth_disadvantage": True, "properties": "Сопротивление (Колющий от баллистики?)" },
    { "name": "Сегментная броня", "item_type": "armor", "category": "Воинское", "rarity": "Редкая", "weight": 40, "armor_type": "Средняя", "ac_bonus": 16, "max_dex_bonus": 2, "strength_requirement": 6, "stealth_disadvantage": True, "properties": None },
    { "name": "Полулаты", "item_type": "armor", "category": "Воинское", "rarity": "Редкая", "weight": 40, "armor_type": "Средняя", "ac_bonus": 16, "max_dex_bonus": 2, "strength_requirement": 6, "stealth_disadvantage": True, "properties": None },
    { "name": "Латный доспех (архаичный/культ.)", "item_type": "armor", "category": "Экзотика", "rarity": "Редкая", "weight": 65, "armor_type": "Тяжёлая", "ac_bonus": 17, "max_dex_bonus": 0, "strength_requirement": 7, "stealth_disadvantage": True, "properties": "Уязвимость (Электричество?)" },
    { "name": "Тяжелая пехотная броня (импер./мар.)", "item_type": "armor", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 50, "armor_type": "Тяжёлая", "ac_bonus": 18, "max_dex_bonus": 0, "strength_requirement": 8, "stealth_disadvantage": True, "properties": "Может иметь слоты для модулей" },
    { "name": "Силовая Броня (прототип)", "item_type": "armor", "category": "Экзотика", "rarity": "Легендарная", "weight": 100, "armor_type": "Тяжёлая", "ac_bonus": 19, "max_dex_bonus": 0, "strength_requirement": 9, "stealth_disadvantage": True, "properties": "Треб. Владение, +2 Сила, Интегр. системы" },
]

# ЩИТЫ
shields_data = [
    { "name": "Легкий щит", "item_type": "shield", "category": "Простое", "rarity": "Обычная", "weight": 2, "ac_bonus": 1, "strength_requirement": 0, "properties": None },
    { "name": "Баклер", "item_type": "shield", "category": "Простое", "rarity": "Обычная", "weight": 2, "ac_bonus": 1, "strength_requirement": 0, "properties": None },
    { "name": "Средний щит", "item_type": "shield", "category": "Воинское", "rarity": "Необычная", "weight": 6, "ac_bonus": 2, "strength_requirement": 0, "properties": None },
    { "name": "Боевой щит", "item_type": "shield", "category": "Воинское", "rarity": "Необычная", "weight": 6, "ac_bonus": 2, "strength_requirement": 0, "properties": None },
    { "name": "Тяжелый штурмовой щит", "item_type": "shield", "category": "Воинское", "rarity": "Редкая", "weight": 12, "ac_bonus": 3, "strength_requirement": 6, "properties": "Особое (Можно использовать как Укрытие 1/2?)" },
    { "name": "Энергетический щит (персон.)", "item_type": "shield", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 4, "ac_bonus": 2, "strength_requirement": 0, "properties": "+4 AC vs Энерг., Требует заряд, Уязвим к ЭDM" },
]

# ОБЩИЕ ПРЕДМЕТЫ (с effect_dice_formula)
general_items_data = [
    { "name": "Мультитул", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Набор отверток, ключей, пассатижей и т.д.", "effect": "Дает преимущество на проверки Техники для ремонта или простого взаимодействия с механизмами.", "uses": None, "effect_dice_formula": None },
    { "name": "Набор для взлома (Механический)", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 1, "description": "Отмычки, щупы, небольшой молоточек.", "effect": "Позволяет совершать проверки Ловкости (Взлом) для вскрытия механических замков. Без набора - помеха или невозможно.", "uses": None, "effect_dice_formula": None },
    { "name": "Набор для взлома (Электронный)", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 1, "description": "Интерфейсные кабели, скребки данных, дешифратор.", "effect": "Позволяет совершать проверки Техники для взлома электронных замков и систем. Без набора - помеха или невозможно.", "uses": None, "effect_dice_formula": None },
    { "name": "Лом", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 5, "description": "Тяжелый металлический рычаг.", "effect": "Используется как оружие (1к6 Дробящий) или инструмент. Дает преимущество на проверки Силы для взлома.", "uses": None, "effect_dice_formula": None }, # Also listed as weapon
    { "name": "Аптечка", "item_type": "general", "category": "Медицина", "rarity": "Обычная", "weight": 3, "description": "Содержит бинты, антисептики, базовые инструменты.", "effect": "Позволяет совершать проверки Медицины для стабилизации (Первая Помощь) или лечения ран.", "uses": 3, "effect_dice_formula": "1к8+Мод.Мед" },
    { "name": "Медпак", "item_type": "general", "category": "Медицина", "rarity": "Обычная", "weight": 3, "description": "Более крупная аптечка.", "effect": "Позволяет совершать проверки Медицины для стабилизации (Первая Помощь) или лечения ран.", "uses": 5, "effect_dice_formula": "1к8+Мод.Мед" },
    { "name": "Стимулятор (Стим)", "item_type": "general", "category": "Медицина", "rarity": "Необычная", "weight": 0.1, "description": "Инъектор с бодрящим веществом.", "effect": "Использование (Бонусное Действие) дает временные ПЗ или снимает 1 уровень Истощения.", "uses": 1, "effect_dice_formula": "2к4" }, # Formula for temp HP
    { "name": "Антидот", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 0.1, "description": "Инъектор с универсальным противоядием.", "effect": "Снимает эффект Отравления (Действие).", "uses": 1, "effect_dice_formula": None },
    { "name": "Противоядие", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 0.1, "description": "Инъектор с универсальным противоядием.", "effect": "Снимает эффект Отравления (Действие).", "uses": 1, "effect_dice_formula": None },
    { "name": "Фонарик", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Источник направленного света.", "effect": "Освещает конус перед собой.", "uses": None, "effect_dice_formula": None },
    { "name": "Химсвет", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 0.2, "description": "Одноразовый химический источник света.", "effect": "Освещает область в радиусе 5-10м в течение 1 часа после активации (сломать).", "uses": 1, "effect_dice_formula": None },
    { "name": "Сканер", "item_type": "general", "category": "Воинское", "rarity": "Необычная", "weight": 2, "description": "Ручное устройство для анализа окружения.", "effect": "Действие: обнаруживает источники энергии, движения, живых существ или материалы в радиусе 10-15м (Проверка Техники/Внимательности для интерпретации).", "uses": None, "effect_dice_formula": None },
    { "name": "Ауспик", "item_type": "general", "category": "Воинское", "rarity": "Редкая", "weight": 2, "description": "Продвинутый сканер.", "effect": "Действие: обнаруживает источники энергии, движения, живых существ или материалы в радиусе 15-20м (Проверка Техники/Внимательности для интерпретации).", "uses": None, "effect_dice_formula": None },
    { "name": "Датапад", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Портативный компьютер.", "effect": "Хранение информации, интерфейс для взаимодействия с сетями (требует Техники для взлома).", "uses": None, "effect_dice_formula": None },
    { "name": "Планшет", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Портативный компьютер.", "effect": "Хранение информации, интерфейс для взаимодействия с сетями (требует Техники для взлома).", "uses": None, "effect_dice_formula": None },
    { "name": "Комм-линк", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 0.5, "description": "Устройство связи.", "effect": "Обеспечивает радиосвязь на коротких дистанциях.", "uses": None, "effect_dice_formula": None },
    { "name": "Вокс-кастер", "item_type": "general", "category": "Воинское", "rarity": "Необычная", "weight": 3, "description": "Мощное устройство связи.", "effect": "Обеспечивает радиосвязь на больших дистанциях, возможно шифрование.", "uses": None, "effect_dice_formula": None },
    { "name": "Респиратор", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Защита органов дыхания.", "effect": "Дает преимущество на спасброски против газов/ядов в воздухе.", "uses": None, "effect_dice_formula": None },
    { "name": "Противогаз", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 2, "description": "Полная защита органов дыхания и лица.", "effect": "Дает иммунитет к газовым атакам, обеспечивает дыхание в разреженной атмосфере на ограниченное время (запас воздуха).", "uses": None, "effect_dice_formula": None },
    { "name": "ЭDM-граната", "item_type": "general", "category": "Воинское", "rarity": "Редкая", "weight": 1, "description": "Электромагнитная граната.", "effect": "Действие: импульс в радиусе 5-10м. Техника/роботы спасбросок Техники/Выносливости или Отключение на 1к4 раунда. Деактивирует энергощиты.", "uses": 1, "effect_dice_formula": None }, # Effect isn't simple dice roll
    { "name": "Веревка (15м)", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 3, "description": "Прочная синтетическая веревка.", "effect": "Используется для лазания, связывания и т.д.", "uses": None, "effect_dice_formula": None },
    { "name": "Набор для выживания", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 5, "description": "Труд, огниво, фильтр для воды, базовые инструменты.", "effect": "Дает преимущество на проверки Адаптации для выживания в дикой местности.", "uses": None, "effect_dice_formula": None },
    { "name": "Бинокль", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Оптический прибор для наблюдения.", "effect": "Позволяет детально рассматривать удаленные объекты.", "uses": None, "effect_dice_formula": None },
    { "name": "Наручники", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Металлические или пластиковые оковы.", "effect": "Используются для сковывания противников (требует успешной проверки Ловкости/Силы в ближнем бою).", "uses": None, "effect_dice_formula": None },
    { "name": "Святая вода (Ампула)", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 0.2, "description": "Освященная жидкость.", "effect": "Метательное. Наносит урон Светом при попадании.", "uses": 1, "effect_dice_formula": "2к6" },
    { "name": "Кислота (Ампула)", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 0.2, "description": "Едкая жидкость.", "effect": "Метательное. Наносит урон Кислотой при попадании.", "uses": 1, "effect_dice_formula": "2к6" },
]

# СПЕЦ. БОЕПРИПАСЫ
ammo_data = [
    { "name": "Бронебойные патроны (AP)", "item_type": "ammo", "category": "Спец.", "rarity": "Редкая", "weight": 0, "ammo_type": "Баллистическое", "effect": "Улучшает свойство Пробивание оружия (например, игнорирует до 3 AC от брони) или дает его, если не было." },
    { "name": "Экспансивные патроны", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0, "ammo_type": "Баллистическое", "effect": "При попадании цель совершает спасбросок Выносливости (СЛ 12) или получает Кровотечение (1к4)." },
    { "name": "Разрывные патроны", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0, "ammo_type": "Баллистическое", "effect": "При попадании цель совершает спасбросок Выносливости (СЛ 12) или получает Кровотечение (1к4)." },
    { "name": "Зажигательные патроны", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0, "ammo_type": "Баллист./Дробовик", "effect": "При попадании цель должна совершить спасбросок Ловкости (СЛ 10) или получить Горение (1к4)." },
    { "name": "ЭDM-заряды", "item_type": "ammo", "category": "Спец.", "rarity": "Редкая", "weight": 0, "ammo_type": "Энергетическое", "effect": "Наносит половину урона, но Отключает технику/щиты на 1 раунд при попадании (Спасбросок Техники СЛ 13)." },
    { "name": "Транквилизаторы", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0, "ammo_type": "Пистолет/Винтовка", "effect": "Урон считается нелетальным. При снижении ПЗ цели до 0, она Без сознания, а не при смерти." },
    { "name": "Благословленные снаряды", "item_type": "ammo", "category": "Спец.", "rarity": "Очень Редкая", "weight": 0, "ammo_type": "Любое (Магич./Пси)", "effect": "Урон считается магическим/психическим. Могут иметь доп. эффект против определенных существ (демоны, псайкеры)." },
    { "name": "Пси-снаряды", "item_type": "ammo", "category": "Спец.", "rarity": "Очень Редкая", "weight": 0, "ammo_type": "Любое (Магич./Пси)", "effect": "Урон считается магическим/психическим. Могут иметь доп. эффект против определенных существ (демоны, псайкеры)." },
]

# СПОСОБНОСТИ (Включая атаки оружия)
abilities_data = [
    # --- Атаки Оружия ---
    # Ближний Бой
    { "name": "Удар Ножом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака ножом.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к4+Мод.Лов", "damage_type": "Колющий" },
    { "name": "Удар Боевым ножом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака боевым ножом.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к4+Мод.Лов", "damage_type": "Колющий" },
    { "name": "Удар Дубинкой", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака дубинкой.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к6+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Удар Обломком трубы", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака обломком трубы.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к6+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Удар Монтировкой", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака монтировкой.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к6+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Удар Топором", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака топором.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к8+Мод.Сил", "damage_type": "Рубящий" },
    { "name": "Удар Мачете", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака мачете.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к8+Мод.Сил", "damage_type": "Рубящий" },
    { "name": "Удар Мечом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака мечом.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к8+Мод.Лов", "damage_type": "Рубящий" }, # Фехтовальное
    { "name": "Удар Катаной", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака катаной.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к8+Мод.Лов", "damage_type": "Рубящий" }, # Фехтовальное
    { "name": "Удар Рапирой", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака рапирой.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к8+Мод.Лов", "damage_type": "Колющий" }, # Фехтовальное
    { "name": "Удар Молотом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака молотом.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к10+Мод.Сил", "damage_type": "Дробящий" }, # Двуручное
    { "name": "Удар Тяжелой дубиной", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака тяжелой дубиной.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к10+Мод.Сил", "damage_type": "Дробящий" }, # Двуручное
    { "name": "Удар Двуручным мечом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака двуручным мечом.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к12+Мод.Сил", "damage_type": "Рубящий" }, # Двуручное
    { "name": "Удар Двуручным топором", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака двуручным топором.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к12+Мод.Сил", "damage_type": "Рубящий" }, # Двуручное
    { "name": "Удар Цепным Мечом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака цепным мечом.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к10+Мод.Сил", "damage_type": "Рубящий" },
    { "name": "Удар Силовым Мечом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака силовым мечом.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "1к8+Мод.Лов", "damage_type": "Энерг./Рубящий" }, # Фехтовальное
    { "name": "Удар Силовым Молотом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака силовым молотом.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "2к10+Мод.Сил", "damage_type": "Энерг./Дроб." },
    { "name": "Удар Кастетом", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака кастетом.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к4+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Удар Укрепленными перчатками", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака укрепленными перчатками.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1к4+Мод.Сил", "damage_type": "Дробящий" },
    { "name": "Безоружный удар", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Атака кулаком или ногой.", "cooldown": None, "range": "1.5м", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Сила", "damage_formula": "1+Мод.Сил", "damage_type": "Дробящий" },
    # Дальний Бой - Общая способность
    { "name": "Одиночный выстрел", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Стандартный выстрел из дальнобойного оружия.", "cooldown": None, "range": "См. оружие", "target": "Одна цель", "is_weapon_attack": True, "attack_skill": "Ловкость", "damage_formula": "См. оружие", "damage_type": "См. оружие" }, # Урон и тип берутся из оружия
    # Способности оружия
    { "name": "Очередь", "branch": "weapon", "level_required": 0, "action_type": "Атака (Действие)", "description": "Трата 3-5 патронов. Атака с помехой, +1 кубик урона при попадании. Альтернативно: атака до 3 целей в 3м друг от друга с помехой по каждой.", "cooldown": None, "range": "См. оружие", "target": "Одна цель / До 3 целей", "is_weapon_attack": False, "attack_skill": "Ловкость", "damage_formula": "См. оружие+1к", "damage_type": "См. оружие" },
    # --- Способности Веток ---
    # Медик
    { "name": "Первая Помощь", "branch": "medic", "level_required": 1, "action_type": "Действие", "range": "5 метров", "target": "Один союзник с 0 ПЗ или любой союзник", "cooldown": "Нет", "description": "Стабилизация союзника с 0 ПЗ или восстановление 1к4 + Медицина ПЗ.", "damage_formula": "1к4+Мод.Мед", "damage_type": "Лечение" },
    { "name": "Лечение Союзника", "branch": "medic", "level_required": 2, "skill_requirements": '{"skill_medicine": 3}', "action_type": "Действие", "range": "Касание", "target": "Одно существо", "cooldown": "1 ход", "description": "Восстанавливает цели 2к8 + Медицина ПЗ. Усиление: Мед 5+ -> 3к8+Мед; Мед 7+ -> 4к8+Мед.", "damage_formula": "2к8+Мод.Мед", "damage_type": "Лечение" }, # Базовая формула
    # ... (Остальные способности веток без изменений) ...
]

# СОСТОЯНИЯ
status_effects_data = [
    { "name": "При смерти (Unconscious)", "description": "Существо недееспособно (лежит), не может двигаться/говорить, роняет предметы. Атаки по нему с преим., вблизи - крит. Провал спасбр. Сил/Лов. При получении урона - спасбросок от смерти (если есть) или просто остается без сознания. Восстанавливается при лечении >0 ПЗ или стабилизации и отдыхе." },
    { "name": "Горение (Burning)", "description": "Существо получает урон огнем (обычно 1к4 или 1к6) в начале своего хода. Можно потратить Действие на тушение (СЛ Ловкости 10)." },
    { "name": "Глухота (Deafened)", "description": "Существо не может слышать и проваливает проверки, требующие слуха." },
    { "name": "Дружественный (Charmed/Friendly)", "description": "Считает источник другом, не атакует его/союзников. Источник имеет преим. на соц. проверки. Эффект может закончиться при нанесении вреда цели." },
    { "name": "Замедление (Slowed)", "description": "Скорость уменьшена (вдвое или на Х). Не может использовать Реакции, связанные с перемещением." },
    { "name": "Застигнут врасплох (Surprised)", "description": "Не может двигаться/действовать/реагировать в свой первый ход боя." },
    { "name": "Истощение (Exhaustion)", "description": "Имеет уровни (1-6) с кумулятивными штрафами: 1:Помеха на проверки; 2:Скор/2; 3:Помеха на атаки/спасбр; 4:МаксПЗ/2; 5:Скор=0; 6:Смерть. Снижается на 1 за длит. отдых." },
    { "name": "Кровотечение (Bleeding)", "description": "Получает урон (1к4) в начале хода. Требует Действия и проверки Медицины (или лечения) для остановки." },
    { "name": "Лежа (Prone)", "description": "Передвижение ползком (скор/2). Помеха на атаки. Атаки ближ. боя с преим., дальн. - с помехой. Встать - половина скорости." },
    { "name": "Невидимость (Invisible)", "description": "Невозможно увидеть без спец. средств. Атаки по существу с помехой, его атаки - с преим. Положение можно определить по звукам." },
    { "name": "Немота (Silenced)", "description": "Не может говорить/издавать звуки голосом. Техно-немота: не может использовать устройства/способности с голосовыми/звуковыми компонентами." },
    { "name": "Обезоружен (Disarmed)", "description": "Роняет один предмет (обычно оружие). Может поднять его (Действие/Взаимодействие)." },
    { "name": "Оглушение (Stunned)", "description": "Недееспособен, не может двигаться, говорит запинаясь. Провал спасбр. Сил/Лов. Атаки по нему с преим." },
    { "name": "Ослепление (Blinded)", "description": "Не может видеть, проваливает проверки на зрение. Атаки по нему с преим., его атаки - с помехой." },
    { "name": "Отравление (Poisoned)", "description": "Помеха на броски атаки и проверки навыков." },
    { "name": "Отключение (Disabled)", "description": "Для механизмов/роботов. Недееспособен, не может двигаться/действовать. Аналог Оглушения для техники." },
    { "name": "Ошеломление (Dazed)", "description": "Может совершить либо Действие, либо Бонусное Действие (не оба). Не может использовать Реакции." },
    { "name": "Паралич (Paralyzed)", "description": "Недееспособен (не может двигаться/действовать). Провал спасбр. Сил/Лов. Атаки по нему с преим. Атака вблизи - крит." },
    { "name": "Подавление (Suppressed)", "description": "Под плотным огнем/ментальным давлением. Помеха на броски атаки и проверки Внимательности." },
    { "name": "Схвачен (Grappled)", "description": "Скорость = 0. Не может добровольно переместиться. Заканчивается, если источник недееспособен или цель вырвалась (проверка)." },
    { "name": "Страх (Frightened)", "description": "Помеха на атаки/проверки, пока источник страха виден. Не может добровольно двигаться к источнику страха." },
    { "name": "Шок (Shocked)", "description": "Не может использовать Реакции." },
    # ПУ Эмоции
    { "name": "ПУ: Паника", "description": "Помеха на атаки/проверки, должен использовать действие для бегства от опасности, если возможно (1 мин)." },
    { "name": "ПУ: Ярость", "description": "Преимущество на атаки ближнего боя (Сила), -2 СЛ Защ. Атакует ближайшее существо (врага или союзника), если возможно (1 мин)." },
    { "name": "ПУ: Апатия", "description": "Помеха на проверки/спасброски, скорость / 2, не может использовать Бонусные действия или Реакции (1 мин)." },
    { "name": "ПУ: Паранойя", "description": "Помеха на социальные проверки (Внушение, Авторитет, Проницательность). Считает всех подозрительными (10 мин)." },
    { "name": "ПУ: Слабоумие", "description": "Действует иррационально согласно внезапно возникшей идее (определяется Мастером). Помеха на все действия, не связанные с этой идеей (10 мин)." },
    { "name": "ПУ: Срыв", "description": "Получает состояние Оглушение на 1 раунд, затем состояние Ошеломление на 1 минуту." },
    { "name": "ПУ: Адреналин", "description": "Может совершить одно дополнительное Действие или Бонусное действие в свой следующий ход." },
    { "name": "ПУ: Вдохновение", "description": "Получает Преимущество на все броски атаки ИЛИ все спасброски (на выбор игрока в момент получения) до конца своего следующего хода." },
    { "name": "ПУ: Спокойствие", "description": "Получает +2 к СЛ Защ и Преимущество на спасброски Самообладания до конца своего следующего хода." },
    { "name": "ПУ: Прозрение", "description": "Получает Преимущество на следующую совершаемую проверку Внимательности, Логики или Проницательности." },
    { "name": "ПУ: Эмпатия", "description": "Получает Преимущество на следующую совершаемую проверку Медицины или неагрессивную проверку Внушения или Проницательности." },
    { "name": "ПУ: Воля", "description": "Автоматически преуспевает на следующем спасброске против эффектов Страха или Внушения. Получает 1к6 временных ПЗ." },
]
# -------------------------------------------------------

# Функция для парсинга имен типа "A / B"
def split_names(name):
    return [n.strip() for n in name.split('/') if n.strip()]

def seed_data():
    db = SessionLocal()
    try:
        logger.info("Seeding Abilities...")
        ability_map = {}
        # --- Сначала создаем ВСЕ способности (включая атаки оружия) ---
        for data in abilities_data:
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
                            logger.warning(f"Invalid JSON in skill_requirements for '{name}', setting to None: {reqs}")
                            data_copy["skill_requirements"] = None

                    ability_fields_cleaned = {k: v for k, v in data_copy.items() if hasattr(Ability, k)}
                    ability_fields_cleaned.setdefault('is_weapon_attack', False)
                    ability_fields_cleaned.setdefault('concentration', False)
                    ability_fields_cleaned.setdefault('action_type', 'Действие')

                    try:
                        ability = Ability(**ability_fields_cleaned)
                        db.add(ability)
                        db.flush() # Получаем ID сразу
                        ability_map[name] = ability
                        logger.info(f"  Added Ability template: {name} (ID: {ability.id})")
                    except Exception as create_exc:
                        logger.error(f"  ERROR creating Ability '{name}': {create_exc}", exc_info=True)
                        logger.error(f"    Data used: {ability_fields_cleaned}")
                else:
                    # logger.debug(f"  Skipped Ability template (exists): {name}")
                    if name not in ability_map:
                        existing_ability = db.query(Ability).filter(Ability.name == name).first()
                        if existing_ability:
                            ability_map[name] = existing_ability

        # # --- Обновляем типы урона для атак оружия ---
        # # (Этот блок был перенесен выше для корректной работы)
        # logger.info("Assigning damage types to weapon attack abilities...")
        # for weapon_data in weapons_data:
        #     # ... (логика присвоения damage_type) ...
        # db.commit() # Коммитим обновленные способности
        # logger.info("Abilities (with weapon damage types) committed.")

        # --- Заполняем Статус-Эффекты ---
        logger.info("Seeding Status Effects...")
        for data in status_effects_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(StatusEffect.id).filter(StatusEffect.name == name).first()
                if not exists:
                    status_fields_cleaned = {k: v for k, v in data_copy.items() if hasattr(StatusEffect, k)}
                    try:
                        effect = StatusEffect(**status_fields_cleaned)
                        db.add(effect)
                        logger.info(f"  Added Status Effect: {name}")
                    except Exception as create_exc:
                        logger.error(f"  ERROR creating StatusEffect '{name}': {create_exc}", exc_info=True)
                        logger.error(f"    Data used: {status_fields_cleaned}")
                # else:
                    # logger.debug(f"  Skipped Status Effect (exists): {name}")
        db.commit() # Коммитим статусы
        logger.info("Status Effects committed.")


        # --- Заполняем Предметы и связываем оружие со способностями ---
        logger.info("Seeding Weapons...")
        for data in weapons_data:
            names_to_add = split_names(data["name"])
            base_weapon_name = names_to_add[0]

            # Определяем базовые способности для этого оружия
            granted_ability_names = []
            properties_str = data.get("properties", "") or ""
            is_ranged = data.get("range_normal") is not None or data.get("damage_type") == "Взрывной" or "Дистанция Броска" in properties_str

            if is_ranged:
                if "Очередь" in properties_str:
                    granted_ability_names.append("Очередь")
                # Добавляем одиночный выстрел для всех дальнобойных, кроме гранат?
                if data.get("damage") != "-": # Не добавляем для гранат без урона
                     granted_ability_names.append("Одиночный выстрел")
            else: # Ближний бой
                attack_ability_name = f"Удар {base_weapon_name}".replace("Удар Безоружный удар", "Безоружный удар")
                if attack_ability_name in ability_map:
                    granted_ability_names.append(attack_ability_name)
                else:
                    logger.warning(f"    Specific attack ability '{attack_ability_name}' not found in map for melee weapon '{base_weapon_name}'.")
                # Можно добавить сюда проверку свойств ближнего боя, если они дают способности

            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(Item.id).filter(Item.name == name).first()
                if not exists:
                    weapon_abilities_to_link = []
                    unique_ability_ids = set()
                    for ability_name in granted_ability_names:
                        ability_obj = ability_map.get(ability_name)
                        if ability_obj and ability_obj.id not in unique_ability_ids:
                            weapon_abilities_to_link.append(ability_obj)
                            unique_ability_ids.add(ability_obj.id)
                        elif not ability_obj:
                            logger.warning(f"    Ability '{ability_name}' not found in map for weapon '{name}'.")

                    data_copy.pop('granted_abilities', None)
                    item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                    weapon_defaults = {"strength_requirement": 0, "stealth_disadvantage": False, "range_normal": None, "range_max": None, "reload_info": None, "is_two_handed": False}
                    data_with_defaults = {**item_defaults, **weapon_defaults, **data_copy}
                    weapon_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Weapon, k)}

                    try:
                        item = Weapon(**weapon_fields_cleaned)
                        if weapon_abilities_to_link:
                            # Важно: используем .append() для каждого объекта, а не extend() с объектами из другой сессии
                            for ab in weapon_abilities_to_link:
                                item.granted_abilities.append(ab)
                        db.add(item)
                        logger.info(f"  Added Weapon: {name} with abilities: {[a.name for a in weapon_abilities_to_link]}")
                    except Exception as create_exc:
                        logger.error(f"  ERROR creating Weapon '{name}': {create_exc}", exc_info=True)
                        logger.error(f"    Data used: {weapon_fields_cleaned}")
                # else:
                    # logger.debug(f"  Skipped Weapon (exists): {name}")

        logger.info("Seeding Armor...")
        for data in armors_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(Item.id).filter(Item.name == name).first()
                if not exists:
                    item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                    armor_defaults = {"strength_requirement": 0, "stealth_disadvantage": False, "max_dex_bonus": None, "properties": None}
                    data_with_defaults = {**item_defaults, **armor_defaults, **data_copy}
                    armor_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Armor, k)}
                    try:
                        item = Armor(**armor_fields_cleaned)
                        db.add(item)
                        logger.info(f"  Added Armor: {name}")
                    except Exception as create_exc:
                         logger.error(f"  ERROR creating Armor '{name}': {create_exc}", exc_info=True)
                         logger.error(f"    Data used: {armor_fields_cleaned}")
                # else:
                    # logger.debug(f"  Skipped Armor (exists): {name}")

        logger.info("Seeding Shields...")
        for data in shields_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(Item.id).filter(Item.name == name).first()
                if not exists:
                    item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                    shield_defaults = {"strength_requirement": 0, "properties": None}
                    data_with_defaults = {**item_defaults, **shield_defaults, **data_copy}
                    shield_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Shield, k)}
                    try:
                        item = Shield(**shield_fields_cleaned)
                        db.add(item)
                        logger.info(f"  Added Shield: {name}")
                    except Exception as create_exc:
                         logger.error(f"  ERROR creating Shield '{name}': {create_exc}", exc_info=True)
                         logger.error(f"    Data used: {shield_fields_cleaned}")
                # else:
                    # logger.debug(f"  Skipped Shield (exists): {name}")

        logger.info("Seeding General Items...")
        for data in general_items_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(Item.id).filter(Item.name == name).first()
                if not exists:
                    item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                    general_defaults = {"uses": None, "effect": None, "effect_dice_formula": None}
                    data_with_defaults = {**item_defaults, **general_defaults, **data_copy}
                    general_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(GeneralItem, k)}
                    try:
                        item = GeneralItem(**general_fields_cleaned)
                        db.add(item)
                        logger.info(f"  Added General Item: {name}")
                    except Exception as create_exc:
                         logger.error(f"  ERROR creating General Item '{name}': {create_exc}", exc_info=True)
                         logger.error(f"    Data used: {general_fields_cleaned}")
                # else:
                    # logger.debug(f"  Skipped General Item (exists): {name}")

        logger.info("Seeding Ammo...")
        for data in ammo_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(Item.id).filter(Item.name == name).first()
                if not exists:
                    item_defaults = {"category": "Спец.", "rarity": "Необычная", "weight": 0}
                    ammo_defaults = {"effect": None}
                    data_with_defaults = {**item_defaults, **ammo_defaults, **data_copy}
                    ammo_fields_cleaned = {k: v for k, v in data_with_defaults.items() if hasattr(Ammo, k)}
                    try:
                        item = Ammo(**ammo_fields_cleaned)
                        db.add(item)
                        logger.info(f"  Added Ammo: {name}")
                    except Exception as create_exc:
                         logger.error(f"  ERROR creating Ammo '{name}': {create_exc}", exc_info=True)
                         logger.error(f"    Data used: {ammo_fields_cleaned}")
                # else:
                    # logger.debug(f"  Skipped Ammo (exists): {name}")

        # Финальный коммит для всех предметов
        db.commit()
        logger.info("Items committed.")

    except Exception as e:
        logger.error(f"An error occurred during database seeding: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()
        logger.info("Database session closed.")

if __name__ == "__main__":
    logger.info("Running database seeder...")
    # --- Создание таблиц ---
    try:
        logger.info("Creating database tables...")
        # Импортируем Base и engine внутри main guard для ясности
        from app.db.database import Base, engine
        # Импортируем все модели, чтобы Base.metadata знал о них
        # import app.models # Это должно загрузить все из app/models/__init__.py
        # Явный импорт всех моделей для надежности
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
        sys.exit(1) # Выходим, если таблицы не создались

    # Запускаем заполнение данными
    seed_data()
    logger.info("Seeding process finished.")