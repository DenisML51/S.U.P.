# backend/app/crud/utils.py
from sqlalchemy.orm import Session
from typing import Optional

# Импортируем модели напрямую, т.к. utils не должен зависеть от других crud модулей
from .. import models, schemas # schemas нужен для VALID_BRANCH_KEYS

# --- Таблицы Эмоций (Перенесены сюда, т.к. используются в character.py) ---
NEGATIVE_EMOTIONS = [ "ПУ: Паника", "ПУ: Ярость", "ПУ: Апатия", "ПУ: Паранойя", "ПУ: Слабоумие", "ПУ: Срыв" ]
POSITIVE_EMOTIONS = [ "ПУ: Адреналин", "ПУ: Вдохновение", "ПУ: Спокойствие", "ПУ: Прозрение", "ПУ: Эмпатия", "ПУ: Воля" ]
# -------------------------------------------------------------------------

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
    """Рассчитывает итоговый AC с учетом брони и щита."""
    dex_mod = character.dexterity_mod
    ac_from_armor = 10 + dex_mod # Базовый AC

    if character.equipped_armor and isinstance(character.equipped_armor.item, models.Armor):
        armor = character.equipped_armor.item
        base_armor_ac = armor.ac_bonus
        max_dex = 99 # По умолчанию

        if armor.armor_type == 'Средняя':
            max_dex = armor.max_dex_bonus if armor.max_dex_bonus is not None else 2
            ac_from_armor = base_armor_ac + min(dex_mod, max_dex)
        elif armor.armor_type == 'Тяжёлая':
            ac_from_armor = base_armor_ac
        elif armor.armor_type == 'Лёгкая':
             max_dex = armor.max_dex_bonus if armor.max_dex_bonus is not None else 99
             ac_from_armor = base_armor_ac + min(dex_mod, max_dex)
        else:
            ac_from_armor = base_armor_ac + dex_mod

    total_ac = ac_from_armor

    if character.equipped_shield and isinstance(character.equipped_shield.item, models.Shield):
        total_ac += character.equipped_shield.item.ac_bonus

    return total_ac