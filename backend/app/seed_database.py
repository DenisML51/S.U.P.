import sys
import os
import json
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, inspect as sqlainspect

# Добавляем путь к корневой папке бэкенда
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_root)

# --- ОБНОВЛЕННЫЕ ИМПОРТЫ ---
try:
    # Импортируем настройки БД из нового места
    from app.db.database import engine, Base, SessionLocal
    # Импортируем ВСЕ модели, чтобы Base.metadata знал о них при создании таблиц
    # Можно импортировать через app.models.__init__ или перечислить все явно
    from app.models import * # Простой способ импортировать всё из __init__.py
    # Или более явно (предпочтительнее, если нет конфликтов имен):
    # from app.models.user import User
    # from app.models.party import Party
    # from app.models.item import Item, Weapon, Armor, Shield, GeneralItem, Ammo
    # from app.models.ability import Ability
    # from app.models.status_effect import StatusEffect
    # from app.models.character import Character, CharacterInventoryItem
    print("Imports successful")
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Please ensure the script is run from the 'backend' directory or adjust sys.path.")
    sys.exit(1)
# --- КОНЕЦ ОБНОВЛЕННЫХ ИМПОРТОВ ---

print("Starting database seeding...")

# --- ДАННЫЕ ДЛЯ ЗАПОЛНЕНИЯ (Полностью из книги правил) ---

