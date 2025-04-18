// src/features/CharacterList/CreateCharacterModal.js
import React, { useState, useMemo } from 'react'; // Добавили useMemo
import * as apiService from '../../api/apiService';
import { theme } from '../../styles/theme';

// Определяем список навыков и очков
const SKILL_NAMES = [
    'skill_strength', 'skill_dexterity', 'skill_endurance', 'skill_reaction', 'skill_technique', 'skill_adaptation',
    'skill_logic', 'skill_attention', 'skill_erudition', 'skill_culture', 'skill_science', 'skill_medicine',
    'skill_suggestion', 'skill_insight', 'skill_authority', 'skill_self_control', 'skill_religion', 'skill_flow'
];
const SKILL_POINTS_TO_SPEND = 45; // 36 очков сверх базы 1

// --- ДОБАВЛЕНО: Определяем ветки и очки для них ---
const BRANCH_KEYS = ['medic', 'mutant', 'sharpshooter', 'scout', 'technician', 'fighter', 'juggernaut'];
const BRANCH_TRANSLATIONS = {
    medic: 'Медик', mutant: 'Мутант', sharpshooter: 'Стрелок', scout: 'Разведчик',
    technician: 'Техник', fighter: 'Боец', juggernaut: 'Джаггернаут'
};
const BRANCH_POINTS_TO_SPEND = 3;
const MAX_INITIAL_BRANCH_LEVEL = 3; // Максимальный стартовый уровень ветки
// -------------------------------------------------

