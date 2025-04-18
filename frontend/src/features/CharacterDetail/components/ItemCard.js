// src/features/CharacterDetail/components/ItemCard.js
import React, { useMemo } from 'react';
import { theme } from '../../../styles/theme';

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

    // Ранний выход если нет данных
    if (!invItem || !invItem.item) return null;

    const { item, quantity, id: inventoryItemId } = invItem; // quantity - это текущее кол-во/заряды
    const isEquippable = ['weapon', 'armor', 'shield'].includes(item.item_type);
    const isUsable = item.item_type === 'general';
    const isEquipped = equippedSlot !== null;
    const isMedicalItem = item.category === 'Медицина';

    // Обработчики действий (без изменений)
    const handleEquipToggleClick = () => {
        if (isEquipped) {
            if (onUnequip && equippedSlot) onUnequip(equippedSlot);
        } else if (isEquippable) {
            if (onEquip) {
                let targetSlot = item.item_type;
                if (item.item_type === 'weapon') {
                    targetSlot = !character?.equipped_weapon1 ? 'weapon1' : (!character?.equipped_weapon2 ? 'weapon2' : 'weapon1');
                }
                 onEquip(inventoryItemId, targetSlot);
             }
        }
    };
    const handleUseClick = () => { if (onUse) onUse(inventoryItemId, item); };
    const handleDropClick = () => { if(onDrop) onDrop(inventoryItemId); };

    // Получение данных для отображения
    const strengthRequirement = item?.strength_requirement ?? 0;
    const stealthDisadvantage = item?.stealth_disadvantage ?? false;

    return (
        // Добавляем title для всплывающей подсказки
        <div style={{ ...styles.itemCard, ...(isEquipped ? styles.equippedItemCard : {}) }} title={item.description || item.name}>
            {/* Заголовок карточки */}
            <div style={styles.itemCardHeader}>
                 <span style={styles.itemName}>
                     {item.name}
                     {/* Отображение количества для не-мед и неэкипированных */}
                     {!isMedicalItem && !isEquipped && quantity > 1 && ` (x${quantity})`}
                     {/* Отображение статуса экипировки */}
                     {isEquipped && ` (Экип. - ${equippedSlot})`}
                 </span>
                 {/* Категория и редкость */}
                 <span style={styles.itemCategory}>[{item.category} / {item.rarity}]</span>
            </div>

            {/* --- ДОБАВЛЕНО ОТОБРАЖЕНИЕ ОПИСАНИЯ --- */}
            {item.description && <p style={styles.itemDescription}>{item.description}</p>}
            {/* --- КОНЕЦ ДОБАВЛЕНИЯ --- */}


            {/* --- Детали предмета (статы, заряды и т.д.) --- */}
            {item.item_type === 'weapon' && <p style={styles.itemDetails}>Урон: {item.damage} ({item.damage_type}) {item.is_two_handed ? '[Двуруч.]' : ''}</p>}
            {item.item_type === 'armor' && <p style={styles.itemDetails}>AC: {item.ac_bonus} ({item.armor_type}) {item.max_dex_bonus !== null ? `[Ловк. макс +${item.max_dex_bonus}]` : ''}</p>}
            {item.item_type === 'shield' && <p style={styles.itemDetails}>Бонус AC: +{item.ac_bonus}</p>}
            {isMedicalItem && <p style={styles.itemDetails}>Заряды: {quantity}</p>}
            {item.item_type === 'general' && !isMedicalItem && item.uses && <p style={styles.itemDetails}>Исп.: {item.uses}</p>}
            {item.item_type === 'general' && !isMedicalItem && item.effect && <p style={styles.itemDetails}>Эффект: {item.effect}</p>}
            {item.item_type === 'ammo' && item.ammo_type && <p style={styles.itemDetails}>Тип: {item.ammo_type}</p>}
            {item.item_type === 'ammo' && item.effect && <p style={styles.itemDetails}>Эффект: {item.effect}</p>}

            {/* Требования */}
            {strengthRequirement > 0 && <p style={styles.itemRequirement}>Треб. Силы: {strengthRequirement}</p>}
            {stealthDisadvantage === true && <p style={styles.itemRequirement}>Помеха Скрытности</p>}

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

// Стили (добавляем стиль для itemDescription)
const styles = {
    itemCard: { background: theme.colors.surface, borderRadius: '8px', padding: '12px', boxShadow: theme.effects.shadow, display: 'flex', flexDirection: 'column', gap: '6px', transition: theme.transitions.default, borderLeft: '4px solid transparent' },
    equippedItemCard: { borderLeftColor: theme.colors.secondary },
    itemCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px dashed ${theme.colors.surface}88`, paddingBottom: '5px', marginBottom: '5px' },
    itemName: { fontWeight: 'bold', color: theme.colors.primary, wordBreak: 'break-word', fontSize: '0.9rem' },
    itemCategory: { fontSize: '0.75rem', color: theme.colors.textSecondary, marginLeft: '5px', whiteSpace: 'nowrap', flexShrink: 0 },
    // --- СТИЛЬ ДЛЯ ОПИСАНИЯ ---
    itemDescription: {
        fontSize: '0.85rem', // Чуть крупнее чем детали
        color: theme.colors.text, // Основной цвет текста
        margin: '4px 0 4px 0', // Отступы
        lineHeight: 1.4, // Межстрочный интервал
    },
    // --- КОНЕЦ СТИЛЯ ---
    itemDetails: { fontSize: '0.8rem', color: theme.colors.textSecondary, margin: '2px 0 0 0', fontStyle: 'italic' },
    itemRequirement: { fontSize: '0.75rem', color: theme.colors.warning || theme.colors.error, margin: '2px 0 0 0', fontStyle: 'italic', fontWeight: 'bold' },
    itemCardActions: { display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', justifyContent: 'flex-end', borderTop: `1px solid ${theme.colors.surface}55` },
    actionButton: { padding: '4px 10px', fontSize: '0.8rem', borderRadius: '5px', border: 'none', cursor: 'pointer', transition: theme.transitions.default, whiteSpace: 'nowrap', background: theme.colors.textSecondary, color: theme.colors.background },
    useButton: { background: theme.colors.secondary, color: theme.colors.background, ':hover': {opacity: 0.9} },
    dropButton: { background: theme.colors.error, color: theme.colors.text, ':hover': {opacity: 0.8} },
};

export default ItemCard;
