// src/features/CharacterDetail/components/AbilityCardBrief.js
// Отображает краткую карточку способности во вкладке "Ветки"
import React, { useMemo, useCallback } from 'react';
import { theme } from '../../../styles/theme'; // Путь к теме
// Импортируем apiService для вызова activateAction
import * as apiService from '../../../api/apiService';

// Основной Компонент
// Принимает: ability (данные способности), character (данные персонажа),
// onClick (функция для открытия модалки), handleApiAction (для активации)
const AbilityCardBrief = ({ ability, character, onClick, handleApiAction }) => {

    // Хук для проверки требований (обернут в useCallback для мемоизации)
    const checkRequirements = useCallback(() => {
        if (!ability || !ability.skill_requirements || !character) {
             return { met: true }; // Считаем выполненными, если нет требований/данных
        }
        try {
            let requirements = {};
            if (typeof ability.skill_requirements === 'string' && ability.skill_requirements.trim()) {
                requirements = JSON.parse(ability.skill_requirements);
            } else {
                return { met: true };
            }
            let allMet = true;
            for (const skillKey in requirements) {
                if (!(skillKey in character) || character[skillKey] < requirements[skillKey]) {
                    allMet = false;
                    break;
                }
            }
            return { met: allMet };
        } catch (e) {
            console.error("AbilityCardBrief: Failed to parse skill_requirements:", ability.skill_requirements, e);
            return { met: false }; // Считаем невыполненными при ошибке
        }
    }, [ability, character]);

    // Вычисляем статус выполнения требований
    const requirementsMet = useMemo(() => checkRequirements().met, [checkRequirements]);

    // Ранний выход, если нет данных о способности
    if (!ability) return null;

    // Определяем, изучена ли способность
    const isLearned = character?.available_abilities?.some(ab => ab.id === ability.id);
    // Является ли атакой оружия
    const isWeaponAttack = ability.is_weapon_attack === true;

    // Определяем, можно ли активировать
    // Условие: передан обработчик И (способность изучена ИЛИ (это атака оружия И требования выполнены))
    const canActivate = !!handleApiAction && (isLearned || (isWeaponAttack && requirementsMet));

    // --- Формируем строку с информацией об уроне ---
    let damageInfo = '';
    if (ability.damage_formula) {
        const diceMatch = ability.damage_formula.match(/(\d+к\d+)/);
        let dicePart = diceMatch ? diceMatch[0] : null;
        if (!dicePart && ability.damage_formula && !ability.damage_formula.includes('Мод.')) {
            dicePart = ability.damage_formula;
        }
        let typePart = '';
        if (ability.damage_type && ability.damage_type.toLowerCase() !== 'лечение' && ability.damage_type.toLowerCase() !== 'см. оружие') {
             typePart = ` ${ability.damage_type.substring(0, 5)}.`;
        }
        if (dicePart) {
            damageInfo = `(${dicePart}${typePart})`;
        } else if (typePart) {
            damageInfo = `(${typePart.trim()})`;
        }
    }
    // --- Конец формирования строки урона ---

    // Формируем мета-информацию, включая урон
    const metaInfo = [
        `Ур. ${ability.level_required}`,
        ability.action_type,
        damageInfo, // Добавляем информацию об уроне
        ability.range ? `Дальн: ${ability.range}` : null,
        ability.cooldown ? `КД: ${ability.cooldown}` : null,
        ability.concentration ? '(Конц.)' : null
    ].filter(Boolean).join(' | '); // Убираем пустые значения и соединяем

    // Определяем цвет индикатора статуса
    const indicatorColor = isLearned                           ? theme.colors.secondary // Изучено
                           : requirementsMet                             ? theme.colors.warning // Не изучено, но доступно
                             : theme.colors.error; // Недоступно (требования не выполнены)

    // Определяем стиль карточки
    const cardStyle = {
        ...styles.card,
        ...(isLearned ? styles.learnedCard : styles.unlearnedCard),
        ...(!isLearned && !requirementsMet ? styles.unmetReqCard : {})
    };

    // Обработчик клика по кнопке "Акт."
    const handleActivateClick = (e) => {
        e.stopPropagation(); // Предотвращаем открытие модалки
        if (!canActivate) return; // Проверка

        const activationData = {
            activation_type: 'ability',
            target_id: ability.id
        };

        // Вызываем общий обработчик API
        handleApiAction(
            apiService.activateAction(character.id, activationData),
            `Способность '${ability.name}' активирована`,
            `Ошибка активации '${ability.name}'`
        );
    };

    // --- Рендеринг Карточки ---
    return (
        // Передаем ability в onClick, чтобы гарантировать передачу не-null значения при клике на карточку
        <div style={cardStyle} onClick={() => onClick(ability)} title={`Нажмите для деталей: ${ability.name}`}>
            {/* Основная информация: Индикатор + Название */}
            <div style={styles.mainInfo}>
                <span style={{...styles.statusIndicator, background: indicatorColor}}></span>
                <strong style={styles.name}>{ability.name}</strong>
            </div>
            {/* Мета-информация */}
            <div style={styles.metaInfo}>{metaInfo}</div>

            {/* Кнопка Активировать (маленькая) */}
            {/* Отображаем, если можно активировать */}
            {canActivate && (
                <button
                    onClick={handleActivateClick}
                    style={styles.activateButtonBrief}
                    title={`Активировать: ${ability.name}`}
                    // disabled={!canActivate} // Можно раскомментировать для визуальной блокировки
                >
                   Акт. {/* Сокращенный текст кнопки */}
                </button>
            )}
        </div>
    );
};

