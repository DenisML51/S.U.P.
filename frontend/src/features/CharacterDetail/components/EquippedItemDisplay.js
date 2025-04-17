// src/features/CharacterDetail/components/EquippedItemDisplay.js
import React from 'react';
import { theme } from '../../../styles/theme'; // Обновленный путь

const EquippedItemDisplay = ({ itemData }) => {
    // Если нет данных или самого предмета, показываем заглушку
    if (!itemData || !itemData.item) {
        return <p style={styles.emptySlotText}>Слот пуст</p>;
    }

    const { item } = itemData;

    return (
        <div style={styles.equippedItemCardDisplay}>
            <div style={styles.equippedItemInfo}>
                <span style={styles.equippedItemName}>{item.name}</span>
                {/* Доп. информация в зависимости от типа предмета */}
                {item.item_type === 'armor' && item.ac_bonus !== undefined && <span style={styles.equippedItemStat}> (КЗ: {item.ac_bonus})</span>}
                {item.item_type === 'shield' && item.ac_bonus !== undefined && <span style={styles.equippedItemStat}> (КЗ: +{item.ac_bonus})</span>}
                {item.item_type === 'weapon' && item.damage && <span style={styles.equippedItemStat}> ({item.damage})</span>}
            </div>
             {/* Можно добавить сюда отображение способностей оружия, если нужно */}
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

// Стили
const styles = {
    equippedItemCardDisplay: { width: '100%', textAlign: 'center', padding: '5px 0' }, // Добавил padding
    equippedItemInfo: {},
    equippedItemName: { fontWeight: '500', color: theme.colors.text, fontSize: '0.95rem', display: 'inline-block', marginBottom: '3px' }, // Сделал inline-block
    equippedItemStat: { fontSize: '0.8rem', color: theme.colors.textSecondary, fontStyle: 'italic', marginLeft: '5px' }, // Добавил отступ
    emptySlotText: { fontStyle: 'italic', color: theme.colors.textSecondary, fontSize: '0.9rem', textAlign: 'center', alignSelf: 'center', padding: '10px 0' }, // Добавил padding
     weaponAbilities: {
         marginTop: '5px',
         display: 'flex',
         flexWrap: 'wrap',
         justifyContent: 'center',
         gap: '4px',
     },
      weaponAbilityTag: {
          background: `rgba(255, 255, 255, 0.1)`,
          color: theme.colors.secondary,
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.7rem',
          border: `1px solid ${theme.colors.secondary}55`
      }
};

export default EquippedItemDisplay;