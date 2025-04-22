// src/features/CharacterDetail/components/CustomItemCard.js
import React from 'react';
import { theme } from '../../../styles/theme'; // Убедитесь, что путь правильный

// --- Иконки ---
// Иконка для произвольного предмета (например, бирка или нейтральный квадрат)
const CustomItemIcon = () => (
    <svg style={styles.cardIcon} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z"/>
    </svg>
);

const DropIcon = () => (
    <svg style={styles.dropIcon} viewBox="0 0 24 24">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
);

const StackIcon = () => (
     <svg style={styles.tagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-8h14V7H7v2z"/></svg>
);
// ---------------

const CustomItemCard = ({ customItem, onDrop }) => {
    if (!customItem) return null;

    const handleDropClick = (e) => {
        e.stopPropagation();
        if (onDrop) {
            let quantityToDrop = 1;
            if (customItem.quantity > 1) {
                const input = prompt(`Сколько "${customItem.name}" выбросить? (Максимум ${customItem.quantity})`, '1');
                const num = parseInt(input, 10);
                if (input === null) return;
                if (!isNaN(num) && num > 0 && num <= customItem.quantity) {
                    quantityToDrop = num;
                } else if (!isNaN(num) && num > customItem.quantity) {
                    alert(`Нельзя выбросить больше, чем есть (${customItem.quantity}). Будет выброшено ${customItem.quantity}.`);
                    quantityToDrop = customItem.quantity;
                } else {
                    alert("Некорректное количество. Будет выброшен 1 предмет.");
                    quantityToDrop = 1; // По умолчанию выбрасываем 1, если ввод некорректен
                }
            }
            onDrop(quantityToDrop);
        }
    };

    return (
        // Добавляем className для hover-эффектов кнопки удаления
        <div style={styles.card} className="custom-item-card">
            {/* Иконка типа слева */}
            <div style={styles.iconContainer}>
                <CustomItemIcon />
            </div>

            {/* Основной контент: Название и Описание */}
            <div style={styles.infoWrapper}>
                <span style={styles.itemName}>{customItem.name}</span>
                {customItem.description && (
                    <p style={styles.itemDescription}>{customItem.description}</p>
                )}
            </div>

            {/* Правая часть: Количество и Кнопка удаления */}
            <div style={styles.actionsWrapper}>
                <span style={styles.quantityTag} title="Количество">
                    <StackIcon /> x{customItem.quantity}
                </span>
                {onDrop && (
                    <button
                        onClick={handleDropClick}
                        style={styles.dropButton}
                        className="drop-button" // Класс для CSS hover
                        title={`Выбросить ${customItem.name}`}
                    >
                        <DropIcon />
                    </button>
                )}
            </div>
            {/* Стиль для hover кнопки удаления */}
            <style>{`
                .custom-item-card .drop-button {
                    opacity: 0; /* Скрыта по умолчанию */
                    transform: scale(0.8);
                    transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
                }
                .custom-item-card:hover .drop-button {
                    opacity: 0.7; /* Появляется при наведении на карточку */
                    transform: scale(1);
                }
                 .custom-item-card .drop-button:hover {
                    opacity: 1; /* Полная непрозрачность при наведении на саму кнопку */
                    background-color: ${theme.colors.error}33; /* Фон при наведении */
                 }
            `}</style>
        </div>
    );
}

// --- Улучшенные Стили для CustomItemCard ---
const styles = {
    card: {
        display: 'flex',
        alignItems: 'center', // Выравниваем по центру вертикально
        background: theme.colors.surface + 'aa',
        borderRadius: '8px',
        padding: '10px 12px', // Уменьшим вертикальный паддинг
        boxShadow: theme.effects.shadowSmall,
        border: `1px solid ${theme.colors.surfaceVariant}`, // Рамка вокруг
        gap: '10px',
        position: 'relative', // Для позиционирования кнопки (хотя сейчас она в потоке)
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        ':hover': {
            borderColor: theme.colors.secondary + '88',
            background: theme.colors.surface + 'cc',
        }
    },
    iconContainer: {
        width: '32px', // Размер контейнера иконки
        height: '32px',
        borderRadius: '6px',
        backgroundColor: theme.colors.textSecondary + '22', // Фон для иконки
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    cardIcon: { // Стиль иконки типа
        width: '20px',
        height: '20px',
        fill: theme.colors.textSecondary, // Цвет иконки
    },
    infoWrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px', // Меньше отступ
        flexGrow: 1,
        overflow: 'hidden',
        paddingRight: '5px', // Небольшой отступ от правого края (кол-во/кнопка)
    },
    itemName: {
        fontWeight: '500',
        color: theme.colors.text,
        fontSize: '0.95rem', // Чуть меньше
        wordBreak: 'break-word',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    itemDescription: {
        fontSize: '0.8rem', // Меньше
        color: theme.colors.textSecondary,
        margin: 0,
        whiteSpace: 'nowrap', // Описание в одну строку в карточке
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: 1.3,
    },
    actionsWrapper: {
        display: 'flex',
        alignItems: 'center', // Выравниваем кол-во и кнопку по центру
        gap: '10px', // Отступ между кол-вом и кнопкой
        flexShrink: 0,
    },
    quantityTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.85rem', // Меньше
        fontWeight: '500',
        color: theme.colors.textSecondary, // Сделаем менее ярким
        background: 'rgba(0,0,0,0.1)',
        padding: '3px 8px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
    },
    tagIcon: {
        width: '11px',
        height: '11px',
        fill: 'currentColor',
        opacity: 0.7,
    },
    dropButton: {
        display: 'flex', // Используем flex для центрирования иконки
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: theme.colors.textSecondary, // Начальный цвет - серый
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        width: '26px', // Размер кнопки
        height: '26px',
        padding: '0',
        // transition управляется через CSS в компоненте
        // ':hover': { ... } // Hover-эффект управляется через CSS
    },
    dropIcon: {
        width: '16px', // Размер иконки внутри кнопки
        height: '16px',
        fill: 'currentColor', // Цвет наследуется от кнопки
    }
};

export default CustomItemCard;