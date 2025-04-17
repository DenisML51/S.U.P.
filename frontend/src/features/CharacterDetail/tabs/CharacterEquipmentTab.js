// src/features/CharacterDetail/tabs/CharacterEquipmentTab.js
import React from 'react';
import EquippedItemDisplay from '../components/EquippedItemDisplay';// Импорт компонента
import { theme } from '../../../styles/theme'; // Импорт темы

const CharacterEquipmentTab = ({ character, handleUnequip, apiActionError }) => {
    if (!character) return null;

    const equipmentSlots = [
        { key: 'armor', label: 'Броня', itemData: character.equipped_armor },
        { key: 'shield', label: 'Щит', itemData: character.equipped_shield },
        { key: 'weapon1', label: 'Оружие 1', itemData: character.equipped_weapon1 },
        { key: 'weapon2', label: 'Оружие 2', itemData: character.equipped_weapon2 }
    ];

     const actionErrorDisplay = typeof apiActionError === 'string' && apiActionError && (apiActionError.includes('экипиров') || apiActionError.includes('снятия')) ? (
         <p style={styles.apiActionErrorStyle}>{apiActionError}</p>
     ) : null;


    return (
        <div style={styles.tabContent}>
            <h4 style={styles.tabHeaderNoBorder}>Экипировка</h4>
             {actionErrorDisplay}
            <div style={styles.equipmentSlotsContainer}>
                {equipmentSlots.map(slot => (
                    <div key={slot.key} style={styles.equipmentSlotCard}>
                        <div style={styles.slotLabel}>{slot.label}</div>
                        <div style={styles.slotItemContainer}>
                            <EquippedItemDisplay itemData={slot.itemData} />
                        </div>
                        {slot.itemData && (
                            <button
                                onClick={() => handleUnequip(slot.key)}
                                style={styles.unequipButtonSlot}
                                title={`Снять ${slot.itemData?.item?.name}`}
                            >×</button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Стили (можно вынести)
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out' }, // Пример анимации
    tabHeaderNoBorder: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', color: theme.colors.primary, fontSize: '1.1rem' },
    equipmentSlotsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' },
    equipmentSlotCard: { background: theme.colors.surface, borderRadius: '8px', padding: '15px', boxShadow: theme.effects.shadow, borderTop: `3px solid ${theme.colors.secondary}`, position: 'relative', minHeight: '80px', display: 'flex', flexDirection: 'column' },
    slotLabel: { fontWeight: 'bold', color: theme.colors.primary, marginBottom: '10px', fontSize: '0.9rem', textAlign: 'center', borderBottom: `1px dashed ${theme.colors.surface}88`, paddingBottom: '8px' },
    slotItemContainer: { flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    unequipButtonSlot: { position: 'absolute', top: '8px', right: '8px', background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.error, border: 'none', borderRadius: '50%', width: '24px', height: '24px', padding: '0', fontSize: '1.1rem', lineHeight: '24px', textAlign: 'center', cursor: 'pointer', opacity: 0.7, transition: theme.transitions.default, ':hover': { background: theme.colors.error, color: theme.colors.surface, opacity: 1 } },
     apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' },
    // ... стили для EquippedItemDisplay должны быть в его файле
};

export default CharacterEquipmentTab;