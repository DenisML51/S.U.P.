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
    "Адаптация": "adaptation_mod", "Логика": "logic_mod", "Внимание": "attention_mod",
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
    character: models.Character, # Персонаж должен быть загружен с inventory и active_status_effects
    skill_name: str
    # situational_modifier: int = 0 # Опционально
    ) -> schemas.SkillCheckResultOut:
    """
    Выполняет проверку указанного навыка для персонажа.
    Учитывает модификаторы характеристик, статус-эффекты (числовые и преим./помеха)
    и бонусы от предметов в инвентаре.
    """
    logger.info(f"Performing skill check for '{character.name}' - Skill: '{skill_name}'")

    # 1. Валидация навыка и получение модификатора характеристики
    mod_attribute = SKILL_TO_MOD_ATTRIBUTE.get(skill_name)
    if not mod_attribute:
        message = f"Ошибка: Неизвестный навык '{skill_name}'."; logger.error(message)
        return schemas.SkillCheckResultOut(
            success=False,
            message=message,
            skill_name=skill_name,
            modifier_used=0,
            roll_mode='normal',
            base_roll=0,
            dice_kept=[],
            dice_all=[],
            numeric_mod_from_effects=0,
            roll_total=0,
            roll_detail_str="Ошибка: Неизвестный навык"  # Или просто message
        ) # Возвращаем ошибку

    base_modifier_value = getattr(character, mod_attribute, 0)
    logger.debug(f"  Base Modifier ({mod_attribute}): {base_modifier_value}")

    # 2. Определение числового модификатора от ЭФФЕКТОВ
    skill_attr_short = mod_attribute.replace('_mod', '')
    context_string = f"skill_checks.{skill_attr_short}"
    numeric_mod_from_effects = _get_numeric_modifier_for_context(character.active_status_effects, context_string)

    # --- НОВОЕ: Определение бонуса от ПРЕДМЕТОВ ---
    item_bonus_value = 0
    item_advantage = False # Флаг для преимущества от предмета
    item_disadvantage = False # Флаг для помехи от предмета

    # Убедимся, что инвентарь загружен
    if not character.inventory:
         logger.warning(f"Character inventory not loaded for skill check bonus calculation. Reloading.")
         # Этого не должно происходить, если роутер грузит инвентарь
         db.refresh(character, attribute_names=['inventory'])
         # Можно еще раз загрузить предметы, если нужно
         # character = db.query(models.Character).options(selectinload(...)).get(character.id)

    if character.inventory:
        logger.debug(f"  Checking inventory ({len(character.inventory)} items) for skill bonuses...")
        for inv_item in character.inventory:
            item = inv_item.item
            # Проверяем, есть ли у предмета бонусы и нужный тип
            if item and hasattr(item, 'skill_check_bonuses') and item.skill_check_bonuses and isinstance(item.skill_check_bonuses, dict):
                bonuses = item.skill_check_bonuses
                # Ищем бонус для КОНКРЕТНОГО навыка (пока по русскому названию из словаря)
                bonus_value = bonuses.get(skill_name)

                if isinstance(bonus_value, int):
                    item_bonus_value += bonus_value
                    logger.debug(f"    Found numeric bonus +{bonus_value} for '{skill_name}' from item '{item.name}'")
                elif isinstance(bonus_value, str):
                    if bonus_value.lower() == 'advantage':
                        item_advantage = True
                        logger.debug(f"    Found ADVANTAGE for '{skill_name}' from item '{item.name}'")
                    elif bonus_value.lower() == 'disadvantage':
                        item_disadvantage = True
                        logger.debug(f"    Found DISADVANTAGE for '{skill_name}' from item '{item.name}'")

    if item_bonus_value != 0: logger.debug(f"  Total numeric bonus from items: {item_bonus_value}")
    if item_advantage: logger.debug("  Advantage granted by item(s).")
    if item_disadvantage: logger.debug("  Disadvantage granted by item(s).")
    # --- КОНЕЦ НОВОГО БЛОКА ---

    # 3. Определение режима броска (учитываем эффекты И предметы)
    logger.debug(f"  Determining roll mode for context: {context_string}")
    # Определяем модификатор от предмета для determine_roll_mode
    ability_modifies_from_item: RollMode = 'normal'
    if item_advantage and not item_disadvantage: ability_modifies_from_item = 'advantage'
    elif item_disadvantage and not item_advantage: ability_modifies_from_item = 'disadvantage'
    # Если есть и то, и другое от предметов, они компенсируются до 'normal'

    # Вызываем determine_roll_mode, передавая модификатор от предмета
    roll_mode = determine_roll_mode(
        character, context_string,
        ability_modifies=ability_modifies_from_item, # <-- Учитываем предмет
        has_temporary_advantage=False # Временное преимущество пока не для навыков
    )

    # 4. Выполнение броска
    base_roll, kept_dice, all_rolls, used_mode = roll_with_advantage_disadvantage(mode=roll_mode)

    # 5. Расчет итогового результата (включая бонус от предметов)
    roll_total = base_roll + base_modifier_value + numeric_mod_from_effects + item_bonus_value

    # 6. Форматирование деталей (передаем item_bonus_value)
    roll_detail_str = format_roll_details(
        kept_dice, all_rolls,
        base_modifier_value, f"Мод.{skill_name[:3]}",
        numeric_mod_from_effects,
        item_bonus_value, # <-- Передаем бонус от предметов
        used_mode
    )

    # 7. Формирование результата
    message = f"Проверка навыка '{skill_name}'. Результат: {roll_total} ({roll_detail_str})."
    logger.info(f"  Skill check result: {message}")

    result_data = schemas.SkillCheckResultOut(
        success=True, message=message, skill_name=skill_name, modifier_used=base_modifier_value,
        roll_mode=used_mode, base_roll=base_roll, dice_kept=kept_dice, dice_all=all_rolls,
        numeric_mod_from_effects=numeric_mod_from_effects + item_bonus_value, # Суммируем все числовые моды
        roll_total=roll_total, roll_detail_str=roll_detail_str
    )

    return result_data