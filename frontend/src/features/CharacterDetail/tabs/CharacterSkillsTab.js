// src/features/CharacterDetail/tabs/CharacterSkillsTab.js
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { theme } from '../../../styles/theme';
import SkillDisplay from '../../../components/UI/SkillDisplay';
import * as apiService from '../../../api/apiService';

// --- Константы ---
const skillGroups = {
    'Физиология': ['skill_strength', 'skill_dexterity', 'skill_endurance', 'skill_reaction', 'skill_technique', 'skill_adaptation'],
    'Интеллект': ['skill_logic', 'skill_attention', 'skill_erudition', 'skill_culture', 'skill_science', 'skill_medicine'],
    'Ментальность': ['skill_suggestion', 'skill_insight', 'skill_authority', 'skill_self_control', 'skill_religion', 'skill_flow'],
};
const skillTranslations = {
    skill_strength: 'Сила', skill_dexterity: 'Ловкость', skill_endurance: 'Выносливость',
    skill_reaction: 'Реакция', skill_technique: 'Техника', skill_adaptation: 'Адаптация',
    skill_logic: 'Логика', skill_attention: 'Внимание', skill_erudition: 'Эрудиция',
    skill_culture: 'Культура', skill_science: 'Наука', skill_medicine: 'Медицина',
    skill_suggestion: 'Внушение', skill_insight: 'Проницательность', skill_authority: 'Авторитет',
    skill_self_control: 'Самообладание', skill_religion: 'Религия', skill_flow: 'Поток'
};

// --- Компонент: Чип выбранного навыка (Обновленный стиль кнопки) ---
const SelectedSkillChip = ({ skillKey, onRemove }) => {
    const name = skillTranslations[skillKey] || skillKey.replace('skill_', '');
    return (
        // Обертка больше не нужна для позиционирования кнопки
        <div style={styles.selectedChip} className="selected-skill-chip">
            <span>{name}</span>
            {/* Кнопка удаления теперь внутри чипа */}
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Предотвращаем срабатывание клика на чипе
                    onRemove(skillKey);
                }}
                style={styles.removeChipButton}
                className="remove-chip-button"
                title={`Убрать ${name}`}
            >
                × {/* Используем символ 'x' */}
            </button>
        </div>
    );
};
// --- КОНЕЦ КОМПОНЕНТА ---


// --- Компонент: Анимация броска кубика ---
const DiceRollAnimation = () => (
    <div style={styles.diceAnimationContainer}>
        <div style={styles.dice}></div>
        <span style={styles.rollingText}>Бросок...</span>
    </div>
);

