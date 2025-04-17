# backend/seed_database.py
import sys
import os
import json
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, inspect as sqlainspect

# Добавляем путь к корневой папке бэкенда
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)

# Импортируем модели и базу данных
try:
    from app.database import engine, Base, SessionLocal
    # Импортируем все модели, которые будем заполнять
    from app.models import Item, Weapon, Armor, Shield, GeneralItem, Ammo, Ability, StatusEffect
    print("Imports successful")
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Please ensure the script is run from the correct directory or adjust sys.path.")
    sys.exit(1)

print("Starting database seeding...")

# --- ДАННЫЕ ДЛЯ ЗАПОЛНЕНИЯ ---
# !!! ВАМ НУЖНО ЗАПОЛНИТЬ ЭТИ СПИСКИ ДАННЫМИ ИЗ ВАШЕГО DOCX !!!

# --- ОРУЖИЕ ---
weapons_data = [
    { "name": "Нож", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "1к4", "damage_type": "Колющий", "properties": "Легкое, Фехтовальное, Дистанция Броска (6/18)", "is_two_handed": False },
    { "name": "Боевой нож", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1, "damage": "1к4", "damage_type": "Колющий", "properties": "Легкое, Фехтовальное, Дистанция Броска (6/18)", "is_two_handed": False },
    { "name": "Дубинка", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к6", "damage_type": "Дробящий", "properties": "Легкое?", "is_two_handed": False },
    { "name": "Обломок трубы", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к6", "damage_type": "Дробящий", "properties": "Легкое?", "is_two_handed": False },
    { "name": "Монтировка", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к6", "damage_type": "Дробящий", "properties": "Особое (Преимущество на проверки Силы для взлома)", "is_two_handed": False },
    { "name": "Топор", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 3, "damage": "1к8", "damage_type": "Рубящий", "properties": None, "is_two_handed": False },
    { "name": "Мачете", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 3, "damage": "1к8", "damage_type": "Рубящий", "properties": None, "is_two_handed": False },
    { "name": "Двуручный меч", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 6, "damage": "1к12", "damage_type": "Рубящий", "properties": "Двуручное, Тяжелое", "is_two_handed": True },
    { "name": "Двуручный топор", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 6, "damage": "1к12", "damage_type": "Рубящий", "properties": "Двуручное, Тяжелое", "is_two_handed": True },
    { "name": "Пистолет (легкий, 9мм)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2, "damage": "1к8", "damage_type": "Колющий", "properties": "Боеприпасы", "range_normal": 15, "range_max": 45, "reload_info": "12 выстр./Бонусное д.", "is_two_handed": False },
    { "name": "Дробовик (обрез)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 3, "damage": "1к8", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное", "range_normal": 10, "range_max": 30, "reload_info": "2 выстр./Действие", "is_two_handed": True },
    { "name": "Автомат", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 4, "damage": "1к10", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Очередь", "range_normal": 40, "range_max": 120, "reload_info": "30 выстр./Действие", "is_two_handed": True },
    { "name": "Штурмовая винтовка", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 4, "damage": "1к10", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Очередь", "range_normal": 40, "range_max": 120, "reload_info": "30 выстр./Действие", "is_two_handed": True },
    { "name": "Лазерная Винтовка (Lasgun)", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 3, "damage": "1к8", "damage_type": "Энерг.", "properties": "Боеприпасы (заряд), Двуручное", "range_normal": 50, "range_max": 150, "reload_info": "60 выстр./Действие", "is_two_handed": True },
    { "name": "Снайперская винтовка", "item_type": "weapon", "category": "Воинское", "rarity": "Редкая", "weight": 8, "damage": "2к8", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Тяжелое", "range_normal": 100, "range_max": 300, "reload_info": "5 выстр./Действие x2", "is_two_handed": True },
    { "name": "Силовой меч", "item_type": "weapon", "category": "Экзотика", "rarity": "Редкая", "weight": 3, "damage": "1к8", "damage_type": "Энерг./Рубящий", "properties": "Фехтовальное", "is_two_handed": False },
    { "name": "Плазменный пистолет", "item_type": "weapon", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 3, "damage": "2к6", "damage_type": "Энерг./Огонь", "properties": "Боеприпасы (заряд), Перегрев", "range_normal": 20, "range_max": 60, "reload_info": "10 выстр./Действие", "is_two_handed": False },
    # !!! ДОБАВЬТЕ ОСТАЛЬНОЕ ОРУЖИЕ !!!
]

# --- БРОНЯ ---
armors_data = [
    { "name": "Укрепленная одежда", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 4, "armor_type": "Лёгкая", "ac_bonus": 11, "max_dex_bonus": 2, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Ряса", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 4, "armor_type": "Лёгкая", "ac_bonus": 11, "max_dex_bonus": 2, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Кожаная куртка", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 6, "armor_type": "Лёгкая", "ac_bonus": 12, "max_dex_bonus": 2, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Комбинезон", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 6, "armor_type": "Лёгкая", "ac_bonus": 12, "max_dex_bonus": 2, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None },
    { "name": "Кольчуга", "item_type": "armor", "category": "Воинское", "rarity": "Необычная", "weight": 20, "armor_type": "Средняя", "ac_bonus": 14, "max_dex_bonus": 2, "strength_requirement": 4, "stealth_disadvantage": True, "properties": None },
    { "name": "Чешуйчатый доспех", "item_type": "armor", "category": "Воинское", "rarity": "Необычная", "weight": 20, "armor_type": "Средняя", "ac_bonus": 14, "max_dex_bonus": 2, "strength_requirement": 4, "stealth_disadvantage": True, "properties": None },
    { "name": "Тяжелый бронежилет", "item_type": "armor", "category": "Воинское", "rarity": "Редкая", "weight": 25, "armor_type": "Средняя", "ac_bonus": 15, "max_dex_bonus": 2, "strength_requirement": 5, "stealth_disadvantage": True, "properties": "Сопротивление (Колющий от баллистики?)" },
    { "name": "Карапас", "item_type": "armor", "category": "Воинское", "rarity": "Редкая", "weight": 25, "armor_type": "Средняя", "ac_bonus": 15, "max_dex_bonus": 2, "strength_requirement": 5, "stealth_disadvantage": True, "properties": "Сопротивление (Колющий от баллистики?)" },
    { "name": "Тяжелая пехотная броня", "item_type": "armor", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 50, "armor_type": "Тяжёлая", "ac_bonus": 18, "max_dex_bonus": 0, "strength_requirement": 8, "stealth_disadvantage": True, "properties": "Может иметь слоты для модулей" },
    # !!! ДОБАВЬТЕ ОСТАЛЬНУЮ БРОНЮ !!!
]

# --- ЩИТЫ ---
shields_data = [
     { "name": "Легкий щит", "item_type": "shield", "category": "Простое", "rarity": "Обычная", "weight": 2, "ac_bonus": 1, "strength_requirement": 0, "properties": None },
     { "name": "Баклер", "item_type": "shield", "category": "Простое", "rarity": "Обычная", "weight": 2, "ac_bonus": 1, "strength_requirement": 0, "properties": None },
     { "name": "Средний щит", "item_type": "shield", "category": "Воинское", "rarity": "Необычная", "weight": 6, "ac_bonus": 2, "strength_requirement": 0, "properties": None },
     { "name": "Боевой щит", "item_type": "shield", "category": "Воинское", "rarity": "Необычная", "weight": 6, "ac_bonus": 2, "strength_requirement": 0, "properties": None },
    { "name": "Тяжелый штурмовой щит", "item_type": "shield", "category": "Воинское", "rarity": "Редкая", "weight": 12, "ac_bonus": 3, "strength_requirement": 6, "properties": "Особое (Можно использовать как Укрытие 1/2?)" },
    # !!! ДОБАВЬТЕ ОСТАЛЬНЫЕ ЩИТЫ !!!
]

# --- ОБЩИЕ ПРЕДМЕТЫ ---
general_items_data = [
    { "name": "Мультитул", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Набор отверток, ключей, пассатижей и т.д.", "effect": "Дает преимущество на проверки Техники для ремонта или простого взаимодействия с механизмами.", "uses": None },
    { "name": "Аптечка", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 2, "description": "Содержит бинты, антисептики, базовые инструменты.", "effect": "Позволяет совершать проверки Медицины для стабилизации (Первая Помощь) или лечения ран (восстанавливает 1к8 + Медицина ПЗ, требует Действия).", "uses": 3 },
    { "name": "Медпак", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 2, "description": "Содержит бинты, антисептики, базовые инструменты.", "effect": "Позволяет совершать проверки Медицины для стабилизации (Первая Помощь) или лечения ран (восстанавливает 1к8 + Медицина ПЗ, требует Действия).", "uses": 3 },
    { "name": "Стимулятор (Стим)", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 0, "description": "Инъектор с бодрящим веществом.", "effect": "Использование (Бонусное Действие) дает 2к4 временных ПЗ на 1 минуту или снимает 1 уровень Истощения.", "uses": 1 },
    { "name": "Фонарик", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Источник света.", "effect": "Освещает область.", "uses": None },
    { "name": "Химсвет", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1, "description": "Источник света.", "effect": "Освещает область в течение 1 часа.", "uses": 1 },
    # !!! ДОБАВЬТЕ ОСТАЛЬНЫЕ ОБЩИЕ ПРЕДМЕТЫ !!!
]

# --- СПЕЦ. БОЕПРИПАСЫ ---
ammo_data = [
    { "name": "Бронебойные патроны (AP)", "item_type": "ammo", "category": "Спец.", "rarity": "Редкая", "weight": 0, "ammo_type": "Баллистическое", "effect": "Улучшает свойство Пробивание оружия (например, игнорирует до 3 AC от брони) или дает его, если не было." },
    { "name": "Экспансивные патроны", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0, "ammo_type": "Баллистическое", "effect": "При попадании цель совершает спасбросок Выносливости (СЛ 12) или получает Кровотечение (1к4)." },
    { "name": "Разрывные патроны", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0, "ammo_type": "Баллистическое", "effect": "При попадании цель совершает спасбросок Выносливости (СЛ 12) или получает Кровотечение (1к4)." },
    { "name": "Зажигательные патроны", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0, "ammo_type": "Баллист./Дробовик", "effect": "При попадании цель должна совершить спасбросок Ловкости (СЛ 10) или получить Горение (1к4)." },
    # !!! ДОБАВЬТЕ ОСТАЛЬНЫЕ БОЕПРИПАСЫ !!!
]

# --- СПОСОБНОСТИ ---
abilities_data = [
    # Оружейные (Примеры)
    { "name": "Одиночный выстрел", "branch": "weapon", "level_required": 0, "action_type": "Атака", "description": "Стандартный выстрел из оружия согласно его характеристикам урона и дальности.", "cooldown": None, "range": "См. оружие", "target": "Одна цель", "skill_requirements":None, "concentration": False},
    { "name": "Очередь", "branch": "weapon", "level_required": 0, "action_type": "Атака (Действие)", "description": "Трата 3 патронов. Атака с помехой, +1 кубик урона при попадании. Альтернативно: обстрел области 3х3м, Спасбросок Ловкости (СЛ 10+Ловк.мод) или половина урона.", "cooldown": None, "range": "См. оружие", "target": "Одна цель / Область", "skill_requirements":None, "concentration": False},
    # Медик
    { "name": "Первая Помощь", "branch": "medic", "level_required": 1, "action_type": "Действие", "range": "5 метров", "target": "Один союзник с 0 ПЗ или любой союзник", "cooldown": "Нет", "description": "Стабилизация союзника с 0 ПЗ или восстановление 1к4+Медицина ПЗ.", "skill_requirements":None, "concentration": False},
    { "name": "Лечение Союзника", "branch": "medic", "level_required": 2, "skill_requirements": '{"skill_medicine": 3}', "action_type": "Действие", "range": "Касание", "target": "Одно существо", "cooldown": "1 ход", "description": "Восстанавливает цели 2к8 + Медицина ПЗ. Усиление: Мед 5+ -> 3к8+Мед; Мед 7+ -> 4к8+Мед.", "concentration": False},
    { "name": "Изготовить Стимулятор", "branch": "medic", "level_required": 3, "skill_requirements": '{"skill_medicine": 3, "skill_science": 3}', "action_type": "Вне боя", "range": None, "target": None, "cooldown": None, "description": "Используя компоненты (1 час) и проверку Медицины (СЛ 13), вы можете создать один Стимулятор.", "concentration": False},
    { "name": "Тактическое Отступление", "branch": "medic", "level_required": 4, "skill_requirements": '{"skill_medicine": 4}', "action_type": "Реакция", "range": "10 метров", "target": "Союзник, получивший урон", "cooldown": "2 хода", "description": "Триггер: Союзник в 10м получает урон от видимого врага. Эффект: Союзник может немедленно переместиться на полскорости, не провоцируя атак от атаковавшего.", "concentration": False },
    # Мутант
    { "name": "Психический Толчок", "branch": "mutant", "level_required": 1, "action_type": "Действие", "range": "10 метров", "target": "Одно существо", "cooldown": "Нет", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "8+Поток+Проф?", "description": "Цель должна совершить спасбросок Силы. При провале отталкивается на 3 метра и получает 1к6 дробящего урона. При провале на 5+, цель также Ошеломлена до конца её следующего хода.", "skill_requirements":None, "concentration": False},
    { "name": "Предчувствие Опасности", "branch": "mutant", "level_required": 2, "skill_requirements": '{"skill_flow": 3}', "action_type": "Пассивно/Реакция", "range": None, "target": "Себя", "cooldown": "1 ход (Реакция)", "description": "Пассивно: +2 к КЗ против атак, о которых вы не подозревали. Реакция: Когда по вам совершается атака, можно наложить помеху на этот бросок атаки.", "concentration": False },
    # Стрелок
    { "name": "Точный Выстрел", "branch": "sharpshooter", "level_required": 1, "action_type": "Бонусное Действие", "description": "В этом ходу ваш следующий дальнобойный выстрел получает +2 к броску атаки.", "skill_requirements":None, "concentration": False },
    # Разведчик
    { "name": "Быстрое Перемещение", "branch": "scout", "level_required": 1, "action_type": "Бонусное Действие", "description": "Вы можете совершить действие 'Рывок' бонусным действием.", "skill_requirements":None, "concentration": False },
    # Техник
    { "name": "Ремонт Механизма", "branch": "technician", "level_required": 1, "action_type": "Действие", "range":"Касание", "target":"Механизм/Дроид", "description": "Вы восстанавливаете механизму 1к8 + Техника ПЗ или снимаете один негативный эффект (Отключен).", "skill_requirements":None, "concentration": False },
    # Боец
    { "name": "Второе Дыхание", "branch": "fighter", "level_required": 1, "action_type": "Бонусное Действие", "cooldown": "Короткий отдых", "description": "Вы восстанавливаете себе 1к10 + ур. Бойца ПЗ.", "skill_requirements":None, "concentration": False },
    # Джаггернаут
    { "name": "Несгибаемость", "branch": "juggernaut", "level_required": 1, "action_type": "Пассивно", "description": "Ваш максимум ПЗ увеличивается на ваш уровень Джаггернаута.", "skill_requirements":None, "concentration": False },
    # !!! ДОБАВЬТЕ ВСЕ ОСТАЛЬНЫЕ СПОСОБНОСТИ ИЗ ВСЕХ ВЕТОК !!!
]

# --- СОСТОЯНИЯ ---
status_effects_data = [
    { "name": "При смерти (Unconscious)", "description": "Существо недееспособно, не может двигаться/говорить, роняет предметы. Атаки с преим., вблизи - крит. Провал спасбр. Сил/Лов. При получении урона - спасбросок от смерти (если есть). Восстанавливается при лечении >0 ПЗ или стабилизации." },
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
    # !!! ДОБАВЬТЕ ОСТАЛЬНЫЕ СОСТОЯНИЯ !!!

    # Психологическая устойчивость
    { "name": "ПУ: Паника", "description": "Помеха на атаки/проверки, должен использовать действие для бегства от опасности, если возможно (1 мин)." },
    { "name": "ПУ: Ярость", "description": "Преимущество на атаки ближнего боя (Сила), -2 КЗ. Атакует ближайшее существо (врага или союзника), если возможно (1 мин)." },
    { "name": "ПУ: Апатия", "description": "Помеха на проверки/спасброски, скорость / 2, не может использовать Бонусные действия или Реакции (1 мин)." },
    { "name": "ПУ: Паранойя", "description": "Помеха на социальные проверки (Внушение, Авторитет, Проницательность). Считает всех подозрительными (10 мин)." },
    { "name": "ПУ: Слабоумие", "description": "Действует иррационально согласно внезапно возникшей идее (определяется Мастером). Помеха на все действия, не связанные с этой идеей (10 мин)." },
    { "name": "ПУ: Срыв", "description": "Получает состояние Оглушение на 1 раунд, затем состояние Ошеломление на 1 минуту." },
    # Положительные Эмоции
    { "name": "ПУ: Адреналин", "description": "Может совершить одно дополнительное Действие или Бонусное действие в свой следующий ход." },
    { "name": "ПУ: Вдохновение", "description": "Получает Преимущество на все броски атаки ИЛИ все спасброски (на выбор игрока в момент получения) до конца своего следующего хода." },
    { "name": "ПУ: Спокойствие", "description": "Получает +2 к КЗ и Преимущество на спасброски Самообладания до конца своего следующего хода." },
    { "name": "ПУ: Прозрение", "description": "Получает Преимущество на следующую совершаемую проверку Внимательности, Логики или Проницательности." },
    { "name": "ПУ: Эмпатия", "description": "Получает Преимущество на следующую совершаемую проверку Медицины или неагрессивную проверку Внушения или Проницательности." },
    { "name": "ПУ: Воля", "description": "Автоматически преуспевает на следующем спасброске против эффектов Страха или Внушения. Получает 1к6 временных ПЗ (запишите отдельно)." },
]

# -------------------------------------------------------

# Функция для парсинга имен типа "A / B"
def split_names(name):
    return [n.strip() for n in name.split('/') if n.strip()]

def seed_data():
    db = SessionLocal()
    # --- Сначала добавляем все способности и эффекты, чтобы на них можно было ссылаться ---
    print("\nSeeding Abilities...")
    ability_map = {}
    for data in abilities_data:
        names_to_add = split_names(data["name"])
        for name in names_to_add:
            data_copy = data.copy()
            data_copy["name"] = name
            # --- ИСПРАВЛЕНИЕ NameError ---
            exists = db.query(Ability.id).filter(Ability.name == name).first()
            # ---------------------------
            if not exists:
                 reqs = data_copy.get("skill_requirements")
                 if isinstance(reqs, str):
                      try: json.loads(reqs)
                      except json.JSONDecodeError: print(f"    Warning: Invalid JSON in skill_requirements for '{name}', setting to None: {reqs}"); data_copy["skill_requirements"] = None
                 data_with_defaults = { "concentration": False, "saving_throw_attribute": None, "saving_throw_dc_formula": None, "effect_on_save_fail": None, "effect_on_save_success": None, "cooldown": None, "range": None, "target": None, "duration": None, **data_copy }
                 ability = Ability(**data_with_defaults)
                 db.add(ability); db.flush(); ability_map[name] = ability
                 print(f"  Added Ability: {name} ({data_copy['branch']} Lvl {data_copy['level_required']})")
            else:
                 print(f"  Skipped Ability (exists): {name}")
                 if name not in ability_map: ability_map[name] = db.query(Ability).filter(Ability.name == name).first()

    print("\nSeeding Status Effects...")
    for data in status_effects_data:
        names_to_add = split_names(data["name"])
        for name in names_to_add:
            data_copy = data.copy()
            data_copy["name"] = name
            # --- ИСПРАВЛЕНИЕ NameError ---
            exists = db.query(StatusEffect.id).filter(StatusEffect.name == name).first()
            # ---------------------------
            if not exists: effect = StatusEffect(**data_copy); db.add(effect); print(f"  Added Status Effect: {name}")
            else: print(f"  Skipped Status Effect (exists): {name}")

    try:
        db.commit()
        print("Abilities and Status Effects committed.")
    except Exception as e:
        print(f"\nError committing Abilities/Status Effects: {e}"); db.rollback(); db.close(); return

    # --- Теперь добавляем предметы и связываем оружие со способностями ---
    print("\nSeeding Weapons...")
    for data in weapons_data:
        names_to_add = split_names(data["name"])
        granted_ability_names = []
        properties_str = data.get("properties", "") or ""
        # --- Логика определения способностей (АДАПТИРУЙТЕ!) ---
        if "Очередь" in properties_str: granted_ability_names.append("Очередь")
        if "Боеприпасы" in properties_str and "Очередь" not in properties_str: granted_ability_names.append("Одиночный выстрел")
        # ----------------------------------------------------
        for name in names_to_add:
            data_copy = data.copy()
            data_copy["name"] = name
            # --- ИСПРАВЛЕНИЕ NameError ---
            exists = db.query(Item.id).filter(Item.name == name).first()
            # ---------------------------
            if not exists:
                weapon_abilities_to_link = []
                for ability_name in granted_ability_names:
                    ability_obj = ability_map.get(ability_name)
                    if ability_obj: weapon_abilities_to_link.append(ability_obj)
                    else: print(f"    Warning: Ability '{ability_name}' not found for weapon '{name}'. Skipping link.")
                data_copy.pop('granted_abilities', None)
                # Добавляем значения по умолчанию, если их нет
                data_with_defaults = {"strength_requirement": 0, "stealth_disadvantage": False, **data_copy}
                item = Weapon(**data_with_defaults)
                if weapon_abilities_to_link: item.granted_abilities.extend(weapon_abilities_to_link)
                db.add(item); print(f"  Added Weapon: {name}")
            else: print(f"  Skipped Weapon (exists): {name}")

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
                     except (ValueError, TypeError): print(f"    Warning: Invalid max_dex_bonus '{max_dex}' for {name}, setting to None."); data_copy["max_dex_bonus"] = None
                # У Armor есть обязательные поля, убедимся что они есть или берем из базы Item
                data_with_defaults = { "strength_requirement": data_copy.get("strength_requirement", 0), "stealth_disadvantage": data_copy.get("stealth_disadvantage", False), **data_copy }
                item = Armor(**data_with_defaults); db.add(item); print(f"  Added Armor: {name}")
             else: print(f"  Skipped Armor (exists): {name}")

    print("\nSeeding Shields...")
    for data in shields_data:
        names_to_add = split_names(data["name"])
        for name in names_to_add:
             data_copy = data.copy()
             data_copy["name"] = name
             exists = db.query(Item.id).filter(Item.name == name).first()
             if not exists:
                  data_with_defaults = { "strength_requirement": data_copy.get("strength_requirement", 0), **data_copy}
                  item = Shield(**data_with_defaults); db.add(item); print(f"  Added Shield: {name}")
             else: print(f"  Skipped Shield (exists): {name}")

    print("\nSeeding General Items...")
    for data in general_items_data:
        names_to_add = split_names(data["name"])
        for name in names_to_add:
             data_copy = data.copy()
             data_copy["name"] = name
             exists = db.query(Item.id).filter(Item.name == name).first()
             if not exists: item = GeneralItem(**data_copy); db.add(item); print(f"  Added General Item: {name}")
             else: print(f"  Skipped General Item (exists): {name}")

    print("\nSeeding Ammo...")
    for data in ammo_data:
        names_to_add = split_names(data["name"])
        for name in names_to_add:
             data_copy = data.copy()
             data_copy["name"] = name
             exists = db.query(Item.id).filter(Item.name == name).first()
             if not exists: item = Ammo(**data_copy); db.add(item); print(f"  Added Ammo: {name}")
             else: print(f"  Skipped Ammo (exists): {name}")

    try:
        db.commit()
        print("\nDatabase seeding completed successfully!")
    except Exception as e:
        print(f"\nAn error occurred during final commit: {e}")
        db.rollback()
    finally:
        db.close()
        print("Database session closed.")

if __name__ == "__main__":
    print("Running database seeder...")
    # print("Creating tables if they don't exist...")
    # Base.metadata.create_all(bind=engine)
    seed_data()