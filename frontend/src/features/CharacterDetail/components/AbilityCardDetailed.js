// src/features/CharacterDetail/components/AbilityCardDetailed.js
// Отображает детальную карточку способности во вкладке "Способности"
import React, { useCallback, useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Путь к теме
// Импортируем apiService для вызова activateAction
import * as apiService from '../../../api/apiService';

// Вспомогательная функция для получения цвета по редкости (если нужна для отображения ветки?)
const getBranchColor = (branchName) => {
    // Можно определить цвета для разных веток
    switch (branchName?.toLowerCase()) {
        case 'medic': return theme.colors.success || '#66BB6A';
        case 'mutant': return '#BA68C8'; // Purple
        case 'sharpshooter': return '#FFD54F'; // Yellow
        case 'scout': return '#4DB6AC'; // Teal
        case 'technician': return '#7986CB'; // Indigo
        case 'fighter': return theme.colors.error || '#CF6679'; // Red
        case 'juggernaut': return '#90A4AE'; // Blue Grey
        case 'weapon': return theme.colors.textSecondary; // Серый для оружейных
        default: return theme.colors.primary;
    }
};

// Основной Компонент
const AbilityCardDetailed = ({ ability, character, onClick, handleApiAction }) => {

    // Хук для проверки требований (обернут в useCallback)
    const checkRequirements = useCallback(() => {
        if (!ability || !ability.skill_requirements || !character) {
             return { met: true, details: null }; // Считаем выполненными, если нет требований/данных
        }
        try {
            let requirements = {};
            if (typeof ability.skill_requirements === 'string' && ability.skill_requirements.trim()) {
                requirements = JSON.parse(ability.skill_requirements);
            } else {
                return { met: true, details: null };
            }

            let allMet = true;
            const details = {};
            for (const skillKey in requirements) {
                const requiredValue = requirements[skillKey];
                const characterValue = character[skillKey] ?? 0; // Используем 0, если навык не найден
                const met = characterValue >= requiredValue;
                details[skillKey] = { required: requiredValue, current: characterValue, met: met };
                if (!met) allMet = false;
            }
            return { met: allMet, details: details };
        } catch (e) {
            console.error("AbilityCardDetailed: Failed to parse skill_requirements:", ability.skill_requirements, e);
            return { met: false, details: { error: `Ошибка парсинга: ${ability.skill_requirements}` } };
        }
    }, [ability, character]);

    // Вычисляем статус выполнения требований
    const requirementsCheck = useMemo(() => checkRequirements(), [checkRequirements]);

    // Ранний выход, если нет данных о способности
    if (!ability) return null;

    // Определяем, изучена ли способность персонажем
    const isLearned = character?.available_abilities?.some(ab => ab.id === ability.id);
    // Является ли атакой оружия
    const isWeaponAttack = ability.is_weapon_attack === true;

    // Определяем, можно ли активировать способность
    // Условие: передан обработчик И (способность изучена ИЛИ (это атака оружия И требования выполнены))
    // TODO: В будущем добавить проверку кулдауна, ресурсов (ОС) и т.д.
    const canActivate = !!handleApiAction && (isLearned || (isWeaponAttack && requirementsCheck.met));

    // Формируем строку с мета-информацией
    const metaInfo = [
        ability.action_type,
        ability.range ? `Дальн: ${ability.range}` : null,
        ability.cooldown ? `КД: ${ability.cooldown}` : null,
        ability.concentration ? '(Конц.)' : null
    ].filter(Boolean).join(' | ');

    // Формируем строку с требованиями для отображения
    let requirementsString = requirementsCheck.details ?
                                 Object.entries(requirementsCheck.details)
                                     .map(([key, val]) => {
                                         const skillName = key.replace('skill_', '').charAt(0).toUpperCase() + key.replace('skill_', '').slice(1);
                                         return `${skillName} ${val.required}${val.met ? '✓' : ` (у вас ${val.current})`}`;
                                     })
                                     .join(', ')
                             : (ability.skill_requirements ? ability.skill_requirements : null); // Показываем строку как есть, если парсинг не удался

    // Определяем стиль карточки
    const cardStyle = {
        ...styles.abilityCard,
        borderLeftColor: getBranchColor(ability.branch),
        ...(isLearned ? styles.learned : {}),
        ...(!isLearned && !requirementsCheck.met ? styles.unmetReq : {})
    };

    // Обработчик клика по кнопке "Активировать"
    const handleActivateClick = (e) => {
        e.stopPropagation(); // Предотвращаем открытие модалки при клике на кнопку
        if (!canActivate) return; // Двойная проверка

        // Формируем данные для запроса активации
        const activationData = {
            activation_type: 'ability',
            target_id: ability.id // Передаем ID способности
        };

        // Вызываем общий обработчик API из props
        handleApiAction(
            apiService.activateAction(character.id, activationData), // Промис вызова API
            `Способность '${ability.name}' активирована`, // Базовое сообщение успеха (бэкенд вернет детали)
            `Ошибка активации способности '${ability.name}'` // Префикс для сообщения об ошибке
        );
    };

    // --- Рендеринг Карточки ---
    return (
        // Обертка для клика по всей карточке (открытие модалки)
        <div onClick={() => onClick(ability)} style={{cursor: 'pointer', position: 'relative'}}>
            <div style={cardStyle} title={requirementsString ? `Требования: ${requirementsString}` : `Нажмите для деталей: ${ability.name}`}>
                {/* Заголовок: Ветка/Уровень и Мета-инфо */}
                <div style={styles.header}>
                    <span style={styles.branch}>[{ability.branch} / Ур. {ability.level_required}]</span>
                    <span style={styles.meta}>{metaInfo}</span>
                </div>

                {/* Название */}
                <h4 style={styles.name}>{ability.name}</h4>

                {/* Требования (если есть и не выполнены) */}
                {!requirementsCheck.met && requirementsString && (
                    <p style={styles.req}>Требования: {requirementsString}</p>
                 )}

                {/* Краткое Описание */}
                <p style={styles.desc}>
                    {ability.description.length > 150 ? `${ability.description.substring(0, 150)}...` : ability.description}
                </p>

                {/* Кнопка Активировать */}
                {/* Отображаем, если можно активировать */}
                {canActivate && (
                    <button
                        onClick={handleActivateClick}
                        style={styles.activateButton}
                        title={`Активировать: ${ability.name}`}
                        // disabled={!canActivate} // Можно добавить disabled, если нужно визуально блокировать
                    >
                       Активировать
                    </button>
                )}

                {/* Индикатор невыполненных требований (если не изучено) */}
                {!isLearned && !requirementsCheck.met && <span style={styles.reqNotMetIndicator} title={`Требования не выполнены: ${requirementsString}`}>!</span>}
            </div>
        </div>
    );
};


// --- Стили ---
const styles = {
    abilityCard: {
        background: theme.colors.surface,
        borderRadius: '8px',
        padding: '15px',
        boxShadow: theme.effects.shadow,
        transition: theme.transitions.default,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '4px solid transparent', // Цвет будет зависеть от ветки
        marginBottom: '15px',
        position: 'relative', // Для позиционирования кнопки и индикатора
        paddingBottom: '50px' // Оставляем место для кнопки активации
    },
    learned: { // Стиль для изученных
        // Можно добавить эффект, например, легкую подсветку
        // boxShadow: `0 0 10px ${theme.colors.secondary}33`,
    },
    unmetReq: { // Стиль для недоступных (не изучено и требования не выполнены)
        opacity: 0.65,
        filter: 'grayscale(60%)'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '8px',
    },
    branch: {
        fontSize: '0.7rem',
        color: theme.colors.textSecondary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    meta: {
        fontSize: '0.7rem',
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'right',
        whiteSpace: 'nowrap'
    },
    name: {
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontSize: '1.1rem',
        margin: '0 0 8px 0',
    },
    req: {
        fontSize: '0.75rem',
        color: theme.colors.warning, // Или error
        fontStyle: 'italic',
        margin: '0 0 8px 0',
        borderTop: `1px dashed ${theme.colors.surface}88`,
        paddingTop: '6px'
    },
    desc: {
        fontSize: '0.9rem',
        color: theme.colors.textSecondary,
        margin: 0,
        lineHeight: 1.5,
        flexGrow: 1, // Занимает доступное пространство
    },
    activateButton: {
        position: 'absolute',
        bottom: '10px',
        right: '15px',
        padding: '5px 10px',
        fontSize: '0.8rem',
        background: theme.colors.secondary + 'CC', // Цвет кнопки активации
        color: theme.colors.background,
        border: `1px solid ${theme.colors.secondary}`,
        borderRadius: '6px',
        cursor: 'pointer',
        transition: theme.transitions.default,
        fontWeight: 'bold',
        ':hover': { // Псевдокласс hover не работает в inline-стилях
            background: theme.colors.secondary,
            boxShadow: `0 0 8px ${theme.colors.secondary}88`
        },
         ':disabled': {
             opacity: 0.5,
             cursor: 'not-allowed',
             background: theme.colors.textSecondary,
             borderColor: theme.colors.textSecondary,
         }
    },
    reqNotMetIndicator: { // Индикатор "!" для невыполненных требований
        position: 'absolute',
        top: '10px',
        right: '15px',
        background: theme.colors.error,
        color: theme.colors.text,
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '0.8rem',
        boxShadow: `0 0 5px ${theme.colors.error}88`,
        cursor: 'help' // Подсказка при наведении (через title)
    }
};

export default AbilityCardDetailed;