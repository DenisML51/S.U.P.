import React, { useState } from 'react';
import * as apiService from '../apiService';
import { theme } from '../theme';

// Определяем список навыков для удобства
const SKILL_NAMES = [
    'skill_strength', 'skill_dexterity', 'skill_endurance', 'skill_reaction', 'skill_technique', 'skill_adaptation',
    'skill_logic', 'skill_attention', 'skill_erudition', 'skill_culture', 'skill_science', 'skill_medicine',
    'skill_suggestion', 'skill_insight', 'skill_authority', 'skill_self_control', 'skill_religion', 'skill_flow'
];

const POINTS_TO_SPEND = 54 - SKILL_NAMES.length; // 36

const CreateCharacterModal = ({ onClose, onCharacterCreated }) => {
    const [name, setName] = useState("");
    const [skills, setSkills] = useState(
        SKILL_NAMES.reduce((acc, skill) => ({ ...acc, [skill]: 1 }), {})
    );
    const [notes, setNotes] = useState({
        appearance_notes: "",
        character_notes: "",
        motivation_notes: "",
        background_notes: ""
    });
    const [pointsSpent, setPointsSpent] = useState(0);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSkillChange = (skillName, value) => {
        const newValue = Math.max(1, Math.min(8, Number(value) || 1)); // Ограничения 1-8
        const newSkills = { ...skills, [skillName]: newValue };

        // Пересчитываем потраченные очки
        const spent = Object.values(newSkills).reduce((sum, val) => sum + (val - 1), 0);

        if (spent <= POINTS_TO_SPEND) {
            setSkills(newSkills);
            setPointsSpent(spent);
            setError(""); // Сбрасываем ошибку если все ок
        } else {
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

        const characterData = {
            name: name.trim(),
            initial_skills: skills,
            ...notes
        };

        try {
            await apiService.createCharacter(characterData);
            if (onCharacterCreated) {
                onCharacterCreated(); // Вызываем колбэк для обновления списка
            }
            onClose(); // Закрываем модалку
        } catch (err) {
            console.error("Ошибка создания персонажа:", err);
            setError(err.response?.data?.detail || err.message || "Неизвестная ошибка при создании персонажа.");
            setIsSubmitting(false);
        }
    };

    const pointsLeft = POINTS_TO_SPEND - pointsSpent;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Создание нового персонажа</h2>
                <button onClick={onClose} style={styles.closeButton}>×</button>

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
                        />
                    </div>

                    {/* Распределение Навыков */}
                    <h3 style={styles.subtitle}>Распределение Очков Навыков</h3>
                    <p style={styles.pointsInfo}>Осталось распределить: <strong style={{ color: pointsLeft === 0 ? theme.colors.secondary : theme.colors.primary }}>{pointsLeft}</strong> / {POINTS_TO_SPEND}</p>
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
                                />
                            </div>
                        ))}
                    </div>

                     {/* Заметки */}
                     <h3 style={styles.subtitle}>Заметки (опционально)</h3>
                      <div style={styles.notesGrid}>
                        <textarea style={styles.textarea} placeholder="Внешность" value={notes.appearance_notes} onChange={(e) => handleNoteChange('appearance_notes', e.target.value)} />
                        <textarea style={styles.textarea} placeholder="Характер" value={notes.character_notes} onChange={(e) => handleNoteChange('character_notes', e.target.value)} />
                        <textarea style={styles.textarea} placeholder="Мотивация" value={notes.motivation_notes} onChange={(e) => handleNoteChange('motivation_notes', e.target.value)} />
                        <textarea style={styles.textarea} placeholder="Предыстория" value={notes.background_notes} onChange={(e) => handleNoteChange('background_notes', e.target.value)} />
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

// Стили вынесены для читаемости
const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    },
    modal: {
        background: theme.colors.surface, padding: '30px', borderRadius: '16px',
        width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto',
        position: 'relative', boxShadow: theme.effects.shadow,
        color: theme.colors.text,
    },
    title: { textAlign: 'center', marginBottom: '25px', color: theme.colors.primary },
    subtitle: { textAlign: 'center', marginTop: '25px', marginBottom: '10px', color: theme.colors.secondary },
    closeButton: {
        position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none',
        color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer',
    },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
    input: {
        width: '100%', padding: '10px 12px', borderRadius: '8px',
        border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)',
        color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box',
    },
    pointsInfo: { textAlign: 'center', marginBottom: '15px', color: theme.colors.textSecondary },
    skillsGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px',
    },
    skillItem: { display: 'flex', alignItems: 'center', gap: '10px' },
    skillLabel: { flexShrink: 0, width: '100px', textAlign: 'right', textTransform: 'capitalize', fontSize: '0.9rem'},
    skillInput: {
        width: '60px', padding: '5px 8px', borderRadius: '6px', textAlign: 'center',
        border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)',
        color: theme.colors.text,
    },
    notesGrid: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px'
    },
    textarea: {
        width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px',
        border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)',
        color: theme.colors.text, fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical'
    },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '15px', fontWeight: 'bold' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' },
    cancelButton: {
        padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background,
        border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default,
        opacity: 0.8
    },
    submitButton: {
        padding: '10px 20px', background: theme.colors.primary, color: theme.colors.background,
        border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default,
        fontWeight: 'bold'
    },
};


export default CreateCharacterModal;