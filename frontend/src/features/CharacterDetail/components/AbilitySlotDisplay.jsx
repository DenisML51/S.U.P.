// frontend/src/features/CharacterDetail/components/AbilitySlotDisplay.js
import React, { useMemo, useEffect, useRef } from 'react'; // Добавили useEffect, useRef
import { theme } from '../../../styles/theme';
import * as apiService from '../../../api/apiService';

// --- Иконки ---
const EmptySlotIcon = () => ( <svg style={styles.emptyIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg> );
const ClearIcon = () => ( <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> );
// ActionBlockedIcon больше не нужен, блокировка будет стилем
// CooldownIcon больше не нужен, будет SVG анимация

// --- Вспомогательная функция для парсинга общей длительности КД ---
// (Дублирует parse_cooldown_duration из бэкенда, можно вынести в utils)
const getTotalCooldownDuration = (cooldownString) => {
    if (!cooldownString) return 0;
    const match = cooldownString.match(/(\d+)\s+ход/);
    return match ? parseInt(match[1], 10) : 0;
};
// -------------------------------------------------------------

const AbilitySlotDisplay = ({
    slotData,
    slotNumber,
    isAssignableSlot,
    characterId,
    onAssignClick,
    onClearClick,
    handleApiAction,
    mainActionAvailable,
    bonusActionAvailable,
    reactionAvailable,
}) => {
    const ability = isAssignableSlot ? slotData?.ability : slotData;
    const cooldownRemaining = isAssignableSlot ? (slotData?.cooldown_remaining ?? 0) : 0;
    const isOnCooldown = cooldownRemaining > 0;
    const isEmptyAssignable = isAssignableSlot && !ability;

    // --- НОВОЕ: Получаем общую длительность КД для анимации ---
    const cooldownTotal = useMemo(() => {
        if (isAssignableSlot && ability?.cooldown) {
            return getTotalCooldownDuration(ability.cooldown);
        }
        return 0; // Оружейные или без КД
    }, [ability?.cooldown, isAssignableSlot]);
    // ------------------------------------------------------

    // Проверка доступности действия
    const isActionAvailable = useMemo(() => {
        if (!ability) return true;
        const type = ability.action_type || "Действие";
        if (type.startsWith("Действие") || type.startsWith("Атака")) return mainActionAvailable;
        if (type === "Бонусное действие") return bonusActionAvailable;
        if (type === "Реакция") return reactionAvailable;
        return true;
    }, [ability, mainActionAvailable, bonusActionAvailable, reactionAvailable]);

    const canActivate = ability && !isOnCooldown && isActionAvailable;

    // --- Обработчики ---
    const handleClick = (e) => {
        e.stopPropagation();
        if (isEmptyAssignable && onAssignClick) { onAssignClick(slotNumber); }
        else if (canActivate && handleApiAction && characterId) { handleActivate(); }
        else if (ability && isOnCooldown) { console.log(`On cooldown: ${cooldownRemaining}/${cooldownTotal}`); }
        else if (ability && !isActionAvailable) { console.log(`Action not available for: ${ability.name}`); }
    };

    const handleActivate = () => {
        if (!ability) return;
        const activationData = { activation_type: 'ability', target_id: ability.id };
        handleApiAction( apiService.activateAction(characterId, activationData), `Способность '${ability.name}' активирована`, `Ошибка активации '${ability.name}'`);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        if (isAssignableSlot && onClearClick) { onClearClick(slotNumber); }
    };

    // --- SVG Анимация Кулдауна ---
    const radius = 32; // Радиус круга анимации (чуть меньше основного)
    const circumference = 2 * Math.PI * radius;
    // Прогресс: 0 = полный КД, 1 = КД завершен
    const progress = cooldownTotal > 0 ? (cooldownTotal - cooldownRemaining) / cooldownTotal : 1;
    // Длина штриха для заполнения
    const strokeDashoffset = circumference * (1 - progress);

    // --- Стили ---
    const containerStyle = { ...styles.slotContainer, '--clear-button-hover-opacity': (isAssignableSlot && ability) ? 0.7 : 0, };
    const slotBaseStyle = {
        ...styles.slotBase,
        ...(isOnCooldown ? styles.slotOnCooldown : {}),
        ...(ability ? styles.slotFilled : (isAssignableSlot ? styles.slotEmpty : styles.slotDisabled) ),
        ...( !isAssignableSlot && ability ? styles.weaponAbilitySlot : {}),
        ...(ability && !isOnCooldown && !isActionAvailable ? styles.slotActionBlocked : {}), // Стиль блокировки действия
    };

    return (
        <div style={containerStyle} className="ability-slot-container">
            {/* Кнопка очистки */}
            {isAssignableSlot && ability && onClearClick && ( <button onClick={handleClear} style={styles.clearButton} className="clear-slot-button" title="Убрать"><ClearIcon /></button> )}

            {/* Основной круг слота */}
            <div
                style={slotBaseStyle}
                onClick={handleClick}
                title={ isEmptyAssignable ? `Назначить в слот ${slotNumber}` : ability && isOnCooldown ? `${ability.name} (КД: ${cooldownRemaining} ход)` : ability && !isActionAvailable ? `${ability.name} (Действие недоступно)` : ability ? `Активировать: ${ability.name}` : "Слот недоступен" }
            >
                {/* --- НОВОЕ: SVG для анимации кулдауна --- */}
                {ability && isOnCooldown && cooldownTotal > 0 && (
                    <svg style={styles.cooldownSvg} viewBox="0 0 70 70"> {/* Размер чуть больше радиуса */}
                        {/* Фоновый круг (серый) */}
                        <circle
                            cx="35" cy="35" r={radius}
                            fill="none"
                            stroke={theme.colors.surfaceVariant + '88'} // Полупрозрачный фон
                            strokeWidth="3"
                        />
                        {/* Круг прогресса (цветной) */}
                        <circle
                            cx="35" cy="35" r={radius}
                            fill="none"
                            stroke={theme.colors.primary} // Цвет прогресса
                            strokeWidth="3"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round" // Скругленные концы
                            transform="rotate(-90 35 35)" // Начинаем сверху
                            style={styles.cooldownProgressCircle} // Для transition
                        />
                        {/* Текст с оставшимся КД */}
                        <text x="50%" y="50%" dy=".3em" textAnchor="middle" style={styles.cooldownSvgText}>
                            {cooldownRemaining}
                        </text>
                    </svg>
                )}
                {/* --- КОНЕЦ SVG --- */}

                {/* Контент слота (поверх SVG) */}
                <div style={styles.slotContent}>
                    {ability ? (
                        <span style={styles.abilityName}>{ability.name}</span>
                    ) : isAssignableSlot ? (
                        <>
                            <EmptySlotIcon />
                            <span style={styles.emptyText}>Слот {slotNumber}</span>
                        </>
                    ) : (
                        <EmptySlotIcon />
                    )}
                </div>
            </div>
             {/* Стиль для кнопки очистки */}
             <style>{` .ability-slot-container .clear-slot-button { opacity: 0; transform: scale(0.7) translate(50%, -50%); transition: opacity 0.15s ease-out, transform 0.15s ease-out; pointer-events: none; } .ability-slot-container:hover .clear-slot-button { opacity: var(--clear-button-hover-opacity, 0); transform: scale(1) translate(50%, -50%); pointer-events: auto; } .ability-slot-container .clear-slot-button:hover { opacity: 1 !important; transform: scale(1.1) translate(50%, -50%) !important; background-color: ${theme.colors.error} !important; border-color: ${theme.colors.error} !important; color: #fff !important; } `}</style>
        </div>
    );
};

// --- Стили ---
const styles = {
     slotContainer: { position: 'relative', width: '80px', height: '80px', display: 'inline-block', }, // Увеличили размер
    slotBase: {
        width: '100%', height: '100%', borderRadius: '50%',
        border: `3px solid ${theme.colors.surfaceVariant}`, // Толще рамка
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease-in-out',
        overflow: 'hidden', background: theme.colors.surface,
        boxShadow: `inset 0 0 12px rgba(0,0,0,0.6), ${theme.effects.shadow}`, // Усилили тень
        userSelect: 'none',
    },
    slotEmpty: { borderStyle: 'dashed', borderColor: theme.colors.textSecondary + '88', background: `${theme.colors.surface}88`, ':hover': { borderColor: theme.colors.secondary, background: `${theme.colors.secondary}1a`, transform: 'scale(1.03)', } },
    slotDisabled: { cursor: 'default', opacity: 0.3, ':hover': { borderColor: theme.colors.surfaceVariant, transform: 'scale(1)', } },
    slotFilled: { borderColor: theme.colors.primary, ':hover': { borderColor: theme.colors.primary + 'cc', transform: 'scale(1.03)', } },
    weaponAbilitySlot: { borderColor: theme.colors.secondary, ':hover': { borderColor: theme.colors.secondary + 'cc', transform: 'scale(1.03)', } },
    slotOnCooldown: { cursor: 'not-allowed', borderColor: theme.colors.textSecondary + '55', filter: 'grayscale(60%)', ':hover': { borderColor: theme.colors.textSecondary + '55', transform: 'scale(1)', filter: 'grayscale(60%)' } },
    slotActionBlocked: { cursor: 'not-allowed', borderColor: theme.colors.error + '55', filter: 'grayscale(30%) brightness(0.8)', ':hover': { borderColor: theme.colors.error + '55', transform: 'scale(1)', filter: 'grayscale(30%) brightness(0.8)' } },
    emptyIcon: { width: '28px', height: '28px', fill: theme.colors.textSecondary, opacity: 0.4, marginBottom: '3px', },
    emptyText: { fontSize: '0.7rem', color: theme.colors.textSecondary, opacity: 0.6, },
    // Контейнер для контента поверх SVG
    slotContent: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '5px', // Отступы внутри круга
        zIndex: 2, // Поверх SVG
        pointerEvents: 'none', // Чтобы клик проходил на основной div
    },
    abilityName: {
        fontSize: '0.75rem', color: theme.colors.text, fontWeight: 'bold',
        textAlign: 'center', padding: '0 3px', lineHeight: 1.2,
        maxHeight: 'calc(1.2em * 3)', overflow: 'hidden', textOverflow: 'ellipsis',
        // Стили для текста на фоне кулдауна
        '$slotOnCooldown &': { opacity: 0.6 }, // Пример, если использовать CSS-in-JS библиотеку
        textShadow: '1px 1px 2px rgba(0,0,0,0.7)', // Тень для читаемости
    },
     // Стили для SVG кулдауна
     cooldownSvg: {
         position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
         zIndex: 1, // Под контентом, но поверх фона
     },
     cooldownProgressCircle: {
         transition: 'stroke-dashoffset 0.3s linear', // Плавная анимация заполнения
     },
     cooldownSvgText: {
         fontSize: '1.6rem', // Крупный текст КД
         fontWeight: 'bold',
         fill: theme.colors.primary, // Цвет текста КД
         textShadow: `0 0 5px ${theme.colors.primary}cc`,
         dominantBaseline: "middle", // Вертикальное выравнивание
     },
    // Убрали cooldownOverlay и cooldownIcon
    // Убрали actionBlockedOverlay и blockedIcon
    clearButton: {
        position: 'absolute', top: '0px', right: '0px', transform: 'translate(30%, -30%)', // Сдвигаем чуть меньше
        background: theme.colors.surfaceVariant + 'dd', border: `1px solid ${theme.colors.textSecondary}44`,
        color: theme.colors.error + 'cc', borderRadius: '50%', width: '22px', height: '22px',
        padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
    },
};

export default AbilitySlotDisplay;

