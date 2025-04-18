// src/features/CharacterDetail/components/AbilityCardDetailed.js
import React, { useCallback, useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Обновленный путь

// Функция для получения цвета по редкости (можно вынести в utils или theme)
const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
        case 'необычная': return theme.colors.success || '#66BB6A'; // Green
        case 'редкая': return '#2196F3'; // Blue
        case 'очень редкая': return theme.colors.primary || '#BB86FC'; // Purple
        case 'экзотика': return theme.colors.warning || '#FFA726'; // Orange
        case 'обычная':
        default: return theme.colors.textSecondary || 'grey'; // Grey
    }
};

const AbilityCardDetailed = ({ ability, character, onClick }) => { // Добавили onClick

    // Функция проверки требований (оптимизирована)
    const checkRequirements = useCallback(() => {
        // Если требований нет или нет данных персонажа, считаем выполненными
        if (!ability.skill_requirements || !character) {
            return { met: true, details: [] };
        }
        try {
             // Парсим JSON только если это непустая строка
             let requirements = {};
             if (typeof ability.skill_requirements === 'string' && ability.skill_requirements.trim()) {
                  requirements = JSON.parse(ability.skill_requirements);
             } else {
                  return { met: true, details: [] }; // Нет требований
             }

            let allMet = true;
            const details = Object.entries(requirements).map(([skillKey, requiredValue]) => {
                 // Проверяем наличие навыка у персонажа
                if (!(skillKey in character)) {
                     console.warn(`AbilityCard: Skill key "${skillKey}" not found in character data for ability "${ability.name}".`);
                     allMet = false;
                     return { key: skillKey, required: requiredValue, current: '?', met: false };
                }
                const currentValue = character[skillKey];
                const met = currentValue >= requiredValue;
                if (!met) allMet = false;
                 // Форматируем имя навыка для отображения
                const skillDisplayName = skillKey.replace(/^skill_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Преобразуем skill_logic -> Logic
                return { key: skillDisplayName, required: requiredValue, current: currentValue, met: met };
            });
            return { met: allMet, details: details };
        } catch (e) {
             console.error(`AbilityCard: Failed to parse skill_requirements JSON for ability "${ability.name}":`, ability.skill_requirements, e);
             // Возвращаем информацию об ошибке
             return { met: false, details: [{key: 'Ошибка парсинга требований', required: '', current: '', met: false}] };
        }
    }, [ability, character]);

    const requirementsCheck = useMemo(() => checkRequirements(), [checkRequirements]);

    // Определяем стили в зависимости от статуса изучения и требований
    const isLearned = character?.available_abilities?.some(ab => ab.id === ability.id);
    const cardStyle = {
        ...styles.abilityCard, // Применяем базовый стиль
        ...(isLearned ? styles.learnedAbilityCard : styles.unlearnedAbilityCard),
        ...(!isLearned && !requirementsCheck.met ? styles.unmetReqAbilityCard : {})
    };


    return (
        // Оборачиваем карточку в div с обработчиком клика
        <div onClick={() => onClick(ability)} style={{cursor: 'pointer'}}>
            <div style={cardStyle} title={`Нажмите для деталей: ${ability.name}`}>
                {/* Название и мета-информация */}
                <div style={styles.cardHeader}>
                    <strong style={styles.abilityName}>{ability.name}</strong>
                    <span style={styles.abilityMeta}>
                        ({ability.action_type}{ability.cooldown ? `, КД: ${ability.cooldown}` : ''})
                    </span>
                </div>
                <span style={styles.abilityBranchLevel}>Ур. {ability.level_required} [{ability.branch}]</span>

                 {/* Отображение требований */}
                 {requirementsCheck.details.length > 0 && (
                      <div style={{...styles.abilityReqContainer, color: requirementsCheck.met ? theme.colors.secondary : theme.colors.error }}>
                          Треб.: {requirementsCheck.details.map((req, index) => (
                             <span key={req.key} title={`Нужно: ${req.required}, У вас: ${req.current}`}>
                                 {index > 0 ? ', ' : ''}
                                 <span style={{ textDecoration: req.met ? 'none' : 'line-through' }}>
                                      {req.key} {req.required}
                                 </span>
                             </span>
                         ))}
                      </div>
                  )}


                {/* Краткое описание */}
                <p style={styles.abilityDescCard}>
                    {/* Обрезаем длинное описание */}
                    {ability.description.length > 100 ? `${ability.description.substring(0, 97)}...` : ability.description}
                 </p>

                {/* Можно добавить иконку или индикатор статуса (изучено/не изучено) */}
                 {!isLearned && !requirementsCheck.met && <span style={styles.reqNotMetIndicator}>!</span>}
            </div>
        </div>
    );
};

// Стили для AbilityCardDetailed
const styles = {
    abilityCard: {
        background: theme.colors.surface,
        borderRadius: '8px',
        padding: '15px',
        boxShadow: theme.effects.shadow,
        transition: theme.transitions.default,
        display: 'flex',
        flexDirection: 'column',
        // height: '100%', // <<< УДАЛЕНО СВОЙСТВО HEIGHT
        borderLeft: '4px solid transparent', // Базовая прозрачная рамка
        marginBottom: '15px', // Оставляем отступ снизу
    },
    learnedAbilityCard: {
        borderLeftColor: theme.colors.secondary // Цвет для изученной
    },
    unlearnedAbilityCard: {
        opacity: 0.7,
        filter: 'grayscale(50%)' // Серая для неизученной
    },
    unmetReqAbilityCard: {
        borderLeftColor: theme.colors.error, // Красная рамка, если требования не выполнены
        filter: 'grayscale(70%)',
        opacity: 0.6
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start', // Выравнивание по верху для длинных названий
        marginBottom: '4px'
    },
    abilityName: {
        fontWeight: 'bold',
        color: theme.colors.secondary,
        display: 'block', // Чтобы занимало всю ширину до меты
        fontSize: '1rem',
        marginRight: '5px', // Отступ от меты
        wordBreak: 'break-word' // Перенос длинных названий
    },
    abilityMeta: {
        fontSize: '0.75rem',
        color: theme.colors.textSecondary,
        whiteSpace: 'nowrap',
        textAlign: 'right',
        flexShrink: 0 // Не сжимать мету
    },
    abilityBranchLevel: {
        fontSize: '0.8rem',
        color: theme.colors.textSecondary,
        display: 'block',
        marginBottom: '8px'
    },
    abilityReqContainer: {
        fontSize: '0.75rem',
        display: 'block',
        marginBottom: '8px',
        fontStyle: 'italic',
        wordBreak: 'break-word' // Перенос длинных требований
    },
    abilityDescCard: {
        fontSize: '0.9rem',
        color: theme.colors.text,
        margin: '5px 0',
        flexGrow: 1, // Описание занимает доступное место
        lineHeight: 1.4
    },
    reqNotMetIndicator: {
        position: 'absolute',
        top: '5px',
        right: '5px',
        color: theme.colors.error,
        fontWeight: 'bold',
        fontSize: '1.2rem'
    },
     // Стили для эффектов спасброска убраны из карточки, т.к. она стала краткой
};

export default AbilityCardDetailed;
