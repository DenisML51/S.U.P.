// src/features/CharacterDetail/components/CustomItemCard.js
import React from 'react';
import { theme } from '../../../styles/theme';

// Иконка для кнопки "выбросить" (можно взять из ItemCard или использовать текстовый символ)
const DropIcon = () => (
    <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
);
// Иконка для количества (если нужно)
const StackIcon = () => (
     <svg style={styles.tagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-8h14V7H7v2z"/></svg>
);


const CustomItemCard = ({ customItem, onDrop }) => {
    if (!customItem) return null;

    const handleDropClick = (e) => {
        e.stopPropagation();
        if (onDrop) {
            // Спросим, сколько выбросить, если больше 1
            let quantityToDrop = 1;
            if (customItem.quantity > 1) {
                const input = prompt(`Сколько "${customItem.name}" выбросить? (Максимум ${customItem.quantity})`, '1');
                const num = parseInt(input, 10);
                if (input === null) return; // Пользователь нажал отмену
                if (!isNaN(num) && num > 0 && num <= customItem.quantity) {
                    quantityToDrop = num;
                } else if (!isNaN(num) && num > customItem.quantity) {
                    alert(`Нельзя выбросить больше, чем есть (${customItem.quantity}). Будет выброшено ${customItem.quantity}.`);
                    quantityToDrop = customItem.quantity;
                } else {
                    alert("Некорректное количество. Будет выброшен 1 предмет.");
                    quantityToDrop = 1;
                }
            }
             onDrop(quantityToDrop); // Вызываем onDrop с количеством
        }
    };

    return (
        <div style={styles.card}>
            {/* Левая часть: Название и Описание */}
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
                        title={`Выбросить ${customItem.name}`}
                    >
                        <DropIcon />
                    </button>
                )}
            </div>
        </div>
    );
}

// Стили для CustomItemCard
const styles = {
    card: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start', // Выравнивание по верху
        background: theme.colors.surface + '99', // Слегка отличный фон от обычных
        borderRadius: '8px',
        padding: '12px 15px',
        boxShadow: theme.effects.shadowSmall,
        borderLeft: `4px solid ${theme.colors.textSecondary}`, // Серая рамка по умолчанию
        gap: '15px', // Отступ между инфо и действиями
    },
    infoWrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flexGrow: 1, // Занимает основное место
        overflow: 'hidden', // Обрезаем длинное описание
    },
    itemName: {
        fontWeight: '500', // Не такой жирный, как у обычных?
        color: theme.colors.text,
        fontSize: '1rem',
        wordBreak: 'break-word', // Перенос длинных названий
    },
    itemDescription: {
        fontSize: '0.85rem',
        color: theme.colors.textSecondary,
        margin: 0,
        whiteSpace: 'pre-wrap', // Сохраняем переносы строк
        lineHeight: 1.4,
        maxHeight: '60px', // Ограничим высоту описания в карточке
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    actionsWrapper: {
        display: 'flex',
        flexDirection: 'column', // Кол-во над кнопкой
        alignItems: 'flex-end', // Выравнивание по правому краю
        gap: '8px',
        flexShrink: 0, // Не сжимать
    },
     quantityTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        color: theme.colors.text,
        background: 'rgba(0,0,0,0.2)',
        padding: '3px 8px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
    },
     tagIcon: { // Стиль для иконки в теге количества
        width: '12px',
        height: '12px',
        fill: 'currentColor',
        opacity: 0.7,
    },
    dropButton: { // Кнопка удаления
         display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
         background: 'transparent',
         color: theme.colors.textSecondary,
         border: 'none',
         borderRadius: '50%',
         cursor: 'pointer',
         width: '28px',
         height: '28px',
         padding: 0, // Убираем паддинг
         transition: theme.transitions.default,
        ':hover': {
            color: theme.colors.error,
            background: `${theme.colors.error}22`,
        }
    },
};

export default CustomItemCard;