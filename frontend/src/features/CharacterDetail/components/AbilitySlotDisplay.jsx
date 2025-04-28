// frontend/src/features/CharacterDetail/components/AbilitySlotDisplay.js
import React from 'react';
import { theme } from '../../../styles/theme'; // Путь к теме
import * as apiService from '../../../api/apiService'; // Импорт для handleActivate

// --- Иконки ---
// Иконка для пустых слотов
const EmptySlotIcon = () => (
    <svg style={styles.emptyIcon} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
);

// Иконка для кнопки очистки
const ClearIcon = () => (
     <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"> {/* Уменьшили размер */}
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
);

// Иконка для отображения КД на самом слоте
const CooldownIcon = () => (
     <svg style={styles.cooldownIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
);
// -----------------------------

const AbilitySlotDisplay = ({
    slotData,            // { ability: AbilityOut | null, cooldown_remaining: number } | AbilityOut (для оружия)
    slotNumber,          // 1-5 для активных слотов, null или undefined для оружейных
    isAssignableSlot,    // boolean: true если это один из 5 слотов, false для оружейных
    characterId,         // ID персонажа для передачи в activateAction
    onAssignClick,       // (slotNumber) => void // Вызывается при клике на пустой назначаемый слот
    onClearClick,        // (slotNumber) => void // Вызывается при клике на кнопку очистки
    handleApiAction      // Функция для вызова activateAction
}) => {
    // Определяем способность и кулдаун
    const ability = isAssignableSlot ? slotData?.ability : slotData;
    const cooldownRemaining = isAssignableSlot ? (slotData?.cooldown_remaining ?? 0) : 0; // Оружейные пока без КД слота
    const isOnCooldown = cooldownRemaining > 0;
    const isEmptyAssignable = isAssignableSlot && !ability; // Пустой назначаемый слот

    // Обработчик клика по основному кругу слота
    const handleClick = (e) => {
        e.stopPropagation(); // Предотвращаем всплытие

        if (isEmptyAssignable && onAssignClick) {
            // Клик по пустому назначаемому слоту -> открыть модалку выбора
            onAssignClick(slotNumber);
        } else if (ability && !isOnCooldown && handleApiAction && characterId) {
            // Клик по заполненному слоту (любому, не на КД) -> активировать
            handleActivate();
        } else if (ability && isOnCooldown) {
            // Клик по слоту на КД -> ничего не делаем (или показываем сообщение)
             console.log(`Ability '${ability.name}' is on cooldown (${cooldownRemaining} turns left).`);
             // Можно добавить всплывающую подсказку или временное сообщение
        }
        // Другие случаи (клик по пустому не-назначаемому) - ничего не делают
    };

    // Функция активации способности
    const handleActivate = () => {
         if (!ability) return; // Доп. проверка
        const activationData = {
            activation_type: 'ability',
            target_id: ability.id
        };
         handleApiAction(
             apiService.activateAction(characterId, activationData), // Используем apiService
             `Способность '${ability.name}' активирована`,
             `Ошибка активации '${ability.name}'`
         );
    };

    // Обработчик клика по кнопке очистки
    const handleClear = (e) => {
        e.stopPropagation(); // Предотвратить активацию/открытие модалки при клике на крестик
        if (isAssignableSlot && onClearClick) {
            onClearClick(slotNumber);
        }
    };

    // Стили контейнера и слота
    const containerStyle = {
        ...styles.slotContainer,
        // Переменная для управления видимостью кнопки очистки через CSS
        // Устанавливаем 0.7, если слот заполнен и назначаемый, иначе 0
        '--clear-button-hover-opacity': (isAssignableSlot && ability) ? 0.7 : 0,
    };

     const slotBaseStyle = {
        ...styles.slotBase,
        ...(isOnCooldown ? styles.slotOnCooldown : {}),
        ...(ability ? styles.slotFilled : (isAssignableSlot ? styles.slotEmpty : styles.slotDisabled) ),
        ...( !isAssignableSlot && ability ? styles.weaponAbilitySlot : {})
    };

    return (
        // Обертка для позиционирования кнопки очистки
        <div style={containerStyle} className="ability-slot-container">
            {/* Кнопка очистки (только для заполненных назначаемых слотов) */}
            {isAssignableSlot && ability && onClearClick && (
                 <button
                    onClick={handleClear}
                    style={styles.clearButton}
                    className="clear-slot-button" // Класс для CSS hover
                    title="Убрать способность из слота"
                 >
                    <ClearIcon />
                </button>
            )}

            {/* Основной круг слота */}
            <div
                style={slotBaseStyle}
                onClick={handleClick} // Клик по кругу вызывает handleClick
                title={ // Динамическая подсказка
                    isEmptyAssignable ? `Назначить способность в слот ${slotNumber}`
                    : ability && isOnCooldown ? `${ability.name} (КД: ${cooldownRemaining} ход)`
                    : ability ? `Активировать: ${ability.name}`
                    : "Слот недоступен" // Для не-назначаемых пустых (не должно быть)
                }
            >
                {/* Оверлей кулдауна */}
                {ability && isOnCooldown && (
                    <div style={styles.cooldownOverlay}>
                         <CooldownIcon />
                         <span style={styles.cooldownText}>{cooldownRemaining}</span>
                    </div>
                )}

                {/* Контент слота */}
                {ability ? (
                    // Заполненный слот: отображаем только имя
                    <span style={styles.abilityName}>{ability.name}</span>
                ) : isAssignableSlot ? (
                    // Пустой НАЗНАЧАЕМЫЙ слот
                    <>
                        <EmptySlotIcon />
                        <span style={styles.emptyText}>Слот {slotNumber}</span>
                        {/* Кнопка "+" для назначения больше не нужна здесь */}
                    </>
                ) : (
                    // Пустой НЕ назначаемый (например, для оружия без способностей)
                    // Отображаем просто иконку пустого слота без текста
                    <EmptySlotIcon />
                )}
            </div>
             {/* Стиль для кнопки очистки (появляется при наведении на контейнер) */}
             <style>{`
                .ability-slot-container .clear-slot-button {
                    opacity: 0;
                    transform: scale(0.7) translate(50%, -50%); /* Начальное состояние */
                    transition: opacity 0.15s ease-out, transform 0.15s ease-out;
                    pointer-events: none; /* Неактивна по умолчанию */
                }
                /* Показываем кнопку при наведении на ВЕСЬ контейнер */
                .ability-slot-container:hover .clear-slot-button {
                    /* Используем CSS переменную для управления видимостью */
                    opacity: var(--clear-button-hover-opacity, 0); /* По умолчанию 0, если переменная не задана */
                    transform: scale(1) translate(50%, -50%); /* Конечное состояние */
                    pointer-events: auto; /* Становится активной */
                }
                /* Дополнительный hover для самой кнопки */
                .ability-slot-container .clear-slot-button:hover {
                    opacity: 1 !important; /* Полная непрозрачность */
                    transform: scale(1.1) translate(50%, -50%) !important; /* Увеличение */
                    background-color: ${theme.colors.error} !important; /* Красный фон */
                    border-color: ${theme.colors.error} !important; /* Красная рамка */
                    color: #fff !important; /* Белая иконка */
                }
             `}</style>
        </div>
    );
};

// --- Стили ---
const styles = {
     // Контейнер для слота и кнопки очистки
     slotContainer: {
         position: 'relative', // Для позиционирования кнопки очистки
         width: '75px',
         height: '75px',
         display: 'inline-block', // Или flex-item в родительском grid/flex
     },
    slotBase: { // Стили круга
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        border: `2px solid ${theme.colors.surfaceVariant}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative', // Для оверлея кулдауна
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        overflow: 'hidden',
        background: theme.colors.surface,
        boxShadow: `inset 0 0 10px rgba(0,0,0,0.5), ${theme.effects.shadowSmall}`,
        userSelect: 'none', // Запретить выделение текста
    },
    slotEmpty: { // Назначаемый пустой слот
        borderStyle: 'dashed',
        borderColor: theme.colors.textSecondary,
        ':hover': {
            borderColor: theme.colors.secondary,
            background: `${theme.colors.secondary}11`,
            transform: 'scale(1.05)',
        }
    },
     slotDisabled: { // Не назначаемый пустой (не должен использоваться)
         cursor: 'default',
         opacity: 0.3,
         ':hover': {
             borderColor: theme.colors.surfaceVariant,
             transform: 'scale(1)',
         }
     },
    slotFilled: { // Заполненный назначаемый слот
       borderColor: theme.colors.primary,
       ':hover': {
             borderColor: theme.colors.primary,
             transform: 'scale(1.05)',
       }
    },
    weaponAbilitySlot: { // Заполненный оружейный слот
        borderColor: theme.colors.secondary,
         ':hover': {
             borderColor: theme.colors.secondary,
             transform: 'scale(1.05)',
        }
    },
    slotOnCooldown: {
        cursor: 'not-allowed',
        borderColor: theme.colors.textSecondary + 'aa',
        ':hover': {
            borderColor: theme.colors.textSecondary + 'aa',
            transform: 'scale(1)',
        }
    },
    emptyIcon: {
        width: '24px',
        height: '24px',
        fill: theme.colors.textSecondary,
        opacity: 0.5,
        marginBottom: '5px', // Отступ до текста "Слот N"
    },
    emptyText: {
        fontSize: '0.7rem',
        color: theme.colors.textSecondary,
        opacity: 0.7,
    },
    abilityName: {
        fontSize: '0.75rem',
        color: theme.colors.text,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '0 5px',
        lineHeight: 1.25,
        maxHeight: 'calc(1.25em * 3)', // 3 строки
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    cooldownOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.80)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        padding: '5px',
        gap: '2px',
    },
     cooldownIcon: {
        width: '20px',
        height: '20px',
        fill: theme.colors.textSecondary,
        opacity: 0.8,
     },
    cooldownText: {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: theme.colors.primary,
        textShadow: `0 0 8px ${theme.colors.primary}cc`,
        lineHeight: 1,
    },
    // Кнопка очистки (позиционируется относительно slotContainer)
    clearButton: {
        position: 'absolute',
        top: '0px', // В правый верхний угол контейнера
        right: '0px',
        transform: 'translate(50%, -50%)', // Смещаем наполовину наружу
        background: theme.colors.surfaceVariant + 'cc',
        border: `1px solid ${theme.colors.textSecondary}55`,
        color: theme.colors.error + 'aa',
        borderRadius: '50%',
        width: '20px', // Маленький размер
        height: '20px',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 3, // Выше основного круга
        // transition и opacity управляются через CSS класс
    },
};

export default AbilitySlotDisplay;
