# backend/app/crud/utils.py
from sqlalchemy.orm import Session
import re 
import random
import math
from typing import Optional, Dict, Any, Tuple, Literal, List

# Импортируем модели напрямую, т.к. utils не должен зависеть от других crud модулей
from .. import models, schemas # schemas нужен для VALID_BRANCH_KEYS
import logging

logger = logging.getLogger(__name__)

# --- Таблицы Эмоций (Перенесены сюда, т.к. используются в character.py) ---
NEGATIVE_EMOTIONS = [ "ПУ: Паника", "ПУ: Ярость", "ПУ: Апатия", "ПУ: Паранойя", "ПУ: Слабоумие", "ПУ: Срыв" ]
POSITIVE_EMOTIONS = [ "ПУ: Адреналин", "ПУ: Вдохновение", "ПУ: Спокойствие", "ПУ: Прозрение", "ПУ: Эмпатия", "ПУ: Воля" ]
# -------------------------------------------------------------------------
SKILL_MODIFIER_MAP: Dict[str, str] = {
    # Сопоставление строк из формул с именами атрибутов модели Character
    "Сил": "strength_mod",
    "Лов": "dexterity_mod",
    "Вын": "endurance_mod",
    "Реа": "reaction_mod",
    "Тех": "technique_mod",
    "Ада": "adaptation_mod",
    "Лог": "logic_mod",
    "Вни": "attention_mod",
    "Эру": "erudition_mod",
    "Кул": "culture_mod",
    "Нау": "science_mod",
    "Мед": "medicine_mod",
    "Вну": "suggestion_mod",
    "Про": "insight_mod",
    "Авт": "authority_mod",
    "Сам": "self_control_mod",
    "Рел": "religion_mod",
    "Пот": "flow_mod",
    # Добавьте другие сокращения или полные имена, если используете
}

# --- НОВАЯ ФУНКЦИЯ БРОСКА d6 ---
def roll_d6_pool(num_dice_to_roll: int, num_dice_to_keep: int, highest: bool = True) -> Tuple[int, List[int], List[int]]:
    """
    Бросает указанное количество к6, оставляет указанное количество лучших/худших
    и возвращает их сумму, список оставленных костей и список всех брошенных костей.
    """
    if num_dice_to_roll <= 0 or num_dice_to_keep <= 0 or num_dice_to_keep > num_dice_to_roll:
        return 0, [], [] # Некорректные параметры

    rolls = [random.randint(1, 6) for _ in range(num_dice_to_roll)]
    rolls.sort(reverse=highest) # Сортируем: największe pierwsze jeśli highest=True

    kept_dice = rolls[:num_dice_to_keep]
    result_sum = sum(kept_dice)

    return result_sum, kept_dice, rolls # Возвращаем сумму, оставленные и все

# --- НОВАЯ ФУНКЦИЯ БРОСКА С УЧЕТОМ МОДИФИКАТОРА (Преимущество/Помеха) ---
RollMode = Literal['advantage', 'disadvantage', 'normal']

def roll_with_advantage_disadvantage(base_roll_func: callable = lambda: roll_d6_pool(3, 3), # По умолчанию 3к6
                                     mode: RollMode = 'normal'
                                     ) -> Tuple[int, List[int], List[int], RollMode]:
    """
    Выполняет бросок костей с учетом преимущества или помехи.
    Возвращает: (сумма, список оставленных костей, список всех костей, использованный режим)
    """
    if mode == 'advantage':
        result, kept, all_rolls = roll_d6_pool(4, 3, highest=True)
        return result, kept, all_rolls, 'advantage'
    elif mode == 'disadvantage':
        result, kept, all_rolls = roll_d6_pool(4, 3, highest=False)
        return result, kept, all_rolls, 'disadvantage'
    else: # 'normal'
        result, kept, all_rolls = base_roll_func()
        # Для обычного броска 3к6, kept и all_rolls будут одинаковыми
        return result, kept, all_rolls, 'normal'
    
