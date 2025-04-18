// src/features/CharacterDetail/modals/SelectMedkitModal.js
import React, { useState } from 'react';
import { theme } from '../../../styles/theme';

const SelectMedkitModal = ({ availableMedkits, onClose, onSelect }) => {
    // availableMedkits - массив объектов { id: inventory_item_id, item: { name, ... }, quantity }
    const [selectedInvItemId, setSelectedInvItemId] = useState(null);

    if (!availableMedkits || availableMedkits.length === 0) {
        return null;
    }

    const handleSelect = () => {
        if (selectedInvItemId) {
            onSelect(selectedInvItemId);
            onClose();
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h3 style={styles.title}>Выберите аптечку</h3>
                <button onClick={onClose} style={styles.closeButton}>×</button>

                <div style={styles.listContainer}>
                    {availableMedkits.map(invItem => (
                        <div
                            key={invItem.id}
                            onClick={() => setSelectedInvItemId(invItem.id)}
                            style={{
                                ...styles.listItem,
                                ...(selectedInvItemId === invItem.id ? styles.listItemActive : {})
                            }}
                            title={invItem.item.description || invItem.item.name}
                        >
                            {/* --- ОТОБРАЖАЕМ КОЛИЧЕСТВО ИСПОЛЬЗОВАНИЙ --- */}
                            {invItem.item.name} <span style={styles.usesCount}>(Исп: {invItem.quantity})</span>
                            {/* --- КОНЕЦ ОТОБРАЖЕНИЯ --- */}
                            {invItem.item.effect && <span style={styles.itemEffect}> - {invItem.item.effect}</span>}
                        </div>
                    ))}
                </div>

                <div style={styles.buttonGroup}>
                    <button type="button" onClick={onClose} style={styles.cancelButton}>Отмена</button>
                    <button
                        onClick={handleSelect}
                        style={styles.submitButton}
                        disabled={!selectedInvItemId}
                    >
                        Использовать выбранную
                    </button>
                </div>
            </div>
        </div>
    );
};

// Обновленные стили
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 },
    modal: { background: theme.colors.surface, padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '450px', maxHeight: '60vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text },
    title: { textAlign: 'center', marginBottom: '15px', color: theme.colors.primary, fontSize: '1.2rem' },
    closeButton: { position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer' },
    listContainer: { flexGrow: 1, overflowY: 'auto', border: `1px solid ${theme.colors.surface}cc`, borderRadius: '8px', padding: '10px', margin: '10px 0 20px 0' },
    listItem: { padding: '12px', borderRadius: '6px', cursor: 'pointer', marginBottom: '8px', border: '1px solid transparent', transition: 'background 0.2s, border-color 0.2s', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', ':hover': { background: `${theme.colors.primary}22` } }, // Добавил flex
    listItemActive: { background: `${theme.colors.primary}44`, borderColor: theme.colors.primary, fontWeight: 'bold' },
    usesCount: { // Стиль для количества использований
        fontSize: '0.8rem',
        color: theme.colors.textSecondary,
        background: 'rgba(255,255,255,0.1)',
        padding: '2px 6px',
        borderRadius: '4px',
        marginLeft: '10px', // Отступ от имени
    },
    itemEffect: { fontSize: '0.8rem', color: theme.colors.textSecondary, marginLeft: '5px', fontStyle: 'italic' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: 'auto', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surface}cc` },
    cancelButton: { padding: '8px 18px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8 },
    submitButton: { padding: '8px 18px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
};

export default SelectMedkitModal;
