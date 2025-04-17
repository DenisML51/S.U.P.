// src/features/CharacterDetail/sections/CharacterStatusSection.js
import React, { useState } from 'react';
import StatDisplay from '../../../components/UI/StatDisplay';// Предполагаем, что StatDisplay вынесен
import { theme } from '../../../styles/theme';
import * as apiService from '../../../api/apiService'; // Импорт для прямых вызовов, если handleApiAction не передан
import AddStatusModal from '../modals/AddStatusModal'; // Импорт модалки
import StatusEffectDetailModal from '../modals/StatusEffectDetailModal'; // Импорт модалки деталей

// Компонент требует: character, handleApiAction (из хука), onLevelUpClick (открыть модалку)
const CharacterStatusSection = ({
    character,
    handleApiAction, // Функция из useApiActionHandler
    onLevelUpClick, // Функция для открытия модалки LevelUp
    refreshCharacterData, // Функция для обновления после добавления статуса
}) => {
    const [xpToAdd, setXpToAdd] = useState('');
    const [showAddStatusModal, setShowAddStatusModal] = useState(false);
    const [showStatusEffectModal, setShowStatusEffectModal] = useState(false);
    const [selectedStatusEffectForModal, setSelectedStatusEffectForModal] = useState(null);

    if (!character) return null; // Или компонент загрузки

    const canLevelUp = character.experience_points >= (character.xp_needed_for_next_level || Infinity);
    const xpProgress = character.xp_needed_for_next_level && character.xp_needed_for_next_level > 0
        ? Math.min(100, Math.floor((character.experience_points / character.xp_needed_for_next_level) * 100))
        : (character.level > 0 ? 100 : 0);

    const handleAddExperience = () => {
        const amount = parseInt(xpToAdd, 10);
        if (isNaN(amount) || amount <= 0) {
             // Можно использовать setError из хука, если он передан, или локальный state
             alert("Введите положительное число XP."); // Пример простого уведомления
             return;
        }
        const newTotalXp = (character.experience_points || 0) + amount;
        handleApiAction(
            apiService.updateCharacterStats(character.id, { experience_points: newTotalXp }),
            `${amount} XP добавлено`,
            `Ошибка добавления опыта`
        );
        setXpToAdd('');
    };

    const handlePuChange = (delta, result = null) => {
        const currentPu = character.current_pu ?? 0;
        const targetPu = currentPu + delta;
        handleApiAction(
            apiService.updateCharacterStats(character.id, { current_pu: targetPu }, result),
            `ПУ изменено на ${delta} ${result ? `(${result})` : ''}`,
            `Ошибка изменения ПУ`
        );
    };

     const handleRemoveStatus = (effectId) => {
         if (window.confirm(`Снять состояние?`)) {
             handleApiAction(
                 apiService.removeStatusEffect(character.id, effectId),
                 `Статус ${effectId} снят`,
                 `Ошибка снятия состояния`
             );
         }
     };

     const handleStatusEffectClick = (effect) => {
         setSelectedStatusEffectForModal(effect);
         setShowStatusEffectModal(true);
     };


    return (
        <>
            {/* Модальные окна, управляемые этим компонентом */}
            {showAddStatusModal && (
                <AddStatusModal
                    characterId={character.id}
                    onClose={() => setShowAddStatusModal(false)}
                    onSuccess={() => {
                        setShowAddStatusModal(false);
                        refreshCharacterData(); // Обновляем данные после добавления
                    }}
                />
            )}
             {showStatusEffectModal && selectedStatusEffectForModal && (
                 <StatusEffectDetailModal
                     effect={selectedStatusEffectForModal}
                     onClose={() => {
                         setShowStatusEffectModal(false);
                         setSelectedStatusEffectForModal(null);
                     }}
                 />
             )}

            {/* Секция Статус */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Статус</h2>
                <StatDisplay label="Уровень" value={character.level} />
                <StatDisplay label="Опыт" value={`${character.experience_points} / ${character.xp_needed_for_next_level ?? 'МАКС'}`} />
                <div style={styles.xpBarContainer} title={`${xpProgress}% до следующего уровня`}>
                    <div style={{ ...styles.xpBarProgress, width: `${xpProgress}%` }}></div>
                </div>
                <div style={styles.addXpContainer}>
                    <input
                        type="number"
                        min="1"
                        value={xpToAdd}
                        onChange={(e) => setXpToAdd(e.target.value)}
                        placeholder="Добавить XP"
                        style={styles.addXpInput}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddExperience()}
                    />
                    <button onClick={handleAddExperience} style={styles.addXpButton} title="Добавить опыт">+</button>
                </div>
                {canLevelUp && (
                    <button onClick={onLevelUpClick} style={styles.levelUpButton}>Повысить Уровень!</button>
                )}

                {/* Статы */}
                <div style={styles.coreStatsGrid}>
                    <StatDisplay label="ПЗ" value={`${character.current_hp} / ${character.max_hp}`} />
                    <StatDisplay label="ОС" value={character.stamina_points} />
                    <StatDisplay label="Истощение" value={character.exhaustion_level} />
                    <StatDisplay label="КЗ" value={character.total_ac} />
                    <StatDisplay label="Иниц." value={character.initiative_bonus >= 0 ? `+${character.initiative_bonus}` : character.initiative_bonus} />
                    <StatDisplay label="Скор." value={`${character.speed} м.`} />
                    <StatDisplay label="Пасс.Вним." value={character.passive_attention} />
                </div>
            </div>

            {/* Секция Псих. Устойчивость */}
            <div style={{ ...styles.section, ...styles.puSection }}>
                <h2 style={{ ...styles.sectionTitle, borderBottomColor: theme.colors.puColor || theme.colors.secondary }}>
                    Псих. Устойчивость
                </h2>
                 {/* Отображение ошибки ПУ, если она есть */}
                 {/* actionError из useApiActionHandler будет показан в CharacterDetailPage */}
                <div style={styles.puDisplayContainer}>
                    <span style={styles.puValue}>{character.current_pu ?? 0}</span>
                    <span style={styles.puSeparator}>/</span>
                    <span style={styles.puBaseValue}>{character.base_pu ?? 1}</span>
                </div>
                <div style={styles.puControlContainer}>
                    <label style={styles.puLabel}>Изменить:</label>
                    <div style={styles.puButtons}>
                        <button onClick={() => handlePuChange(-1, 'failure')} style={{ ...styles.puButton, ...styles.puButtonFailure }} title="-1 ПУ (Провал)">-1 Провал</button>
                        <button onClick={() => handlePuChange(-1)} style={styles.puButton} title="-1 ПУ (Прочее)">-1</button>
                        <button onClick={() => handlePuChange(1)} style={styles.puButton} title="+1 ПУ (Прочее)">+1</button>
                        <button onClick={() => handlePuChange(1, 'success')} style={{ ...styles.puButton, ...styles.puButtonSuccess }} title="+1 ПУ (Успех)">+1 Успех</button>
                    </div>
                </div>
            </div>

             {/* Секция Активные Состояния */}
             <div style={styles.section}>
                 <div style={{ ...styles.tabHeader, marginBottom: '10px', paddingBottom: '5px' }}>
                     <h2 style={{ ...styles.sectionTitle, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>Активные Состояния</h2>
                     <button onClick={() => setShowAddStatusModal(true)} style={{ ...styles.addItemButton, padding: '4px 8px' }} title="Добавить состояние">+</button>
                 </div>
                 {/* Отображение ошибки Статусов */}
                  {/* actionError из useApiActionHandler будет показан в CharacterDetailPage */}
                 {character.active_status_effects.length > 0 ? (
                     <div style={styles.statusTagContainer}>
                         {character.active_status_effects.map(effect => (
                             <div key={effect.id} style={{ ...styles.statusTag, ...(effect.name.startsWith('ПУ:') ? styles.statusTagPu : {}) }} title={effect.description || "Нажмите для описания"}>
                                 <span onClick={() => handleStatusEffectClick(effect)} style={styles.statusTagName}>
                                     {effect.name}
                                 </span>
                                 <button onClick={() => handleRemoveStatus(effect.id)} style={styles.removeStatusButtonTag} title="Снять состояние">×</button>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <p style={styles.placeholderText}>Нет активных состояний.</p>
                 )}
             </div>
        </>
    );
};

// Стили для секции (можно вынести в отдельный файл или определить здесь)
const styles = {
    section: { background: theme.effects.glass, backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '20px', boxShadow: theme.effects.shadow, marginBottom: '25px' }, // Добавлен marginBottom
    sectionTitle: { margin: '0 0 15px 0', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}`, paddingBottom: '8px', fontSize: '1.2rem' },
    coreStatsGrid: { marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px 15px' },
    xpBarContainer: { height: '8px', background: theme.colors.surface, borderRadius: '4px', overflow: 'hidden', margin: '8px 0' },
    xpBarProgress: { height: '100%', background: theme.colors.primary, borderRadius: '4px', transition: 'width 0.5s ease-in-out' },
    addXpContainer: { display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '5px' },
    addXpInput: { flexGrow: 1, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '0.9rem', boxSizing: 'border-box', '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 }, '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 }, appearance: 'textfield' },
    addXpButton: { padding: '8px 12px', background: theme.colors.secondary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: theme.transitions.default, ':hover': { opacity: 0.9 } },
    levelUpButton: { display: 'block', width: '100%', padding: '10px', marginTop: '15px', background: `linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.secondary})`, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: theme.transitions.default, ':hover': { boxShadow: `0 0 15px ${theme.colors.primary}99`, transform: 'translateY(-1px)' } },
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
    tabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.colors.surface}66`, paddingBottom: '5px'}, // Убран marginBottom
    addItemButton: { padding: '6px 12px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: theme.transitions.default, ':hover': {opacity: 0.9} },
    statusTagContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', justifyContent: 'flex-start' },
    statusTag: { display: 'inline-flex', alignItems: 'center', background: theme.colors.surface, border: `1px solid ${theme.colors.textSecondary}55`, borderRadius: '15px', padding: '5px 10px 5px 12px', fontSize: '0.9rem', cursor: 'default', transition: 'all 0.2s ease', ':hover': { borderColor: `${theme.colors.primary}88`, background: `${theme.colors.primary}11` } },
    statusTagPu: { borderColor: theme.colors.primary, background: `${theme.colors.primary}15` },
    statusTagName: { cursor: 'pointer', marginRight: '5px', color: theme.colors.text, ':hover': { color: theme.colors.primary, textDecoration: 'underline' } },
    removeStatusButtonTag: { background: 'transparent', color: theme.colors.error, border: 'none', padding: '0', marginLeft: '4px', fontSize: '1.1rem', lineHeight: '1', cursor: 'pointer', opacity: 0.6, ':hover': { opacity: 1 } },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '20px' },
    // Добавьте другие стили, если они были в CharacterDetailPage.js и относятся к этим секциям
};


export default CharacterStatusSection;