def format_roll_details(
    kept_dice: List[int],
    all_rolls: List[int],
    attribute_modifier_value: int = 0, # Переименовали для ясности
    attribute_modifier_source: str = "", # Напр. "Мод.Лов", "Проф."
    numeric_modifier_value: int = 0, # <-- НОВОЕ: Численный модификатор от эффектов/прочего
    numeric_modifier_source: str = "Эффекты", # <-- НОВОЕ: Источник
    mode_used: RollMode = 'normal'
) -> str:
    """Форматирует строку с деталями броска, включая модификаторы и режим."""
    dice_str = "+".join(map(str, kept_dice))
    roll_base_sum = sum(kept_dice)

    prefix = ""
    if mode_used == 'advantage':
        prefix = f"4к6в3 ({'/'.join(map(str, sorted(all_rolls)))})"
    elif mode_used == 'disadvantage':
        prefix = f"4к6н3 ({'/'.join(map(str, sorted(all_rolls)))})"
    else:
        prefix = f"3к6 ({'/'.join(map(str, sorted(all_rolls)))})" # Для 3к6 all_rolls == kept_dice

    modifier_str = ""
    total_numeric_mod = attribute_modifier_value + numeric_modifier_value # <-- СУММИРУЕМ МОДИФИКАТОРЫ
    total_result = roll_base_sum + total_numeric_mod

    if attribute_modifier_value != 0:
        sign = "+" if attribute_modifier_value > 0 else ""
        source_info = f"({attribute_modifier_source})" if attribute_modifier_source else ""
        modifier_str += f" {sign}{attribute_modifier_value}{source_info}"

    # --- НОВОЕ: Добавляем числовой модификатор от эффектов ---
    if numeric_modifier_value != 0:
        sign = "+" if numeric_modifier_value > 0 else ""
        source_info = f"({numeric_modifier_source})" if numeric_modifier_source else ""
        modifier_str += f" {sign}{numeric_modifier_value}{source_info}"
    # --- КОНЕЦ НОВОГО БЛОКА ---

    # Убираем пробел в начале, если он есть
    modifier_str = modifier_str.strip()

    if modifier_str: # Если были какие-либо модификаторы
        return f"{prefix} = {roll_base_sum} {modifier_str.replace('+','+ ').replace('-','- ')} = {total_result}" # Добавим пробелы для читаемости
    else: # Если модификаторов не было
        return f"{prefix} = {roll_base_sum}"

def _parse_and_roll(formula: str, character: models.Character) -> Tuple[int, str]:
    """
    Парсит формулу вида 'NdM+X+Мод.АБВ' или 'NdM', бросает кубики и добавляет модификаторы.
    Возвращает кортеж: (результат_броска: int, детали_броска: str).
    """
    if not formula or not character:
        return 0, "Нет формулы или персонажа"

    total_result = 0
    details_list = []
    dice_regex = re.compile(r"(\d+)к(\d+)") # NdM
    static_mod_regex = re.compile(r"([\+\-])(\d+)(?!к)") # +X or -X (не часть NdM)
    skill_mod_regex = re.compile(r"([\+\-])Мод\.(\w+)") # +Мод.АБВ or -Мод.АБВ

    # 1. Бросок кубиков
    dice_match = dice_regex.search(formula)
    if dice_match:
        num_dice = int(dice_match.group(1))
        die_type = int(dice_match.group(2))
        rolls = [random.randint(1, die_type) for _ in range(num_dice)]
        dice_sum = sum(rolls)
        total_result += dice_sum
        details_list.append(f"{num_dice}к{die_type}({'+'.join(map(str, rolls))}={dice_sum})")
    else:
        # Если кубиков нет, может быть просто число или модификатор
         # Пробуем найти число в начале строки, если нет к
         static_start_match = re.match(r"^(\d+)$", formula.split('+')[0].split('-')[0].strip())
         if static_start_match:
             start_val = int(static_start_match.group(1))
             total_result += start_val
             details_list.append(str(start_val))
         # Иначе начинаем с 0

    # 2. Статический модификатор
    static_mod_match = static_mod_regex.search(formula)
    if static_mod_match:
        sign = static_mod_match.group(1)
        value = int(static_mod_match.group(2))
        if sign == '+':
            total_result += value
            details_list.append(f"+{value}")
        else:
            total_result -= value
            details_list.append(f"-{value}")

    # 3. Модификатор навыка
    skill_mod_match = skill_mod_regex.search(formula)
    if skill_mod_match:
        sign = skill_mod_match.group(1)
        mod_key_short = skill_mod_match.group(2)
        mod_attr = SKILL_MODIFIER_MAP.get(mod_key_short)
        if mod_attr and hasattr(character, mod_attr):
            mod_value = getattr(character, mod_attr)
            if sign == '+':
                total_result += mod_value
                details_list.append(f"+{mod_value}(Мод.{mod_key_short})")
            else:
                total_result -= mod_value
                details_list.append(f"-{mod_value}(Мод.{mod_key_short})")
        else:
            details_list.append(f"(Ошибка: неизв. мод. '{mod_key_short}')")

    # Убедимся, что результат не отрицательный (для лечения/урона обычно)
    final_result = max(0, total_result)
    roll_details = " ".join(details_list) + f" = {final_result}"

    return final_result, roll_details

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
    # Импортируем XP_THRESHOLDS здесь, чтобы избежать циклических зависимостей на уровне модуля
    from ..models import XP_THRESHOLDS
    return XP_THRESHOLDS.get(level)

