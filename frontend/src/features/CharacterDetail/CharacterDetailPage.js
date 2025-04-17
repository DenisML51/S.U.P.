// src/features/CharacterDetail/CharacterDetailPage.js
import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { theme } from '../../styles/theme';
import * as apiService from '../../api/apiService';

// Импорт хуков
import { useCharacterData } from '../../hooks/useCharacterData';
import { useApiActionHandler } from '../../hooks/useApiActionHandler';

// Импорт компонентов секций и вкладок
import CharacterStatusSection from './sections/CharacterStatusSection';
import CharacterSkillsSection from './sections/CharacterSkillsSection';
import CharacterEquipmentTab from './tabs/CharacterEquipmentTab';
import CharacterInventoryTab from './tabs/CharacterInventoryTab'; // <<< Этот компонент получает handleEquip
import CharacterAbilitiesTab from './tabs/CharacterAbilitiesTab';
import CharacterBranchesTab from './tabs/CharacterBranchesTab';
import CharacterNotesTab from './tabs/CharacterNotesTab';

// Импорт модальных окон
import LevelUpModal from './modals/LevelUpModal';
import AddItemModal from './modals/AddItemModal';
import EditNotesModal from './modals/EditNotesModal';
import AbilityDetailModal from './modals/AbilityDetailModal';


