// src/features/CharacterDetail/components/AbilityCardBrief.js
import React, { useMemo, useCallback } from 'react';
import { theme } from '../../../styles/theme';
import * as apiService from '../../../api/apiService'; // Импортируем apiService

// Иконки (можно вынести в общий файл)
const ActionTypeIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M13 6V3h-2v3H8l4 4 4-4h-3zm4.6 8.17l-4-4-4 4H3v2h18v-2h-2.4z"/></svg> );
const AdvantageIcon = () => ( <svg style={styles.modTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> );
const DisadvantageIcon = () => ( <svg style={styles.modTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg> );


const AbilityCardBrief = ({ ability, character, onClick, handleApiAction, weaponAbilityIds = new Set() }) => { // Добавлен weaponAbilityIds

    // --- Хуки в начале ---
    const checkRequirements = useCallback(() => {
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
                 const characterValue = character?.[skillKey] ?? 0;
                 const met = characterValue >= requiredValue;
                 details[skillKey] = { required: requiredValue, current: characterValue, met: met };
                 if (!met) allMet = false;
             }
             return { met: allMet, details: details };
         } catch (e) {
             console.error("AbilityCardBrief: Failed to parse skill_requirements:", ability?.skill_requirements, e);
             return { met: false, details: { error: `Ошибка парсинга: ${ability?.skill_requirements}` } };
         }
     }, [ability, character]);

    const requirementsCheck = useMemo(() => checkRequirements(), [checkRequirements]);

    const inherentModifier = useMemo(() => {
        if (!ability?.name) return null;
        const nameLower = ability.name.toLowerCase();
        if (nameLower.includes('точный выстрел')) return 'advantage';
        if (nameLower.includes('очередь') || nameLower.includes('снайперский выстрел в глаз')) return 'disadvantage';
        return null;
    }, [ability?.name]);
    // --- Конец хуков ---

    if (!ability) return null;

    const isLearned = character?.available_abilities?.some(ab => ab?.id === ability.id);
    const isGrantedByWeapon = weaponAbilityIds.has(ability.id); // Используем переданный Set

    // --- ИСПРАВЛЕНИЕ: Обновляем логику canActivate ---
    const canActivate = !!handleApiAction && requirementsCheck.met && (isLearned || isGrantedByWeapon);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    // Обработчик клика по кнопке "Активировать"
    const handleActivateClick = (e) => {
        e.stopPropagation(); // Предотвращаем открытие модалки
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

    const cardStyle = {
        ...styles.card,
        ...(!isLearned && !canActivate ? styles.unmetReq : {}) // Применяем стиль, если не изучено И не активно
    };

    return (
        <div style={cardStyle} onClick={() => onClick(ability)} title={`Ур. ${ability.level_required} - Нажмите для деталей`}>
            <div style={styles.content}>
                <div style={styles.nameContainer}>
                    <span style={styles.level}>Ур. {ability.level_required}</span>
                    <h5 style={styles.name}>{ability.name}</h5>
                    {/* Отображение тега Преим./Помехи */}
                    {inherentModifier === 'advantage' && (
                        <span style={{...styles.modifierTag, ...styles.advantageTag}} title="Способность дает Преимущество">
                            <AdvantageIcon />
                        </span>
                    )}
                    {inherentModifier === 'disadvantage' && (
                        <span style={{...styles.modifierTag, ...styles.disadvantageTag}} title="Способность накладывает Помеху">
                            <DisadvantageIcon />
                        </span>
                    )}
                </div>
                <div style={styles.meta}>
                    <span style={styles.detailTag} title="Тип действия"> <ActionTypeIcon /> {ability.action_type} </span>
                    {/* Можно добавить другие краткие теги при необходимости */}
                </div>
                 {/* Требования (если есть и не выполнены) - опционально для краткой карточки */}

            </div>
            {/* Кнопка активации */}
            {canActivate && (
                <button
                    onClick={handleActivateClick}
                    style={styles.activateButton}
                    title={`Активировать: ${ability.name}`}
                >
                   Акт.
                </button>
            )}
            {/* Индикатор, если не изучено и не активно */}
             {!isLearned && !canActivate && <span style={styles.reqNotMetIndicator} title={`Недоступно (не изучено или требования не выполнены)`}>!</span>}
        </div>
    );
};

// Стили
const styles = {
    card: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: theme.colors.surface,
        padding: '8px 12px',
        borderRadius: '6px',
        marginBottom: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s, box-shadow 0.2s',
        border: `1px solid ${theme.colors.surfaceVariant}`,
        position: 'relative', // Для позиционирования индикатора
        ':hover': {
            backgroundColor: theme.colors.surfaceVariant,
            boxShadow: `0 2px 5px rgba(0,0,0,0.2)`,
        }
    },
    unmetReq: { // Стиль для неактивных/неизученных
        opacity: 0.6,
        filter: 'grayscale(50%)',
        cursor: 'default', // Убираем курсор pointer
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        marginRight: '10px', // Отступ до кнопки
    },
    nameContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px',
    },
    level: {
        fontSize: '0.7rem',
        color: theme.colors.textSecondary,
        background: theme.colors.surfaceVariant,
        padding: '2px 5px',
        borderRadius: '4px',
        fontWeight: 'bold',
    },
    name: {
        fontSize: '0.95rem',
        fontWeight: '500',
        color: theme.colors.text,
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    meta: {
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
    },
    detailTag: { // Используем стиль из детальной карточки, но можно сделать еще компактнее
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.7rem',
        background: 'rgba(255,255,255,0.08)',
        color: theme.colors.textSecondary,
        padding: '2px 6px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)',
        whiteSpace: 'nowrap',
    },
    detailTagIcon: {
        width: '11px',
        height: '11px',
        fill: 'currentColor',
        flexShrink: 0,
        opacity: 0.8,
    },
    modifierTag: {
        display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 4px', // Еще компактнее
        borderRadius: '6px', border: '1px solid', flexShrink: 0,
    },
    advantageTag: { background: `${theme.colors.success || '#66BB6A'}22`, color: theme.colors.success || '#66BB6A', borderColor: `${theme.colors.success || '#66BB6A'}88`, },
    disadvantageTag: { background: `${theme.colors.error}22`, color: theme.colors.error, borderColor: `${theme.colors.error}88`, },
    modTagIcon: { width: '10px', height: '10px', fill: 'currentColor', },
    activateButton: {
        flexShrink: 0, // Не сжимать кнопку
        padding: '5px 8px',
        fontSize: '0.75rem',
        background: theme.colors.primary + 'AA',
        color: theme.colors.background,
        border: `1px solid ${theme.colors.primary}`,
        borderRadius: '5px',
        cursor: 'pointer',
        transition: theme.transitions.default,
        fontWeight: 'bold',
        ':hover': { background: theme.colors.primary, boxShadow: `0 0 6px ${theme.colors.primary}88` },
        ':disabled': { opacity: 0.5, cursor: 'not-allowed', background: theme.colors.textSecondary, borderColor: theme.colors.textSecondary, }
    },
     req: { // Индикатор невыполненных требований (если нужно показывать)
         fontSize: '0.7rem',
         color: theme.colors.warning,
         margin: '2px 0 0 0',
         fontWeight: 'bold',
     },
     reqNotMetIndicator: { // Индикатор "!" для полностью недоступных
         position: 'absolute',
         top: '4px',
         right: '4px',
         background: theme.colors.error,
         color: theme.colors.text,
         width: '14px',
         height: '14px',
         borderRadius: '50%',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         fontWeight: 'bold',
         fontSize: '0.65rem',
         boxShadow: `0 0 3px ${theme.colors.error}88`,
         cursor: 'help'
     },
};


export default AbilityCardBrief;
