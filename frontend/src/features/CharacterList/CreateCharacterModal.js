// src/features/CharacterList/CreateCharacterModal.js
import React, { useState } from 'react';
import * as apiService from '../../api/apiService';
import { theme } from '../../styles/theme'; // Обновленный импорт

// Определяем список навыков для удобства
const SKILL_NAMES = [
    'skill_strength', 'skill_dexterity', 'skill_endurance', 'skill_reaction', 'skill_technique', 'skill_adaptation',
    'skill_logic', 'skill_attention', 'skill_erudition', 'skill_culture', 'skill_science', 'skill_medicine',
    'skill_suggestion', 'skill_insight', 'skill_authority', 'skill_self_control', 'skill_religion', 'skill_flow'
];
// 36 очков сверх базы 1 для каждого из 18 навыков
const POINTS_TO_SPEND = 36;

const CreateCharacterModal = ({ onClose, onCharacterCreated }) => {
    const [name, setName] = useState("");
    // Начальное состояние - все навыки по 1
    const [skills, setSkills] = useState(
        SKILL_NAMES.reduce((acc, skill) => ({ ...acc, [skill]: 1 }), {})
    );
    const [notes, setNotes] = useState({
        appearance_notes: "", character_notes: "", motivation_notes: "", background_notes: ""
    });
    // Считаем потраченные очки (значение навыка - 1)
    const [pointsSpent, setPointsSpent] = useState(0);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSkillChange = (skillName, value) => {
        // Ограничения 1-8 для начального распределения
        const newValue = Math.max(1, Math.min(8, Number(value) || 1));
        const newSkills = { ...skills, [skillName]: newValue };
        // Пересчитываем потраченные очки
        const spent = Object.values(newSkills).reduce((sum, val) => sum + (val - 1), 0);

        if (spent <= POINTS_TO_SPEND) {
            setSkills(newSkills);
            setPointsSpent(spent);
            setError(""); // Сбрасываем ошибку если все ок
        } else {
            // Не обновляем состояние, если лимит превышен
            setError(`Превышен лимит очков! Максимум ${POINTS_TO_SPEND}.`);
        }
    };

     const handleNoteChange = (noteName, value) => {
        setNotes(prev => ({ ...prev, [noteName]: value }));
     };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (pointsSpent !== POINTS_TO_SPEND) {
            setError(`Необходимо распределить ровно ${POINTS_TO_SPEND} очков навыков (потрачено ${pointsSpent}).`);
            return;
        }
        if (!name.trim()) {
            setError("Имя персонажа не может быть пустым.");
            return;
        }
        setError("");
        setIsSubmitting(true);

        // Формируем данные для API (initial_skills как объект)
        const characterData = {
            name: name.trim(),
            initial_skills: skills, // Передаем весь объект skills
            appearance_notes: notes.appearance_notes,
            character_notes: notes.character_notes,
            motivation_notes: notes.motivation_notes,
            background_notes: notes.background_notes
        };

        try {
            await apiService.createCharacter(characterData);
            if (onCharacterCreated) {
                onCharacterCreated(); // Вызываем колбэк для обновления списка
            }
            onClose(); // Закрываем модалку
        } catch (err) {
            console.error("Ошибка создания персонажа:", err);
            let errorMessage = "Неизвестная ошибка при создании персонажа.";
             if (err.response?.data?.detail) {
                  const detail = err.response.data.detail;
                  // Обработка ошибок валидации FastAPI
                  if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
                       const firstError = detail[0];
                       const field = firstError.loc?.slice(1).join('.') || 'поле';
                       errorMessage = `Ошибка валидации: ${firstError.msg} (поле: ${field})`;
                   } else if (typeof detail === 'string') {
                       errorMessage = detail; // Простое сообщение об ошибке
                   } else {
                        errorMessage = JSON.stringify(detail); // Если структура неизвестна
                   }
             } else if (err.message) {
                  errorMessage = err.message;
             }
             setError(String(errorMessage)); // Устанавливаем ошибку
        } finally {
             setIsSubmitting(false);
        }
    };

    const pointsLeft = POINTS_TO_SPEND - pointsSpent;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Создание нового персонажа</h2>
                <button onClick={onClose} style={styles.closeButton} disabled={isSubmitting}>×</button>
                <form onSubmit={handleSubmit}>
                    {/* Имя Персонажа */}
                    <div style={styles.formGroup}>
                        <label style={styles.label} htmlFor="charName">Имя персонажа:</label>
                        <input
                            style={styles.input}
                            type="text"
                            id="charName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={100}
                            required
                            disabled={isSubmitting}
                        />
                    </div>
                    {/* Распределение Навыков */}
                    <h3 style={styles.subtitle}>Распределение Очков Навыков</h3>
                    <p style={styles.pointsInfo}>
                        Осталось распределить: <strong style={{ color: pointsLeft === 0 ? theme.colors.secondary : theme.colors.primary }}>{pointsLeft}</strong> / {POINTS_TO_SPEND}
                    </p>
                    <div style={styles.skillsGrid}>
                        {SKILL_NAMES.map(skillName => (
                            <div key={skillName} style={styles.skillItem}>
                                <label style={styles.skillLabel} htmlFor={skillName}>{skillName.replace('skill_', '')}:</label>
                                <input
                                    style={styles.skillInput}
                                    type="number"
                                    id={skillName}
                                    name={skillName}
                                    min="1"
                                    max="8"
                                    value={skills[skillName]}
                                    onChange={(e) => handleSkillChange(skillName, e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                        ))}
                    </div>
                     {/* Заметки */}
                     <h3 style={styles.subtitle}>Заметки (опционально)</h3>
                     <div style={styles.notesGrid}>
                        <textarea style={styles.textarea} placeholder="Внешность" value={notes.appearance_notes} onChange={(e) => handleNoteChange('appearance_notes', e.target.value)} disabled={isSubmitting}/>
                        <textarea style={styles.textarea} placeholder="Характер" value={notes.character_notes} onChange={(e) => handleNoteChange('character_notes', e.target.value)} disabled={isSubmitting}/>
                        <textarea style={styles.textarea} placeholder="Мотивация" value={notes.motivation_notes} onChange={(e) => handleNoteChange('motivation_notes', e.target.value)} disabled={isSubmitting}/>
                        <textarea style={styles.textarea} placeholder="Предыстория" value={notes.background_notes} onChange={(e) => handleNoteChange('background_notes', e.target.value)} disabled={isSubmitting}/>
                     </div>

                    {error && <p style={styles.errorText}>{error}</p>}

                    {/* Кнопки */}
                    <div style={styles.buttonGroup}>
                        <button type="button" onClick={onClose} style={styles.cancelButton} disabled={isSubmitting}>Отмена</button>
                        <button type="submit" style={styles.submitButton} disabled={isSubmitting || pointsLeft !== 0}>
                            {isSubmitting ? 'Создание...' : 'Создать персонажа'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Стили
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text },
    title: { textAlign: 'center', marginBottom: '25px', color: theme.colors.primary },
    subtitle: { textAlign: 'center', marginTop: '25px', marginBottom: '10px', color: theme.colors.secondary, fontSize: '1.1rem' }, // Сделал подзаголовок меньше
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer', ':disabled': { opacity: 0.5 } },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }, // Уменьшил label
    input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    pointsInfo: { textAlign: 'center', marginBottom: '15px', color: theme.colors.textSecondary, fontSize: '0.9rem' }, // Уменьшил текст
    skillsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px 15px' }, // Уменьшил gap
    skillItem: { display: 'flex', alignItems: 'center', gap: '8px' }, // Уменьшил gap
    skillLabel: { flexShrink: 0, width: '90px', textAlign: 'right', textTransform: 'capitalize', fontSize: '0.85rem', color: theme.colors.textSecondary}, // Уменьшил label и ширину
    skillInput: { width: '55px', padding: '5px 8px', borderRadius: '6px', textAlign: 'center', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '0.9rem', '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 }, '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 }, appearance: 'textfield', ':disabled': { opacity: 0.5, cursor: 'not-allowed'} }, // Уменьшил input
    notesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' },
    textarea: { width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical', ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '15px', fontWeight: 'bold', minHeight: '1.2em' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' },
    cancelButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    submitButton: { padding: '10px 20px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
};

export default CreateCharacterModal;