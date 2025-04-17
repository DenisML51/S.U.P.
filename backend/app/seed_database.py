# backend/seed_database.py
import sys
import os
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

# Добавляем путь к корневой папке бэкенда, чтобы импорты работали
# Настройте путь в соответствии с вашей структурой
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)


# Импортируем модели и базу данных (пути могут отличаться)
try:
    from app.database import engine, Base, SessionLocal
    from app.models import Item, Weapon, Armor, Shield, GeneralItem, Ammo, Ability, StatusEffect
    print("Imports successful")
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Please ensure the script is run from the correct directory or adjust sys.path.")
    sys.exit(1)

print("Starting database seeding...")

# Данные для заполнения (ВАМ НУЖНО ЗАПОЛНИТЬ ИХ ИЗ DOCX)
# -------------------------------------------------------

weapons_data = [
    { "name": "Нож / Боевой нож", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 1,
      "damage": "1к4", "damage_type": "Колющий", "properties": "Легкое, Фехтовальное, Дистанция Броска (6/18)", "is_two_handed": False },
    { "name": "Дубинка / Обломок трубы", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2,
      "damage": "1к6", "damage_type": "Дробящий", "properties": None, "is_two_handed": False },
    { "name": "Монтировка", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2,
      "damage": "1к6", "damage_type": "Дробящий", "properties": "Особое (Преимущество на проверки Силы для взлома)", "is_two_handed": False },
    { "name": "Топор / Мачете", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 3,
      "damage": "1к8", "damage_type": "Рубящий", "properties": None, "is_two_handed": False }, # Пример - предполагаем одноручный топор
    { "name": "Двуручный меч / Топор", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 6,
      "damage": "1к12", "damage_type": "Рубящий", "properties": "Двуручное, Тяжелое", "is_two_handed": True },
    { "name": "Пистолет (легкий, 9мм)", "item_type": "weapon", "category": "Простое", "rarity": "Обычная", "weight": 2,
      "damage": "1к8", "damage_type": "Колющий", "properties": "Боеприпасы", "range_normal": 15, "range_max": 45, "reload_info": "12 выстр./Бонусное д.", "is_two_handed": False },
    { "name": "Автомат / Штурмовая винтовка", "item_type": "weapon", "category": "Воинское", "rarity": "Необычная", "weight": 4,
      "damage": "1к10", "damage_type": "Колющий", "properties": "Боеприпасы, Двуручное, Очередь", "range_normal": 40, "range_max": 120, "reload_info": "30 выстр./Действие", "is_two_handed": True },
     { "name": "Лазерная Винтовка (Lasgun)", "item_type": "weapon", "category": "Воинское", "rarity": "Обычная", "weight": 3,
       "damage": "1к8", "damage_type": "Энерг.", "properties": "Боеприпасы (заряд), Двуручное", "range_normal": 50, "range_max": 150, "reload_info": "60 выстр./Действие", "is_two_handed": True },
    # !!! ДОБАВЬТЕ ОСТАЛЬНОЕ ОРУЖИЕ ИЗ ТАБЛИЦЫ !!!
]

armors_data = [
    { "name": "Укрепленная одежда / Ряса", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 4,
      "armor_type": "Лёгкая", "ac_bonus": 11, "max_dex_bonus": None, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None }, # По таблице: 11 + Ловкость(макс +2?) - Ставим AC=11, max_dex=None (или 2, если "+2" относится к максимуму)
    { "name": "Кожаная куртка / Комбинезон", "item_type": "armor", "category": "Простое", "rarity": "Обычная", "weight": 6,
      "armor_type": "Лёгкая", "ac_bonus": 12, "max_dex_bonus": None, "strength_requirement": 0, "stealth_disadvantage": False, "properties": None }, # По таблице: 12 + Ловкость(макс +2?)
    { "name": "Кольчуга / Чешуйчатый доспех", "item_type": "armor", "category": "Воинское", "rarity": "Необычная", "weight": 20,
      "armor_type": "Средняя", "ac_bonus": 14, "max_dex_bonus": 2, "strength_requirement": 4, "stealth_disadvantage": True, "properties": None }, # По таблице: 14 + Ловкость (макс +2)
    { "name": "Тяжелый бронежилет / Карапас", "item_type": "armor", "category": "Воинское", "rarity": "Редкая", "weight": 25,
      "armor_type": "Средняя", "ac_bonus": 15, "max_dex_bonus": 2, "strength_requirement": 5, "stealth_disadvantage": True, "properties": "Сопротивление (Колющий от баллистики?)" },
     { "name": "Тяжелая пех. броня (импер./мар.)", "item_type": "armor", "category": "Экзотика", "rarity": "Очень Редкая", "weight": 50,
       "armor_type": "Тяжёлая", "ac_bonus": 18, "max_dex_bonus": 0, "strength_requirement": 8, "stealth_disadvantage": True, "properties": "Может иметь слоты для модулей" }, # Тяжелая - нет бонуса ловкости (max_dex=0)
    # !!! ДОБАВЬТЕ ОСТАЛЬНУЮ БРОНЮ ИЗ ТАБЛИЦЫ !!!
]