// --- Стили ---
const styles = {
    card: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: `1px solid ${theme.colors.surface}cc`,
        background: theme.colors.surface,
        minHeight: '50px',
        position: 'relative', // Для позиционирования кнопки
        paddingRight: '50px' // Оставляем место для кнопки справа
        // ':hover': { // Псевдокласс hover не работает в inline-стилях
        //     borderColor: theme.colors.primary,
        //     background: `${theme.colors.primary}11`,
        //     transform: 'translateX(2px)'
        // }
    },
    learnedCard: {
        // Можно добавить стили для изученных
    },
    unlearnedCard: {
        opacity: 0.85,
    },
    unmetReqCard: {
        opacity: 0.65,
        filter: 'grayscale(50%)'
    },
    mainInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '5px'
    },
    statusIndicator: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        flexShrink: 0,
        transition: 'background 0.3s ease'
    },
    name: {
        fontWeight: 'bold',
        color: theme.colors.text,
        fontSize: '0.95rem',
        wordBreak: 'break-word',
        overflow: 'hidden', // Обрезаем длинные названия
        textOverflow: 'ellipsis', // Добавляем троеточие
        whiteSpace: 'nowrap', // Предотвращаем перенос на новую строку
    },
    metaInfo: {
        fontSize: '0.75rem',
        color: theme.colors.textSecondary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginLeft: '18px' // Отступ слева, чтобы выровнять под именем
    },
    activateButtonBrief: { // Стиль для маленькой кнопки активации
        position: 'absolute',
        top: '50%',
        right: '10px',
        transform: 'translateY(-50%)',
        padding: '3px 6px',
        fontSize: '0.7rem',
        background: theme.colors.secondary + 'AA',
        color: theme.colors.text,
        border: `1px solid ${theme.colors.secondary}55`,
        borderRadius: '4px',
        cursor: 'pointer',
        transition: theme.transitions.default,
        fontWeight: 'bold',
        lineHeight: 1,
         ':hover': { // Псевдокласс hover не работает в inline-стилях
             background: theme.colors.secondary,
             color: theme.colors.background,
         },
         ':disabled': { // Стиль для неактивной кнопки
             opacity: 0.4,
             cursor: 'not-allowed',
             background: theme.colors.textSecondary + '55',
             borderColor: theme.colors.textSecondary + '33',
             color: theme.colors.textSecondary
         }
    }
};

export default AbilityCardBrief;