const CreateCharacterModal = ({ onClose, onCharacterCreated }) => {
    const [name, setName] = useState("");
    const [skills, setSkills] = useState(
        SKILL_NAMES.reduce((acc, skill) => ({ ...acc, [skill]: 1 }), {})
    );
    // --- ДОБАВЛЕНО: Состояние для уровней веток ---
    const [branchLevels, setBranchLevels] = useState(
        BRANCH_KEYS.reduce((acc, branch) => ({ ...acc, [branch]: 0 }), {}) // Начальные уровни 0
    );
    // -------------------------------------------
    const [notes, setNotes] = useState({
        appearance_notes: "", character_notes: "", motivation_notes: "", background_notes: ""
    });

    // Пересчитываем потраченные очки навыков и веток с помощью useMemo
    const skillPointsSpent = useMemo(() => {
        return Object.values(skills).reduce((sum, val) => sum + (val - 1), 0);
    }, [skills]);

    const branchPointsSpent = useMemo(() => {
        return Object.values(branchLevels).reduce((sum, val) => sum + val, 0);
    }, [branchLevels]);

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSkillChange = (skillName, value) => {
        const newValue = Math.max(1, Math.min(8, Number(value) || 1));
        const tempSkills = { ...skills, [skillName]: newValue };
        const spent = Object.values(tempSkills).reduce((sum, val) => sum + (val - 1), 0);

        if (spent <= SKILL_POINTS_TO_SPEND) {
            setSkills(tempSkills);
            setError("");
        } else {
            setError(`Превышен лимит очков навыков! Максимум ${SKILL_POINTS_TO_SPEND}.`);
        }
    };

    // --- ДОБАВЛЕНО: Обработчик изменения уровня ветки ---
    const handleBranchChange = (branchKey, delta) => {
        const currentLevel = branchLevels[branchKey] || 0;
        const newLevel = currentLevel + delta;

        // Проверяем границы уровня (0 - MAX_INITIAL_BRANCH_LEVEL)
        if (newLevel < 0 || newLevel > MAX_INITIAL_BRANCH_LEVEL) {
            return; // Ничего не делаем, если выходим за границы
        }

        // Проверяем общее количество потраченных очков
        const newTotalSpent = branchPointsSpent - currentLevel + newLevel;

        if (newTotalSpent <= BRANCH_POINTS_TO_SPEND) {
            setBranchLevels(prev => ({ ...prev, [branchKey]: newLevel }));
            setError(""); // Сбрасываем ошибку, если изменение возможно
        } else {
            setError(`Превышен лимит очков веток! Максимум ${BRANCH_POINTS_TO_SPEND}.`);
        }
    };
    // -------------------------------------------------

     const handleNoteChange = (noteName, value) => {
        setNotes(prev => ({ ...prev, [noteName]: value }));
     };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Проверка очков навыков
        if (skillPointsSpent !== SKILL_POINTS_TO_SPEND) {
            setError(`Необходимо распределить ровно ${SKILL_POINTS_TO_SPEND} очков навыков (потрачено ${skillPointsSpent}).`);
            return;
        }
        // --- ДОБАВЛЕНО: Проверка очков веток ---
        if (branchPointsSpent !== BRANCH_POINTS_TO_SPEND) {
            setError(`Необходимо распределить ровно ${BRANCH_POINTS_TO_SPEND} очков веток (распределено ${branchPointsSpent}).`);
            return;
        }
        // ------------------------------------
        if (!name.trim()) {
            setError("Имя персонажа не может быть пустым.");
            return;
        }
        setError("");
        setIsSubmitting(true);

        // --- ДОБАВЛЕНО: Формируем initial_branch_levels ---
        // Включаем только те ветки, уровень которых > 0
        const initial_branch_levels_payload = Object.entries(branchLevels)
            .filter(([key, value]) => value > 0)
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});
        // -------------------------------------------------

        // Формируем данные для API
        const characterData = {
            name: name.trim(),
            // Характеристики (пока не реализован ввод, используем заглушки - НУЖНО ДОБАВИТЬ UI!)
            // ЗАГЛУШКА: Сумма должна быть 35
            strength: 5, dexterity: 5, endurance: 5, intelligence: 5, perception: 5, charisma: 5, luck: 5,
            initial_skills: skills,
            initial_branch_levels: initial_branch_levels_payload, // Передаем уровни веток
            // Заметки
            appearance_notes: notes.appearance_notes,
            character_notes: notes.character_notes,
            motivation_notes: notes.motivation_notes,
            background_notes: notes.background_notes
        };

        console.log("Отправка данных создания персонажа:", characterData); // Для отладки

        try {
            await apiService.createCharacter(characterData);
            if (onCharacterCreated) {
                onCharacterCreated();
            }
            onClose();
        } catch (err) {
            console.error("Ошибка создания персонажа:", err);
            let errorMessage = "Неизвестная ошибка при создании персонажа.";
             if (err.response?.data?.detail) {
                  const detail = err.response.data.detail;
                  if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
                       const firstError = detail[0];
                       const field = firstError.loc?.slice(1).join('.') || 'поле';
                       errorMessage = `Ошибка валидации: ${firstError.msg} (поле: ${field})`;
                   } else if (typeof detail === 'string') {
                       errorMessage = detail;
                   } else {
                        errorMessage = JSON.stringify(detail);
                   }
             } else if (err.message) {
                  errorMessage = err.message;
             }
             setError(String(errorMessage));
        } finally {
             setIsSubmitting(false);
        }
    };

    const skillPointsLeft = SKILL_POINTS_TO_SPEND - skillPointsSpent;
    const branchPointsLeft = BRANCH_POINTS_TO_SPEND - branchPointsSpent;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Создание нового персонажа</h2>
                <button onClick={onClose} style={styles.closeButton} disabled={isSubmitting}>×</button>
                <form onSubmit={handleSubmit}>
                    {/* Имя Персонажа */}
                    <div style={styles.formGroup}>
                        <label style={styles.label} htmlFor="charName">Имя персонажа:</label>
                        <input style={styles.input} type="text" id="charName" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required disabled={isSubmitting} />
                    </div>

                    {/* Распределение Навыков */}
                    <h3 style={styles.subtitle}>Распределение Очков Навыков</h3>
                    <p style={styles.pointsInfo}>
                        Осталось распределить (свыше 1): <strong style={{ color: skillPointsLeft === 0 ? theme.colors.secondary : theme.colors.primary }}>{skillPointsLeft}</strong> / {SKILL_POINTS_TO_SPEND}
                    </p>
                    <div style={styles.skillsGrid}>
                        {SKILL_NAMES.map(skillName => (
                            <div key={skillName} style={styles.skillItem}>
                                <label style={styles.skillLabel} htmlFor={skillName}>{skillName.replace('skill_', '')}:</label>
                                <input style={styles.skillInput} type="number" id={skillName} name={skillName} min="1" max="8" value={skills[skillName]} onChange={(e) => handleSkillChange(skillName, e.target.value)} disabled={isSubmitting} />
                            </div>
                        ))}
                    </div>

                    {/* --- ДОБАВЛЕНО: Распределение Очков Веток --- */}
                    <h3 style={styles.subtitle}>Распределение Очков Веток</h3>
                     <p style={styles.pointsInfo}>
                        Осталось распределить: <strong style={{ color: branchPointsLeft === 0 ? theme.colors.secondary : theme.colors.primary }}>{branchPointsLeft}</strong> / {BRANCH_POINTS_TO_SPEND}
                    </p>
                    <div style={styles.branchesGrid}>
                        {BRANCH_KEYS.map(branchKey => {
                            const currentLevel = branchLevels[branchKey] || 0;
                            const canIncrease = branchPointsLeft > 0 && currentLevel < MAX_INITIAL_BRANCH_LEVEL;
                            const canDecrease = currentLevel > 0;
                            return (
                                <div key={branchKey} style={styles.branchItem}>
                                    <span style={styles.branchLabel}>{BRANCH_TRANSLATIONS[branchKey]}:</span>
                                    <div style={styles.branchControls}>
                                        <button type="button" onClick={() => handleBranchChange(branchKey, -1)} style={styles.branchButton} disabled={!canDecrease || isSubmitting}>-</button>
                                        <span style={styles.branchLevel}>{currentLevel}</span>
                                        <button type="button" onClick={() => handleBranchChange(branchKey, +1)} style={styles.branchButton} disabled={!canIncrease || isSubmitting}>+</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* --- КОНЕЦ БЛОКА ВЕТОК --- */}

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
                        <button type="submit" style={styles.submitButton} disabled={isSubmitting || skillPointsLeft !== 0 || branchPointsLeft !== 0}>
                            {isSubmitting ? 'Создание...' : 'Создать персонажа'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Стили (добавляем стили для веток)
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text },
    title: { textAlign: 'center', marginBottom: '25px', color: theme.colors.primary },
    subtitle: { textAlign: 'center', marginTop: '25px', marginBottom: '10px', color: theme.colors.secondary, fontSize: '1.1rem' },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer', ':disabled': { opacity: 0.5 } },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' },
    input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    pointsInfo: { textAlign: 'center', marginBottom: '15px', color: theme.colors.textSecondary, fontSize: '0.9rem' },
    skillsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px 15px' },
    skillItem: { display: 'flex', alignItems: 'center', gap: '8px' },
    skillLabel: { flexShrink: 0, width: '90px', textAlign: 'right', textTransform: 'capitalize', fontSize: '0.85rem', color: theme.colors.textSecondary},
    skillInput: { width: '55px', padding: '5px 8px', borderRadius: '6px', textAlign: 'center', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '0.9rem', '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 }, '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 }, appearance: 'textfield', ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    // --- Стили для блока веток ---
    branchesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', // Колонки для веток
        gap: '12px 15px', // Отступы
        marginTop: '5px',
    },
    branchItem: {
        display: 'flex',
        justifyContent: 'space-between', // Название слева, кнопки справа
        alignItems: 'center',
        padding: '8px 10px', // Внутренние отступы
        background: 'rgba(255, 255, 255, 0.05)', // Легкий фон
        borderRadius: '6px',
        border: `1px solid ${theme.colors.surface}88`,
    },
    branchLabel: {
        fontSize: '0.9rem',
        fontWeight: '500',
        color: theme.colors.text,
        marginRight: '10px',
    },
    branchControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px', // Отступ между кнопками и числом
    },
    branchButton: {
        padding: '4px 8px', // Маленькие кнопки
        fontSize: '1rem',
        fontWeight: 'bold',
        lineHeight: 1,
        minWidth: '25px',
        background: theme.colors.primary + '44',
        color: theme.colors.primary,
        border: `1px solid ${theme.colors.primary}88`,
        borderRadius: '4px',
        cursor: 'pointer',
        transition: theme.transitions.default,
        ':hover:not(:disabled)': {
            background: theme.colors.primary + '77',
            color: theme.colors.text,
        },
        ':disabled': {
            opacity: 0.4,
            cursor: 'not-allowed',
            background: theme.colors.textSecondary + '22',
            color: theme.colors.textSecondary + '55',
            borderColor: theme.colors.textSecondary + '44',
        }
    },
    branchLevel: {
        fontSize: '1rem',
        fontWeight: 'bold',
        color: theme.colors.text,
        minWidth: '20px', // Ширина для числа
        textAlign: 'center',
    },
    // --- Конец стилей для веток ---
    notesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' },
    textarea: { width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical', ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '15px', fontWeight: 'bold', minHeight: '1.2em' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' },
    cancelButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    submitButton: { padding: '10px 20px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
};

export default CreateCharacterModal;