shields_data = [
     { "name": "Легкий щит / Баклер", "item_type": "shield", "category": "Простое", "rarity": "Обычная", "weight": 2,
       "ac_bonus": 1, "strength_requirement": 0, "properties": None },
     { "name": "Средний щит / Боевой щит", "item_type": "shield", "category": "Воинское", "rarity": "Необычная", "weight": 6,
       "ac_bonus": 2, "strength_requirement": 0, "properties": None },
    { "name": "Тяжелый штурмовой щит", "item_type": "shield", "category": "Воинское", "rarity": "Редкая", "weight": 12,
       "ac_bonus": 3, "strength_requirement": 6, "properties": "Особое (Можно использовать как Укрытие 1/2?)" },
    # !!! ДОБАВЬТЕ ОСТАЛЬНЫЕ ЩИТЫ ИЗ ТАБЛИЦЫ !!!
]

general_items_data = [
    { "name": "Мультитул", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1,
      "description": "Набор отверток, ключей, пассатижей и т.д.", "effect": "Дает преимущество на проверки Техники для ремонта или простого взаимодействия с механизмами.", "uses": None },
    { "name": "Аптечка / Медпак", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 2,
      "description": "Содержит бинты, антисептики, базовые инструменты.", "effect": "Позволяет совершать проверки Медицины для стабилизации (Первая Помощь) или лечения ран (восстанавливает 1к8 + Медицина ПЗ, требует Действия).", "uses": 3 }, # Пример: 3 использования
    { "name": "Стимулятор (Стим)", "item_type": "general", "category": "Простое", "rarity": "Необычная", "weight": 0,
      "description": "Инъектор с бодрящим веществом.", "effect": "Использование (Бонусное Действие) дает 2к4 временных ПЗ на 1 минуту или снимает 1 уровень Истощения.", "uses": 1 },
    { "name": "Фонарик / Химсвет", "item_type": "general", "category": "Простое", "rarity": "Обычная", "weight": 1,
      "description": "Источник света.", "effect": "Освещает область.", "uses": None }, # Или uses для химсвета
    # !!! ДОБАВЬТЕ ОСТАЛЬНЫЕ ОБЩИЕ ПРЕДМЕТЫ !!!
]

ammo_data = [
    { "name": "Бронебойные (AP)", "item_type": "ammo", "category": "Спец.", "rarity": "Редкая", "weight": 0,
      "ammo_type": "Баллистическое", "effect": "Улучшает свойство Пробивание оружия (например, игнорирует до 3 AC от брони) или дает его, если не было." },
    { "name": "Экспансивные / Разрывные", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0,
      "ammo_type": "Баллистическое", "effect": "При попадании цель совершает спасбросок Выносливости (СЛ 12) или получает Кровотечение (1к4)." },
     { "name": "Зажигательные", "item_type": "ammo", "category": "Спец.", "rarity": "Необычная", "weight": 0,
       "ammo_type": "Баллист./Дробовик", "effect": "При попадании цель должна совершить спасбросок Ловкости (СЛ 10) или получить Горение (1к4)." },
    # !!! ДОБАВЬТЕ ОСТАЛЬНЫЕ БОЕПРИПАСЫ !!!
]

