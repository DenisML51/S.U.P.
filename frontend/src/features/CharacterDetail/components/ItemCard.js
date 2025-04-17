// src/features/CharacterDetail/components/ItemCard.js
import React, { useMemo } from 'react';
import { theme } from '../../../styles/theme';

const ItemCard = ({ character, invItem, onEquip, onDrop, onUnequip, onUse }) => {

    // --- DEBUG: Проверка полученных props ---
    console.log(
        `ItemCard Render - Item Name: ${invItem?.item?.name ?? 'N/A'}`,
        'Received Props ->',
        `onEquip: ${!!onEquip}, onDrop: ${!!onDrop}, onUnequip: ${!!onUnequip}, onUse: ${!!onUse}`
    );
    // --- END DEBUG ---

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

    // --- DEBUG: Проверка вычисленных значений ---
    console.log(
        `ItemCard Details - Item: ${item.name}, Type: ${item.item_type}`,
        `isEquippable: ${isEquippable}, isEquipped: ${isEquipped}`
    );
    // --- END DEBUG ---

    const handleEquipToggleClick = () => {
        if (isEquipped) {
            if (onUnequip && equippedSlot) {
                console.log(`ItemCard: Calling onUnequip for slot ${equippedSlot}`);
                onUnequip(equippedSlot);
            } else {
                console.warn("ItemCard: onUnequip or equippedSlot is missing!"); // Отладка
            }
        } else if (isEquippable) {
            if (onEquip) {
                console.log(`ItemCard: Calling onEquip for item ${inventoryItemId}`);
                let targetSlot = item.item_type;
                if (item.item_type === 'weapon') {
                    targetSlot = !character?.equipped_weapon1 ? 'weapon1' : (!character?.equipped_weapon2 ? 'weapon2' : 'weapon1');
                    console.log(`ItemCard: Determined weapon slot: ${targetSlot}`);
                }
                 onEquip(inventoryItemId, targetSlot);
             } else {
                 console.warn("ItemCard: onEquip is missing!"); // Отладка
             }
        }
    };

    const handleUseClick = () => { if (onUse) onUse(inventoryItemId, item); };
    const handleDropClick = () => { if(onDrop) onDrop(inventoryItemId); };

    const strengthRequirement = item?.strength_requirement ?? 0;
    const stealthDisadvantage = item?.stealth_disadvantage ?? false;

    // --- DEBUG: Проверка условия рендера кнопки ---
    const shouldRenderEquipButton = isEquippable && (!!onEquip || !!onUnequip); // Используем !! для явного bool
     console.log(`ItemCard Button Render Check - Item: ${item.name}, shouldRenderEquipButton: ${shouldRenderEquipButton}`);
    // --- END DEBUG ---

    return (
        <div style={{ ...styles.itemCard, ...(isEquipped ? styles.equippedItemCard : {}) }} title={item.description || item.name}>
            {/* ... Заголовок, Детали, Требования ... */}
            <div style={styles.itemCardHeader}>
                 <span style={styles.itemName}>
                     {item.name} {isEquipped ? `(Экип. - ${equippedSlot})` : (quantity > 1 ? `(x${quantity})` : '')}
                 </span>
                 <span style={styles.itemCategory}>[{item.category} / {item.rarity}]</span>
            </div>
            {item.item_type === 'weapon' && <p style={styles.itemDetails}>Урон: {item.damage} ({item.damage_type}) {item.is_two_handed ? '[Двуруч.]' : ''}</p>}
            {item.item_type === 'armor' && <p style={styles.itemDetails}>AC: {item.ac_bonus} ({item.armor_type}) {item.max_dex_bonus !== null ? `[Ловк. макс +${item.max_dex_bonus}]` : ''}</p>}
            {item.item_type === 'shield' && <p style={styles.itemDetails}>Бонус AC: +{item.ac_bonus}</p>}
            {item.item_type === 'general' && item.uses && <p style={styles.itemDetails}>Исп.: {item.uses}</p>}
            {item.item_type === 'general' && item.effect && <p style={styles.itemDetails}>Эффект: {item.effect}</p>}
            {item.item_type === 'ammo' && item.ammo_type && <p style={styles.itemDetails}>Тип: {item.ammo_type}</p>}
             {item.item_type === 'ammo' && item.effect && <p style={styles.itemDetails}>Эффект: {item.effect}</p>}
             {strengthRequirement > 0 && <p style={styles.itemRequirement}>Треб. Силы: {strengthRequirement}</p>}
            {stealthDisadvantage === true && <p style={styles.itemRequirement}>Помеха Скрытности</p>}


            <div style={styles.itemCardActions}>
                 {isUsable && onUse && <button onClick={handleUseClick} style={{...styles.actionButton, ...styles.useButton}}>Исп.</button>}
                 {/* Условие рендера кнопки */}
                 {shouldRenderEquipButton && (
                     <button onClick={handleEquipToggleClick} style={styles.actionButton}>
                         {isEquipped ? 'Снять' : 'Экип.'}
                     </button>
                 )}
                 {onDrop && <button onClick={handleDropClick} style={{...styles.actionButton, ...styles.dropButton}}>Выбр.</button>}
            </div>
        </div>
    );
};


// Стили styles остаются без изменений
const styles = {
    itemCard: { background: theme.colors.surface, borderRadius: '8px', padding: '12px', boxShadow: theme.effects.shadow, display: 'flex', flexDirection: 'column', gap: '6px', transition: theme.transitions.default, borderLeft: '4px solid transparent' },
    equippedItemCard: { borderLeftColor: theme.colors.secondary },
    itemCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px dashed ${theme.colors.surface}88`, paddingBottom: '5px', marginBottom: '5px' },
    itemName: { fontWeight: 'bold', color: theme.colors.primary, wordBreak: 'break-word', fontSize: '0.9rem' },
    itemCategory: { fontSize: '0.75rem', color: theme.colors.textSecondary, marginLeft: '5px', whiteSpace: 'nowrap', flexShrink: 0 },
    itemDetails: { fontSize: '0.8rem', color: theme.colors.textSecondary, margin: '2px 0 0 0', fontStyle: 'italic' },
    itemRequirement: { fontSize: '0.75rem', color: theme.colors.warning || theme.colors.error, margin: '2px 0 0 0', fontStyle: 'italic', fontWeight: 'bold' },
    itemCardActions: { display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', justifyContent: 'flex-end', borderTop: `1px solid ${theme.colors.surface}55` },
    actionButton: { padding: '4px 10px', fontSize: '0.8rem', borderRadius: '5px', border: 'none', cursor: 'pointer', transition: theme.transitions.default, whiteSpace: 'nowrap', background: theme.colors.textSecondary, color: theme.colors.background },
    useButton: { background: theme.colors.secondary, color: theme.colors.background, ':hover': {opacity: 0.9} },
    dropButton: { background: theme.colors.error, color: theme.colors.text, ':hover': {opacity: 0.8} },
};

export default ItemCard;