// src/features/CharacterDetail/modals/SelectMedkitModal.js
import React, { useState, useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Убедитесь, что путь правильный

// --- Иконки для тегов (можно взять из ItemCard или определить здесь) ---
const UsesIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M17 4h-3V2h-4v2H7c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 17H7V6h10v15z"/><path d="M9 11h6v2H9zm0 4h6v2H9z"/></svg> );
// Убрали StackIcon, так как тег количества удален
// const StackIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-8h14V7H7v2z"/></svg> );
const WeightIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm-1-8h2v3h-2zm0-4h2v2h-2z"/></svg> );
const EffectIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M18 14.45V11c0-1.66-1.34-3-3-3 .35-.6.5-1.28.5-2 0-2.21-1.79-4-4-4S7.5 3.79 7.5 6c0 .72.15 1.4.5 2-1.66 0-3 1.34-3 3v3.45c-1.17.69-2 1.97-2 3.43V20h5v-2H6v-2.12c0-1.09.6-2.06 1.5-2.55V11c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v2.76c1.17.69 2 1.97 2 3.43V20h5v-2h-2v-2.12c0-1.46-.83-2.74-2-3.43zm-6-7c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/></svg> );

// Вспомогательная функция для цвета редкости (можно взять из ItemCard)
const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
        case 'необычная': return theme.colors.success || '#66BB6A';
        case 'редкая': return '#2196F3';
        case 'очень редкая': return theme.colors.primary || '#BB86FC';
        case 'экзотика': return theme.colors.warning || '#FFA726';
        case 'легендарная': return '#FF7043';
        case 'обычная': default: return theme.colors.textSecondary || 'grey';
    }
};


