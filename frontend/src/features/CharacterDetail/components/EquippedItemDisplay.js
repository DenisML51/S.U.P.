// src/features/CharacterDetail/components/EquippedItemDisplay.js
import React from 'react';
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

// Иконки для типов предметов (простые SVG)
const getItemIcon = (itemType) => {
    const iconStyle = { width: '20px', height: '20px', marginRight: '8px', fill: theme.colors.textSecondary };
    switch (itemType) {
        case 'weapon':
            return ( // Простой меч
                <svg style={iconStyle} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.71,5.29l-4-4a1,1,0,0,0-1.42,0l-12,12a1,1,0,0,0,0,1.42l4,4a1,1,0,0,0,1.42,0l12-12A1,1,0,0,0,21.71,5.29ZM11,18.59l-2-2L12.59,13,14,14.41ZM18.59,10,17,11.59l-4-4L14.59,6Zm-4-4L16,7.41,10.41,13,9,11.59Z"/>
                </svg>
            );
        case 'armor':
            return ( // Простой нагрудник
                <svg style={iconStyle} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,1A1,1,0,0,0,11,2V5.08A7,7,0,0,0,6,12v5a1,1,0,0,0,.25.66l3,2.84A1,1,0,0,0,10,21h4a1,1,0,0,0,.75-.3l3-2.84A1,1,0,0,0,18,17V12A7,7,0,0,0,13,5.08V2A1,1,0,0,0,12,1Zm4,11a5,5,0,0,1-8,0V12h8Z"/>
                </svg>
            );
        case 'shield':
            return ( // Простой щит
                <svg style={iconStyle} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,1A10,10,0,0,0,2,11v3.54a1,1,0,0,0,.41.81l7,4.46A1,1,0,0,0,10,20h4a1,1,0,0,0,.59-.19l7-4.46A1,1,0,0,0,22,14.54V11A10,10,0,0,0,12,1Zm0,17.74L5.88,15.51,5,15.17V11a7,7,0,0,1,14,0v4.17l-.88.34Z"/>
                </svg>
            );
        default: return null;
    }
};


const EquippedItemDisplay = ({ itemData }) => {
    // Отображение пустого слота
    if (!itemData || !itemData.item) {
        return (
            <div style={styles.emptySlotContainer}>
                 <span style={styles.emptySlotIcon}>⛶</span> {/* Иконка пустого слота */}
                 <p style={styles.emptySlotText}>Слот пуст</p>
            </div>
        );
    }

    const { item } = itemData;
    const rarityColor = getRarityColor(item.rarity);

    return (
        // Карточка с рамкой цвета редкости
        <div style={{ ...styles.equippedItemCardDisplay, borderLeftColor: rarityColor }}>
            {/* Иконка типа предмета */}
            {getItemIcon(item.item_type)}
            {/* Информация */}
            <div style={styles.equippedItemInfo}>
                <span style={styles.equippedItemName} title={item.description || item.name}>{item.name}</span>
                {/* Доп. информация */}
                {item.item_type === 'armor' && item.ac_bonus !== undefined && <span style={styles.equippedItemStat}> (КЗ: {item.ac_bonus})</span>}
                {item.item_type === 'shield' && item.ac_bonus !== undefined && <span style={styles.equippedItemStat}> (КЗ: +{item.ac_bonus})</span>}
                {item.item_type === 'weapon' && item.damage && <span style={styles.equippedItemStat}> ({item.damage})</span>}
                {/* Требования (если есть) */}
                {item.strength_requirement > 0 && <span style={styles.requirementText} title={`Требуется Сила ${item.strength_requirement}`}> (Сил:{item.strength_requirement})</span>}
                {item.stealth_disadvantage === true && <span style={styles.requirementText} title="Помеха Скрытности"> (Скр!)</span>}
            </div>
            {/* Способности оружия */}
             {item.item_type === 'weapon' && item.granted_abilities && item.granted_abilities.length > 0 && (
                 <div style={styles.weaponAbilities}>
                      {item.granted_abilities.map(ab => (
                          <span key={ab.id} style={styles.weaponAbilityTag} title={ab.description}>{ab.name}</span>
                      ))}
                 </div>
             )}
        </div>
    );
};

// Обновленные стили
const styles = {
    // Стили для пустого слота
    emptySlotContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '60px', // Минимальная высота для выравнивания
        opacity: 0.5,
    },
    emptySlotIcon: {
        fontSize: '1.8rem',
        color: theme.colors.textSecondary,
        marginBottom: '5px',
    },
    emptySlotText: {
        fontStyle: 'italic',
        color: theme.colors.textSecondary,
        fontSize: '0.85rem',
        margin: 0,
    },
    // Стили для отображения предмета
    equippedItemCardDisplay: {
        width: '100%',
        textAlign: 'left', // Выравнивание по левому краю
        padding: '10px 12px', // Внутренние отступы
        borderRadius: '6px',
        background: `rgba(255, 255, 255, 0.05)`, // Легкий фон
        borderLeft: '4px solid grey', // Рамка слева для цвета редкости
        display: 'flex',
        alignItems: 'center',
        transition: theme.transitions.default,
    },
    equippedItemInfo: {
        display: 'flex',
        flexDirection: 'column', // Имя и статы друг под другом
        flexGrow: 1,
        overflow: 'hidden', // Обрезаем длинный текст
    },
    equippedItemName: {
        fontWeight: 'bold', // Сделаем жирнее
        color: theme.colors.text,
        fontSize: '0.95rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    equippedItemStat: {
        fontSize: '0.8rem',
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    requirementText: {
        fontSize: '0.75rem',
        color: theme.colors.warning || '#FFA726', // Цвет предупреждения
        fontStyle: 'italic',
        marginLeft: '5px', // Отступ от статов
    },
    weaponAbilities: {
         marginTop: '4px', // Небольшой отступ сверху
         display: 'flex',
         flexWrap: 'wrap',
         gap: '4px',
         marginLeft: '28px', // Отступ слева (иконка + отступ)
     },
      weaponAbilityTag: {
          background: `${theme.colors.secondary}22`, // Фон с цветом акцента
          color: theme.colors.secondary,
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.7rem',
          border: `1px solid ${theme.colors.secondary}55`
      }
};

export default EquippedItemDisplay;