const CharacterDetailPage = () => {
    const { characterId } = useParams();
    const navigate = useNavigate();

    // --- Hooks ---
    const { character, isLoading, error: loadingError, refreshCharacterData, setError: setLoadingError } = useCharacterData(characterId);
    // handleApiAction отвечает за вызов API, обработку ошибок и обновление данных через refreshCharacterData
    const { handleApiAction, actionError, triggeredEmotion, clearActionError, clearTriggeredEmotion } = useApiActionHandler(refreshCharacterData);

    // --- Local State ---
    const [activeTab, setActiveTab] = useState('inventory'); // Начинаем с инвентаря для проверки
    const [allAbilities, setAllAbilities] = useState([]);
    const [isLoadingAbilities, setIsLoadingAbilities] = useState(true);
    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [showEditNotesModal, setShowEditNotesModal] = useState(false);
    const [showAbilityModal, setShowAbilityModal] = useState(false);
    const [selectedAbilityForModal, setSelectedAbilityForModal] = useState(null);

    // --- Data Fetching ---
    const fetchAllAbilities = useCallback(async () => { /* ... (код без изменений) ... */
         setIsLoadingAbilities(true);
        try {
            const res = await apiService.getAllAbilities();
            setAllAbilities(res.data);
        } catch (err) { console.error("Failed fetch abilities", err); setLoadingError(prev => prev ? `${prev}\nОшибка способностей.` : "Ошибка способностей.");}
        finally { setIsLoadingAbilities(false); }
    }, [setLoadingError]);
    useEffect(() => { fetchAllAbilities(); }, [fetchAllAbilities]);
    useEffect(() => { clearActionError(); clearTriggeredEmotion(); }, [activeTab, clearActionError, clearTriggeredEmotion]);

    // --- Event Handlers ---

    // >>> ЭТОТ КОЛБЭК ДОЛЖЕН БЫТЬ ЗДЕСЬ <<<
    const handleEquip = useCallback((inventoryItemId, slot) => {
        console.log(`CharacterDetailPage: handleEquip called - invId: ${inventoryItemId}, slot: ${slot}`);
        handleApiAction(
            apiService.equipItem(characterId, inventoryItemId, slot), // Вызываем API
            `Предмет экипирован в ${slot}`,                         // Сообщение об успехе (опционально)
            `Ошибка экипировки`                                    // Префикс ошибки
        );
    }, [handleApiAction, characterId]); // Зависимости

    const handleUnequip = useCallback((slot) => {
        console.log(`CharacterDetailPage: handleUnequip called - slot: ${slot}`);
        handleApiAction(
            apiService.unequipItem(characterId, slot),
            `Предмет снят со слота ${slot}`,
            `Ошибка снятия`
        );
    }, [handleApiAction, characterId]);

    const handleDropItem = useCallback((inventoryItemId) => {
        console.log(`CharacterDetailPage: handleDropItem called - invId: ${inventoryItemId}`);
        if (window.confirm(`Выбросить предмет?`)) {
            handleApiAction(
                apiService.removeItemFromInventory(characterId, inventoryItemId, 1), // Удаляем 1 шт
                `Предмет удален`,
                `Ошибка удаления`
            );
        }
    }, [handleApiAction, characterId]);

    const handleAbilityCardClick = useCallback((ability) => {
        setSelectedAbilityForModal(ability);
        setShowAbilityModal(true);
    }, []);

    // --- Rendering ---
    if (isLoading || (isLoadingAbilities && allAbilities.length === 0)) { /* ... */ return <div style={styles.loading}>Загрузка данных...</div>; }
    if (loadingError && !character) { /* ... */ return <div style={styles.error}>{loadingError} <button onClick={() => refreshCharacterData(true)}>Попробовать снова</button></div>; }
    if (!character) { /* ... */ return <div style={styles.error}>Не удалось загрузить персонажа.</div>; }

    // --- ПРОВЕРЯЕМ ПЕРЕДАЧУ PROPS В renderTabContent ---
    const renderTabContent = () => {
         switch (activeTab) {
             case 'equipment':
                 return <CharacterEquipmentTab
                            character={character}
                            handleUnequip={handleUnequip} // <--- Передаем для снятия
                            apiActionError={actionError}
                        />;
             case 'inventory':
                 return <CharacterInventoryTab
                            character={character}
                            handleEquip={handleEquip} // <<-- УБЕДИТЕСЬ, ЧТО ЭТОТ PROP ПЕРЕДАЕТСЯ
                            handleDropItem={handleDropItem}
                            onAddItemClick={() => setShowAddItemModal(true)}
                            apiActionError={actionError}
                        />;
             case 'abilities':
                 return <CharacterAbilitiesTab character={character} allAbilities={allAbilities} onAbilityClick={handleAbilityCardClick} apiActionError={actionError} />;
             case 'branches':
                  return <CharacterBranchesTab character={character} allAbilities={allAbilities} onAbilityClick={handleAbilityCardClick} apiActionError={actionError} />;
             case 'notes':
                 return <CharacterNotesTab character={character} onEditNotesClick={() => setShowEditNotesModal(true)} apiActionError={actionError} />;
             default: return null;
         }
     };

    return (
        <Fragment>
            {/* Модальные окна */}
            {showLevelUpModal && <LevelUpModal characterId={characterId} currentCharacterData={character} onClose={() => setShowLevelUpModal(false)} onLevelUpSuccess={() => { setShowLevelUpModal(false); refreshCharacterData(); }} />}
            {showAddItemModal && <AddItemModal characterId={characterId} onClose={() => setShowAddItemModal(false)} onSuccess={() => { setShowAddItemModal(false); refreshCharacterData(); }} />}
            {showEditNotesModal && <EditNotesModal characterId={characterId} currentNotes={{ appearance_notes: character.appearance_notes, character_notes: character.character_notes, motivation_notes: character.motivation_notes, background_notes: character.background_notes, }} onClose={() => setShowEditNotesModal(false)} onSuccess={() => { setShowEditNotesModal(false); refreshCharacterData(); }} />}
            {showAbilityModal && selectedAbilityForModal && <AbilityDetailModal ability={selectedAbilityForModal} onClose={() => { setShowAbilityModal(false); setSelectedAbilityForModal(null); }} />}

            {/* Основная разметка */}
            <div style={styles.pageContainer}>
                <div style={styles.header}>
                     <button onClick={() => navigate('/')} style={styles.backButton}>{"<"} Назад</button>
                     <h1 style={styles.characterNameHeader}>{character.name}</h1>
                     <div style={{ minWidth: '80px' }}></div>
                </div>

                {typeof loadingError === 'string' && loadingError && !character && <div style={styles.apiError}>{loadingError}</div>}
                 {triggeredEmotion && ( <p style={styles.emotionTriggeredText}>Эмоция: <strong>{triggeredEmotion}</strong>! (ПУ сброшено до {character.base_pu})</p> )}

                <div style={styles.mainLayout}>
                    <div style={styles.leftColumn}>
                        {/* CharacterStatusSection и CharacterSkillsSection без изменений */}
                        <CharacterStatusSection character={character} handleApiAction={handleApiAction} onLevelUpClick={() => setShowLevelUpModal(true)} refreshCharacterData={refreshCharacterData} />
                        <CharacterSkillsSection character={character} />
                    </div>

                    <div style={styles.rightColumn}>
                        <div style={styles.tabButtons}>
                            <button onClick={() => setActiveTab('equipment')} style={activeTab === 'equipment' ? styles.tabButtonActive : styles.tabButton}>Экипировка</button>
                            <button onClick={() => setActiveTab('inventory')} style={activeTab === 'inventory' ? styles.tabButtonActive : styles.tabButton}>Инвентарь</button>
                            <button onClick={() => setActiveTab('abilities')} style={activeTab === 'abilities' ? styles.tabButtonActive : styles.tabButton}>Способности</button>
                            <button onClick={() => setActiveTab('branches')} style={activeTab === 'branches' ? styles.tabButtonActive : styles.tabButton}>Ветки</button>
                            <button onClick={() => setActiveTab('notes')} style={activeTab === 'notes' ? styles.tabButtonActive : styles.tabButton}>Заметки</button>
                        </div>
                        <div style={styles.tabContentContainer}>
                             {typeof actionError === 'string' && actionError && ( <p style={{...styles.apiActionErrorStyle, marginBottom: '15px'}}>{actionError}</p> )}
                             {renderTabContent()} {/* Вызов функции рендера */}
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

// Стили styles остаются без изменений
const styles = {
    pageContainer: { minHeight: '100vh', background: theme.colors.background, color: theme.colors.text, padding: '20px', boxSizing: 'border-box' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '15px', borderBottom: `1px solid ${theme.colors.surface}`, maxWidth: '1400px', margin: '0 auto 30px auto' },
    characterNameHeader: { margin: 0, color: theme.colors.primary, fontSize: '2.2rem', textAlign: 'center', flexGrow: 1 },
    backButton: { padding: '8px 16px', background: 'transparent', color: theme.colors.textSecondary, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', fontSize: '1rem', minWidth: '80px', textAlign: 'left', ':hover': { color: theme.colors.primary } },
    mainLayout: { display: 'flex', flexDirection: 'row', gap: '30px', maxWidth: '1400px', margin: '0 auto', flexWrap: 'wrap' },
    leftColumn: { flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: '0px', minWidth: '350px' },
    rightColumn: { flex: '1 1 calc(60% - 30px)', display: 'flex', flexDirection: 'column', minWidth: '400px' },
    tabButtons: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surface}` },
    tabButton: { padding: '8px 15px', background: theme.colors.surface, color: theme.colors.textSecondary, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.9rem', ':hover': { background: `${theme.colors.primary}44`, color: theme.colors.primary } },
    tabButtonActive: { padding: '8px 15px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.9rem', fontWeight: 'bold', boxShadow: `0 0 10px ${theme.colors.primary}77` },
    tabContentContainer: { flexGrow: 1, background: theme.effects.glass, backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '25px', boxShadow: theme.effects.shadow, minHeight: '400px', position: 'relative' },
    loading: { textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: theme.colors.text },
    error: { textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: theme.colors.error },
    apiError: { background: `${theme.colors.error}44`, color: theme.colors.error, padding: '10px 15px', borderRadius: '8px', border: `1px solid ${theme.colors.error}`, textAlign: 'center', marginBottom: '20px', maxWidth: '1400px', margin: '0 auto 20px auto' },
    apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', fontSize: '0.9rem' },
    emotionTriggeredText: { color: theme.colors.primary, fontWeight: 'bold', textAlign: 'center', padding: '8px 12px', background: `${theme.colors.primary}22`, borderRadius: '6px', fontSize: '0.9rem', animation: 'fadeIn 0.5s', maxWidth: '1400px', margin: '0 auto 20px auto' },
};


export default CharacterDetailPage;