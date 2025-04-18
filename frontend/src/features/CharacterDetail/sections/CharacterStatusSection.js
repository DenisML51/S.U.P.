// src/features/CharacterDetail/sections/CharacterStatusSection.js
import React, { useState, useMemo } from 'react';
import StatDisplay from '../../../components/UI/StatDisplay';
import { theme } from '../../../styles/theme';
import * as apiService from '../../../api/apiService';
import AddStatusModal from '../modals/AddStatusModal';
import StatusEffectDetailModal from '../modals/StatusEffectDetailModal';
import SelectMedkitModal from '../modals/SelectMedkitModal';
import ShortRestModal from '../modals/ShortRestModal';

// --- Вспомогательные функции для ПУ ---
const getPuBarColor = (currentPu) => {
    if (currentPu <= 1) return theme.colors.error || '#CF6679'; // Красный при 0-1
    if (currentPu <= 3) return theme.colors.warning || '#FFA726'; // Оранжевый при 2-3
    if (currentPu >= 8) return theme.colors.secondary || '#03DAC6'; // Бирюзовый при 8-10
    return theme.colors.primary || '#BB86FC'; // Фиолетовый (основной) для середины 4-7
};

// --- Основной Компонент ---
const CharacterStatusSection = ({
    character,
    handleApiAction,
    onLevelUpClick,
    refreshCharacterData,
}) => {
    // --- Состояния ---
    const [xpToAdd, setXpToAdd] = useState('');
    const [xpToRemove, setXpToRemove] = useState('');
    const [showAddStatusModal, setShowAddStatusModal] = useState(false);
    const [showStatusEffectModal, setShowStatusEffectModal] = useState(false);
    const [selectedStatusEffectForModal, setSelectedStatusEffectForModal] = useState(null);
    const [showSelectMedkitModal, setShowSelectMedkitModal] = useState(false);
    const [damageInput, setDamageInput] = useState('');
    const [showShortRestModal, setShowShortRestModal] = useState(false);

    // --- Мемоизированные вычисления ---
    const availableMedkits = useMemo(() => {
        if (!character?.inventory || !Array.isArray(character.inventory)) { return []; }
        return character.inventory.filter(invItem => invItem.item?.category === 'Медицина');
    }, [character?.inventory]);

    const maxStaminaPoints = useMemo(() => {
         if (!character) return 1;
         return Math.max(1, (character.level ?? 1));
    }, [character?.level]);

    const hpPercentage = useMemo(() => {
        if (!character || !character.max_hp || character.max_hp <= 0) return 0;
        return Math.max(0, Math.min(100, (character.current_hp / character.max_hp) * 100));
    }, [character?.current_hp, character?.max_hp]);

    const xpProgress = useMemo(() => {
        if (!character || !character.xp_needed_for_next_level || character.xp_needed_for_next_level <= 0) {
             return (character?.level ?? 0) > 0 ? 100 : 0;
        }
        return Math.min(100, Math.floor((character.experience_points / character.xp_needed_for_next_level) * 100));
    }, [character?.experience_points, character?.xp_needed_for_next_level, character?.level]);

    // Расчеты для Шкалы ПУ
    const currentPu = character?.current_pu ?? 0;
    const basePu = character?.base_pu ?? 1;
    const puPercentage = Math.max(0, Math.min(100, (currentPu / 10) * 100)); // Шкала 0-10
    const puBarColor = useMemo(() => getPuBarColor(currentPu), [currentPu]);
    const basePuPercentage = Math.max(0, Math.min(100, (basePu / 10) * 100));

    // Ранний выход
    if (!character) return null;

    // Определяем состояния для UI
    const canLevelUp = character.experience_points >= (character.xp_needed_for_next_level || Infinity);
    const hasMedkit = availableMedkits.length > 0;
    const isHpFull = character.current_hp >= character.max_hp;
    const isHpZero = character.current_hp <= 0;
    const hasStamina = character.stamina_points > 0;
    const canFailPu = currentPu > 0;
    const canSucceedPu = currentPu < 10;

    // --- Обработчики Действий ---
    const handleAddExperience = () => {
        const amount = parseInt(xpToAdd, 10);
        if (!isNaN(amount) && amount > 0) {
            const newTotalXp = (character.experience_points || 0) + amount;
            handleApiAction(apiService.updateCharacterStats(character.id, { experience_points: newTotalXp }), `${amount} XP добавлено`, `Ошибка добавления XP`);
            setXpToAdd('');
        } else { alert("Введите положительное число XP."); }
    };

    const handleRemoveExperience = () => {
        const amount = parseInt(xpToRemove, 10);
        if (!isNaN(amount) && amount > 0) {
            const newTotalXp = Math.max(0, (character.experience_points || 0) - amount);
            handleApiAction(apiService.updateCharacterStats(character.id, { experience_points: newTotalXp }), `${amount} XP вычтено`, `Ошибка вычитания XP`);
            setXpToRemove('');
        } else { alert("Введите положительное число XP для вычитания."); }
    };

    const handlePuChange = (delta, result = null) => {
        const currentPuValue = character.current_pu ?? 0;
        const targetPu = currentPuValue + delta;
        handleApiAction(
            apiService.updateCharacterStats(character.id, { current_pu: targetPu }, result),
            `ПУ изменено`,
            `Ошибка изменения ПУ`
        );
    };

    const handleRemoveStatus = (effectId) => {
        if (window.confirm(`Снять состояние "${character.active_status_effects.find(e=>e.id===effectId)?.name || 'это'}"?`)) {
            handleApiAction(
                apiService.removeStatusEffect(character.id, effectId),
                `Статус снят`,
                `Ошибка снятия состояния`
            );
        }
    };

    const handleStatusEffectClick = (effect) => {
        setSelectedStatusEffectForModal(effect);
        setShowStatusEffectModal(true);
    };

    const handleHealMedkitClick = () => {
        if (!hasMedkit || isHpFull) return;
        if (availableMedkits.length === 1) {
            handleApiAction(
                apiService.activateAction(character.id, { activation_type: 'item', target_id: availableMedkits[0].id }),
                "Аптечка использована", "Ошибка лечения аптечкой"
            );
        } else {
            setShowSelectMedkitModal(true);
        }
    };

    const handleMedkitSelected = (selectedInventoryItemId) => {
        setShowSelectMedkitModal(false);
        handleApiAction(
            apiService.activateAction(character.id, { activation_type: 'item', target_id: selectedInventoryItemId }),
            "Выбранная аптечка использована", "Ошибка лечения выбранной аптечкой"
        );
    };

    const handleApplyDamage = () => {
        const damageAmount = parseInt(damageInput, 10);
        if (!isNaN(damageAmount) && damageAmount > 0 && !isHpZero) {
            const newHp = Math.max(0, character.current_hp - damageAmount);
            handleApiAction(
                apiService.updateCharacterStats(character.id, { current_hp: newHp }),
                `${damageAmount} урона применено`, "Ошибка применения урона"
            );
            setDamageInput('');
        } else if (isHpZero) { alert("Персонаж уже при смерти.");
        } else { alert("Введите положительное число урона."); }
    };

    const handleOpenShortRestModal = () => {
        if (hasStamina) setShowShortRestModal(true);
        else alert("Нет Очков Стойкости.");
    };

    const handlePerformShortRest = (diceCount) => {
        setShowShortRestModal(false);
        handleApiAction(apiService.performShortRest(character.id, diceCount), `Короткий отдых (${diceCount} ОС) завершен`, "Ошибка короткого отдыха");
    };

    const handlePerformLongRest = () => {
        if (window.confirm("Начать длительный отдых? Это восстановит ПЗ, ОС, ПУ и снизит Истощение.")) {
            handleApiAction(apiService.performLongRest(character.id), "Длительный отдых завершен", "Ошибка длительного отдыха");
        }
    };

    // --- Состояния кнопок для UI ---
    const isHealMedkitDisabled = isHpFull || !hasMedkit;
    const isShortRestDisabled = !hasStamina;
    const isApplyDamageDisabled = !damageInput || parseInt(damageInput, 10) <= 0 || isHpZero;
    const isRemoveXpDisabled = !xpToRemove || parseInt(xpToRemove, 10) <= 0;
    const hpBarColor = hpPercentage <= 25 ? theme.colors.error : hpPercentage <= 50 ? (theme.colors.warning || '#FFA726') : (theme.colors.success || '#66BB6A');

    // --- Рендеринг ---
    return (
        <>
            {/* --- Модальные окна --- */}
            {showAddStatusModal && ( <AddStatusModal characterId={character.id} onClose={() => setShowAddStatusModal(false)} onSuccess={() => { setShowAddStatusModal(false); if (refreshCharacterData) refreshCharacterData(); }} /> )}
            {showStatusEffectModal && selectedStatusEffectForModal && ( <StatusEffectDetailModal effect={selectedStatusEffectForModal} onClose={() => { setShowStatusEffectModal(false); setSelectedStatusEffectForModal(null); }} /> )}
            {showSelectMedkitModal && ( <SelectMedkitModal availableMedkits={availableMedkits} onClose={() => setShowSelectMedkitModal(false)} onSelect={handleMedkitSelected} /> )}
            {showShortRestModal && ( <ShortRestModal currentStamina={character.stamina_points} maxStamina={maxStaminaPoints} onClose={() => setShowShortRestModal(false)} onSubmit={handlePerformShortRest} /> )}

            {/* --- Секция Статус --- */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Статус</h2>
                <StatDisplay label="Уровень" value={character.level} />
                <StatDisplay label="Опыт" value={`${character.experience_points} / ${character.xp_needed_for_next_level ?? 'МАКС'}`} />
                <div style={styles.xpBarContainer} title={`${xpProgress}% до следующего уровня`}> <div style={{ ...styles.xpBarProgress, width: `${xpProgress}%` }}></div> </div>
                <div style={styles.xpControlContainer}>
                    <div style={styles.xpActionGroup}> <input type="number" min="1" value={xpToAdd} onChange={(e) => setXpToAdd(e.target.value)} placeholder="Добавить XP" style={{...styles.xpInput, ...styles.xpInputAdd}} onKeyPress={(e) => e.key === 'Enter' && handleAddExperience()} /> <button onClick={handleAddExperience} style={{...styles.xpButton, ...styles.xpButtonAdd}} title="Добавить опыт">+</button> </div>
                    <div style={styles.xpActionGroup}> <input type="number" min="1" value={xpToRemove} onChange={(e) => setXpToRemove(e.target.value)} placeholder="Отнять XP" style={{...styles.xpInput, ...styles.xpInputRemove}} onKeyPress={(e) => e.key === 'Enter' && !isRemoveXpDisabled && handleRemoveExperience()} disabled={character.experience_points === 0}/> <button onClick={handleRemoveExperience} style={{...styles.xpButton, ...styles.xpButtonRemove}} title="Отнять опыт" disabled={isRemoveXpDisabled}>-</button> </div>
                </div>
                {canLevelUp && ( <button onClick={onLevelUpClick} style={styles.levelUpButton}>Повысить Уровень!</button> )}
                <div style={styles.coreStatsGrid}>
                    <div style={styles.hpBarOuterContainer}>
                        <span style={styles.statLabelHp}>ПЗ:</span>
                        <div style={styles.hpBarContainer} title={`${character.current_hp} / ${character.max_hp} (${hpPercentage.toFixed(0)}%)`}>
                            <div style={{ ...styles.hpBarFill, width: `${hpPercentage}%`, backgroundColor: hpBarColor }}></div>
                            <span style={styles.hpBarText}>{character.current_hp} / {character.max_hp}</span>
                        </div>
                    </div>
                    <StatDisplay label="ОС" value={`${character.stamina_points} / ${maxStaminaPoints}`} />
                    <StatDisplay label="Истощение" value={character.exhaustion_level} />
                    <StatDisplay label="КЗ" value={character.total_ac} />
                    <StatDisplay label="Иниц." value={character.initiative_bonus >= 0 ? `+${character.initiative_bonus}` : character.initiative_bonus} />
                    <StatDisplay label="Скор." value={`${character.speed} м.`} />
                    <StatDisplay label="Пасс.Вним." value={character.passive_attention} />
                </div>
                 <div style={styles.damageInputContainer}>
                     <input type="number" min="1" value={damageInput} onChange={(e) => setDamageInput(e.target.value)} placeholder="Полученный урон" style={styles.damageInput} onKeyPress={(e) => e.key === 'Enter' && !isApplyDamageDisabled && handleApplyDamage()} disabled={isHpZero} />
                     <button onClick={handleApplyDamage} style={{...styles.applyDamageButton, ...(isApplyDamageDisabled ? styles.actionButtonDisabled : {})}} disabled={isApplyDamageDisabled} title={isHpZero ? "Персонаж уже при смерти" : "Применить урон"}> Применить урон </button>
                 </div>
                 <div style={styles.actionButtonsContainer}>
                     <button onClick={handleHealMedkitClick} style={{...styles.actionButton, ...(isHealMedkitDisabled ? styles.actionButtonDisabled : styles.healButtonMedkitActive)}} disabled={isHealMedkitDisabled} title={isHpFull ? "Здоровье полное" : hasMedkit ? "Исп. аптечку" : "Нет аптечек"}> Аптечка {hasMedkit ? `(${availableMedkits.length})` : ''} </button>
                     <button onClick={handleOpenShortRestModal} style={{...styles.actionButton, ...(isShortRestDisabled ? styles.actionButtonDisabled : styles.restButtonShortActive)}} disabled={isShortRestDisabled} title={hasStamina ? `Начать короткий отдых (есть ${character.stamina_points} ОС)` : "Нет ОС для отдыха"}> Кор. Отдых </button>
                     <button onClick={handlePerformLongRest} style={{...styles.actionButton, ...styles.restButtonLongActive}} title="Начать длительный отдых (8 часов)"> Длит. Отдых </button>
                 </div>
            </div>

            {/* === Секция Псих. Устойчивость (Редизайн со Шкалой и 2+2 Кнопками) === */}
            <div style={{ ...styles.section, ...styles.puSection, borderTopColor: puBarColor }}>
                 <h3 style={{ ...styles.sectionTitle}}>
                    Псих. Устойчивость
                 </h3>
                 <div style={styles.puValueDisplay}>
                     <span style={styles.puCurrentValueLabel}>Текущее:</span>
                     <div style={styles.puManualAdjust}>
                         <button onClick={() => handlePuChange(-1)} style={styles.puManualButton} disabled={currentPu <= 0} title="Корректировка -1 ПУ">-</button>
                         <span style={styles.puCurrentValueNumber}>{currentPu}</span>
                         <button onClick={() => handlePuChange(1)} style={styles.puManualButton} disabled={currentPu >= 10} title="Корректировка +1 ПУ">+</button>
                     </div>
                     <span style={styles.puBaseValueLabel}>Базовое: {basePu}</span>
                 </div>
                 <div style={styles.puBarContainer} title={`Текущее ПУ: ${currentPu}, Базовое: ${basePu}`}>
                    <div style={{ ...styles.puBaseMark, left: `${basePuPercentage}%` }}></div>
                    <div style={{ ...styles.puBarFill, width: `${puPercentage}%`, backgroundColor: puBarColor }}></div>
                 </div>
                <div style={styles.puControlContainer}>
                    <label style={styles.puLabel}>Результат Проверки:</label>
                    <div style={styles.puButtons}>
                        <button onClick={() => handlePuChange(-1, 'failure')} style={{ ...styles.puButton, ...styles.puButtonFailure }} disabled={!canFailPu} title={canFailPu ? "Провал проверки (-1 ПУ, возможна НЭ)" : "ПУ уже на нуле"}> Провал </button>
                        <button onClick={() => handlePuChange(1, 'success')} style={{ ...styles.puButton, ...styles.puButtonSuccess }} disabled={!canSucceedPu} title={canSucceedPu ? "Успех проверки (+1 ПУ, возможна ПЭ)" : "ПУ уже на максимуме"}> Успех </button>
                    </div>
                </div>
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

// --- Стили ---
// Базовые стили кнопок действий
const actionButton = { padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}88`, background: `${theme.colors.surface}cc`, color: theme.colors.textSecondary, cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.85rem', fontWeight: '500', flex: '1', textAlign: 'center', whiteSpace: 'nowrap' };
const actionButtonDisabled = { opacity: 0.6, cursor: 'not-allowed', filter: 'grayscale(50%)' };
const healButtonMedkitActive = { borderColor: theme.colors.success || '#66BB6A', color: theme.colors.success || '#66BB6A', background: `${theme.colors.success || '#66BB6A'}22`, '&:hover': { background: `${theme.colors.success || '#66BB6A'}33` } };
const restButtonShortActive = { borderColor: theme.colors.secondary, color: theme.colors.secondary, background: `${theme.colors.secondary}22`, '&:hover': { background: `${theme.colors.secondary}33` } };
const restButtonLongActive = { borderColor: theme.colors.primary, color: theme.colors.primary, background: `${theme.colors.primary}22`, '&:hover': { background: `${theme.colors.primary}33` } };
const applyDamageButton = { padding: '10px 20px', borderRadius: '8px', border: `1px solid ${theme.colors.error}`, background: `${theme.colors.error}cc`, color: theme.colors.text, cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', '&:hover:not(:disabled)': { background: `${theme.colors.error}ee` } };

// Основной объект стилей
const styles = {
    section: { background: theme.effects.glass, backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '20px', boxShadow: theme.effects.shadow, marginBottom: '25px' },
    sectionTitle: { margin: '0 0 15px 0', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}`, paddingBottom: '8px', fontSize: '1.2rem' },
    coreStatsGrid: { marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px 15px', alignItems: 'center' },
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
    hpBarFill: { height: '100%', borderRadius: '10px', transition: 'width 0.5s ease-out, background-color 0.5s ease-out', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' },
    hpBarText: { position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: theme.colors.text, textShadow: '1px 1px 1px rgba(0,0,0,0.7)' },
    damageInputContainer: { display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surface}55` },
    damageInput: { flexGrow: 1, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.error}88`, background: `${theme.colors.error}11`, color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', textAlign: 'center', appearance: 'textfield', '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 }, '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 }, ':disabled': { background: `${theme.colors.surface}55`, borderColor: `${theme.colors.textSecondary}44`, cursor: 'not-allowed', opacity: 0.6 } },
    applyDamageButton: applyDamageButton,
    actionButtonsContainer: { display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surface}55` },
    actionButton: actionButton,
    actionButtonDisabled: actionButtonDisabled,
    healButtonMedkitActive: healButtonMedkitActive,
    restButtonShortActive: restButtonShortActive,
    restButtonLongActive: restButtonLongActive,
    // puSection: { borderTop: `4px solid ${theme.colors.primary}`, background: `${theme.colors.surface}66` },
    puValueDisplay: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 5px' },
    puCurrentValueLabel: { fontSize: '0.9rem', color: theme.colors.textSecondary, marginRight: '10px' },
    puManualAdjust: { display: 'flex', alignItems: 'center', gap: '8px' },
    puManualButton: { padding: '0', width: '26px', height: '26px', fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1, background: theme.colors.surface + '99', color: theme.colors.textSecondary, border: `1px solid ${theme.colors.textSecondary}55`, borderRadius: '10%', cursor: 'pointer', transition: theme.transitions.default, ':hover:not(:disabled)': { background: theme.colors.primary + '33', color: theme.colors.primary, borderColor: theme.colors.primary + '88' }, ':disabled': { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } },
    puCurrentValueNumber: { fontSize: '1.8rem', fontWeight: 'bold', color: theme.colors.primary, lineHeight: 1, minWidth: '30px', textAlign: 'center' },
    puBaseValueLabel: { fontSize: '0.9rem', color: theme.colors.textSecondary, marginLeft: '10px' },
    puBarContainer: { height: '12px', background: theme.colors.surface, borderRadius: '8px', overflow: 'hidden', position: 'relative', border: `1px solid ${theme.colors.surface}cc`, marginBottom: '15px' },
    puBarFill: { height: '100%', borderRadius: '8px', transition: 'width 0.5s ease-in-out, background-color 0.5s ease-in-out', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' },
    puBaseMark: { position: 'absolute', top: '-2px', bottom: '-2px', width: '3px', background: theme.colors.textSecondary, transform: 'translateX(-50%)', borderRadius: '1px', opacity: 0.7, zIndex: 1 },
    puControlContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop:'15px', borderTop: `1px dashed ${theme.colors.surface}55`, marginTop:'15px' },
    puLabel: { color: theme.colors.textSecondary, fontSize: '0.9rem', marginRight: 'auto', fontWeight:'bold' },
    puButtons: { display: 'flex', gap: '15px' },
    puButton: { padding: '8px 18px', fontSize: '0.95rem', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, border: '1px solid', ':disabled': { ...actionButtonDisabled } }, // Добавили общие стили disabled
    puButtonFailure: { borderColor: theme.colors.error, color: theme.colors.error, background: `${theme.colors.error}11`, ':hover:not(:disabled)': { background: `${theme.colors.error}33` } },
    puButtonSuccess: { borderColor: theme.colors.secondary, color: theme.colors.secondary, background: `${theme.colors.secondary}11`, ':hover:not(:disabled)': { background: `${theme.colors.secondary}33` } },
    puButtonManual: { // Переопределяем стиль, если нужно
        padding: '0', width: '26px', height: '26px', fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1, background: theme.colors.surface + '99', color: theme.colors.textSecondary, border: `1px solid ${theme.colors.textSecondary}55`, borderRadius: '50%', cursor: 'pointer', transition: theme.transitions.default,
        ':hover:not(:disabled)': { background: theme.colors.primary + '33', color: theme.colors.primary, borderColor: theme.colors.primary + '88' },
        ':disabled': { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' }
    },
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