const SelectMedkitModal = ({ availableMedkits, onClose, onSelect }) => {
    // availableMedkits - массив объектов { id: inventory_item_id, item: { name, description, effect, uses, rarity, weight }, quantity }
    const [selectedInvItemId, setSelectedInvItemId] = useState(null);

    if (!availableMedkits || availableMedkits.length === 0) {
        console.warn("SelectMedkitModal opened with no available medkits.");
        return null;
    }

    const handleSelect = () => {
        if (selectedInvItemId) {
            onSelect(selectedInvItemId);
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h3 style={styles.title}>Выберите предмет для использования</h3>
                <button onClick={onClose} style={styles.closeButton} title="Закрыть">×</button>

                <div style={styles.listContainer}>
                    {availableMedkits.map(invItem => {
                        const item = invItem.item;
                        const rarityColor = getRarityColor(item.rarity);
                        const isSelected = selectedInvItemId === invItem.id;
                        // Проверяем, есть ли у базового предмета свойство uses
                        const hasBaseUses = item.uses !== null && item.uses !== undefined;

                        return (
                            <div
                                key={invItem.id}
                                onClick={() => setSelectedInvItemId(invItem.id)}
                                style={{
                                    ...styles.listItem,
                                    borderLeftColor: rarityColor,
                                    ...(isSelected ? styles.listItemActive : {})
                                }}
                                title={item.description || item.name}
                            >
                                {/* Основная информация */}
                                <div style={styles.itemInfo}>
                                    <span style={styles.itemName}>{item.name}</span>
                                    {item.effect && (
                                        <div style={styles.itemEffect}>
                                            <EffectIcon />
                                            <span>{item.effect}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Теги с характеристиками */}
                                <div style={styles.tagsContainer}>
                                    {/* --- ИЗМЕНЕНИЕ: Тег для оставшихся использований/количества --- */}
                                    {/* Показываем, если у базового предмета есть uses */}
                                    {hasBaseUses && (
                                         <span style={styles.detailTag} title="Осталось зарядов/штук">
                                             <UsesIcon /> {invItem.quantity} исп. {/* Отображаем динамическое quantity */}
                                         </span>
                                    )}
                                    {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}

                                    {/* Тег веса 1 шт */}
                                    {item.weight !== null && item.weight !== undefined && (
                                        <span style={styles.detailTag} title="Вес (1 шт.)">
                                            <WeightIcon /> {item.weight.toFixed(1)} кг
                                        </span>
                                    )}
                                    {/* Тег редкости */}
                                    <span style={{...styles.detailTag, color: rarityColor, borderColor: `${rarityColor}55`, background: `${rarityColor}11`}} title="Редкость">
                                        {item.rarity}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Кнопки управления */}
                <div style={styles.buttonGroup}>
                    <button type="button" onClick={onClose} style={styles.cancelButton}>Отмена</button>
                    <button
                        onClick={handleSelect}
                        style={selectedInvItemId ? styles.submitButton : {...styles.submitButton, ...styles.submitButtonDisabled}}
                        disabled={!selectedInvItemId}
                    >
                        Использовать
                    </button>
                </div>
            </div>
        </div>
    );
};

// Обновленные стили
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, backdropFilter: 'blur(5px)' },
    modal: {
        background: theme.colors.surface,
        padding: '25px',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 5px 25px rgba(0,0,0,0.4)',
        color: theme.colors.text,
        border: `1px solid ${theme.colors.surfaceVariant}`,
    },
    title: {
        textAlign: 'center',
        marginBottom: '20px',
        color: theme.colors.primary,
        fontSize: '1.3rem',
        fontWeight: '600',
        borderBottom: `1px solid ${theme.colors.surfaceVariant}`,
        paddingBottom: '15px',
    },
    closeButton: {
        position: 'absolute', top: '15px', right: '15px',
        background: 'transparent', border: 'none', color: theme.colors.textSecondary,
        fontSize: '1.8rem',
        cursor: 'pointer', lineHeight: 1, padding: '0 5px',
        transition: 'color 0.2s',
        ':hover': { color: theme.colors.primary }
    },
    listContainer: {
        flexGrow: 1, overflowY: 'auto',
        padding: '5px', margin: '0 0 20px 0',
        '::-webkit-scrollbar': { width: '8px' },
        '::-webkit-scrollbar-track': { background: theme.colors.surface, borderRadius: '4px' },
        '::-webkit-scrollbar-thumb': { background: theme.colors.surfaceVariant, borderRadius: '4px' },
        '::-webkit-scrollbar-thumb:hover': { background: theme.colors.textSecondary }
    },
    listItem: {
        padding: '15px',
        borderRadius: '8px',
        cursor: 'pointer',
        marginBottom: '10px',
        border: `1px solid ${theme.colors.surfaceVariant}`,
        borderLeft: '5px solid transparent',
        transition: 'all 0.2s ease-in-out',
        background: theme.colors.background,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        ':hover': { background: `${theme.colors.surface}cc`, borderColor: theme.colors.primary, transform: 'translateX(2px)' }
    },
    listItemActive: {
        background: `${theme.colors.primary}22`,
        borderColor: theme.colors.primary,
        borderLeftWidth: '5px',
        boxShadow: `0 0 10px ${theme.colors.primary}33`,
    },
    itemInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    itemName: {
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontSize: '1.05rem',
    },
    itemEffect: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.85rem',
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    tagsContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
        borderTop: `1px dashed ${theme.colors.surfaceVariant}`,
        paddingTop: '10px',
        marginTop: '5px',
    },
    detailTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.75rem',
        background: 'rgba(255,255,255,0.08)',
        color: theme.colors.textSecondary,
        padding: '3px 8px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)',
        whiteSpace: 'nowrap',
    },
    detailTagIcon: {
        width: '12px',
        height: '12px',
        fill: 'currentColor',
        flexShrink: 0,
        opacity: 0.8,
    },
     mainDetailIcon: { // Иконка для эффекта
        width: '14px',
        height: '14px',
        fill: theme.colors.textSecondary,
        flexShrink: 0,
        opacity: 0.9,
    },
    buttonGroup: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
        marginTop: 'auto',
        paddingTop: '20px',
        borderTop: `1px solid ${theme.colors.surfaceVariant}`
    },
    cancelButton: {
        padding: '8px 18px',
        background: theme.colors.textSecondary,
        color: theme.colors.background,
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: theme.transitions.default,
        opacity: 0.8,
        fontWeight: '500',
        ':hover': { opacity: 1 }
    },
    submitButton: {
        padding: '8px 18px',
        background: theme.colors.primary,
        color: theme.colors.background,
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: theme.transitions.default,
        fontWeight: 'bold',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        ':hover': { filter: 'brightness(1.1)' }
    },
    submitButtonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
        filter: 'grayscale(50%)',
        boxShadow: 'none',
    },
};

export default SelectMedkitModal;
