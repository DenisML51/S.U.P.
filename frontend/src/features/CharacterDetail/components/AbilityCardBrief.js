// src/features/CharacterDetail/components/AbilityCardBrief.js
import React, { useMemo, useCallback } from 'react';
import { theme } from '../../../styles/theme'; // Путь к теме

const AbilityCardBrief = ({ ability, character, onClick }) => {

    // --- ХУКИ ПЕРЕМЕЩЕНЫ ВВЕРХ ---
    // Проверка требований (логика взята из AbilityCardDetailed)
    const checkRequirements = useCallback(() => {
        // Добавим проверку на ability здесь, на случай если хук вызовется до return null
        if (!ability || !ability.skill_requirements || !character) return { met: true };
        try {
            let requirements = {};
            if (typeof ability.skill_requirements === 'string' && ability.skill_requirements.trim()) {
                 requirements = JSON.parse(ability.skill_requirements);
            } else { return { met: true }; } // Считаем выполненными, если требований нет

            let allMet = true;
            for (const skillKey in requirements) {
                // Проверяем наличие навыка и его значение
                if (!(skillKey in character) || character[skillKey] < requirements[skillKey]) {
                    allMet = false;
                    break; // Дальше можно не проверять
                }
            }
            return { met: allMet };
        } catch (e) {
             console.error("Failed to parse skill_requirements:", e);
             return { met: false }; // Считаем невыполненными при ошибке парсинга
        }
        // Зависимости хука: изменяются только если меняется сам объект ability или character
    }, [ability, character]); // Убрали ability.skill_requirements, т.к. ability достаточно

    const requirementsMet = useMemo(() => checkRequirements().met, [checkRequirements]);
    // --- КОНЕЦ ПЕРЕМЕЩЕННЫХ ХУКОВ ---

    // Ранний выход, если нет данных о способности
    if (!ability) return null;

    // Определяем статус изучения после проверки на ability
    const isLearned = character?.available_abilities?.some(ab => ab.id === ability.id);

    // Определяем стиль в зависимости от статуса
    const cardStyle = {
        ...styles.card,
        ...(isLearned ? styles.learnedCard : styles.unlearnedCard),
        ...(!isLearned && !requirementsMet ? styles.unmetReqCard : {}) // Применяем стиль, если не изучено И не выполнены требования
    };

    // Формируем мета-информацию
    const metaInfo = [
        `Ур. ${ability.level_required}`,
        ability.action_type,
        ability.range ? `Дальн: ${ability.range}` : null,
        ability.cooldown ? `КД: ${ability.cooldown}` : null,
        ability.concentration ? '(Конц.)' : null
    ].filter(Boolean).join(' | ');

    // Определяем цвет индикатора
    const indicatorColor = isLearned
                           ? theme.colors.secondary // Зеленый для изученных
                           : requirementsMet
                             ? theme.colors.warning // Желтый для неизученных, но доступных
                             : theme.colors.error; // Красный для недоступных

    return (
        // Передаем ability в onClick, чтобы гарантировать передачу не-null значения
        <div style={cardStyle} onClick={() => onClick(ability)} title={`Нажмите для деталей: ${ability.name}`}>
            <div style={styles.mainInfo}>
                {/* Используем вычисленный цвет индикатора */}
                <span style={{...styles.statusIndicator, background: indicatorColor}}></span>
                <strong style={styles.name}>{ability.name}</strong>
            </div>
            <div style={styles.metaInfo}>{metaInfo}</div>
        </div>
    );
};

// Стили для AbilityCardBrief (без изменений)
const styles = {
    card: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out', // Изменил transition
        border: `1px solid ${theme.colors.surface}cc`,
        background: theme.colors.surface,
        minHeight: '50px',
        position: 'relative', // Для возможного абсолютного позиционирования индикаторов
        '&:hover': { // Этот стиль не сработает в inline, нужен CSS/Styled Components
            borderColor: theme.colors.primary,
            background: `${theme.colors.primary}11`,
            transform: 'translateX(2px)' // Небольшой сдвиг при наведении
        }
    },
    learnedCard: {}, // Можно убрать специфичные стили рамки, если используется индикатор
    unlearnedCard: { opacity: 0.85 }, // Чуть менее прозрачный
    unmetReqCard: { opacity: 0.65, filter: 'grayscale(50%)' }, // Чуть менее серый
    mainInfo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' },
    statusIndicator: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, transition: 'background 0.3s ease' }, // Плавная смена цвета индикатора
    name: { fontWeight: 'bold', color: theme.colors.text, fontSize: '0.95rem' },
    metaInfo: { fontSize: '0.75rem', color: theme.colors.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: '18px' },
};

export default AbilityCardBrief;
