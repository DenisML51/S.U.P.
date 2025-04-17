// src/features/CharacterDetail/tabs/CharacterNotesTab.js
import React from 'react';
import { theme } from '../../../styles/theme'; // Обновленный путь

const CharacterNotesTab = ({ character, onEditNotesClick, apiActionError }) => {
    if (!character) return null;

    const notesFields = [
        { key: 'appearance_notes', label: 'Внешность' },
        { key: 'character_notes', label: 'Характер' },
        { key: 'motivation_notes', label: 'Мотивация' },
        { key: 'background_notes', label: 'Предыстория' },
    ];

    // Фильтруем ошибку
    const relevantError = typeof apiActionError === 'string' && apiActionError && apiActionError.includes('заметок') ? apiActionError : null;


    return (
        <div style={styles.tabContent}>
             <div style={styles.tabHeader}>
                 <h4 style={styles.tabTitle}>Заметки</h4>
                 <button onClick={onEditNotesClick} style={styles.editButton} title="Редактировать заметки">Редактировать</button>
             </div>
             {relevantError && <p style={styles.apiActionErrorStyle}>{relevantError}</p>}

             <div style={styles.notesContainer}>
                 {notesFields.map(field => (
                     <div key={field.key} style={styles.noteSection}>
                         <h5 style={styles.noteLabel}>{field.label}:</h5>
                         <p style={styles.noteText}>
                             {character[field.key] || <span style={styles.placeholderText}>(Пусто)</span>}
                         </p>
                     </div>
                 ))}
             </div>
        </div>
    );
};

// Стили
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out' },
    tabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `1px solid ${theme.colors.surface}66`, paddingBottom: '10px' },
    tabTitle: { margin: 0, color: theme.colors.primary, fontSize: '1.1rem' },
    editButton: { padding: '6px 12px', background: theme.colors.secondary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: theme.transitions.default, ':hover': {opacity: 0.9} },
    notesContainer: { display: 'grid', gridTemplateColumns: '1fr', gap: '20px', '@media (min-width: 768px)': { gridTemplateColumns: '1fr 1fr' } }, // Адаптивность: 2 колонки на больших экранах
    noteSection: { background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px' },
    noteLabel: { margin: '0 0 8px 0', color: theme.colors.secondary, fontSize: '0.95rem', borderBottom: `1px dashed ${theme.colors.surface}88`, paddingBottom: '5px' },
    noteText: { margin: 0, color: theme.colors.text, fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }, // Сохраняем переносы строк
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic' },
     apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' },
};


export default CharacterNotesTab;