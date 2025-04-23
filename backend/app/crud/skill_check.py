# backend/app/crud/skill_check.py
import logging
from typing import Dict, Any, Optional, List # Добавляем List
from sqlalchemy.orm import Session

from .. import models, schemas # Импортируем модели и новые схемы
# Импортируем утилиты, включая обновленную determine_roll_mode
from .utils import determine_roll_mode, roll_with_advantage_disadvantage, format_roll_details

logger = logging.getLogger(__name__)

# --- Словарь Навыков (остается как был) ---
SKILL_TO_MOD_ATTRIBUTE: Dict[str, str] = {
    # ... (все навыки как в предыдущем ответе) ...
    "Сила": "strength_mod", "Атлетика": "strength_mod",
    "Ловкость": "dexterity_mod", "Акробатика": "dexterity_mod", "Скрытность": "dexterity_mod",
    "Выносливость": "endurance_mod", "Реакция": "reaction_mod", "Техника": "technique_mod",
    "Адаптация": "adaptation_mod", "Логика": "logic_mod", "Внимательность": "attention_mod",
    "Эрудиция": "erudition_mod", "Культура": "culture_mod", "Наука": "science_mod",
    "Медицина": "medicine_mod", "Внушение": "suggestion_mod", "Проницательность": "insight_mod",
    "Авторитет": "authority_mod", "Самообладание": "self_control_mod", "Религия": "religion_mod",
    "Поток": "flow_mod",
}

# --- ОБНОВЛЕННАЯ Вспомогательная Функция Парсинга Числовых Модификаторов ---
def _get_numeric_modifier_for_context(
    active_effects: List[models.StatusEffect],
    target_context: str # e.g., "skill_checks.logic", "attack_rolls.melee.strength"
    ) -> int:
    """
    Извлекает и суммирует применимые числовые модификаторы из поля numeric_modifiers
    активных статус-эффектов для заданного контекста броска.
    Учитывает иерархию: применяется наиболее специфичный найденный модификатор для каждого эффекта.
    """
    total_mod = 0
    if not active_effects:
        return 0

    context_parts = target_context.split('.') # e.g., ['skill_checks', 'logic']
    if not context_parts:
        return 0

    # Проверяем каждый активный эффект
    for effect in active_effects:
        if not (effect.numeric_modifiers and isinstance(effect.numeric_modifiers, dict)):
            continue

        numeric_mods = effect.numeric_modifiers
        best_mod_found: Optional[int] = None
        best_match_level = -1 # Уровень специфичности (-1 = нет совпадения)

        # Ищем наиболее специфичный ключ в модификаторах этого эффекта
        for key, value in numeric_mods.items():
            if not isinstance(value, int): # Нас интересуют только числовые модификаторы
                 continue

            key_parts = key.split('.')

            # Проверяем, является ли ключ префиксом или полным совпадением контекста
            # и не длиннее ли он самого контекста
            if len(key_parts) <= len(context_parts):
                is_match_for_level = True
                for i in range(len(key_parts)):
                    if key_parts[i] != context_parts[i]:
                        is_match_for_level = False
                        break

                if is_match_for_level:
                    # Если нашли более специфичное совпадение, обновляем
                    current_match_level = len(key_parts)
                    if current_match_level > best_match_level:
                        best_match_level = current_match_level
                        best_mod_found = value
                        logger.debug(f"  Effect '{effect.name}' potential numeric mod update (Key '{key}', Level {current_match_level}): {value}")

        # Если для этого эффекта был найден подходящий модификатор, добавляем его к сумме
        if best_mod_found is not None:
            total_mod += best_mod_found
            logger.debug(f"  Effect '{effect.name}' applied numeric modifier: {best_mod_found} (Best Match Level: {best_match_level}) for context '{target_context}'")

    if total_mod != 0:
        logger.debug(f"Total numeric modifier from effects for context '{target_context}': {total_mod}")
    return total_mod
# --- КОНЕЦ ОБНОВЛЕННОЙ ФУНКЦИИ ---


# --- Основная Функция Проверки Навыка (остается как была, использует обновленный _get_numeric_modifier_for_context) ---
def perform_skill_check(
    db: Session,
    character: models.Character,
    skill_name: str
    ) -> schemas.SkillCheckResultOut:
    """Выполняет проверку указанного навыка для персонажа."""

    logger.info(f"Performing skill check for character '{character.name}' (ID: {character.id}) - Skill: '{skill_name}'")

    # 1. Валидация навыка и получение модификатора характеристики
    mod_attribute = SKILL_TO_MOD_ATTRIBUTE.get(skill_name)
    if not mod_attribute:
        message = f"Ошибка: Неизвестный навык '{skill_name}'."
        logger.error(message)
        return schemas.SkillCheckResultOut(
            success=False, message=message, skill_name=skill_name, modifier_used=0, roll_mode='normal',
            base_roll=0, dice_kept=[], dice_all=[], numeric_mod_from_effects=0, roll_total=0, roll_detail_str="Неизвестный навык"
        )
    base_modifier_value = getattr(character, mod_attribute, 0)
    logger.debug(f"  Skill '{skill_name}' -> Attr '{mod_attribute}', Base Modifier: {base_modifier_value}")

    # 2. Определение числового модификатора от эффектов
    skill_attr_short = mod_attribute.replace('_mod', '')
    context_string = f"skill_checks.{skill_attr_short}"
    # Вызываем ОБНОВЛЕННУЮ функцию для парсинга
    numeric_mod_sum = _get_numeric_modifier_for_context(character.active_status_effects, context_string)

    # 3. Определение режима броска (Преимущество/Помеха)
    logger.debug(f"  Determining roll mode for context: {context_string}")
    roll_mode = determine_roll_mode(character, context_string, 'normal', has_temporary_advantage=False)

    # 4. Выполнение броска
    base_roll, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(mode=roll_mode)

    # 5. Расчет итогового результата
    roll_total = base_roll + base_modifier_value + numeric_mod_sum

    # 6. Форматирование деталей (используя обновленную format_roll_details)
    roll_detail_str = format_roll_details(
        kept_dice, all_rolls,
        base_modifier_value, f"Мод.{skill_name[:3]}",
        numeric_mod_sum, # Сумма от эффектов
        used_mode
    )

    # 7. Формирование результата
    message = f"Проверка навыка '{skill_name}'. Результат: {roll_total} ({roll_detail_str})."
    logger.info(f"  Skill check result: {message}")

    result_data = schemas.SkillCheckResultOut(
        success=True, message=message, skill_name=skill_name, modifier_used=base_modifier_value,
        roll_mode=used_mode, base_roll=base_roll, dice_kept=kept_dice, dice_all=all_rolls,
        numeric_mod_from_effects=numeric_mod_sum, # Передаем сумму
        roll_total=roll_total, roll_detail_str=roll_detail_str
    )

    return result_data