def _update_character_available_abilities(db: Session, character: models.Character):
    """Обновляет список ДОСТУПНЫХ способностей персонажа (только из веток)."""
    # Запрашиваем только способности, относящиеся к веткам классов
    all_branch_abilities = db.query(models.Ability).filter(
        models.Ability.branch.in_(schemas.VALID_BRANCH_KEYS) # Используем константу из schemas
    ).all()

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

    for ability in all_branch_abilities:
        required_level = ability.level_required
        branch_name = ability.branch
        # Проверка, что branch_name есть в branch_levels (на случай новых веток)
        current_branch_level = branch_levels.get(branch_name, 0)

        if current_branch_level >= required_level:
            if ability.id not in current_ability_ids:
                abilities_to_add.append(ability)

    if abilities_to_add:
        character.available_abilities.extend(abilities_to_add)
        # Не делаем flush/commit здесь, это должно происходить в вызывающей функции

def _calculate_total_ac(character: models.Character) -> int:
    """Рассчитывает итоговый AC с учетом брони, щита и статус-эффектов."""
    dex_mod = character.dexterity_mod
    ac_from_armor = 10 + dex_mod # Базовый AC

    # Расчет AC от брони (существующая логика без изменений)
    if character.equipped_armor and isinstance(character.equipped_armor.item, models.Armor):
        armor = character.equipped_armor.item
        base_armor_ac = armor.ac_bonus
        max_dex = 99
        if armor.armor_type == 'Средняя':
            max_dex = armor.max_dex_bonus if armor.max_dex_bonus is not None else 2
            ac_from_armor = base_armor_ac + min(dex_mod, max_dex)
        elif armor.armor_type == 'Тяжёлая':
            ac_from_armor = base_armor_ac
        elif armor.armor_type == 'Лёгкая':
             max_dex = armor.max_dex_bonus if armor.max_dex_bonus is not None else 99
             ac_from_armor = base_armor_ac + min(dex_mod, max_dex)
        else: # Если тип брони неизвестен или "Нет", считаем как без брони
             ac_from_armor = 10 + dex_mod # Используем базовый AC

    total_ac = ac_from_armor

    # Добавление бонуса от щита (существующая логика без изменений)
    if character.equipped_shield and isinstance(character.equipped_shield.item, models.Shield):
        total_ac += character.equipped_shield.item.ac_bonus

    # --- НОВОЕ: Учет модификаторов от статус-эффектов ---
    # Убедимся, что эффекты загружены. Если нет, возможно, их нужно загрузить здесь
    # или передавать в функцию. Предполагаем, что они доступны в character.active_status_effects
    if character.active_status_effects:
        ac_mod_from_effects = sum(
            effect.ac_modifier for effect in character.active_status_effects
            if effect.ac_modifier is not None
        )
        total_ac += ac_mod_from_effects
        # Логирование для отладки (опционально)
        if ac_mod_from_effects != 0:
             logger.debug(f"Applying AC modifier from status effects: {ac_mod_from_effects}. New Total AC (before final): {total_ac}")
    # --- КОНЕЦ НОВОГО БЛОКА ---

    return total_ac


