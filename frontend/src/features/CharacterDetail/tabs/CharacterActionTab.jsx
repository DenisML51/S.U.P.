// frontend/src/features/CharacterDetail/tabs/CharacterActionTab.js
import React, { useState, useCallback, useMemo } from 'react';
import { theme } from '../../../styles/theme';
import * as apiService from '../../../api/apiService';

// Импорт компонентов
import AbilitySlotDisplay from '../components/AbilitySlotDisplay'; // Обновленный компонент
import AbilitySelectionModal from '../modals/AbilitySelectionModal';

// --- Иконки ---
const EndTurnIcon = () => ( <svg style={styles.endTurnIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> );
// --- Обновленные, более лаконичные иконки действий ---
const MainActionIcon = ({ available }) => ( <svg style={{...styles.actionIcon, color: available ? theme.colors.primary : theme.colors.textSecondary + '99'}} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg> ); // Круг с точкой
const BonusActionIcon = ({ available }) => ( <svg style={{...styles.actionIcon, color: available ? theme.colors.secondary : theme.colors.textSecondary + '99'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg> ); // Треугольник/стрелка вверх
const ReactionIcon = ({ available }) => ( <svg style={{...styles.actionIcon, color: available ? theme.colors.warning : theme.colors.textSecondary + '99'}} viewBox="0 0 24 24" fill="currentColor"><path d="M13 6V3h-2v3H8l4 4 4-4h-3zm4.6 8.17l-4-4-4 4H3v2h18v-2h-2.4z"/></svg> ); // Молния/реакция
// --- КОНЕЦ Иконок ---


const CharacterActionTab = ({
    character,
    handleApiAction,
    // onAbilityClick больше не нужен
}) => {
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [targetSlotForSelection, setTargetSlotForSelection] = useState(null);

    // Данные для 5 назначаемых слотов
    const activeSlotsData = useMemo(() => [
        { slotNumber: 1, data: character?.active_slot_1 }, { slotNumber: 2, data: character?.active_slot_2 },
        { slotNumber: 3, data: character?.active_slot_3 }, { slotNumber: 4, data: character?.active_slot_4 },
        { slotNumber: 5, data: character?.active_slot_5 },
    ], [ character?.active_slot_1, character?.active_slot_2, character?.active_slot_3, character?.active_slot_4, character?.active_slot_5, ]);

    // Уникальные способности от оружия
    const weaponAbilities = useMemo(() => {
        const abilitiesMap = new Map();
        const processWeapon = (weaponInvItem) => {
            const weapon = weaponInvItem?.item;
            if (weapon?.item_type === 'weapon' && Array.isArray(weapon.granted_abilities)) {
                weapon.granted_abilities.forEach(ab => { if (ab && ab.id != null && !abilitiesMap.has(ab.id)) abilitiesMap.set(ab.id, ab); });
            }
        };
        processWeapon(character?.equipped_weapon1); processWeapon(character?.equipped_weapon2);
        return Array.from(abilitiesMap.values());
    }, [character?.equipped_weapon1, character?.equipped_weapon2]);

    // Статус действий
    const mainActionAvailable = !character?.has_used_main_action;
    const bonusActionAvailable = !character?.has_used_bonus_action;
    const reactionAvailable = !character?.has_used_reaction;

    // Коллбэки
    const handleAssignClick = useCallback((slotNumber) => { setTargetSlotForSelection(slotNumber); setIsSelectionModalOpen(true); }, []);
    const handleCloseSelectionModal = useCallback(() => { setIsSelectionModalOpen(false); setTargetSlotForSelection(null); }, []);
    const handleClearClick = useCallback((slotNumber) => { if (!character?.id) return; handleApiAction(apiService.setCharacterAbilitySlot(character.id, slotNumber, null), `Слот ${slotNumber} очищен`, `Ошибка очистки слота ${slotNumber}`); }, [character?.id, handleApiAction]);
    const handleSelectAbilityFromModal = useCallback((abilityId) => { if (!character?.id || targetSlotForSelection === null) return; handleApiAction(apiService.setCharacterAbilitySlot(character.id, targetSlotForSelection, abilityId), `Слот ${targetSlotForSelection} назначен`, `Ошибка назначения`); handleCloseSelectionModal(); }, [character?.id, targetSlotForSelection, handleApiAction, handleCloseSelectionModal]);
    const handleEndTurnClick = useCallback(() => { if (!character?.id) return; handleApiAction(apiService.endCharacterTurn(character.id), "Ход завершен", "Ошибка завершения хода"); }, [character?.id, handleApiAction]);

    if (!character) { return <p style={styles.placeholderText}>Нет данных персонажа.</p>; }

    return (
        <div style={styles.tabContent}>
            {/* Модальное окно выбора способности */}
            {isSelectionModalOpen && targetSlotForSelection !== null && (
                <AbilitySelectionModal
                    character={character}
                    targetSlotNumber={targetSlotForSelection}
                    onClose={handleCloseSelectionModal}
                    onSelectAbility={handleSelectAbilityFromModal}
                />
            )}

            {/* Блок Статуса Действий */}
            <div style={styles.actionStatusContainer}>
                 <div style={{...styles.actionStatusItem, opacity: mainActionAvailable ? 1 : 0.5}} title={mainActionAvailable ? "Доступно" : "Использовано"}>
                     <MainActionIcon available={mainActionAvailable} /> <span>Действие</span>
                 </div>
                 <div style={{...styles.actionStatusItem, opacity: bonusActionAvailable ? 1 : 0.5}} title={bonusActionAvailable ? "Доступно" : "Использовано"}>
                     <BonusActionIcon available={bonusActionAvailable} /> <span>Бонус</span>
                 </div>
                 <div style={{...styles.actionStatusItem, opacity: reactionAvailable ? 1 : 0.5}} title={reactionAvailable ? "Доступно" : "Использовано"}>
                     <ReactionIcon available={reactionAvailable} /> <span>Реакция</span>
                 </div>
            </div>

            {/* Основная область с двумя колонками */}
            <div style={styles.mainArea}>
                {/* Левая часть: Слоты персонажа */}
                <div style={styles.slotsSection}>
                    <h3 style={styles.sectionTitle}>Активные Слоты</h3>
                    <div style={styles.slotsGrid}>
                        {activeSlotsData.map(({ slotNumber, data }) => (
                            <AbilitySlotDisplay
                                key={`slot-${slotNumber}`}
                                slotData={data} slotNumber={slotNumber} isAssignableSlot={true}
                                characterId={character.id}
                                onAssignClick={handleAssignClick} onClearClick={handleClearClick}
                                handleApiAction={handleApiAction}
                                mainActionAvailable={mainActionAvailable}
                                bonusActionAvailable={bonusActionAvailable}
                                reactionAvailable={reactionAvailable}
                            />
                        ))}
                    </div>
                </div>
                {/* Правая часть: Слоты оружия */}
                <div style={styles.weaponSlotsSection}>
                     <h3 style={styles.sectionTitle}>Способности Оружия</h3>
                     <div style={styles.slotsGridWeapon}>
                         {weaponAbilities.length > 0 ? (
                             weaponAbilities.map(ability => (
                                 ability && ability.id ? (
                                     <AbilitySlotDisplay
                                         key={`weapon-${ability.id}`}
                                         slotData={ability} slotNumber={null} isAssignableSlot={false}
                                         characterId={character.id}
                                         onAssignClick={null} onClearClick={null}
                                         handleApiAction={handleApiAction}
                                         mainActionAvailable={mainActionAvailable}
                                         bonusActionAvailable={bonusActionAvailable}
                                         reactionAvailable={reactionAvailable}
                                     />
                                 ) : null
                             ))
                         ) : ( <p style={styles.placeholderTextSmall}>Нет способностей от оружия.</p> )}
                     </div>
                </div>
            </div>

            {/* Нижняя часть: Кнопка завершения хода */}
            <div style={styles.endTurnContainer}>
                <button onClick={handleEndTurnClick} style={styles.endTurnButton} title="Завершить ход">
                    <EndTurnIcon /> Завершить Ход
                </button>
            </div>
        </div>
    );
};

// --- Стили ---
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out', display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', boxSizing: 'border-box' },
    actionStatusContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '25px', padding: '10px 15px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: `1px solid ${theme.colors.surfaceVariant}`, marginBottom: '0px', flexShrink: 0, },
    actionStatusItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '500', color: theme.colors.text, transition: 'opacity 0.3s ease', },
    actionIcon: { width: '20px', height: '20px', }, // Иконки теперь цветные и стильные
    mainArea: { display: 'flex', flexDirection: 'row', gap: '25px', flexGrow: 1, overflow: 'hidden', '@media (max-width: 900px)': { flexDirection: 'column', overflow: 'visible', gap: '20px',} },
    slotsSection: { flex: '1 1 60%', display: 'flex', flexDirection: 'column', padding: '15px', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', border: `1px solid ${theme.colors.surfaceVariant}`, minWidth: 0, },
    weaponSlotsSection: { flex: '1 1 35%', display: 'flex', flexDirection: 'column', padding: '15px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', border: `1px solid ${theme.colors.surfaceVariant}`, minWidth: 0, },
    sectionTitle: { margin: '0 0 15px 0', color: theme.colors.primary, textAlign: 'center', fontSize: '1.1rem', borderBottom: `1px dashed ${theme.colors.primary}55`, paddingBottom: '10px', flexShrink: 0, },
    slotsGrid: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '25px', flexWrap: 'wrap', padding: '10px 0', }, // Увеличили gap
    slotsGridWeapon: { display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '20px', flexWrap: 'wrap', padding: '10px 0', overflowY: 'auto', maxHeight: 'calc(100% - 50px)', paddingRight: '5px', scrollbarWidth: 'thin', scrollbarColor: `${theme.colors.secondary}55 ${theme.colors.surface}33`, '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-track': { background: `${theme.colors.surface}33`, borderRadius: '3px' }, '&::-webkit-scrollbar-thumb': { background: `${theme.colors.secondary}55`, borderRadius: '3px' }, '&::-webkit-scrollbar-thumb:hover': { background: `${theme.colors.secondary}88` } },
    placeholderTextSmall: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', fontSize: '0.9rem', padding: '10px 0', width: '100%', },
    endTurnContainer: { marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${theme.colors.surfaceVariant}`, display: 'flex', justifyContent: 'center', flexShrink: 0, },
    endTurnButton: { padding: '10px 25px', fontSize: '1rem', fontWeight: 'bold', background: `linear-gradient(45deg, ${theme.colors.secondary}, ${theme.colors.primary})`, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', ':hover': { filter: 'brightness(1.15)', boxShadow: `0 4px 10px ${theme.colors.secondary}55`, transform: 'scale(1.03)', }, },
    endTurnIcon: { width: '18px', height: '18px', fill: 'currentColor', },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '30px' },
};

export default CharacterActionTab;
