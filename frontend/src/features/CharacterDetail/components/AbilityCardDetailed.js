// src/features/CharacterDetail/components/AbilityCardDetailed.js
import React, { useCallback, useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Путь к теме
import * as apiService from '../../../api/apiService'; // Импортируем apiService

// Вспомогательная функция для цвета ветки (без изменений)
const getBranchColor = (branchName) => {
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

// --- ИЗМЕНЕНИЕ: Добавляем пропс weaponAbilityIds ---
const AbilityCardDetailed = ({ ability, character, onClick, handleApiAction, weaponAbilityIds = new Set() }) => {

    // Хук для проверки требований (без изменений)
    const checkRequirements = useCallback(() => {
        // ... (логика проверки требований остается прежней) ...
         if (!ability || !ability.skill_requirements || !character) {
             return { met: true, details: null };
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
                 // Используем 0, если навык не найден или null/undefined
                 const characterValue = character[skillKey] ?? 0;
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

    // Вычисляем статус выполнения требований (без изменений)
    const requirementsCheck = useMemo(() => checkRequirements(), [checkRequirements]);

    // Ранний выход, если нет данных о способности (без изменений)
    if (!ability) return null;

    // Определяем, изучена ли способность персонажем (без изменений)
    const isLearned = character?.available_abilities?.some(ab => ab?.id === ability.id);

    // Является ли атакой оружия (без изменений)
    // const isWeaponAttack = ability.is_weapon_attack === true; // Это поле больше не используется в логике активации

    // --- ИЗМЕНЕНИЕ: Определяем, предоставлена ли способность оружием ---
    const isGrantedByWeapon = weaponAbilityIds.has(ability.id);
    // -------------------------------------------------------------------

    // --- ИЗМЕНЕНИЕ: Обновляем логику canActivate ---
    // Можно активировать, если:
    // 1. Способность изучена персонажем (isLearned)
    // ИЛИ
    // 2. Способность предоставлена оружием (isGrantedByWeapon) И требования выполнены (requirementsCheck.met)
    const canActivate = !!handleApiAction && (isLearned || (isGrantedByWeapon && requirementsCheck.met));
    // -----------------------------------------------

    // Формируем строку с мета-информацией (без изменений)
    const metaInfo = [
        ability.action_type,
        ability.range ? `Дальн: ${ability.range}` : null,
        ability.cooldown ? `КД: ${ability.cooldown}` : null,
        ability.concentration ? '(Конц.)' : null
    ].filter(Boolean).join(' | ');

    // Формируем строку с требованиями для отображения (без изменений)
    let requirementsString = requirementsCheck.details ?
                                 Object.entries(requirementsCheck.details)
                                     .map(([key, val]) => {
                                         // Улучшаем отображение имени навыка
                                         const skillName = key.replace('skill_', '');
                                         const russianName = { /* карта переводов, если нужна */ strength: 'Сила', dexterity: 'Ловкость' }[skillName] || skillName.charAt(0).toUpperCase() + skillName.slice(1);
                                         return `${russianName} ${val.required}${val.met ? '✓' : ` (у вас ${val.current})`}`;
                                     })
                                     .join(', ')
                             : (ability.skill_requirements ? ability.skill_requirements : null);

    // Определяем стиль карточки (без изменений)
    const cardStyle = {
        ...styles.abilityCard,
        borderLeftColor: getBranchColor(ability.branch),
        ...(isLearned ? styles.learned : {}),
        // Условие для недоступных теперь только !canActivate, если не изучена и не предоставлена/требования не выполнены
        ...(!isLearned && !canActivate ? styles.unmetReq : {})
    };

    // Обработчик клика по кнопке "Активировать" (без изменений)
    const handleActivateClick = (e) => {
        e.stopPropagation();
        if (!canActivate) return;
        const activationData = {
            activation_type: 'ability',
            target_id: ability.id
        };
        handleApiAction(
            apiService.activateAction(character.id, activationData),
            `Способность '${ability.name}' активирована`,
            `Ошибка активации способности '${ability.name}'`
        );
    };

    // --- Рендеринг Карточки ---
    return (
        <div onClick={() => onClick(ability)} style={{cursor: 'pointer', position: 'relative'}}>
            <div style={cardStyle} title={requirementsString ? `Требования: ${requirementsString}` : `Нажмите для деталей: ${ability.name}`}>
                {/* Заголовок */}
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
                    {ability.description?.length > 150 ? `${ability.description.substring(0, 150)}...` : ability.description}
                </p>
                {/* Кнопка Активировать */}
                {/* Отображаем, если можно активировать */}
                {canActivate && (
                    <button
                        onClick={handleActivateClick}
                        style={styles.activateButton}
                        title={`Активировать: ${ability.name}`}
                    >
                       Активировать
                    </button>
                )}
                {/* Индикатор недоступности (если не изучено и нельзя активировать) */}
                {!isLearned && !canActivate && <span style={styles.reqNotMetIndicator} title={`Недоступно (не изучено или требования не выполнены)`}>!</span>}
            </div>
        </div>
    );
};

// Стили (без изменений)
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
