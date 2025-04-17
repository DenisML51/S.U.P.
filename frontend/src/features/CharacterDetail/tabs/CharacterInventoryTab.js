// src/features/CharacterDetail/tabs/CharacterInventoryTab.js
import React from 'react';
import { theme } from '../../../styles/theme';
import ItemCard from '../components/ItemCard'; // Импортируем ItemCard

// <<<=== ПРИНИМАЕМ handleEquip и handleDropItem ===>>>
const CharacterInventoryTab = ({
    character,
    handleEquip,
    handleDropItem,
    onAddItemClick,
    apiActionError
}) => {
    if (!character) return null;

    const inventory = character.inventory || [];
    const relevantError = typeof apiActionError === 'string' && apiActionError &&
         (apiActionError.includes('предмет') || apiActionError.includes('инвентар') || apiActionError.includes('экипир'))
         ? apiActionError : null;

    return (
        <div style={styles.tabContent}>
            <div style={styles.tabHeader}>
                <h4 style={styles.tabTitle}>Инвентарь</h4>
                <button onClick={onAddItemClick} style={styles.addItemButton} title="Добавить предмет">+</button>
            </div>
            {relevantError && <p style={styles.apiActionErrorStyle}>{relevantError}</p>}

            {inventory.length > 0 ? (
                <div style={styles.inventoryGrid}>
                    {inventory.map((invItem) => (
                        <ItemCard
                            key={invItem.id}
                            character={character}
                            invItem={invItem}
                            onEquip={handleEquip} // <<<=== ПЕРЕДАЕМ В ItemCard
                            onDrop={handleDropItem} // <<<=== ПЕРЕДАЕМ В ItemCard
                            // Передаем также onUnequip, если он будет использоваться в ItemCard
                            // onUnequip={...} // Этот колбэк должен прийти из CharacterDetailPage, если он нужен ItemCard
                        />
                    ))}
                </div>
            ) : (
                <p style={styles.placeholderText}>Инвентарь пуст.</p>
            )}
        </div>
    );
};

// Стили styles остаются без изменений
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out' },
    tabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: `1px solid ${theme.colors.surface}66`, paddingBottom: '10px' },
    tabTitle: { margin: 0, color: theme.colors.primary, fontSize: '1.1rem' },
    addItemButton: { padding: '6px 12px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: theme.transitions.default, ':hover': {opacity: 0.9} },
    inventoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginTop: '10px' },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '30px' },
    apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' },
};


export default CharacterInventoryTab;