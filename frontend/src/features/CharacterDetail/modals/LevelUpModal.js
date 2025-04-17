// src/features/CharacterDetail/modals/LevelUpModal.js
import React, { useState, useMemo } from 'react';
import * as apiService from '../../../api/apiService'; // Обновленный путь
import { theme } from '../../../styles/theme'; // Обновленный путь

const ALL_SKILLS = [
    'skill_strength', 'skill_dexterity', 'skill_endurance', 'skill_reaction',
    'skill_technique', 'skill_adaptation', 'skill_logic', 'skill_attention',
    'skill_erudition', 'skill_culture', 'skill_science', 'skill_medicine',
    'skill_suggestion', 'skill_insight', 'skill_authority', 'skill_self_control',
    'skill_religion', 'skill_flow'
];
const ALL_BRANCHES = [
    { key: 'medic', name: 'Медик' }, { key: 'mutant', name: 'Мутант' },
    { key: 'sharpshooter', name: 'Стрелок' }, { key: 'scout', name: 'Разведчик' },
    { key: 'technician', name: 'Техник' }, { key: 'fighter', name: 'Боец' },
    { key: 'juggernaut', name: 'Джаггернаут' }
];

const LevelUpModal = ({ characterId, currentCharacterData, onClose, onLevelUpSuccess }) => {
    const [hpRoll, setHpRoll] = useState('');
    const [selectedBranch, setSelectedBranch] = useState(''); // Храним ключ ветки
    const [skillPoints, setSkillPoints] = useState(
        ALL_SKILLS.reduce((acc, skill) => ({ ...acc, [skill]: 0 }), {})
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Считаем потраченные очки навыков
    const pointsSpent = useMemo(() => {
        return Object.values(skillPoints).reduce((sum, points) => sum + points, 0);
    }, [skillPoints]);

    const pointsLeft = 3 - pointsSpent; // Сколько очков осталось распределить

    // Обработчик изменения очков навыка
    const handleSkillChange = (skillName, change) => {
        const currentAddedPoints = skillPoints[skillName];
        const currentSkillLevel = currentCharacterData?.[skillName] || 1;
        let newAddedPoints = currentAddedPoints + change;

        // Проверка лимитов
        if (change > 0 && pointsLeft <= 0) return; // Нельзя добавить больше 3 очков
        if (change < 0 && newAddedPoints < 0) newAddedPoints = 0; // Нельзя уйти в минус

        const projectedLevel = currentSkillLevel + newAddedPoints;
        if (projectedLevel > 10) { // Проверка максимального уровня навыка
            setError(`Навык ${skillName.replace('skill_', '')} не может превышать 10.`);
            return;
        }

        const projectedTotalSpent = pointsSpent - currentAddedPoints + newAddedPoints;
        if (projectedTotalSpent > 3) { // Дополнительная проверка общего лимита
            setError("Можно распределить только 3 очка навыков.");
            return;
        }

        setError(""); // Сброс ошибки
        setSkillPoints(prev => ({ ...prev, [skillName]: newAddedPoints }));
    };

    // Обработчик выбора ветки
    const handleBranchSelect = (branchKey) => {
        const branchLevelKey = `${branchKey}_branch_level`;
        // Проверка на максимальный уровень ветки
        if (currentCharacterData && typeof currentCharacterData[branchLevelKey] === 'number' && currentCharacterData[branchLevelKey] >= 10) {
            setError(`Ветка "${ALL_BRANCHES.find(b => b.key === branchKey)?.name}" уже максимального уровня.`);
            return; // Нельзя выбрать ветку 10 уровня
        }
        setError(""); // Сброс ошибки
        setSelectedBranch(branchKey);
    };

    // Обработчик отправки формы
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Валидация входных данных
        const parsedHpRoll = parseInt(hpRoll, 10);
        if (isNaN(parsedHpRoll) || parsedHpRoll < 1 || parsedHpRoll > 10) {
            setError("Введите корректный результат броска HP (1-10).");
            return;
        }
        if (!selectedBranch) {
            setError("Выберите ветку класса для прокачки.");
            return;
        }
        if (pointsSpent !== 3) {
            setError("Необходимо распределить ровно 3 очка навыка.");
            return;
        }
        // Дополнительная проверка уровня ветки на случай гонки состояний
        const branchLevelKey = `${selectedBranch}_branch_level`;
        if (!currentCharacterData || typeof currentCharacterData[branchLevelKey] !== 'number') {
             setError("Ошибка данных персонажа. Не удалось проверить уровень ветки.");
             return;
         }
        if (currentCharacterData[branchLevelKey] >= 10) {
             setError(`Ветка "${ALL_BRANCHES.find(b => b.key === selectedBranch)?.name}" уже максимального уровня (10).`);
             return;
        }

        setIsLoading(true);

        // Формируем данные для отправки на бэкенд
        const skillPointsSpentData = {};
        for (const skill in skillPoints) {
            if (skillPoints[skill] > 0) {
                skillPointsSpentData[skill] = skillPoints[skill];
            }
        }
        const levelUpData = {
            hp_roll: parsedHpRoll,
            branch_point_spent: selectedBranch,
            skill_points_spent: skillPointsSpentData
        };

        try {
            await apiService.levelUpCharacter(characterId, levelUpData);
            onLevelUpSuccess(); // Вызываем колбэк при успехе
            onClose(); // Закрываем модалку
        } catch (err) {
            console.error("Level up error:", err);
             let errorMessage = "Ошибка повышения уровня.";
             if (err.response?.data?.detail) {
                  const detail = err.response.data.detail;
                  if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
                       const firstError = detail[0];
                       const field = firstError.loc?.slice(1).join('.') || 'поле';
                       errorMessage = `Ошибка валидации: ${firstError.msg} (поле: ${field})`;
                   } else if (typeof detail === 'string') { errorMessage = detail; }
                   else { errorMessage = JSON.stringify(detail); }
             } else if (err.message) { errorMessage = err.message; }
             setError(String(errorMessage));
        } finally {
             setIsLoading(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Повышение Уровня!</h2>
                <button onClick={onClose} style={styles.closeButton} disabled={isLoading}>×</button>
                <form onSubmit={handleSubmit}>
                    {/* Бросок HP */}
                    <div style={styles.formGroup}>
                        <label htmlFor="hpRoll" style={styles.label}>Результат броска 1к10 на ПЗ:</label>
                        <input
                            style={styles.input}
                            type="number"
                            id="hpRoll"
                            min="1" max="10"
                            value={hpRoll}
                            onChange={(e) => setHpRoll(e.target.value)} // Убрал Number() здесь, парсим при сабмите
                            required
                            placeholder="1-10"
                            disabled={isLoading}
                        />
                    </div>
                    {/* Выбор Ветки (Карточки) */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Ветка класса (+1 уровень):</label>
                        <div style={styles.branchGrid}>
                            {ALL_BRANCHES.map(branch => {
                                const levelKey = `${branch.key}_branch_level`;
                                const currentLevel = currentCharacterData?.[levelKey] ?? 0;
                                const isDisabled = currentLevel >= 10;
                                const isSelected = selectedBranch === branch.key;
                                return (
                                    <button
                                        type="button"
                                        key={branch.key}
                                        onClick={() => handleBranchSelect(branch.key)}
                                        style={{
                                            ...styles.branchCard,
                                            ...(isSelected ? styles.branchCardSelected : {}),
                                            ...(isDisabled ? styles.branchCardDisabled : {})
                                        }}
                                        disabled={isDisabled || isLoading}
                                        title={isDisabled ? `${branch.name} - Макс. уровень (${currentLevel})` : `Выбрать ${branch.name} (${currentLevel} -> ${currentLevel + 1})`}
                                    >
                                        <span style={styles.branchName}>{branch.name}</span>
                                        <span style={styles.branchLevelIndicator}>{isDisabled ? 'МАКС' : `${currentLevel} ур.`}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {!selectedBranch && !error && <p style={styles.hintText}>Выберите ветку</p>}
                    </div>
                    {/* Распределение Очков Навыков */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Очки Навыков (+3 очка):</label>
                        <p style={styles.pointsInfo}>
                            Осталось распределить: <strong style={{ color: pointsLeft === 0 ? theme.colors.secondary : theme.colors.primary }}>{pointsLeft}</strong> / 3
                        </p>
                        <div style={styles.skillsGrid}>
                            {ALL_SKILLS.map(skillName => {
                                const currentLevel = currentCharacterData?.[skillName] || 1;
                                const addedPoints = skillPoints[skillName];
                                const nextLevel = currentLevel + addedPoints;
                                const canIncrease = pointsLeft > 0 && nextLevel < 10;
                                const canDecrease = addedPoints > 0;
                                return (
                                    <div key={skillName} style={styles.skillItem}>
                                        <span style={styles.skillLabelItem}>{skillName.replace('skill_', '')}:</span>
                                        <span style={styles.skillLevelValue}>{nextLevel}</span> {/* Показываем итоговый уровень */}
                                        <div style={styles.skillButtons}>
                                            <button type="button" onClick={() => handleSkillChange(skillName, -1)} disabled={!canDecrease || isLoading} style={styles.skillButton}>-</button>
                                            <button type="button" onClick={() => handleSkillChange(skillName, 1)} disabled={!canIncrease || isLoading} style={styles.skillButton}>+</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* Отображение ошибки */}
                    {error && <p style={styles.errorText}>{error}</p>}
                    {/* Кнопки действия */}
                    <div style={styles.buttonGroup}>
                        <button type="button" onClick={onClose} style={styles.cancelButton} disabled={isLoading}>Отмена</button>
                        <button type="submit" style={styles.submitButton} disabled={isLoading || pointsLeft !== 0 || !selectedBranch || hpRoll === ''}>
                            {isLoading ? 'Повышаем...' : 'Подтвердить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// Стили LevelUpModal
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text },
    title: { textAlign: 'center', marginBottom: '25px', color: theme.colors.primary },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer', ':disabled': { opacity: 0.5 } },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold' },
    input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
    pointsInfo: { textAlign: 'center', marginBottom: '15px', color: theme.colors.textSecondary },
    skillsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 15px', maxHeight: '300px', overflowY: 'auto', paddingRight: '10px', border: `1px solid ${theme.colors.surface}`, borderRadius: '8px', padding: '10px' },
    skillItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px dashed ${theme.colors.surface}55` },
    skillLabelItem: { textTransform: 'capitalize', fontSize: '0.9rem', flexBasis: '50%' },
    skillLevelValue: { fontWeight: 'bold', fontSize: '1rem', minWidth: '25px', textAlign: 'center'},
    skillButtons: { display: 'flex', gap: '5px'},
    skillButton: { width: '28px', height: '28px', borderRadius: '50%', border: `1px solid ${theme.colors.primary}`, background: theme.colors.surface, color: theme.colors.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', transition: theme.transitions.default, ':disabled': { opacity: 0.3, cursor: 'not-allowed', filter: 'grayscale(1)' }, ':hover:not(:disabled)': { background: `${theme.colors.primary}33` } },
    branchGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginTop: '5px' },
    branchCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px 10px', border: `1px solid ${theme.colors.surface}`, borderRadius: '8px', background: theme.colors.surface, color: theme.colors.textSecondary, cursor: 'pointer', transition: 'all 0.2s ease-in-out', textAlign: 'center', minHeight: '70px', ':hover:not(:disabled)': { borderColor: theme.colors.primary, color: theme.colors.primary, transform: 'translateY(-2px)', boxShadow: `0 2px 8px ${theme.colors.primary}33` }, ':disabled': { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(80%)' } },
    branchCardSelected: { borderColor: theme.colors.secondary, background: `${theme.colors.secondary}33`, color: theme.colors.secondary, fontWeight: 'bold', boxShadow: `0 0 10px ${theme.colors.secondary}55` },
    branchCardDisabled: { /* Стили для disabled уже есть в :disabled */ },
    branchName: { fontSize: '0.9rem', fontWeight: 'inherit', marginBottom: '4px' },
    branchLevelIndicator: { fontSize: '0.75rem', opacity: 0.8 },
    hintText: { textAlign: 'center', fontSize: '0.85rem', color: theme.colors.warning || theme.colors.textSecondary, marginTop: '5px' },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '15px', fontWeight: 'bold', minHeight: '1.2em' }, // minHeight чтобы не прыгал layout
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' },
    cancelButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    submitButton: { padding: '10px 20px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
};

export default LevelUpModal;