def determine_roll_mode(character: models.Character, roll_target: str, ability_modifies: RollMode = 'normal') -> RollMode:
    """
    Определяет итоговый режим броска (advantage, disadvantage, normal),
    учитывая активные статус-эффекты персонажа и модификатор от самой способности/действия.

    roll_target: Строка, описывающая тип броска (напр., 'attack_rolls.melee.Сил', 'saving_throws.dexterity')
    ability_modifies: Режим, накладываемый самой способностью ('advantage', 'disadvantage')
    """
    status_advantage = False
    status_disadvantage = False
    roll_target_parts = roll_target.split('.') # Разбираем цель на части

    if character.active_status_effects:
        logger.debug(f"Checking effects for roll target: {roll_target}")
        for effect in character.active_status_effects:
            # Пропускаем временные эффекты, они обрабатываются отдельно
            if effect.name.startswith("_Temp:"):
                continue

            # Проверяем, есть ли у эффекта нужные поля и является ли targets словарем
            if not (effect.roll_modifier_type and effect.roll_modifier_targets and isinstance(effect.roll_modifier_targets, dict)):
                continue

            targets_dict = effect.roll_modifier_targets
            applies = False # Флаг, сработал ли эффект на эту цель

            # --- Логика проверки совпадения цели ---
            for target_key, target_value in targets_dict.items():
                target_key_parts = target_key.split('.')

                # 1. Полное совпадение ключа эффекта с целью броска
                #    (e.g., effect key "attack_rolls.melee.Сил" == roll_target "attack_rolls.melee.Сил")
                if target_key == roll_target and target_value == True:
                    applies = True
                    logger.debug(f"  Effect '{effect.name}' MATCH (Exact Key) for '{roll_target}'")
                    break

                # 2. Совпадение по основной категории с значением true или "all"
                #    (e.g., effect key "attack_rolls" == roll_target_parts[0] "attack_rolls" and value is true/"all")
                if len(target_key_parts) == 1 and target_key == roll_target_parts[0] and (target_value == True or target_value == "all"):
                    applies = True
                    logger.debug(f"  Effect '{effect.name}' MATCH (Base Category '{target_key}' == true/all)")
                    break

                # 3. Совпадение по основной категории и подкатегории в списке
                #    (e.g., effect key "saving_throws", value ["dexterity", "strength"], roll_target "saving_throws.dexterity")
                if len(target_key_parts) == 1 and target_key == roll_target_parts[0] and isinstance(target_value, list) and len(roll_target_parts) > 1:
                    if roll_target_parts[1] in target_value:
                        applies = True
                        logger.debug(f"  Effect '{effect.name}' MATCH (Sub-category '{roll_target_parts[1]}' in list for '{target_key}')")
                        break

                # 4. Совпадение по более общей категории с точкой (менее специфичной, чем roll_target)
                #    (e.g., effect key "attack_rolls.melee" == roll_target "attack_rolls.melee.Сил" and value is true)
                #    Проверяем, что ключ эффекта является началом строки цели броска
                if roll_target.startswith(target_key + '.') and target_value == True:
                     applies = True
                     logger.debug(f"  Effect '{effect.name}' MATCH (General Key '{target_key}' applies to '{roll_target}')")
                     break

            # --- Применяем модификатор, если цель совпала ---
            if applies:
                if effect.roll_modifier_type == 'advantage':
                    status_advantage = True
                    logger.debug(f"  Effect '{effect.name}' grants ADVANTAGE.")
                elif effect.roll_modifier_type == 'disadvantage':
                    status_disadvantage = True
                    logger.debug(f"  Effect '{effect.name}' grants DISADVANTAGE.")

    # --- Определяем итоговый режим ---
    final_mode = 'normal'
    action_has_advantage = ability_modifies == 'advantage'
    action_has_disadvantage = ability_modifies == 'disadvantage'

    has_advantage = status_advantage or action_has_advantage
    has_disadvantage = status_disadvantage or action_has_disadvantage

    if has_advantage and has_disadvantage:
        final_mode = 'normal' # Конфликт -> нормальный бросок
    elif has_advantage:
        final_mode = 'advantage'
    elif has_disadvantage:
        final_mode = 'disadvantage'

    logger.debug(f"Determine Roll Mode Result: Target='{roll_target}', AbilityMod='{ability_modifies}', StatusAdv={status_advantage}, StatusDisadv={status_disadvantage} => FinalMode='{final_mode}'")
    return final_mode