abilities_data = [
    # Медик
    { "name": "Первая Помощь", "branch": "medic", "level_required": 1, "action_type": "Действие", "range": "5 метров", "target": "Один союзник с 0 ПЗ или любой союзник", "cooldown": "Нет",
      "description": "Вы стабилизируете одного союзника с 0 ПЗ (Без сознания) в пределах 5 метров. Он перестает быть при смерти, но остается без сознания. Либо восстанавливаете союзнику 1к4 + Медицина ПЗ." },
    { "name": "Лечение Союзника", "branch": "medic", "level_required": 2, "skill_requirements": '{"Медицина": 3}', "action_type": "Действие", "range": "Касание", "target": "Одно существо", "cooldown": "1 ход",
      "description": "Восстанавливает цели 2к8 + Медицина ПЗ. Усиление: Медицина 5+ -> 3к8+Мед; Медицина 7+ -> 4к8+Мед." }, # Уровень ветки условный, ставим по порядку
    { "name": "Изготовить Зелье Лечения", "branch": "medic", "level_required": 3, "skill_requirements": '{"Медицина": 3, "Логика": 3, "Адаптация": 3}', "action_type": "Вне боя", "range": None, "target": None, "cooldown": None,
      "description": "Используя компоненты и проверку Медицины (СЛ зависит от рецепта), вы можете создать зелье лечения (2к4+2 ПЗ) или другие препараты." },
    { "name": "Тактическое Отступление", "branch": "medic", "level_required": 4, "skill_requirements": '{"Медицина": 4}', "action_type": "Реакция", "range": "10 метров", "target": "Союзник, получивший урон", "cooldown": "2 хода",
      "description": "Триггер: Союзник в 10м получает урон от видимого врага. Эффект: Союзник может немедленно переместиться на полскорости, не провоцируя атак от атаковавшего." },
    # ... и так далее для всех способностей всех веток ...

    # Мутант
     { "name": "Психический Толчок", "branch": "mutant", "level_required": 1, "action_type": "Действие", "range": "10 метров", "target": "Одно существо", "cooldown": "Нет", "saving_throw_attribute": "Сила", "saving_throw_dc_formula": "СЛ вашей Способности",
       "description": "Цель должна совершить спасбросок Силы (СЛ вашей Способности). При провале отталкивается на 3 метра и получает 1к6 дробящего урона. При провале на 5+, цель также Ошеломлена до конца её следующего хода." },
     { "name": "Предчувствие Опасности", "branch": "mutant", "level_required": 2, "skill_requirements": '{"Поток": 3}', "action_type": "Пассивно/Реакция", "range": None, "target": "Себя", "cooldown": "1 ход (Реакция)",
       "description": "Пассивно: +2 к СЛ Защиты против атак, о которых вы не подозревали. Реакция: Когда по вам совершается атака, можно наложить помеху на этот бросок атаки." },
    # !!! ДОБАВЬТЕ ОСТАЛЬНЫЕ СПОСОБНОСТИ !!!
]

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
    # !!! ДОБАВЬТЕ ОСТАЛЬНЫЕ СОСТОЯНИЯ, ЕСЛИ ЕСТЬ !!!
]


# -------------------------------------------------------

def seed_data():
    db = SessionLocal()
    try:
        print("Seeding Weapons...")
        for data in weapons_data:
            exists = db.query(Item.id).filter(Item.name == data["name"]).first()
            if not exists:
                item = Weapon(**data)
                db.add(item)
                print(f"  Added Weapon: {data['name']}")
            else:
                print(f"  Skipped (exists): {data['name']}")

        print("\nSeeding Armor...")
        for data in armors_data:
            exists = db.query(Item.id).filter(Item.name == data["name"]).first()
            if not exists:
                # Преобразуем max_dex_bonus в int или None
                max_dex = data.get("max_dex_bonus")
                if max_dex is not None:
                    try:
                        data["max_dex_bonus"] = int(max_dex)
                    except (ValueError, TypeError):
                        print(f"    Warning: Invalid max_dex_bonus '{max_dex}' for {data['name']}, setting to None.")
                        data["max_dex_bonus"] = None

                item = Armor(**data)
                db.add(item)
                print(f"  Added Armor: {data['name']}")
            else:
                print(f"  Skipped (exists): {data['name']}")

        print("\nSeeding Shields...")
        for data in shields_data:
             exists = db.query(Item.id).filter(Item.name == data["name"]).first()
             if not exists:
                item = Shield(**data)
                db.add(item)
                print(f"  Added Shield: {data['name']}")
             else:
                 print(f"  Skipped (exists): {data['name']}")

        print("\nSeeding General Items...")
        for data in general_items_data:
             exists = db.query(Item.id).filter(Item.name == data["name"]).first()
             if not exists:
                 item = GeneralItem(**data)
                 db.add(item)
                 print(f"  Added General Item: {data['name']}")
             else:
                 print(f"  Skipped (exists): {data['name']}")

        print("\nSeeding Ammo...")
        for data in ammo_data:
            exists = db.query(Item.id).filter(Item.name == data["name"]).first()
            if not exists:
                item = Ammo(**data)
                db.add(item)
                print(f"  Added Ammo: {data['name']}")
            else:
                print(f"  Skipped (exists): {data['name']}")

        print("\nSeeding Abilities...")
        for data in abilities_data:
            exists = db.query(Ability.id).filter(Ability.name == data["name"]).first()
            if not exists:
                ability = Ability(**data)
                db.add(ability)
                print(f"  Added Ability: {data['name']} ({data['branch']} Lvl {data['level_required']})")
            else:
                print(f"  Skipped (exists): {data['name']}")

        print("\nSeeding Status Effects...")
        for data in status_effects_data:
             exists = db.query(StatusEffect.id).filter(StatusEffect.name == data["name"]).first()
             if not exists:
                effect = StatusEffect(**data)
                db.add(effect)
                print(f"  Added Status Effect: {data['name']}")
             else:
                 print(f"  Skipped (exists): {data['name']}")


        db.commit()
        print("\nDatabase seeding completed successfully!")

    except Exception as e:
        print(f"\nAn error occurred during seeding: {e}")
        db.rollback() # Откатываем изменения в случае ошибки
    finally:
        db.close()
        print("Database session closed.")

if __name__ == "__main__":
    print("Running database seeder...")
    # Опционально: можно создать таблицы здесь, если их нет
    # print("Creating tables if they don't exist...")
    # Base.metadata.create_all(bind=engine)
    seed_data()