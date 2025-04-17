import React, { useState, useEffect } from 'react';
import * as apiService from '../apiService';
import { theme } from '../theme';

const EditNotesModal = ({ characterId, currentNotes, onClose, onSuccess }) => {
    const [notes, setNotes] = useState({
        appearance_notes: '',
        character_notes: '',
        motivation_notes: '',
        background_notes: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Заполняем форму текущими заметками при открытии
        if (currentNotes) {
            setNotes({
                appearance_notes: currentNotes.appearance_notes || '',
                character_notes: currentNotes.character_notes || '',
                motivation_notes: currentNotes.motivation_notes || '',
                background_notes: currentNotes.background_notes || ''
            });
        }
    }, [currentNotes]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNotes(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await apiService.updateCharacterNotes(characterId, notes);
            onSuccess(); // Обновляем данные в родительском компоненте
            onClose();
        } catch (err) {
            console.error("Failed to update notes", err);
            setError(err.response?.data?.detail || "Ошибка сохранения заметок.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Редактировать Заметки</h2>
                <button onClick={onClose} style={styles.closeButton} disabled={isLoading}>×</button>
                <form onSubmit={handleSubmit}>
                    <div style={styles.notesGrid}>
                        <textarea name="appearance_notes" style={styles.textarea} placeholder="Внешность" value={notes.appearance_notes} onChange={handleChange} />
                        <textarea name="character_notes" style={styles.textarea} placeholder="Характер" value={notes.character_notes} onChange={handleChange} />
                        <textarea name="motivation_notes" style={styles.textarea} placeholder="Мотивация" value={notes.motivation_notes} onChange={handleChange} />
                        <textarea name="background_notes" style={styles.textarea} placeholder="Предыстория" value={notes.background_notes} onChange={handleChange} />
                    </div>

                    {error && <p style={styles.errorText}>{error}</p>}

                    <div style={styles.buttonGroup}>
                        <button type="button" onClick={onClose} style={styles.cancelButton} disabled={isLoading}>Отмена</button>
                        <button type="submit" style={styles.submitButton} disabled={isLoading}>
                            {isLoading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Стили для EditNotesModal
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '700px', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text },
    title: { textAlign: 'center', marginBottom: '25px', color: theme.colors.primary },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer' },
    notesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' },
    textarea: { width: '100%', minHeight: '120px', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '15px', fontWeight: 'bold' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px' },
    cancelButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8 },
    submitButton: { padding: '10px 20px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
};

export default EditNotesModal;