// --- Основной Компонент Вкладки ---
const CharacterSkillsTab = ({ character, refreshCharacterData }) => {
    // Хуки состояния
    const [selectedSkillKeys, setSelectedSkillKeys] = useState(new Set());
    const [skillCheckResults, setSkillCheckResults] = useState({});
    const [isRolling, setIsRolling] = useState(false);
    const [rollError, setRollError] = useState(null);
    const [showResults, setShowResults] = useState(false);

    // Мемоизированные значения
    const modifiers = useMemo(() => character?.skill_modifiers || {}, [character?.skill_modifiers]);

    // Обработчики событий
    const handleSkillToggle = useCallback((skillKey) => {
        setSelectedSkillKeys(prev => { const newSet = new Set(prev); if (newSet.has(skillKey)) newSet.delete(skillKey); else newSet.add(skillKey); return newSet; });
        setSkillCheckResults({}); setRollError(null); setShowResults(false);
    }, []);

     const handleRemoveChip = useCallback((skillKey) => {
        setSelectedSkillKeys(prev => { const newSet = new Set(prev); newSet.delete(skillKey); return newSet; });
        setSkillCheckResults(prev => { const newResults = {...prev}; delete newResults[skillKey]; return newResults; });
    }, []);

    const handleRollSelectedClick = useCallback(async () => {
        if (selectedSkillKeys.size === 0 || isRolling || !character?.id) return;
        setIsRolling(true); setShowResults(false); setSkillCheckResults({}); setRollError(null);
        await new Promise(resolve => setTimeout(resolve, 800));

        const promises = Array.from(selectedSkillKeys).map(skillKey => {
            const skillNameForApi = skillTranslations[skillKey] || skillKey.replace('skill_', '');
            return apiService.performSkillCheck(character.id, skillNameForApi)
                .then(response => ({ skillKey, status: 'fulfilled', value: response.data }))
                .catch(error => ({ skillKey, status: 'rejected', reason: error }));
        });

        const results = await Promise.allSettled(promises);
        const newResults = {}; let hasErrors = false; let errorMessages = [];

        results.forEach(result => {
            const skillKey = result.status === 'fulfilled' ? result.value?.skillKey : result.reason?.skillKey;
            const skillName = skillTranslations[skillKey] || skillKey?.replace('skill_', '') || 'unknown_skill';
            if (result.status === 'fulfilled' && result.value) {
                const { value: apiResult } = result.value;
                if (apiResult.success) { newResults[skillKey] = apiResult; }
                else { console.error(`Check failed for ${skillName}:`, apiResult.message); hasErrors = true; errorMessages.push(`${skillName}: ${apiResult.message || '?'}`); newResults[skillKey] = null; }
            } else if (result.status === 'rejected') {
                const detail = result.reason?.response?.data?.detail || result.reason?.message || 'Network Error';
                console.error(`API call rejected for ${skillName}:`, detail); hasErrors = true; errorMessages.push(`${skillName}: ${detail}`); newResults[skillKey] = null;
            }
        });

        setSkillCheckResults(newResults);
        if (hasErrors) { setRollError(`Ошибки:\n${errorMessages.join('\n')}`); }
        setIsRolling(false); setShowResults(true);
    }, [selectedSkillKeys, isRolling, character?.id]);

    // Проверка пропса character
    if (!character || typeof character !== 'object') {
         return <p style={styles.errorText}>Ошибка: Данные персонажа не загружены.</p>;
    }

    return (
        <div style={styles.tabContent}>
            {/* CSS для анимации и hover кнопки удаления */}
            <style>{`
                @keyframes roll { 0% { transform: rotate(0deg) scale(1); } 25% { transform: rotate(180deg) scale(1.2); } 50% { transform: rotate(360deg) scale(1); } 75% { transform: rotate(540deg) scale(1.2); } 100% { transform: rotate(720deg) scale(1); } }
                @keyframes fadeInResult { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .selected-skill-chip { animation: fadeInResult 0.3s ease-out forwards; opacity: 0; } /* Анимация для чипа */
                .result-fade-in { animation: fadeInResult 0.5s ease-out forwards; opacity: 0; }
                @keyframes pulseBg { 0% { background-color: ${theme.colors.secondary}; } 50% { background-color: ${theme.colors.primary}; } 100% { background-color: ${theme.colors.secondary}; } }
                .rolling { animation: pulseBg 1s infinite alternate; }
                /* Появление кнопки удаления при наведении на ЧИП */
                .selected-skill-chip .remove-chip-button {
                    opacity: 0;
                    transform: scale(0.7);
                    transition: opacity 0.15s ease-out, transform 0.15s ease-out;
                    pointer-events: none;
                }
                .selected-skill-chip:hover .remove-chip-button {
                    opacity: 0.7;
                    transform: scale(1);
                    pointer-events: auto;
                }
                .selected-skill-chip .remove-chip-button:hover {
                    opacity: 1;
                    background-color: ${theme.colors.error} !important; /* Важно для переопределения */
                    color: #fff !important;
                    transform: scale(1.1);
                }
            `}</style>

            {/* === Верхняя Область: Список Навыков === */}
            <div style={styles.skillsSection}>
                 <h3 style={styles.skillsSectionTitle}>Доступные Навыки</h3>
                 <div style={styles.skillGroupsContainer}>
                     {Object.entries(skillGroups).map(([groupName, skillKeys]) => (
                         <div key={groupName} style={styles.skillGroup}>
                             <h4 style={styles.skillGroupTitle}>{groupName}</h4>
                             <div style={styles.skillsList}>
                                 {skillKeys.map(skillKey => {
                                     const skillLevel = character[skillKey] ?? '?';
                                     const modifierKey = `${skillKey.replace('skill_', '')}_mod`;
                                     const modifier = modifiers[modifierKey] ?? '?';
                                     const skillNameRussian = skillTranslations[skillKey] || skillKey.replace('skill_', '');
                                     const isSelected = selectedSkillKeys.has(skillKey);
                                     if (skillLevel === '?' || modifier === '?') { return <div key={skillKey} style={styles.skillError}>Данные {skillNameRussian}?</div>; }
                                     return (
                                         <button key={skillKey} onClick={() => handleSkillToggle(skillKey)} style={{...styles.skillButtonWrapper, ...(isSelected ? styles.skillButtonSelected : {})}} title={`${isSelected ? 'Убрать' : 'Выбрать'} ${skillNameRussian} для проверки`}>
                                             <SkillDisplay name={skillNameRussian} level={skillLevel} modifier={modifier} />
                                         </button>
                                     );
                                 })}
                             </div>
                         </div>
                     ))}
                 </div>
            </div>

            {/* === Нижняя Область: Контейнер Броска и Результаты === */}
            <div style={styles.rollSection}>
                {/* Контейнер Выбранных Навыков и Кнопка */}
                <div style={styles.rollContainer}>
                    <div style={styles.selectedChipsScrollContainer}>
                        {selectedSkillKeys.size > 0 ? (
                            Array.from(selectedSkillKeys).map(skillKey => (
                                <SelectedSkillChip key={skillKey} skillKey={skillKey} onRemove={handleRemoveChip} />
                            ))
                        ) : (
                            <p style={styles.placeholderTextRoll}>Кликните на навыки выше...</p>
                        )}
                    </div>
                    <button
                        onClick={handleRollSelectedClick}
                        disabled={selectedSkillKeys.size === 0 || isRolling}
                        style={{ ...styles.rollButton, ...((selectedSkillKeys.size === 0 || isRolling) ? styles.buttonDisabled : {}) }}
                        className={isRolling ? 'rolling' : ''}
                    >
                        {isRolling ? '...' : `Бросить (${selectedSkillKeys.size})`}
                    </button>
                </div>

                {/* Контейнер Результатов или Анимации */}
                <div style={styles.resultsOuterContainer}>
                    {isRolling ? (
                        <DiceRollAnimation />
                    ) : showResults && (rollError || Object.keys(skillCheckResults).length > 0) ? (
                        <div style={styles.resultsSection} className="result-fade-in">
                            <h4 style={styles.resultsTitle}>Результаты Проверок:</h4>
                            {rollError && <p style={{...styles.errorText, whiteSpace: 'pre-wrap'}}>{rollError}</p>}
                            <div style={styles.resultsGrid}>
                                {Object.entries(skillCheckResults).map(([skillKey, result]) => {
                                    const skillName = skillTranslations[skillKey] || skillKey.replace('skill_', '');
                                    let resultColor = theme.colors.textSecondary;
                                    if (result?.roll_total) {
                                        if (result.roll_total >= 15) resultColor = theme.colors.success || '#66BB6A';
                                        else if (result.roll_total <= 8) resultColor = theme.colors.error || '#CF6679';
                                    }
                                    return (
                                        <div key={skillKey} style={{...styles.resultGridItem, borderLeftColor: resultColor}} title={result?.roll_detail_str || 'Ошибка'}>
                                            <span style={styles.resultGridSkillName}>{skillName}:</span>
                                            {result ? (
                                                <>
                                                    <span style={{ ...styles.resultGridTotal, color: resultColor }}>
                                                        {result.roll_total}
                                                    </span>
                                                    <span style={styles.resultGridMode}>
                                                        ({result.roll_mode === 'advantage' ? 'Adv' : result.roll_mode === 'disadvantage' ? 'Dis' : 'Norm'})
                                                    </span>
                                                </>
                                            ) : (
                                                <span style={styles.resultGridError}>Ошибка</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

// --- Стили ---
const styles = {
    // ... (основные стили tabContent, skillsSection, rollSection и т.д. как были) ...
    tabContent: { animation: 'fadeIn 0.5s ease-out', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', gap: '20px' },
    skillsSection: { width: '100%', maxHeight: '50vh', overflowY: 'auto', padding: '15px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', border: `1px solid ${theme.colors.surface}44`, scrollbarWidth: 'thin', scrollbarColor: `${theme.colors.primary}33 ${theme.colors.surface}55`, '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-track': { background: `${theme.colors.surface}55`, borderRadius: '4px' }, '&::-webkit-scrollbar-thumb': { background: `${theme.colors.primary}55`, borderRadius: '4px', border: `1px solid ${theme.colors.surface}88` }, '&::-webkit-scrollbar-thumb:hover': { background: `${theme.colors.primary}88` } },
    skillsSectionTitle: { margin: '0 0 15px 0', color: theme.colors.secondary, textAlign: 'center', fontSize: '1.2rem', borderBottom: `1px solid ${theme.colors.secondary}66`, paddingBottom: '10px' },
    rollSection: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginTop: 'auto', paddingTop: '10px' },
    skillGroupsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' },
    skillGroup: { background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '8px', border: `1px solid ${theme.colors.surface}55`, display: 'flex', flexDirection: 'column' },
    skillGroupTitle: { margin: '0 0 12px 0', color: theme.colors.primary, fontSize: '1rem', borderBottom: `1px solid ${theme.colors.primary}88`, paddingBottom: '8px', textAlign: 'center' },
    skillsList: { display: 'flex', flexDirection: 'column', gap: '4px' },
    skillButtonWrapper: { background: 'transparent', border: `1px solid transparent`, borderRadius: '6px', padding: '0', margin: '0', display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.2s, border-color 0.2s, transform 0.1s ease', ':hover': { background: `${theme.colors.primary}11`, borderColor: `${theme.colors.primary}33`, transform: 'translateX(2px)' } },
    skillButtonSelected: { background: `${theme.colors.secondary}33`, borderColor: theme.colors.secondary, boxShadow: `0 0 8px ${theme.colors.secondary}22`, transform: 'scale(1.01)' },
    rollContainer: { width: '100%', maxWidth: '800px', padding: '10px 15px', background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '12px', border: `1px solid ${theme.colors.surfaceVariant}aa`, display: 'flex', alignItems: 'center', gap: '15px', boxShadow: theme.effects.shadow },
    selectedChipsScrollContainer: { display: 'flex', flexWrap: 'nowrap', gap: '10px', overflowX: 'auto', flexGrow: 1, padding: '5px 0', scrollbarWidth: 'thin', scrollbarColor: `${theme.colors.secondary}55 transparent`, '::-webkit-scrollbar': { height: '4px' }, '::-webkit-scrollbar-track': { background: 'transparent' }, '::-webkit-scrollbar-thumb': { background: `${theme.colors.secondary}55`, borderRadius: '2px' }, '::-webkit-scrollbar-thumb:hover': { background: `${theme.colors.secondary}88` } },
    placeholderTextRoll: { fontStyle: 'italic', color: theme.colors.textSecondary, fontSize: '0.9rem', flexGrow: 1, textAlign: 'left', paddingLeft: '5px' },
    rollButton: { padding: '10px 18px', fontSize: '1rem', fontWeight: 'bold', background: `linear-gradient(45deg, ${theme.colors.secondary}, ${theme.colors.primary})`, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s ease', minHeight: '40px', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', flexShrink: 0, ':hover:not(:disabled)': { filter: 'brightness(1.15)', boxShadow: `0 4px 10px ${theme.colors.secondary}55`, transform: 'scale(1.03)' }, '&.rolling': { /* Анимация pulseBg */ } },
    buttonDisabled: { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(70%)', boxShadow: 'none', background: theme.colors.textSecondary, ':hover': { filter: 'grayscale(70%)', boxShadow: 'none', transform: 'none' } },
    resultsOuterContainer: { width: '100%', maxWidth: '800px', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: '15px' },
    diceAnimationContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', color: theme.colors.textSecondary },
    dice: { width: '40px', height: '40px', background: theme.colors.primary, borderRadius: '6px', animation: 'roll 0.8s ease-in-out infinite alternate', border: '2px solid rgba(255,255,255,0.5)', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5)' },
    rollingText: { fontSize: '1rem', fontWeight: 'bold', fontStyle: 'italic' },
    resultsSection: { width: '100%', padding: '15px', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', border: `1px solid ${theme.colors.surface}66`, display: 'flex', flexDirection: 'column', gap: '0px', animation: 'fadeInResult 0.5s ease-out forwards', opacity: 0, maxHeight: '35vh', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${theme.colors.secondary}55 ${theme.colors.surface}33`, '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-track': { background: `${theme.colors.surface}33`, borderRadius: '3px' }, '&::-webkit-scrollbar-thumb': { background: `${theme.colors.secondary}55`, borderRadius: '3px' }, '&::-webkit-scrollbar-thumb:hover': { background: `${theme.colors.secondary}88` } },
    resultsTitle: { margin: '0 0 10px 0', color: theme.colors.primary, fontSize: '1rem', fontWeight: 'bold', textAlign: 'center', paddingBottom: '8px', borderBottom: `1px dashed ${theme.colors.surface}88`, flexShrink: 0 },
    resultsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 12px' },
    resultGridItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${theme.colors.surface}55`, padding: '8px 12px', borderRadius: '6px', borderLeft: '4px solid', transition: 'background-color 0.2s', minHeight: '40px', ':hover': { background: `${theme.colors.surface}99` } },
    resultGridSkillName: { fontWeight: '500', color: theme.colors.text, fontSize: '0.9rem', marginRight: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    resultGridTotal: { fontSize: '1.3rem', fontWeight: 'bold', cursor: 'help', marginLeft: 'auto', paddingLeft: '10px' },
    resultGridMode: { fontSize: '0.75rem', color: theme.colors.textSecondary, fontStyle: 'italic', marginLeft: '5px' },
    resultGridError: { color: theme.colors.error, fontSize: '0.9rem', fontWeight: '500', fontStyle: 'italic', marginLeft: 'auto' },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '10px', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'pre-wrap' },
    skillError: { fontSize: '0.85rem', color: theme.colors.error, fontStyle: 'italic', padding: '8px 0', textAlign: 'center' },

    // --- ОБНОВЛЕННЫЕ Стили для Чипов и Кнопки Удаления ---
    selectedChipWrapper: { /* Убрали обертку */ },
    selectedChip: { // Стиль самого чипа
        display: 'inline-flex', // Чтобы кнопка была внутри
        alignItems: 'center', // Выравниваем текст и кнопку
        position: 'relative', // Для позиционирования кнопки
        background: theme.colors.secondary + 'dd',
        color: theme.colors.background,
        padding: '6px 12px',
        // --- ИЗМЕНЕНИЕ: Добавляем правый паддинг для кнопки ---
        paddingRight: '60px', // Место для кнопки
        // --- КОНЕЦ ---

        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: '600',
        boxShadow: '1px 1px 4px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap',
        animation: 'fadeInResult 0.3s ease-out forwards',
        opacity: 0,
        overflow: 'hidden', // Скрываем кнопку, если она вылезет
    },
    removeChipButton: { // Кнопка "x" внутри чипа
        position: 'absolute', // Абсолютное позиционирование
        top: '50%', // Центрируем по вертикали
        right: '4px', // Отступ справа
        transform: 'translateY(-50%)', // Точное центрирование по вертикали
        background: 'transparent', // Без фона по умолчанию
        border: 'none',
        color: theme.colors.background + '99', // Полупрозрачный цвет фона чипа
        width: '18px', // Маленький размер
        height: '18px',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.1rem', // Размер крестика
        lineHeight: 1,
        padding: 0,
        // transition и opacity управляются через CSS класс .remove-chip-button
    },
    // --- КОНЕЦ ОБНОВЛЕННЫХ СТИЛЕЙ ---
};

export default CharacterSkillsTab;
