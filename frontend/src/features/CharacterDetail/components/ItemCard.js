// src/features/CharacterDetail/components/ItemCard.js
import React, { useMemo } from 'react';
import { theme } from '../../../styles/theme';

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

// Функция для получения цвета по типу предмета (можно вынести)
const getTypeColor = (itemType) => {
     switch (itemType) {
        case 'weapon': return theme.colors.error || '#CF6679';
        case 'armor': return '#64B5F6'; // Light Blue
        case 'shield': return '#81C784'; // Light Green
        case 'general': return theme.colors.primary || '#BB86FC';
        case 'ammo': return theme.colors.warning || '#FFA726';
        default: return theme.colors.textSecondary;
    }
}

// Импортируем русские названия типов из другого компонента или определяем здесь
const ITEM_TYPES = {
    all: 'Все',
    weapon: 'Оружие',
    armor: 'Броня',
    shield: 'Щиты',
    general: 'Общее',
    ammo: 'Патроны'
};


const ItemCard = ({ character, invItem, onEquip, onDrop, onUnequip, onUse }) => {

    const equippedSlot = useMemo(() => {
        if (!invItem || !character) return null;
        const inventoryItemId = invItem.id;
        if (character.equipped_armor?.id === inventoryItemId) return 'armor';
        if (character.equipped_shield?.id === inventoryItemId) return 'shield';
        if (character.equipped_weapon1?.id === inventoryItemId) return 'weapon1';
        if (character.equipped_weapon2?.id === inventoryItemId) return 'weapon2';
        return null;
    }, [character, invItem]);

    if (!invItem || !invItem.item) return null;

    const { item, quantity, id: inventoryItemId } = invItem;
    const isEquippable = ['weapon', 'armor', 'shield'].includes(item.item_type);
    const isUsable = item.item_type === 'general';
    const isEquipped = equippedSlot !== null;
    const isMedicalItem = item.category === 'Медицина';

    const rarityColor = getRarityColor(item.rarity);
    const typeColor = getTypeColor(item.item_type);

    const cardStyle = {
        ...styles.itemCard,
        borderLeftColor: rarityColor,
        backgroundColor: isEquipped ? `${theme.colors.secondary}1A` : styles.itemCard.backgroundColor,
    };


    // Обработчики действий
    const handleEquipToggleClick = () => { if (isEquipped) { if (onUnequip && equippedSlot) onUnequip(equippedSlot); } else if (isEquippable) { if (onEquip) { let targetSlot = item.item_type; if (item.item_type === 'weapon') { targetSlot = !character?.equipped_weapon1 ? 'weapon1' : (!character?.equipped_weapon2 ? 'weapon2' : 'weapon1'); } onEquip(inventoryItemId, targetSlot); } } };
    const handleUseClick = () => { if (onUse) onUse(inventoryItemId, item); };
    const handleDropClick = () => { if(onDrop) onDrop(inventoryItemId); };

    const strengthRequirement = item?.strength_requirement ?? 0;
    const stealthDisadvantage = item?.stealth_disadvantage ?? false;

    return (
        <div style={cardStyle} title={item.description || item.name}>
            {/* Заголовок карточки */}
            <div style={styles.itemCardHeader}>
                <div style={styles.headerLeft}>
                     <span style={styles.itemName}>
                         {item.name}
                         {!isMedicalItem && !isEquipped && quantity > 1 && ` (x${quantity})`}
                     </span>
                     <span style={{...styles.itemTypeBadge, backgroundColor: `${typeColor}33`, color: typeColor, borderColor: `${typeColor}88`}}>
                         {ITEM_TYPES[item.item_type] || item.item_type}
                     </span>
                </div>
                 <span style={styles.itemCategory}>[{item.category} / {item.rarity}]</span>
            </div>

            {/* Описание предмета (можно закомментировать для большей компактности) */}
            {/* item.description && <p style={styles.itemDescription}>{item.description}</p> */}

            {/* Детали предмета */}
            <div style={styles.detailsContainer}> {/* Обертка для деталей */}
                {item.item_type === 'weapon' && <span style={styles.itemDetails}>Урон: {item.damage} ({item.damage_type}) {item.is_two_handed ? '[Двуруч.]' : ''}</span>}
                {item.item_type === 'armor' && <span style={styles.itemDetails}>AC: {item.ac_bonus} ({item.armor_type}) {item.max_dex_bonus !== null ? `[Ловк. макс +${item.max_dex_bonus}]` : ''}</span>}
                {item.item_type === 'shield' && <span style={styles.itemDetails}>Бонус AC: +{item.ac_bonus}</span>}
                {isMedicalItem && <span style={styles.itemDetails}>Заряды: {quantity}</span>}
                {item.item_type === 'general' && !isMedicalItem && item.uses && <span style={styles.itemDetails}>Исп.: {item.uses}</span>}
                {item.item_type === 'general' && !isMedicalItem && item.effect && <span style={styles.itemDetails}>Эффект: {item.effect}</span>}
                {item.item_type === 'ammo' && item.ammo_type && <span style={styles.itemDetails}>Тип: {item.ammo_type}</span>}
                {item.item_type === 'ammo' && item.effect && <span style={styles.itemDetails}>Эффект: {item.effect}</span>}
                {/* Требования */}
                {strengthRequirement > 0 && <span style={styles.itemRequirement}>Треб. Силы: {strengthRequirement}</span>}
                {stealthDisadvantage === true && <span style={styles.itemRequirement}>Помеха Скрытности</span>}
            </div>

            {/* Кнопки действий */}
            <div style={styles.itemCardActions}>
                 {isUsable && onUse && <button onClick={handleUseClick} style={{...styles.actionButton, ...styles.useButton}}>Исп.</button>}
                 {isEquippable && (onEquip || onUnequip) && (
                     <button onClick={handleEquipToggleClick} style={styles.actionButton}>
                         {isEquipped ? 'Снять' : 'Экип.'}
                     </button>
                 )}
                 {onDrop && <button onClick={handleDropClick} style={{...styles.actionButton, ...styles.dropButton}}>Выбр.</button>}
            </div>
        </div>
    );
};

