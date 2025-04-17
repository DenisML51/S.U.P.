// src/features/CharacterDetail/modals/EditNotesModal.js
import React, { useState, useEffect } from 'react';
import * as apiService from '../../../api/apiService'; // Обновленный путь
import { theme } from '../../../styles/theme'; // Обновленный путь

const EditNotesModal = ({ characterId, currentNotes, onClose, onSuccess }) => {
    // Инициализируем state текущими заметками или пустыми строками
    const [notes, setNotes] = useState({
        appearance_notes: currentNotes?.appearance_notes || '',
        character_notes: currentNotes?.character_notes || '',
        motivation_notes: currentNotes?.motivation_notes || '',
        background_notes: currentNotes?.background_notes || ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Обновление state при изменении полей ввода
    const handleChange = (e) => {
        const { name, value } = e.target;
        setNotes(prev => ({ ...prev, [name]: value }));
    };

    // Обработчик сохранения
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            // Передаем только те поля, которые могут быть null или string
            const notesToSend = {
                 appearance_notes: notes.appearance_notes || null,
                 character_notes: notes.character_notes || null,
                 motivation_notes: notes.motivation_notes || null,
                 background_notes: notes.background_notes || null
            };
            await apiService.updateCharacterNotes(characterId, notesToSend);
            onSuccess(); // Вызываем коллбэк для обновления данных персонажа
            onClose(); // Закрываем модалку
        } catch (err) {
            console.error("Failed to update notes", err);
            let errorMessage = "Ошибка сохранения заметок.";
             if (err.response?.data?.detail) { errorMessage = String(err.response.data.detail); }
             else if (err.message) { errorMessage = err.message; }
             setError(errorMessage);
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
                    {/* Сетка для полей ввода */}
                    <div style={styles.notesGrid}>
                        <textarea name="appearance_notes" style={styles.textarea} placeholder="Внешность" value={notes.appearance_notes} onChange={handleChange} disabled={isLoading} />
                        <textarea name="character_notes" style={styles.textarea} placeholder="Характер" value={notes.character_notes} onChange={handleChange} disabled={isLoading} />
                        <textarea name="motivation_notes" style={styles.textarea} placeholder="Мотивация" value={notes.motivation_notes} onChange={handleChange} disabled={isLoading} />
                        <textarea name="background_notes" style={styles.textarea} placeholder="Предыстория" value={notes.background_notes} onChange={handleChange} disabled={isLoading} />
                    </div>
                    {/* Отображение ошибки */}
                    {error && <p style={styles.errorText}>{error}</p>}
                    {/* Кнопки */}
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
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '700px', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text, maxHeight: '85vh', overflowY: 'auto' }, // Добавил maxHeight и overflowY
    title: { textAlign: 'center', marginBottom: '25px', color: theme.colors.primary },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer', ':disabled': { opacity: 0.5 } },
    notesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', '@media (max-width: 600px)': { gridTemplateColumns: '1fr' } }, // Адаптивность для маленьких экранов
    textarea: { width: '100%', minHeight: '150px', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical', ':disabled': { opacity: 0.5 } },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '15px', fontWeight: 'bold', minHeight: '1.2em' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surface}` }, // Добавил разделитель
    cancelButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    submitButton: { padding: '10px 20px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
};

export default EditNotesModal;