# --- Оружейные ---
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
    { "name": "Цепной Меч", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 6, "damage": "1к10", "damage_type": "Рубящий", "properties": "Двуручное ИЛИ Одноручное (с Силой 13+), Разрывное, Шумное", "is_two_handed": True }, # Defaulting to two-handed, property specifies condition
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
    { "name": "Огнемет", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 15, "damage": "2к6", "damage_type": "Огненный", "properties": "Боеприпасы (топливо), Двуручное, Взрыв (конус 5м)", "range_normal": 5, "range_max": 5, "reload_info": "5 исп./Действие", "is_two_handed": True }, # Range is effectively the cone
    { "name": "Граната (Осколочная)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "3к6", "damage_type": "Оскол.", "properties": "Взрыв (Радиус 5м), Одноразовая, Дистанция Броска (10/20)", "range_normal": 10, "range_max": 20, "is_two_handed": False },
    { "name": "Граната (Светошумовая)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "-", "damage_type": "Эффект", "properties": "Взрыв (Радиус 5м), Одноразовая, Дистанция Броска (10/20), Особое (Оглушение)", "range_normal": 10, "range_max": 20, "is_two_handed": False },
    { "name": "Плазменный пистолет", "item_type": "weapon", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 3, "damage": "2к6", "damage_type": "Энерг./Огонь", "properties": "Боеприпасы (заряд), Перегрев?", "range_normal": 20, "range_max": 60, "reload_info": "10 выстр./Действие", "is_two_handed": False }, # Added from original script example
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
    { "name": "Силовая Броня (прототип)", "item_type": "armor", "category": "Экзотика", "rarity": "Легендарная", "weight": 100, "armor_type": "Тяжёлая", "ac_bonus": 19, "max_dex_bonus": 0, "strength_requirement": 9, "stealth_disadvantage": True, "properties": "Треб. Владение, +2 Сила, Интегр. системы" }, # AC 19-20, used 19
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

# ОБЩИЕ ПРЕДМЕТЫ
general_items_data = [
    { "name": "Мультитул", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Набор отверток, ключей, пассатижей и т.д.", "effect": "Дает преимущество на проверки Техники для ремонта или простого взаимодействия с механизмами.", "uses": None },
    { "name": "Набор для взлома (Механический)", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 1, "description": "Отмычки, щупы, небольшой молоточек.", "effect": "Позволяет совершать проверки Ловкости (Взлом) для вскрытия механических замков. Без набора - помеха или невозможно.", "uses": None },
    { "name": "Набор для взлома (Электронный)", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 1, "description": "Интерфейсные кабели, скребки данных, дешифратор.", "effect": "Позволяет совершать проверки Техники для взлома электронных замков и систем. Без набора - помеха или невозможно.", "uses": None },
    { "name": "Лом", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 5, "description": "Тяжелый металлический рычаг.", "effect": "Используется как оружие (1к6 Дробящий) или инструмент. Дает преимущество на проверки Силы для взлома.", "uses": None }, # Also listed as weapon
    { "name": "Аптечка", "item_type": "general", "category": "Медицина", "rarity": "Обычная", "weight": 3, "description": "Содержит бинты, антисептики, базовые инструменты.", "effect": "Позволяет совершать проверки Медицины для стабилизации (Первая Помощь) или лечения ран (восстанавливает 1к8 + Медицина ПЗ, требует Действия).", "uses": 3 },
    { "name": "Медпак", "item_type": "general", "category": "Медицина", "rarity": "Обычная", "weight": 3, "description": "Более крупная аптечка.", "effect": "Позволяет совершать проверки Медицины для стабилизации (Первая Помощь) или лечения ран (восстанавливает 1к8 + Медицина ПЗ, требует Действия).", "uses": 5 },
    { "name": "Стимулятор (Стим)", "item_type": "general", "category": "Медицина", "rarity": "Необычная", "weight": 0.1, "description": "Инъектор с бодрящим веществом.", "effect": "Использование (Бонусное Действие) дает 2к4 временных ПЗ на 1 минуту или снимает 1 уровень Истощения. Возможны побочные эффекты (проверка Выносливости).", "uses": 1 },
    { "name": "Антидот", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 0.1, "description": "Инъектор с универсальным противоядием.", "effect": "Снимает эффект Отравления (Действие).", "uses": 1 },
    { "name": "Противоядие", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 0.1, "description": "Инъектор с универсальным противоядием.", "effect": "Снимает эффект Отравления (Действие).", "uses": 1 },
    { "name": "Фонарик", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Источник направленного света.", "effect": "Освещает конус перед собой.", "uses": None }, # Assuming battery lasts
    { "name": "Химсвет", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 0.2, "description": "Одноразовый химический источник света.", "effect": "Освещает область в радиусе 5-10м в течение 1 часа после активации (сломать).", "uses": 1 },
    { "name": "Сканер", "item_type": "general", "category": "Воинское", "rarity": "Необычная", "weight": 2, "description": "Ручное устройство для анализа окружения.", "effect": "Действие: обнаруживает источники энергии, движения, живых существ или материалы в радиусе 10-15м (Проверка Техники/Внимательности для интерпретации).", "uses": None },
    { "name": "Ауспик", "item_type": "general", "category": "Воинское", "rarity": "Редкая", "weight": 2, "description": "Продвинутый сканер.", "effect": "Действие: обнаруживает источники энергии, движения, живых существ или материалы в радиусе 15-20м (Проверка Техники/Внимательности для интерпретации).", "uses": None },
    { "name": "Датапад", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Портативный компьютер.", "effect": "Хранение информации, интерфейс для взаимодействия с сетями (требует Техники для взлома).", "uses": None },
    { "name": "Планшет", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Портативный компьютер.", "effect": "Хранение информации, интерфейс для взаимодействия с сетями (требует Техники для взлома).", "uses": None },
    { "name": "Комм-линк", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 0.5, "description": "Устройство связи.", "effect": "Обеспечивает радиосвязь на коротких дистанциях.", "uses": None },
    { "name": "Вокс-кастер", "item_type": "general", "category": "Воинское", "rarity": "Необычная", "weight": 3, "description": "Мощное устройство связи.", "effect": "Обеспечивает радиосвязь на больших дистанциях, возможно шифрование.", "uses": None },
    { "name": "Респиратор", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Защита органов дыхания.", "effect": "Дает преимущество на спасброски против газов/ядов в воздухе.", "uses": None }, # Filter might need replacing
    { "name": "Противогаз", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 2, "description": "Полная защита органов дыхания и лица.", "effect": "Дает иммунитет к газовым атакам, обеспечивает дыхание в разреженной атмосфере на ограниченное время (запас воздуха).", "uses": None }, # Limited air supply
    { "name": "ЭDM-граната", "item_type": "general", "category": "Воинское", "rarity": "Редкая", "weight": 1, "description": "Электромагнитная граната.", "effect": "Действие: импульс в радиусе 5-10м. Техника/роботы спасбросок Техники/Выносливости или Отключение на 1к4 раунда. Деактивирует энергощиты.", "uses": 1 },
    { "name": "Веревка (15м)", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 3, "description": "Прочная синтетическая веревка.", "effect": "Используется для лазания, связывания и т.д.", "uses": None },
    { "name": "Набор для выживания", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 5, "description": "Труд, огниво, фильтр для воды, базовые инструменты.", "effect": "Дает преимущество на проверки Адаптации для выживания в дикой местности.", "uses": None },
    { "name": "Бинокль", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Оптический прибор для наблюдения.", "effect": "Позволяет детально рассматривать удаленные объекты.", "uses": None },
    { "name": "Наручники", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Металлические или пластиковые оковы.", "effect": "Используются для сковывания противников (требует успешной проверки Ловкости/Силы в ближнем бою).", "uses": None },
    { "name": "Святая вода (Ампула)", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 0.2, "description": "Освященная жидкость.", "effect": "Метательное. Наносит 2к6 урона Светом при попадании (атака касанием вблизи или бросок).", "uses": 1 },
    { "name": "Кислота (Ампула)", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 0.2, "description": "Едкая жидкость.", "effect": "Метательное. Наносит 2к6 урона Кислотой при попадании (атака касанием вблизи или бросок).", "uses": 1 },
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

# СПОСОБНОСТИ
abilities_data = [
    # Оружейные (Базовые)
    { "name": "Одиночный выстрел", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Стандартный выстрел из оружия согласно его характеристикам урона и дальности.", "cooldown": None, "range": "См. оружие", "target": "Одна цель", "skill_requirements": None, "concentration": False },
    { "name": "Очередь", "branch": "weapon", "level_required": 0, "action_type": "Атака (Действие)", "description": "Трата 3-5 патронов. Атака с помехой, +1 кубик урона при попадании. Альтернативно: атака до 3 целей в 3м друг от друга с помехой по каждой.", "cooldown": None, "range": "См. оружие", "target": "Одна цель / До 3 целей", "skill_requirements": None, "concentration": False }, # Combined rulebook descriptions

    # Медик
    { "name": "Первая Помощь", "branch": "medic", "level_required": 1, "action_type": "Действие", "range": "5 метров", "target": "Один союзник с 0 ПЗ или любой союзник", "cooldown": "Нет", "description": "Стабилизация союзника с 0 ПЗ или восстановление 1к4 + Медицина ПЗ.", "skill_requirements": None, "concentration": False },
    { "name": "Лечение Союзника", "branch": "medic", "level_required": 2, "skill_requirements": '{"skill_medicine": 3}', "action_type": "Действие", "range": "Касание", "target": "Одно существо", "cooldown": "1 ход", "description": "Восстанавливает цели 2к8 + Медицина ПЗ. Усиление: Мед 5+ -> 3к8+Мед; Мед 7+ -> 4к8+Мед.", "concentration": False },
    { "name": "Изготовить Зелье Лечения", "branch": "medic", "level_required": 3, "skill_requirements": '{"skill_medicine": 3, "skill_logic": 3, "skill_adaptation": 3}', "action_type": "Вне боя (Время)", "range": None, "target": None, "cooldown": None, "description": "Используя компоненты и проверку Медицины (СЛ зависит от рецепта), вы можете создать лечебные препараты.", "concentration": False },
    { "name": "Тактическое Отступление", "branch": "medic", "level_required": 4, "skill_requirements": '{"skill_medicine": 4}', "action_type": "Реакция", "range": "10 метров", "target": "Союзник, получивший урон", "cooldown": "2 хода", "description": "Триггер: Союзник в 10м получает урон от видимого врага. Эффект: Союзник может немедленно переместиться на полскорости, не провоцируя атак от атаковавшего.", "concentration": False },
    { "name": "Спринт к Союзнику", "branch": "medic", "level_required": 5, "skill_requirements": '{"skill_medicine": 5}', "action_type": "Бонусное Действие", "range": "20 метров", "target": "Раненый союзник (<50% ПЗ)", "cooldown": "1 ход", "description": "Переместиться на свою скорость к раненому союзнику в 20м.", "concentration": False },
    { "name": "Реанимация", "branch": "medic", "level_required": 6, "skill_requirements": '{"skill_medicine": 6}', "action_type": "Действие", "range": "Касание", "target": "Умерший союзник (<1 мин)", "cooldown": "1/день", "description": "Возвращает союзника к жизни с 20% макс. ПЗ и 1 ур. Истощения. Требует реанимационного комплекта.", "concentration": False },
    { "name": "Защита от Смерти", "branch": "medic", "level_required": 7, "skill_requirements": '{"skill_medicine": 7}', "action_type": "Действие", "range": "Касание", "target": "Одно существо", "cooldown": "3 хода", "description": "Цель получает 1к10 + Медицина временных ПЗ. Пока есть врем. ПЗ, ее ПЗ не могут опуститься ниже 1. Длительность 1 мин.", "concentration": False },
    { "name": "Очищение", "branch": "medic", "level_required": 8, "skill_requirements": '{"skill_medicine": 8, "skill_science": 4}', "action_type": "Действие", "range": "Касание", "target": "Одно существо", "cooldown": "2 хода", "description": "Снимает один эффект: Отравление, Болезнь, Оглушение, Паралич, Слепота, Глухота, Страх. Цель получает преим. на след. спасбросок против этого эффекта (1 мин).", "concentration": False },
    { "name": "Массовое Лечение", "branch": "medic", "level_required": 9, "skill_requirements": '{"skill_medicine": 9}', "action_type": "Действие", "range": "15 метров", "target": "До 6 существ в сфере 10м", "cooldown": "5 ходов", "description": "Каждая цель восстанавливает 3к8 + Медицина ПЗ.", "concentration": False },
    { "name": "Полевой Госпиталь", "branch": "medic", "level_required": 10, "skill_requirements": '{"skill_medicine": 10}', "action_type": "Действие", "range": "Себя (радиус 10м)", "target": "Союзники в зоне", "cooldown": "1/день", "description": "Создает зону на 1 мин (концентрация). В начале вашего хода союзники в зоне лечат 1к6 ПЗ и получают преим. на спасбросок против 1 негативного эффекта (из списка Очищения).", "concentration": True },

    # Мутант
    { "name": "Психический Толчок", "branch": "mutant", "level_required": 1, "action_type": "Действие", "range": "10 метров", "target": "Одно существо", "cooldown": "Нет", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Цель - спасбросок Силы. Провал: отталкивание на 3м, 1к6 дробящего урона. Провал на 5+: также Ошеломление до конца ее след. хода.", "skill_requirements": None, "concentration": False },
    { "name": "Предчувствие Опасности", "branch": "mutant", "level_required": 2, "skill_requirements": '{"skill_flow": 3}', "action_type": "Пассивно/Реакция", "range": None, "target": "Себя", "cooldown": "1 ход (Реакция)", "description": "Пассивно: +2 к СЛ Защиты против атак, о которых не подозревали. Реакция: Когда по вам совершается атака, можно наложить помеху на этот бросок атаки.", "concentration": False },
    { "name": "Выбить Оружие", "branch": "mutant", "level_required": 3, "skill_requirements": '{"skill_strength": 4, "skill_flow": 4}', "action_type": "Действие", "range": "5 метров", "target": "Одно существо с предметом", "cooldown": "2 хода", "saving_throw_attribute": "Сила/Ловкость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Цель - спасбросок Силы/Ловкости. Провал: роняет 1 предмет (Обезоружен).", "concentration": False },
    { "name": "Аура Исцеления", "branch": "mutant", "level_required": 4, "skill_requirements": '{"skill_medicine": 5, "skill_flow": 5}', "action_type": "Действие", "range": "Себя (радиус 5м)", "target": "Себя и союзники в зоне", "cooldown": "3 хода", "description": "Вы и союзники в 5м лечите 1к6 + Поток ПЗ. Концентрация (1 мин): вы и союзники +1 к спасброскам от Страха/Отравления в зоне.", "concentration": True },
    { "name": "Воодушевление", "branch": "mutant", "level_required": 5, "skill_requirements": '{"skill_authority": 5}', "action_type": "Действие", "range": "15 метров", "target": "До 3 союзников", "cooldown": "3 хода", "description": "Цели получают +1к4 к атакам и спасброскам на 1 мин.", "concentration": False }, # Concentration not mentioned, assuming no
    { "name": "Приказ: Подчинись!", "branch": "mutant", "level_required": 6, "skill_requirements": '{"skill_suggestion": 7}', "action_type": "Действие", "range": "10 метров", "target": "Один гуманоид", "cooldown": "4 хода", "saving_throw_attribute": "Самообладание", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Цель - спасбросок Самообладания. Провал: подчиняется простому не-самоубийственному приказу в след. ход. Повторный спасбросок в конце хода цели.", "concentration": False },
    { "name": "Завербовать Противника", "branch": "mutant", "level_required": 7, "skill_requirements": '{"skill_suggestion": 8, "skill_authority": 6}', "action_type": "Действие", "range": "10 метров", "target": "Один гуманоид (<50% ПЗ)", "cooldown": "1/день", "saving_throw_attribute": "Самообладание", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Цель - спасбросок Самообладания. Провал: становится Дружественной на 1 час. Сражается за вас, избегая суицидальных действий. Эффект прерывается при уроне от вас/союзников.", "concentration": False },
    { "name": "Конвертация Жизни в Действие", "branch": "mutant", "level_required": 8, "skill_requirements": '{"skill_stamina": 6}', "action_type": "Бонусное Действие", "range": None, "target": "Себя", "cooldown": "3 хода", "description": "Получить доп. Основное Действие, получив урон = 30% текущих ПЗ (мин 5, нельзя уменьшить).", "concentration": False },
    { "name": "Ментальный Щит", "branch": "mutant", "level_required": 9, "skill_requirements": '{"skill_flow": 8}', "action_type": "Реакция", "range": "10 метров", "target": "Себя или союзник", "cooldown": "2 хода", "description": "Триггер: цель атаки или вредоносной способности (спасбр. Инт/Сам/Пот). Эффект: помеха на атаку ИЛИ преим. на спасбросок цели.", "concentration": False },
    { "name": "Спрятать в Потоке", "branch": "mutant", "level_required": 10, "skill_requirements": '{"skill_flow": 9}', "action_type": "Действие", "range": "Касание", "target": "Себя или 1 согласное существо", "cooldown": "4 хода", "description": "Цель становится Невидимой на 1 мин (концентрация?). Эффект прерывается при атаке/способности по врагу.", "concentration": True }, # Assuming concentration based on duration

    # Стрелок
    { "name": "Точный Выстрел", "branch": "sharpshooter", "level_required": 1, "action_type": "Бонусное Действие", "range": None, "target": "Себя", "cooldown": "1 ход", "description": "Ваш следующий бросок атаки дальнобойным оружием в этот ход совершается с преимуществом.", "skill_requirements": None, "concentration": False },
    { "name": "Подавляющий Огонь", "branch": "sharpshooter", "level_required": 2, "skill_requirements": '{"skill_attention": 3}', "action_type": "Действие", "range": "Дистанция оружия", "target": "Зона (3х3м квадрат / 5м конус)", "cooldown": "1 ход", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "8 + мод. Ловкости", "description": "Существа в зоне - спасбросок Ловкости. Провал: скорость/2 и Подавлен до конца их след. хода.", "concentration": False },
    { "name": "Авто-Прицеливание", "branch": "sharpshooter", "level_required": 3, "skill_requirements": '{"skill_technique": 4}', "action_type": "Действие", "range": "Дистанция оружия", "target": "1-2 противника в 5м друг от друга", "cooldown": "2 хода", "description": "Атака дальнобойным оружием по каждой цели. Урон половинится.", "concentration": False },
    { "name": "Снайперский Выстрел в Глаз", "branch": "sharpshooter", "level_required": 4, "skill_requirements": '{"skill_attention": 6}', "action_type": "Действие", "range": "Дистанция оружия", "target": "Одна цель", "cooldown": "3 хода", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Атака дальнобойным оружием с помехой. Попадание = крит. Если крит, цель - спасбросок Выносливости или Ослепление на 1 раунд.", "concentration": False },
    { "name": "Отталкивающий Выстрел", "branch": "sharpshooter", "level_required": 5, "skill_requirements": '{"skill_strength": 3}', "action_type": "Действие", "range": "Дистанция оружия", "target": "Одно существо", "cooldown": "1 ход", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Атака дальнобойным оружием. Попадание: цель - спасбросок Силы. Провал: отталкивание на 3м.", "concentration": False },
    { "name": "Плечевая Турель", "branch": "sharpshooter", "level_required": 6, "skill_requirements": '{"skill_technique": 5}', "action_type": "Бонусное (активация/атака)", "range": "20 метров (турель)", "target": "Одна цель (атака турели)", "cooldown": "4 хода", "description": "Активация турели (1 мин). Бонусным действием турель атакует: 3к6 + (УрСтр/2 + Лов) vs СЛ Защ, урон 1к6+Лов.", "concentration": False },
    { "name": "Ассистирование", "branch": "sharpshooter", "level_required": 7, "skill_requirements": '{"skill_attention": 5}', "action_type": "Реакция", "range": "15 метров", "target": "Союзник", "cooldown": "2 хода", "description": "Триггер: Союзник в 15м промахивается атакой по видимому врагу. Эффект: +2 к броску атаки союзника.", "concentration": False },
    { "name": "Разрывная Ракета", "branch": "sharpshooter", "level_required": 8, "skill_requirements": '{"skill_science": 5}', "action_type": "Действие", "range": "30 метров", "target": "Точка (радиус 5м)", "cooldown": "5 ходов / Боезапас", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Взрыв в точке. Существа в 5м - спасбросок Ловкости. Провал: 6к6 огн./оскол. урона + Горение (1к4). Успех: половина урона, без горения.", "concentration": False },
    { "name": "Скан на Уязвимости", "branch": "sharpshooter", "level_required": 9, "skill_requirements": '{"skill_attention": 8, "skill_technique": 4}', "action_type": "Бонусное Действие", "range": "20 метров", "target": "Одно существо", "cooldown": "3 хода", "description": "Сканирование цели. След. атака по ней в течение 1 мин наносит +2к6 урона и имеет улучшенный шанс крита.", "concentration": False },
    { "name": "Шквал Огня", "branch": "sharpshooter", "level_required": 10, "skill_requirements": '{"skill_reaction": 7}', "action_type": "Действие", "range": "10 метров (от основной цели)", "target": "До 4 противников", "cooldown": "5 ходов", "description": "Атака дальнобойным оружием по каждому выбранному противнику в 10м от основной цели (макс 4). Каждая атака с помехой.", "concentration": False },

    # Разведчик
    { "name": "Скрытность", "branch": "scout", "level_required": 1, "action_type": "Бонусное Действие", "range": None, "target": "Себя", "cooldown": "Нет", "description": "Попытка спрятаться вне прямой видимости или в затенении. Проверка Ловкости (Скрытность) vs пассивной Внимательности врагов.", "skill_requirements": None, "concentration": False }, # Based on core rules, implies skill check
    { "name": "Трекинг Цели", "branch": "scout", "level_required": 2, "skill_requirements": '{"skill_attention": 4, "skill_adaptation": 3}', "action_type": "Действие", "range": "Видимость", "target": "Одна цель / Следы", "cooldown": "2 хода (боевой эффект)", "description": "Вне боя: Проверка Внимательности для отслеживания. В бою: Выбрать цель. До конца след. хода знаете ее местоположение (игнор невидимость/укрытие), первая атака по ней с преимуществом.", "concentration": False },
    { "name": "Удар в Спину / Скрытая Атака", "branch": "scout", "level_required": 3, "action_type": "Пассивно (1/ход)", "range": None, "target": "Цель атаки", "cooldown": "Нет", "description": "1/ход, +2к6 урона к атаке дальнобойным или легким/фехтовальным оружием, если было преимущество на атаку ИЛИ союзник в 1.5м от цели. Урон растет: 3к6 (ур. 6), 4к6 (ур. 9). Крит -> Кровотечение (1к4).", "skill_requirements": None, "concentration": False },
    { "name": "Голограмма-Приманка", "branch": "scout", "level_required": 4, "skill_requirements": '{"skill_technique": 3}', "action_type": "Действие", "range": "15 метров", "target": "Точка", "cooldown": "3 хода", "saving_throw_attribute": "Выносливость (при уничт.)", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Создает иллюзорную копию (СЛ Защ 10, 1 ПЗ) на 1 мин. Можно распознать проверкой Логики (СЛ вашей Способности). При уничтожении вспышка: уничт. - спасбр. Вын или Ослепление на 1 раунд.", "concentration": False },
    { "name": "Оружейный Гоп-Стоп / Обезоруживание", "branch": "scout", "level_required": 5, "skill_requirements": '{"skill_dexterity": 6}', "action_type": "Действие", "range": "1.5 метра", "target": "Одно существо", "cooldown": "2 хода", "saving_throw_attribute": "Сила/Ловкость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Атака оружием/рукой vs цели. Попадание: без урона, цель - спасбросок Силы/Ловкости. Провал: вырвать 1 предмет (Обезоружен).", "concentration": False },
    { "name": "Добивающий Удар", "branch": "scout", "level_required": 6, "action_type": "Бонусное Действие", "range": "Досягаемость/Дистанция", "target": "Другая цель", "cooldown": "Нет", "description": "Условие: нанес крит ИЛИ убил врага атакой. Эффект: немедленно доп. атака Бонусным Действием по другой цели.", "skill_requirements": None, "concentration": False },
    { "name": "Удар с Вертушки / Вихрь Клинков", "branch": "scout", "level_required": 7, "skill_requirements": '{"skill_dexterity": 7}', "action_type": "Действие", "range": "1.5 метра", "target": "Все существа в досягаемости", "cooldown": "3 хода", "description": "Атака ближнего боя по всем выбранным целям в 1.5м. Один бросок атаки против СЛ Защиты каждой цели.", "concentration": False },
    { "name": "Неуловимость", "branch": "scout", "level_required": 8, "skill_requirements": '{"skill_dexterity": 8}', "action_type": "Пассивно/Реакция", "range": None, "target": "Себя", "cooldown": "1 ход (Реакция)", "description": "Атаки по возможности по вам с помехой. Реакция: Когда по вам попадает атака, уменьшить урон вдвое.", "concentration": False },
    { "name": "Мастер Тени", "branch": "scout", "level_required": 9, "skill_requirements": '{"skill_dexterity": 9}', "action_type": "Бонусное Действие", "range": None, "target": "Себя", "cooldown": "2 хода", "description": "Если в тусклом свете/темноте, Бонусным Действием стать Невидимым. Эффект до атаки/способности/яркого света/потери концентрации.", "concentration": True }, # Added concentration
    { "name": "Удар Смерти", "branch": "scout", "level_required": 10, "action_type": "Действие", "range": "Дистанция оружия", "target": "Застигнутая врасплох / Не видящая вас цель", "cooldown": "5 ходов", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Атака оружием. Попадание: цель - спасбросок Выносливости. Провал: урон удваивается. Успех: обычный урон (+ Скрытая Атака).", "concentration": False },

    # Техник
    { "name": "Анализ Механизма", "branch": "technician", "level_required": 1, "skill_requirements": '{"skill_logic": 3}', "action_type": "Бонусное Действие", "range": "10 метров", "target": "Механизм/робот/киборг/тех. объект", "cooldown": "Нет", "description": "Узнать ПЗ, уязвимости, сопротивления/иммунитеты цели.", "concentration": False },
    { "name": "Ремонт Механизма", "branch": "technician", "level_required": 1, "action_type": "Действие", "range":"Касание", "target":"Механизм/Дроид", "description": "Вы восстанавливаете механизму 1к8 + Техника ПЗ или снимаете один негативный эффект (Отключен).", "skill_requirements": None, "concentration": False }, # Added from original script example
    { "name": "Электронный Замок / Взлом", "branch": "technician", "level_required": 2, "skill_requirements": '{"skill_technique": 3}', "action_type": "Действие", "range": "5 метров (в бою)", "target": "Замок/Система/Аугментация", "cooldown": "3 хода (боевой эффект)", "saving_throw_attribute": "Техника/Выносливость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Вне боя: Проверка Техники для взлома. В бою: Цель (в 5м) - спасбросок Тех/Вын. Провал: аугментация/оружие отключается на 1 раунд (Отключение).", "concentration": False },
    { "name": "Блокировка Систем", "branch": "technician", "level_required": 3, "action_type": "Действие", "range": "15 метров", "target": "Механизм/робот/киборг", "cooldown": "3 хода", "saving_throw_attribute": "Техника/Интеллект (ИИ)", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Цель - спасбросок Тех/Инт. Провал: не может использовать особые способности/действия (кроме атаки/перемещения) в след. ход (Немота технологическая).", "concentration": False },
    { "name": "Улучшение Брони", "branch": "technician", "level_required": 4, "skill_requirements": '{"skill_technique": 4, "skill_science": 3}', "action_type": "Действие", "range": "Касание", "target": "1 согласное существо", "cooldown": "Нет (расходники?)", "description": "Цель получает +1 СЛ Защиты и сопротивление 1 типу урона (на выбор) на 10 мин.", "concentration": False },
    { "name": "Установка Мины", "branch": "technician", "level_required": 5, "action_type": "Действие", "range": "1.5 метра", "target": "Точка", "cooldown": "1 ход (установка) / Боезапас", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Установить скрытую мину. Взрыв при контакте/дистанционно (Бонусн. д.). Существа в 2м - спасбр. Ловк. Провал: 3к6 урон. Успех: половина.", "concentration": False },
    { "name": "Электромагнитный Разряд", "branch": "technician", "level_required": 6, "skill_requirements": '{"skill_technique": 6, "skill_science": 5}', "action_type": "Действие", "range": "Линия 10м / Конус 5м", "target": "Зона", "cooldown": "4 хода", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Существа в зоне - спасбр. Ловк. Провал: 4к8 электр. урона + Шок до конца их след. хода. Механизмы/роботы: спасбр. с помехой, при провале + Отключение на 1 раунд.", "concentration": False },
    { "name": "Гравитационная Ловушка / Стяжка", "branch": "technician", "level_required": 7, "skill_requirements": '{"skill_technique": 7, "skill_science": 6}', "action_type": "Действие", "range": "20 метров", "target": "Точка (радиус 5м)", "cooldown": "4 хода", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Зона стягивания на 1 раунд. Существа, начинающие/входящие в зону - спасбр. Силы. Провал: скорость = 0 до нач. их след. хода, притяжение на 3м к центру.", "concentration": False },
    { "name": "Стан-Граната / Импульс", "branch": "technician", "level_required": 8, "action_type": "Действие", "range": "15 метров (бросок)", "target": "Точка (радиус 5м)", "cooldown": "4 хода / Боезапас", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Существа в 5м - спасбр. Вын. Провал: Оглушены до конца вашего след. хода. Механизмы: вместо оглушения - Отключение (1 раунд) + 2к6 урона.", "concentration": False },
    { "name": "Завербовать Механизм", "branch": "technician", "level_required": 9, "skill_requirements": '{"skill_technique": 9}', "action_type": "Действие", "range": "10 метров", "target": "1 механизм/робот (Инт <= 4)", "cooldown": "1/день", "saving_throw_attribute": "Техника", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Цель - спасбр. Техники. Провал: становится Дружественной на 1 час, подчиняется командам. Макс 1 одновременно.", "concentration": False },
    { "name": "Перегрузка Реактора / Самоуничтожение", "branch": "technician", "level_required": 10, "skill_requirements": '{"skill_technique": 10, "skill_science": 8}', "action_type": "Действие", "range": "10 метров", "target": "Механизм/робот/турель/объект с источником энергии", "cooldown": "1/день", "saving_throw_attribute": "Техника/Выносливость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Цель - спасбр. Тех/Вын. Провал: взрывается в конце ее след. хода (10к6 урона в 5м). Успех: 5к6 урона немедленно.", "concentration": False },

    # Боец
    { "name": "Мощный Удар", "branch": "fighter", "level_required": 1, "action_type": "Бонусное Действие", "range": None, "target": "Атака ближнего боя", "cooldown": "Нет", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "8 + мод. Силы", "description": "Перед атакой бл. боя: -2 к атаке, +4 к урону. Попадание: цель - спасбр. Вын или скорость -3м до конца ее след. хода.", "skill_requirements": None, "concentration": False },
    { "name": "Второе Дыхание", "branch": "fighter", "level_required": 2, "skill_requirements": '{"skill_stamina": 4}', "action_type": "Бонусное Действие", "range": None, "target": "Себя", "cooldown": "3 хода", "description": "Восстановить 1к10 + Выносливость ПЗ.", "concentration": False }, # Cooldown updated per rulebook
    { "name": "Атака по Области / Рассекающий Удар", "branch": "fighter", "level_required": 3, "skill_requirements": '{"skill_strength": 5}', "action_type": "Действие", "range": "Досягаемость", "target": "Все существа в досягаемости", "cooldown": "2 хода", "description": "Атака ближнего боя по всем выбранным целям в досягаемости. Один бросок атаки.", "concentration": False },
    { "name": "Захват", "branch": "fighter", "level_required": 4, "skill_requirements": '{"skill_strength": 4}', "action_type": "Действие/Замена Атаки", "range": "Досягаемость", "target": "Существо (размер <= ваш)", "cooldown": "Нет", "description": "Проверка Силы (Атлетика) против Силы (Атлетика) или Ловкости (Акробатика) цели. Успех: цель Схвачена.", "concentration": False },
    { "name": "Жестокая Расправа", "branch": "fighter", "level_required": 4, "action_type": "Часть Захвата/Реакция", "range": "Схваченная цель", "target": "Схваченная цель (<20% ПЗ)", "cooldown": "Нет (связано с Резней)", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Условие: Схваченная цель <20% ПЗ. Эффект: Цель - спасбр. Вын. Провал: смерть. Успех -> Резня.", "concentration": False },
    { "name": "Резня", "branch": "fighter", "level_required": 4, "action_type": "Пассивно (эффект)", "range": None, "target": "Себя", "cooldown": "3 хода (эффект Резни)", "description": "Условие: Убил цель Жестокой Расправой. Эффект: на 1 мин (или до урона) 1/ход можно Бонусным действием пытаться захватить цель <20% ПЗ для Жестокой Расправы.", "concentration": False },
    { "name": "Афтершок / Землетрясение", "branch": "fighter", "level_required": 5, "skill_requirements": '{"skill_strength": 6}', "action_type": "Действие", "range": "Себя (радиус 3м)", "target": "Существа на земле в зоне", "cooldown": "3 хода", "saving_throw_attribute": "Ловкость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Удар по земле. Существа в 3м - спасбр. Ловк. Провал: 2к6 дроб. урона + Лежа. Зона - трудн. местность до нач. вашего след. хода.", "concentration": False },
    { "name": "Сближение с Ударом / Рывок Берсерка", "branch": "fighter", "level_required": 6, "action_type": "Действие", "range": "10 метров (перемещение)", "target": "Противник в конце", "cooldown": "3 хода", "description": "Перемещение по прямой до 10м к врагу, атака бл. боя в конце. Попадание: +1к6 урона за каждые 3м бега (макс +3к6). Провоцирует атаки.", "concentration": False },
    { "name": "Оглушающий Удар", "branch": "fighter", "level_required": 7, "skill_requirements": '{"skill_strength": 7}', "action_type": "Действие", "range": "Ближний бой", "target": "Одна цель", "cooldown": "4 хода", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Атака бл. боя. Попадание: цель - спасбр. Вын. Провал: Оглушена до конца вашего след. хода.", "concentration": False },
    { "name": "Перегрев Оружия / Раскаленный Клинок", "branch": "fighter", "level_required": 8, "skill_requirements": '{"skill_technique": 3, "skill_science": 3}', "action_type": "Бонусное Действие", "range": None, "target": "Оружие ближнего боя", "cooldown": "4 хода", "saving_throw_attribute": "Ловкость (от горения)", "saving_throw_dc_formula": "10", "description": "На 1 мин атаки выбранным оружием бл. боя наносят +1к6 урона огнем. Попадание: цель - спасбр. Ловк (СЛ 10) или Горение (1к4).", "concentration": False },
    { "name": "Дополнительная Атака", "branch": "fighter", "level_required": 9, "skill_requirements": '{"skill_reaction": 6}', "action_type": "Пассивно/Бонусное Действие", "range": None, "target": None, "cooldown": "Нет", "description": "Когда используете Действие Атака (бл. бой), можно совершить 1 доп. атаку этим же оружием Бонусным Действием.", "concentration": False },
    { "name": "Несокрушимость", "branch": "fighter", "level_required": 10, "skill_requirements": '{"skill_stamina": 8}', "action_type": "Реакция", "range": None, "target": "Себя", "cooldown": "1/день", "description": "Триггер: Получение урона, опускающего ПЗ до 0 (но не убивающего). Эффект: ПЗ опускаются только до 1.", "concentration": False },

    # Джаггернаут
    { "name": "Провокация / Вызов", "branch": "juggernaut", "level_required": 1, "skill_requirements": '{"skill_authority": 3}', "action_type": "Бонусное Действие", "range": "10 метров", "target": "1 существо (видит/слышит)", "cooldown": "Нет", "saving_throw_attribute": "Самообладание", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Цель - спасбр. Самообл. Провал: помеха на атаки по всем, кроме вас, до конца вашего след. хода.", "concentration": False },
    { "name": "Несгибаемость", "branch": "juggernaut", "level_required": 2, "skill_requirements": '{"skill_stamina": 5}', "action_type": "Пассивно", "range": None, "target": "Себя", "cooldown": "Нет", "description": "Преимущество на спасброски Силы/Ловкости против эффектов сбивания с ног или насильного перемещения.", "concentration": False }, # Level assumption based on order
    { "name": "Оглушающий Удар Щитом", "branch": "juggernaut", "level_required": 3, "skill_requirements": '{"skill_strength": 4}', "action_type": "Бонусное Действие", "range": "1.5 метра", "target": "1 существо", "cooldown": "1 ход", "saving_throw_attribute": "Выносливость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Условие: Атаковал Действием, использует щит. Эффект: удар щитом. Цель - спасбр. Вын. Провал: 1к4 дроб. урона + Шок до нач. ее след. хода.", "concentration": False },
    { "name": "Рывок и Сбивание", "branch": "juggernaut", "level_required": 4, "skill_requirements": '{"skill_strength": 6}', "action_type": "Действие", "range": "10 метров (перемещение)", "target": "Существо на пути", "cooldown": "3 хода", "saving_throw_attribute": "Сила/Ловкость", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Перемещение по прямой до 10м. Существо на пути - спасбр. Сил/Лов. Провал: 2к8 дроб. урона + Лежа + Ошеломлен до конца его след. хода. Остановка за целью.", "concentration": False },
    { "name": "Таунт / Массовый Вызов", "branch": "juggernaut", "level_required": 5, "skill_requirements": '{"skill_authority": 6}', "action_type": "Действие", "range": "Себя (радиус 10м)", "target": "Все враги в зоне (видят/слышат)", "cooldown": "4 хода", "saving_throw_attribute": "Самообладание", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Цели - спасбр. Самообл. Провал: помеха на атаки по всем, кроме вас (1 мин). Повторный спасбросок в конце хода цели.", "concentration": False }, # Concentration not mentioned
    { "name": "Отталкивающий Удар / Волна Силы", "branch": "juggernaut", "level_required": 6, "skill_requirements": '{"skill_strength": 7}', "action_type": "Действие", "range": "Себя (радиус 3м)", "target": "Все существа в зоне", "cooldown": "3 хода", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Существа в 3м - спасбр. Силы. Провал: отталкивание на 3м + 2к6 силов./дроб. урона.", "concentration": False },
    { "name": "Хук / Притягивание", "branch": "juggernaut", "level_required": 7, "skill_requirements": '{"skill_dexterity": 4, "skill_technique": 4}', "action_type": "Действие", "range": "10 метров", "target": "1 существо (размер <= ваш)", "cooldown": "4 хода", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Дальнобойная атака (цепь/крюк/гарпун, Сил/Лов). Попадание: 1к8 урон + цель спасбр. Силы. Провал: притягивание вплотную.", "concentration": False },
    { "name": "Непробиваемый Щит", "branch": "juggernaut", "level_required": 8, "skill_requirements": '{"skill_stamina": 7}', "action_type": "Реакция", "range": "1.5 метра", "target": "Себя или союзник", "cooldown": "2 хода", "description": "Условие: Использует щит. Триггер: цель (вы или союзник в 1.5м) дальнобойной атаки. Эффект: помеха на атаку. Если попали в союзника, можно принять половину урона. Если в вас - +5 СЛ Защиты против этой атаки.", "concentration": False },
    { "name": "Стойкость Титана", "branch": "juggernaut", "level_required": 9, "skill_requirements": '{"skill_stamina": 9}', "action_type": "Пассивно", "range": None, "target": "Себя", "cooldown": "Нет", "description": "В начале вашего хода в бою лечите ПЗ = мод. Выносливости (мин 1), если ПЗ > 0 и не Без сознания.", "concentration": False },
    { "name": "Арена / Дуэльная Зона", "branch": "juggernaut", "level_required": 10, "skill_requirements": '{"skill_authority": 8}', "action_type": "Действие", "range": "10 метров", "target": "1 существо", "cooldown": "1/день", "saving_throw_attribute": "Сила (для выхода)", "saving_throw_dc_formula": "См. СЛ Способности", "description": "Создать барьер (цилиндр 5м рад, 10м выс) между вами и целью на 1 мин (концентрация). Нельзя добровольно покинуть (спасбр. Силы). Внутри: преим. на атаки друг по другу. Атаки снаружи/внутрь с помехой.", "concentration": True },
]

# СОСТОЯНИЯ
status_effects_data = [
    { "name": "При смерти (Unconscious)", "description": "Существо недееспособно (лежит), не может двигаться/говорить, роняет предметы. Атаки по нему с преим., вблизи - крит. Провал спасбр. Сил/Лов. При получении урона - спасбросок от смерти (если есть) или просто остается без сознания. Восстанавливается при лечении >0 ПЗ или стабилизации." },
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
        # --- Сначала добавляем все способности и эффекты ---
        print("\nSeeding Abilities...")
        ability_map = {} # Карта для хранения созданных объектов способностей {name: Ability}
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
                            print(f"      Warning: Invalid JSON in skill_requirements for '{name}', setting to None: {reqs}")
                            data_copy["skill_requirements"] = None

                    # Определяем поля, которые могут быть None и должны иметь дефолты
                    defaults = {k: data_copy.get(k) for k in ["cooldown", "range", "target", "duration", "saving_throw_attribute", "saving_throw_dc_formula", "effect_on_save_fail", "effect_on_save_success"]}
                    defaults["concentration"] = data_copy.get("concentration", False)
                    defaults["action_type"] = data_copy.get("action_type", "Действие") # Default action type if missing
                    defaults["skill_requirements"] = data_copy.get("skill_requirements") # Ensure this is carried over

                    # Собираем поля, которые есть в модели Ability
                    ability_fields = {k: v for k, v in data_copy.items() if k in Ability.__table__.columns or k == 'skill_requirements'}

                    # Применяем дефолты только для тех полей, которые не были заданы в data_copy или были None
                    for key, default_value in defaults.items():
                         if ability_fields.get(key) is None and default_value is not None :
                              ability_fields[key] = default_value
                         elif key == "concentration": # Ensure boolean concentration is always set
                             ability_fields[key] = default_value

                    # Оставляем только то, что есть в модели (включая skill_requirements)
                    ability_fields_cleaned = {k:v for k,v in ability_fields.items() if k in Ability.__mapper__.attrs or k == 'skill_requirements'}

                    try:
                        ability = Ability(**ability_fields_cleaned)
                        db.add(ability)
                        db.flush() # Получаем ID
                        ability_map[name] = ability # Сохраняем объект для связи с оружием
                        print(f"  Added Ability: {name} (ID: {ability.id})")
                    except Exception as create_exc:
                        print(f"  ERROR creating Ability '{name}': {create_exc}")
                        print(f"    Data used: {ability_fields_cleaned}")
                else:
                    print(f"  Skipped Ability (exists): {name}")
                    # Если способность уже есть, все равно добавим её в карту для связи
                    if name not in ability_map:
                         existing_ability = db.query(Ability).filter(Ability.name == name).first()
                         if existing_ability:
                             ability_map[name] = existing_ability


        print("\nSeeding Status Effects...")
        for data in status_effects_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(StatusEffect.id).filter(StatusEffect.name == name).first()
                if not exists:
                    # Очищаем данные от полей, которых нет в модели StatusEffect
                    status_fields_cleaned = {k: v for k, v in data_copy.items() if k in StatusEffect.__mapper__.attrs}
                    try:
                        effect = StatusEffect(**status_fields_cleaned)
                        db.add(effect)
                        print(f"  Added Status Effect: {name}")
                    except Exception as create_exc:
                         print(f"  ERROR creating StatusEffect '{name}': {create_exc}")
                         print(f"    Data used: {status_fields_cleaned}")

                else:
                    print(f"  Skipped Status Effect (exists): {name}")

        db.commit() # Коммитим способности и эффекты
        print("Abilities and Status Effects committed.")

        # --- Теперь добавляем предметы и связываем оружие со способностями ---
        print("\nSeeding Weapons...")
        for data in weapons_data:
            names_to_add = split_names(data["name"])
            granted_ability_names = []
            properties_str = data.get("properties", "") or ""

            # Логика определения способностей по свойствам оружия
            if "Очередь" in properties_str: granted_ability_names.append("Очередь")
            if "Боеприпасы" in properties_str and "Очередь" not in properties_str and data.get("item_type") == "weapon": # Проверяем, что это огнестрельное
                granted_ability_names.append("Одиночный выстрел")
            # Добавьте сюда другие связи свойств и способностей, если нужно

            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(Item.id).filter(Item.name == name).first()
                if not exists:
                    weapon_abilities_to_link = []
                    for ability_name in granted_ability_names:
                        ability_obj = ability_map.get(ability_name)
                        if ability_obj:
                            weapon_abilities_to_link.append(ability_obj)
                        else:
                            print(f"    Warning: Ability '{ability_name}' not found for weapon '{name}'.")

                    # Убираем 'granted_abilities' перед созданием Weapon, т.к. это relationship
                    data_copy.pop('granted_abilities', None)

                    # Устанавливаем дефолты, если поля отсутствуют
                    item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                    weapon_defaults = {"strength_requirement": 0, "stealth_disadvantage": False, "range_normal": None, "range_max": None, "reload_info": None, "is_two_handed": False}
                    data_with_defaults = {**item_defaults, **weapon_defaults, **data_copy}

                    # Очищаем данные от полей, которых нет в модели Weapon
                    weapon_fields_cleaned = {k: v for k, v in data_with_defaults.items() if k in Weapon.__mapper__.attrs}

                    try:
                        item = Weapon(**weapon_fields_cleaned)
                        if weapon_abilities_to_link:
                            item.granted_abilities.extend(weapon_abilities_to_link)
                        db.add(item)
                        print(f"  Added Weapon: {name}")
                    except Exception as create_exc:
                        print(f"  ERROR creating Weapon '{name}': {create_exc}")
                        print(f"    Data used: {weapon_fields_cleaned}")
                else:
                    print(f"  Skipped Weapon (exists): {name}")


        print("\nSeeding Armor...")
        for data in armors_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(Item.id).filter(Item.name == name).first()
                if not exists:
                    max_dex = data_copy.get("max_dex_bonus")
                    if max_dex is not None:
                        try: data_copy["max_dex_bonus"] = int(max_dex)
                        except (ValueError, TypeError): data_copy["max_dex_bonus"] = None # Или 0 для тяжелой? Смотря по логике игры

                    item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                    armor_defaults = {"strength_requirement": 0, "stealth_disadvantage": False, "max_dex_bonus": None, "properties": None} # Добавил properties
                    data_with_defaults = {**item_defaults, **armor_defaults, **data_copy}

                    # Очищаем данные от полей, которых нет в модели Armor
                    armor_fields_cleaned = {k: v for k, v in data_with_defaults.items() if k in Armor.__mapper__.attrs}


                    try:
                        item = Armor(**armor_fields_cleaned)
                        db.add(item)
                        print(f"  Added Armor: {name}")
                    except Exception as create_exc:
                         print(f"  ERROR creating Armor '{name}': {create_exc}")
                         print(f"    Data used: {armor_fields_cleaned}")
                else:
                    print(f"  Skipped Armor (exists): {name}")


        print("\nSeeding Shields...")
        for data in shields_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(Item.id).filter(Item.name == name).first()
                if not exists:
                    item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                    shield_defaults = {"strength_requirement": 0, "properties": None} # Добавил properties
                    data_with_defaults = {**item_defaults, **shield_defaults, **data_copy}

                    # Очищаем данные от полей, которых нет в модели Shield
                    shield_fields_cleaned = {k: v for k, v in data_with_defaults.items() if k in Shield.__mapper__.attrs}

                    try:
                        item = Shield(**shield_fields_cleaned)
                        db.add(item)
                        print(f"  Added Shield: {name}")
                    except Exception as create_exc:
                         print(f"  ERROR creating Shield '{name}': {create_exc}")
                         print(f"    Data used: {shield_fields_cleaned}")
                else:
                    print(f"  Skipped Shield (exists): {name}")


        print("\nSeeding General Items...")
        for data in general_items_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(Item.id).filter(Item.name == name).first()
                if not exists:
                    item_defaults = {"category": "Простое", "rarity": "Обычная", "weight": 1}
                    general_defaults = {"uses": None, "effect": None} # Добавил effect
                    data_with_defaults = {**item_defaults, **general_defaults, **data_copy}

                    # Очищаем данные от полей, которых нет в модели GeneralItem
                    general_fields_cleaned = {k: v for k, v in data_with_defaults.items() if k in GeneralItem.__mapper__.attrs}

                    try:
                        item = GeneralItem(**general_fields_cleaned)
                        db.add(item)
                        print(f"  Added General Item: {name}")
                    except Exception as create_exc:
                         print(f"  ERROR creating General Item '{name}': {create_exc}")
                         print(f"    Data used: {general_fields_cleaned}")
                else:
                    print(f"  Skipped General Item (exists): {name}")


        print("\nSeeding Ammo...")
        for data in ammo_data:
            names_to_add = split_names(data["name"])
            for name in names_to_add:
                data_copy = data.copy()
                data_copy["name"] = name
                exists = db.query(Item.id).filter(Item.name == name).first()
                if not exists:
                    item_defaults = {"category": "Спец.", "rarity": "Необычная", "weight": 0} # Updated defaults based on table
                    ammo_defaults = {"effect": None}
                    data_with_defaults = {**item_defaults, **ammo_defaults, **data_copy}

                    # Очищаем данные от полей, которых нет в модели Ammo
                    ammo_fields_cleaned = {k: v for k, v in data_with_defaults.items() if k in Ammo.__mapper__.attrs}

                    try:
                        item = Ammo(**ammo_fields_cleaned)
                        db.add(item)
                        print(f"  Added Ammo: {name}")
                    except Exception as create_exc:
                         print(f"  ERROR creating Ammo '{name}': {create_exc}")
                         print(f"    Data used: {ammo_fields_cleaned}")
                else:
                    print(f"  Skipped Ammo (exists): {name}")

        # Финальный коммит для всех предметов
        db.commit()
        print("\nItems committed.")

    except Exception as e:
        print(f"\nAn error occurred during database seeding: {e}")
        db.rollback()
    finally:
        db.close()
        print("Database session closed.")


if __name__ == "__main__":
    print("Running database seeder...")
    # --- ДОБАВЛЕНО СОЗДАНИЕ ТАБЛИЦ ---
    try:
        print("Creating database tables...")
        # Импортируем Base и engine внутри main guard для ясности
        from app.db.database import Base, engine
        # Импортируем все модели, чтобы Base.metadata знал о них
        import app.models # Это должно загрузить все из app/models/__init__.py
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully (if they didn't exist).")
    except Exception as table_creation_error:
        print(f"ERROR creating tables: {table_creation_error}")
        sys.exit(1) # Выходим, если таблицы не создались
    # --- КОНЕЦ ДОБАВЛЕНИЯ ---

    # Запускаем заполнение данными
    seed_data()