// Обновленные стили для компактности
const styles = {
    itemCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: '6px', // Чуть меньше скругление
        padding: '8px 12px', // Уменьшили вертикальный и горизонтальный паддинг
        boxShadow: theme.effects.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px', // Уменьшили основной gap
        transition: theme.transitions.default,
        borderLeft: '4px solid grey', // Уменьшили толщину рамки редкости
        position: 'relative',
    },
    itemCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: `1px dashed ${theme.colors.surface}66`, // Тоньше разделитель
        paddingBottom: '4px', // Уменьшили отступ
        marginBottom: '4px', // Уменьшили отступ
        gap: '8px',
    },
    headerLeft: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '3px', // Уменьшили gap
        overflow: 'hidden',
        marginRight: '5px',
    },
    itemName: {
        fontWeight: 'bold',
        color: theme.colors.primary,
        wordBreak: 'break-word',
        fontSize: '0.9rem', // Немного уменьшили шрифт
        lineHeight: 1.2,
    },
    itemTypeBadge: {
        fontSize: '0.65rem', // Уменьшили шрифт
        padding: '1px 5px', // Уменьшили паддинг
        borderRadius: '4px',
        border: '1px solid',
        fontWeight: '500',
        textTransform: 'uppercase',
        display: 'inline-block',
    },
    itemCategory: {
        fontSize: '0.7rem', // Уменьшили шрифт
        color: theme.colors.textSecondary,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        textAlign: 'right',
        paddingTop: '1px', // Скорректировали отступ
    },
    itemDescription: { // Оставим стиль, если решите вернуть описание
        fontSize: '0.8rem', // Уменьшили
        color: theme.colors.text,
        margin: '2px 0 2px 0', // Уменьшили отступы
        lineHeight: 1.3,
    },
    detailsContainer: { // Обертка для деталей и требований
        display: 'flex',
        flexDirection: 'column', // Детали друг под другом
        gap: '2px', // Минимальный отступ
        marginTop: '2px', // Небольшой отступ сверху
    },
    itemDetails: {
        fontSize: '0.75rem', // Уменьшили
        color: theme.colors.textSecondary,
        margin: '0', // Убрали вертикальные отступы
        fontStyle: 'italic',
        whiteSpace: 'nowrap', // Предотвращаем перенос деталей
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    itemRequirement: {
        fontSize: '0.7rem', // Уменьшили
        color: theme.colors.warning || theme.colors.error,
        margin: '0', // Убрали вертикальные отступы
        fontStyle: 'italic',
        fontWeight: 'bold',
         whiteSpace: 'nowrap',
    },
    itemCardActions: {
        display: 'flex',
        gap: '6px', // Уменьшили
        marginTop: '6px', // Уменьшили
        paddingTop: '6px', // Уменьшили
        justifyContent: 'flex-end',
        borderTop: `1px solid ${theme.colors.surface}44` // Тоньше разделитель
    },
    actionButton: {
        padding: '3px 8px', // Уменьшили кнопку
        fontSize: '0.75rem', // Уменьшили шрифт
        borderRadius: '4px', // Меньше скругление
        border: 'none', cursor: 'pointer', transition: theme.transitions.default, whiteSpace: 'nowrap', background: theme.colors.textSecondary, color: theme.colors.background
    },
    useButton: { background: theme.colors.secondary, color: theme.colors.background },
    dropButton: { background: theme.colors.error, color: theme.colors.text },
};


export default ItemCard;
