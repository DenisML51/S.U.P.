// src/features/CharacterDetail/sections/CharacterStatusSection.js
import React, { useState, useMemo } from 'react';
// Импортируем StatDisplay и theme
import StatDisplay from '../../../components/UI/StatDisplay';
import { theme } from '../../../styles/theme';
// Импортируем apiService для вызова лечения
import * as apiService from '../../../api/apiService';
// Импортируем модалки
import AddStatusModal from '../modals/AddStatusModal';
import StatusEffectDetailModal from '../modals/StatusEffectDetailModal';
import SelectMedkitModal from '../modals/SelectMedkitModal';
// Импортируем новую модалку для короткого отдыха
import ShortRestModal from '../modals/ShortRestModal';


// Компонент теперь принимает handleApiAction ИЗ useApiActionHandler
const CharacterStatusSection = ({
    character,
    handleApiAction, // <--- Функция из useApiActionHandler
    onLevelUpClick,
    refreshCharacterData, // <--- Функция для обновления данных (если нужна для AddStatusModal)
}) => {
    const [xpToAdd, setXpToAdd] = useState('');
    const [xpToRemove, setXpToRemove] = useState('');
    const [showAddStatusModal, setShowAddStatusModal] = useState(false);
    const [showStatusEffectModal, setShowStatusEffectModal] = useState(false);
    const [selectedStatusEffectForModal, setSelectedStatusEffectForModal] = useState(null);
    const [showSelectMedkitModal, setShowSelectMedkitModal] = useState(false);
    const [damageInput, setDamageInput] = useState('');
    const [showShortRestModal, setShowShortRestModal] = useState(false);


    // --- useMemo хуки ПЕРЕМЕЩЕНЫ ВВЕРХ ---
    const availableMedkits = useMemo(() => {
        if (!character?.inventory || !Array.isArray(character.inventory)) { return []; }
        return character.inventory.filter(invItem => invItem.item?.category === 'Медицина');
    }, [character?.inventory]);

    const maxStaminaPoints = useMemo(() => {
         if (!character) return 1;
         const enduranceMod = character.skill_modifiers?.endurance_mod ?? 0;
         return Math.max(1, (character.level ?? 1)); // Макс ОС = Уровень
    }, [character?.level, character?.skill_modifiers?.endurance_mod]);

    // --- Расчеты для HP Bar ПЕРЕМЕЩЕНЫ ВВЕРХ ---
    const hpPercentage = useMemo(() => {
        // Добавлена проверка на character и max_hp внутри useMemo
        if (!character || !character.max_hp || character.max_hp <= 0) return 0;
        // Используем character.current_hp и character.max_hp
        return Math.max(0, Math.min(100, (character.current_hp / character.max_hp) * 100));
        // Зависимости теперь с optional chaining
    }, [character?.current_hp, character?.max_hp]);

    const getHpBarColor = (percentage) => {
        if (percentage <= 25) return theme.colors.error;
        if (percentage <= 50) return theme.colors.warning || '#FFA726';
        return theme.colors.success || '#66BB6A';
    };
    const hpBarColor = getHpBarColor(hpPercentage);
    // --- КОНЕЦ ПЕРЕМЕЩЕННЫХ БЛОКОВ ---


    // Ранний выход, если нет данных персонажа
    if (!character) return null;

    // Определяем состояния ПОСЛЕ проверки на character
    const hasMedkit = availableMedkits.length > 0;
    const isHpFull = character.current_hp >= character.max_hp;
    const isHpZero = character.current_hp <= 0;
    const hasStamina = character.stamina_points > 0;
    const canLevelUp = character.experience_points >= (character.xp_needed_for_next_level || Infinity);
    const xpProgress = character.xp_needed_for_next_level && character.xp_needed_for_next_level > 0
        ? Math.min(100, Math.floor((character.experience_points / character.xp_needed_for_next_level) * 100))
        : (character.level > 0 ? 100 : 0);


    // --- Обработчики действий (без изменений) ---
    const handleAddExperience = () => { const amount = parseInt(xpToAdd, 10); if (isNaN(amount) || amount <= 0) { alert("Введите положительное число XP."); return; } const newTotalXp = (character.experience_points || 0) + amount; handleApiAction( apiService.updateCharacterStats(character.id, { experience_points: newTotalXp }), `${amount} XP добавлено`, `Ошибка добавления XP` ); setXpToAdd(''); };
    const handleRemoveExperience = () => { const amount = parseInt(xpToRemove, 10); if (isNaN(amount) || amount <= 0) { alert("Введите положительное число XP для вычитания."); return; } const newTotalXp = Math.max(0, (character.experience_points || 0) - amount); handleApiAction( apiService.updateCharacterStats(character.id, { experience_points: newTotalXp }), `${amount} XP вычтено`, `Ошибка вычитания XP` ); setXpToRemove(''); };
    const handlePuChange = (delta, result = null) => { const currentPu = character.current_pu ?? 0; const targetPu = currentPu + delta; handleApiAction( apiService.updateCharacterStats(character.id, { current_pu: targetPu }, result), `ПУ изменено`, `Ошибка изменения ПУ` ); };
    const handleRemoveStatus = (effectId) => { if (window.confirm(`Снять состояние?`)) { handleApiAction( apiService.removeStatusEffect(character.id, effectId), `Статус ${effectId} снят`, `Ошибка снятия состояния` ); } };
    const handleStatusEffectClick = (effect) => { setSelectedStatusEffectForModal(effect); setShowStatusEffectModal(true); };
    const handleHealMedkitClick = () => { if (!hasMedkit || isHpFull) return; if (availableMedkits.length === 1) { handleApiAction( apiService.healCharacter(character.id, { source: 'medkit', inventory_item_id: availableMedkits[0].id }), "Аптечка использована", "Ошибка лечения аптечкой" ); } else { setShowSelectMedkitModal(true); } };
    const handleMedkitSelected = (selectedInventoryItemId) => { setShowSelectMedkitModal(false); handleApiAction( apiService.healCharacter(character.id, { source: 'medkit', inventory_item_id: selectedInventoryItemId }), "Выбранная аптечка использована", "Ошибка лечения выбранной аптечкой" ); };
    const handleApplyDamage = () => { const damageAmount = parseInt(damageInput, 10); if (isNaN(damageAmount) || damageAmount <= 0) { alert("Введите положительное число урона."); return; } if (isHpZero) { alert("Персонаж уже при смерти."); return; } const newHp = Math.max(0, character.current_hp - damageAmount); handleApiAction( apiService.updateCharacterStats(character.id, { current_hp: newHp }), `${damageAmount} урона применено`, "Ошибка применения урона" ); setDamageInput(''); };
    const handleOpenShortRestModal = () => { if (!hasStamina) { alert("Нет Очков Стойкости."); return; } setShowShortRestModal(true); };
    const handlePerformShortRest = (diceCount) => { handleApiAction( apiService.performShortRest(character.id, diceCount), `Короткий отдых (${diceCount} ОС) завершен`, "Ошибка короткого отдыха" ); };
    const handlePerformLongRest = () => { if (window.confirm("Начать длительный отдых?")) { handleApiAction( apiService.performLongRest(character.id), "Длительный отдых завершен", "Ошибка длительного отдыха" ); } };


    // --- Рендеринг компонента ---
    const isHealMedkitDisabled = isHpFull || !hasMedkit;
    const isShortRestDisabled = !hasStamina;
    const isApplyDamageDisabled = !damageInput || parseInt(damageInput, 10) <= 0 || isHpZero;
    const isRemoveXpDisabled = !xpToRemove || parseInt(xpToRemove, 10) <= 0;

    // Определяем стили для кнопок в зависимости от состояния
    const healButtonStyle = isHealMedkitDisabled ? { ...styles.actionButton, ...styles.actionButtonDisabled } : { ...styles.actionButton, ...styles.healButtonMedkitActive };
    const shortRestButtonStyle = isShortRestDisabled ? { ...styles.actionButton, ...styles.actionButtonDisabled } : { ...styles.actionButton, ...styles.restButtonShortActive };
    const longRestButtonStyle = { ...styles.actionButton, ...styles.restButtonLongActive };
    const applyDamageButtonStyle = isApplyDamageDisabled ? { ...styles.applyDamageButton, ...styles.actionButtonDisabled } : styles.applyDamageButton;


    return (
        <>
            {/* --- Модальные окна --- */}
            {/* Модалки рендерятся здесь */}
            {showAddStatusModal && ( <AddStatusModal characterId={character.id} onClose={() => setShowAddStatusModal(false)} onSuccess={() => { setShowAddStatusModal(false); if (refreshCharacterData) refreshCharacterData(); }} /> )}
            {showStatusEffectModal && selectedStatusEffectForModal && ( <StatusEffectDetailModal effect={selectedStatusEffectForModal} onClose={() => { setShowStatusEffectModal(false); setSelectedStatusEffectForModal(null); }} /> )}
            {showSelectMedkitModal && ( <SelectMedkitModal availableMedkits={availableMedkits} onClose={() => setShowSelectMedkitModal(false)} onSelect={handleMedkitSelected} /> )}
            {showShortRestModal && ( <ShortRestModal currentStamina={character.stamina_points} maxStamina={maxStaminaPoints} onClose={() => setShowShortRestModal(false)} onSubmit={handlePerformShortRest} /> )}


            {/* --- Секция Статус --- */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Статус</h2>
                {/* Уровень и Опыт */}
                <StatDisplay label="Уровень" value={character.level} />
                <StatDisplay label="Опыт" value={`${character.experience_points} / ${character.xp_needed_for_next_level ?? 'МАКС'}`} />
                <div style={styles.xpBarContainer} title={`${xpProgress}% до следующего уровня`}> <div style={{ ...styles.xpBarProgress, width: `${xpProgress}%` }}></div> </div>
                {/* Блок Управления Опытом */}
                <div style={styles.xpControlContainer}>
                    <div style={styles.xpActionGroup}>
                        <input type="number" min="1" value={xpToAdd} onChange={(e) => setXpToAdd(e.target.value)} placeholder="Добавить XP" style={{...styles.xpInput, ...styles.xpInputAdd}} onKeyPress={(e) => e.key === 'Enter' && handleAddExperience()} />
                        <button onClick={handleAddExperience} style={{...styles.xpButton, ...styles.xpButtonAdd}} title="Добавить опыт">+</button>
                    </div>
                    <div style={styles.xpActionGroup}>
                        <input type="number" min="1" value={xpToRemove} onChange={(e) => setXpToRemove(e.target.value)} placeholder="Отнять XP" style={{...styles.xpInput, ...styles.xpInputRemove}} onKeyPress={(e) => e.key === 'Enter' && !isRemoveXpDisabled && handleRemoveExperience()} />
                        <button onClick={handleRemoveExperience} style={{...styles.xpButton, ...styles.xpButtonRemove}} title="Отнять опыт" disabled={isRemoveXpDisabled}>-</button>
                    </div>
                </div>
                {canLevelUp && ( <button onClick={onLevelUpClick} style={styles.levelUpButton}>Повысить Уровень!</button> )}

                {/* Основные Статы */}
                <div style={styles.coreStatsGrid}>
                    {/* Полоса Здоровья */}
                    <div style={styles.hpBarOuterContainer}>
                         <span style={styles.statLabelHp}>ПЗ:</span>
                         <div style={styles.hpBarContainer} title={`${character.current_hp} / ${character.max_hp} (${hpPercentage.toFixed(0)}%)`}>
                             <div style={{ ...styles.hpBarFill, width: `${hpPercentage}%`, backgroundColor: hpBarColor }}></div>
                             <span style={styles.hpBarText}>{character.current_hp} / {character.max_hp}</span>
                         </div>
                    </div>
                    {/* Остальные статы */}
                    <StatDisplay label="ОС" value={`${character.stamina_points} / ${maxStaminaPoints}`} />
                    <StatDisplay label="Истощение" value={character.exhaustion_level} />
                    <StatDisplay label="КЗ" value={character.total_ac} />
                    <StatDisplay label="Иниц." value={character.initiative_bonus >= 0 ? `+${character.initiative_bonus}` : character.initiative_bonus} />
                    <StatDisplay label="Скор." value={`${character.speed} м.`} />
                    <StatDisplay label="Пасс.Вним." value={character.passive_attention} />
                </div>

                {/* Блок Урона */}
                <div style={styles.damageInputContainer}>
                    <input type="number" min="1" value={damageInput} onChange={(e) => setDamageInput(e.target.value)} placeholder="Полученный урон" style={styles.damageInput} onKeyPress={(e) => e.key === 'Enter' && !isApplyDamageDisabled && handleApplyDamage()} disabled={isHpZero} />
                    <button onClick={handleApplyDamage} style={applyDamageButtonStyle} disabled={isApplyDamageDisabled} title={isHpZero ? "Персонаж уже при смерти" : "Применить урон"}> Применить урон </button>
                </div>

                 {/* Кнопки Лечения и Отдыха */}
                 <div style={styles.actionButtonsContainer}>
                     <button onClick={handleHealMedkitClick} style={healButtonStyle} disabled={isHealMedkitDisabled} title={isHpFull ? "Здоровье полное" : hasMedkit ? "Исп. аптечку" : "Нет аптечек"}>
                         Аптечка {hasMedkit ? `(${availableMedkits.length})` : ''}
                     </button>
                     <button onClick={handleOpenShortRestModal} style={shortRestButtonStyle} disabled={isShortRestDisabled} title={hasStamina ? `Начать короткий отдых (есть ${character.stamina_points} ОС)` : "Нет ОС для отдыха"}>
                         Кор. Отдых
                     </button>
                     <button onClick={handlePerformLongRest} style={longRestButtonStyle} title="Начать длительный отдых (8 часов)">
                         Длит. Отдых
                     </button>
                 </div>
            </div>

            {/* --- Секция Псих. Устойчивость --- */}
            <div style={{ ...styles.section, ...styles.puSection }}>
                 <h2 style={{ ...styles.sectionTitle, borderBottomColor: theme.colors.puColor || theme.colors.secondary }}> Псих. Устойчивость </h2>
                <div style={styles.puDisplayContainer}> <span style={styles.puValue}>{character.current_pu ?? 0}</span> <span style={styles.puSeparator}>/</span> <span style={styles.puBaseValue}>{character.base_pu ?? 1}</span> </div>
                <div style={styles.puControlContainer}> <label style={styles.puLabel}>Изменить:</label> <div style={styles.puButtons}> <button onClick={() => handlePuChange(-1, 'failure')} style={{ ...styles.puButton, ...styles.puButtonFailure }} title="-1 ПУ (Провал)">-1 Провал</button> <button onClick={() => handlePuChange(-1)} style={styles.puButton} title="-1 ПУ (Прочее)">-1</button> <button onClick={() => handlePuChange(1)} style={styles.puButton} title="+1 ПУ (Прочее)">+1</button> <button onClick={() => handlePuChange(1, 'success')} style={{ ...styles.puButton, ...styles.puButtonSuccess }} title="+1 ПУ (Успех)">+1 Успех</button> </div> </div>
            </div>

             {/* --- Секция Активные Состояния --- */}
             <div style={styles.section}>
                 <div style={{ ...styles.tabHeader, marginBottom: '10px', paddingBottom: '5px' }}> <h2 style={{ ...styles.sectionTitle, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>Активные Состояния</h2> <button onClick={() => setShowAddStatusModal(true)} style={{ ...styles.addItemButton, padding: '4px 8px' }} title="Добавить состояние">+</button> </div>
                 {character.active_status_effects && character.active_status_effects.length > 0 ? (
                     <div style={styles.statusTagContainer}> {character.active_status_effects.map(effect => ( <div key={effect.id} style={{ ...styles.statusTag, ...(effect.name.startsWith('ПУ:') ? styles.statusTagPu : {}) }} title={effect.description || "Нажмите для описания"}> <span onClick={() => handleStatusEffectClick(effect)} style={styles.statusTagName}> {effect.name} </span> <button onClick={() => handleRemoveStatus(effect.id)} style={styles.removeStatusButtonTag} title="Снять состояние">×</button> </div> ))} </div>
                 ) : ( <p style={styles.placeholderText}>Нет активных состояний.</p> )}
             </div>
        </>
    );
};

// Стили styles (возвращены к предыдущей версии слияния)
const actionButton = { padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}88`, background: `${theme.colors.surface}cc`, color: theme.colors.textSecondary, cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.85rem', fontWeight: '500', flex: '1', textAlign: 'center', whiteSpace: 'nowrap', };
const actionButtonDisabled = { opacity: 0.6, cursor: 'not-allowed', borderColor: `${theme.colors.textSecondary}44`, background: `${theme.colors.surface}55`, color: `${theme.colors.textSecondary}99`, ':hover': {} };
const healButtonMedkitActive = { borderColor: theme.colors.success || '#66BB6A', color: theme.colors.success || '#66BB6A', background: `${theme.colors.success || '#66BB6A'}22`, };
const restButtonShortActive = { borderColor: theme.colors.secondary, color: theme.colors.secondary, background: `${theme.colors.secondary}22`, };
const restButtonLongActive = { borderColor: theme.colors.primary, color: theme.colors.primary, background: `${theme.colors.primary}22`, };
const applyDamageButton = { padding: '10px 20px', borderRadius: '8px', border: `1px solid ${theme.colors.error}`, background: `${theme.colors.error}cc`, color: theme.colors.text, cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', };
const styles = {
    section: { background: theme.effects.glass, backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '20px', boxShadow: theme.effects.shadow, marginBottom: '25px' },
    sectionTitle: { margin: '0 0 15px 0', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}`, paddingBottom: '8px', fontSize: '1.2rem' },
    coreStatsGrid: { marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px 15px', alignItems: 'center' },
    statItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: `1px solid ${theme.colors.surface}33`, fontSize: '0.95rem' },
    statLabel: { color: theme.colors.textSecondary, marginRight: '10px', whiteSpace: 'nowrap' },
    statValue: { fontWeight: 'bold', textAlign: 'right', wordBreak: 'break-word' },
    xpBarContainer: { height: '8px', background: theme.colors.surface, borderRadius: '4px', overflow: 'hidden', margin: '8px 0' },
    xpBarProgress: { height: '100%', background: theme.colors.primary, borderRadius: '4px', transition: 'width 0.5s ease-in-out' },
    xpControlContainer: { display: 'flex', gap: '15px', marginTop: '10px', marginBottom: '5px', flexWrap: 'wrap' },
    xpActionGroup: { display: 'flex', gap: '8px', flex: '1 1 180px' },
    xpInput: { flexGrow: 1, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '0.9rem', boxSizing: 'border-box', textAlign: 'center', appearance: 'textfield', '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 }, '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 } },
    xpInputAdd: { borderColor: theme.colors.secondary },
    xpInputRemove: { borderColor: theme.colors.error },
    xpButton: { padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', lineHeight: 1, transition: theme.transitions.default, minWidth: '40px', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
    xpButtonAdd: { background: theme.colors.secondary, color: theme.colors.background, ':hover:not(:disabled)': { opacity: 0.9 } },
    xpButtonRemove: { background: theme.colors.error, color: theme.colors.text, ':hover:not(:disabled)': { opacity: 0.9 } },
    levelUpButton: { display: 'block', width: '100%', padding: '10px', marginTop: '15px', background: `linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.secondary})`, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: theme.transitions.default, ':hover': { boxShadow: `0 0 15px ${theme.colors.primary}99`, transform: 'translateY(-1px)' } },
    hpBarOuterContainer: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: `1px solid ${theme.colors.surface}33`, gridColumn: '1 / -1' },
    statLabelHp: { color: theme.colors.textSecondary, whiteSpace: 'nowrap', fontSize: '0.95rem', flexShrink: 0 },
    hpBarContainer: { flexGrow: 1, height: '20px', background: theme.colors.surface, borderRadius: '10px', overflow: 'hidden', position: 'relative', border: `1px solid ${theme.colors.surface}88` },
    hpBarFill: { height: '100%', borderRadius: '10px', transition: 'width 0.5s ease-out, background-color 0.5s ease-out', },
    hpBarText: { position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: theme.colors.text, textShadow: '1px 1px 1px rgba(0,0,0,0.7)', },
    damageInputContainer: { display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surface}55` },
    damageInput: { flexGrow: 1, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.error}88`, background: `${theme.colors.error}11`, color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', textAlign: 'center', appearance: 'textfield', '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 }, '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 }, ':disabled': { background: `${theme.colors.surface}55`, borderColor: `${theme.colors.textSecondary}44`, cursor: 'not-allowed', opacity: 0.6 } },
    applyDamageButton: applyDamageButton, // Используем стиль-константу
    actionButtonsContainer: { display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surface}55` },
    actionButton: actionButton, // Базовый стиль
    actionButtonDisabled: actionButtonDisabled, // Стиль для неактивных (визуально не применится)
    healButtonMedkitActive: healButtonMedkitActive, // Активные стили-оверрайды
    restButtonShortActive: restButtonShortActive,
    restButtonLongActive: restButtonLongActive,
    puSection: { borderTop: `3px solid ${theme.colors.puColor || theme.colors.secondary}55`, background: `${theme.colors.puColor || theme.colors.secondary}0A` },
    puDisplayContainer: { textAlign: 'center', margin: '5px 0 15px 0', padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' },
    puValue: { fontSize: '2rem', fontWeight: 'bold', color: theme.colors.primary },
    puSeparator: { fontSize: '1.5rem', margin: '0 5px', color: theme.colors.textSecondary },
    puBaseValue: { fontSize: '1.2rem', color: theme.colors.textSecondary },
    puControlContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop:'15px', borderTop: `1px dashed ${theme.colors.surface}55`, marginTop:'15px' },
    puLabel: { color: theme.colors.textSecondary, fontSize: '0.9rem', marginRight: 'auto', fontWeight:'bold' },
    puButtons: { display: 'flex', gap: '8px' },
    puButton: { padding: '6px 10px', fontSize: '0.85rem', minWidth: '40px', background: theme.colors.surface, color: theme.colors.textSecondary, border: `1px solid ${theme.colors.textSecondary}88`, borderRadius: '6px', cursor: 'pointer', transition: theme.transitions.default, ':hover': { borderColor: theme.colors.primary, color: theme.colors.primary, background: `${theme.colors.primary}11` } },
    puButtonFailure: { borderColor: theme.colors.error, color: theme.colors.error, ':hover': { background: `${theme.colors.error}22` } },
    puButtonSuccess: { borderColor: theme.colors.secondary, color: theme.colors.secondary, ':hover': { background: `${theme.colors.secondary}22` } },
    tabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.colors.surface}66`, paddingBottom: '5px'},
    addItemButton: { padding: '6px 12px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: theme.transitions.default, ':hover': {opacity: 0.9} },
    statusTagContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', justifyContent: 'flex-start' },
    statusTag: { display: 'inline-flex', alignItems: 'center', background: theme.colors.surface, border: `1px solid ${theme.colors.textSecondary}55`, borderRadius: '15px', padding: '5px 10px 5px 12px', fontSize: '0.9rem', cursor: 'default', transition: 'all 0.2s ease', ':hover': { borderColor: `${theme.colors.primary}88`, background: `${theme.colors.primary}11` } },
    statusTagPu: { borderColor: theme.colors.primary, background: `${theme.colors.primary}15` },
    statusTagName: { cursor: 'pointer', marginRight: '5px', color: theme.colors.text, ':hover': { color: theme.colors.primary, textDecoration: 'underline' } },
    removeStatusButtonTag: { background: 'transparent', color: theme.colors.error, border: 'none', padding: '0', marginLeft: '4px', fontSize: '1.1rem', lineHeight: '1', cursor: 'pointer', opacity: 0.6, ':hover': { opacity: 1 } },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '20px' },
};


export default CharacterStatusSection;
