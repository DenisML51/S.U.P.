// src/features/Lobby/components/ExpandedCharacterSheet.js
import React, { useState, useCallback } from 'react';
import { theme } from '../../../styles/theme';

// Импорт компонентов со страницы деталей
import CharacterStatusSection from '../../CharacterDetail/sections/CharacterStatusSection';
import CharacterActionTab from '../../CharacterDetail/tabs/CharacterActionTab';
import CharacterSkillsTab from '../../CharacterDetail/tabs/CharacterSkillsTab';
import CharacterEquipmentTab from '../../CharacterDetail/tabs/CharacterEquipmentTab';
import CharacterInventoryTab from '../../CharacterDetail/tabs/CharacterInventoryTab';
import CharacterNotesTab from '../../CharacterDetail/tabs/CharacterNotesTab';
// Импорт API сервиса для обработчиков инвентаря
import * as apiService from '../../../api/apiService';

// Иконка закрытия
const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
);

const ExpandedCharacterSheet = ({
    character,
    onClose,
    handleApiAction, // Принимаем обработчик-обертку из Lobby.js
    // lobbyKey больше не нужен как проп
 }) => {
    const [activeSheetTab, setActiveSheetTab] = useState('status');

    // --- ИСПРАВЛЕНИЕ: Используем переданный handleApiAction напрямую ---
    // Обработчики для InventoryTab - вызывают handleApiAction напрямую с новой сигнатурой
    const handleEquipItem = useCallback((inventoryItemId, slot) => {
        if (!character?.id || !handleApiAction) return;
        // Передаем функцию API и массив аргументов
        handleApiAction(
             apiService.equipItem,
             [character.id, inventoryItemId, slot],
             `Предмет экипирован`, `Ошибка экипировки`
         );
    }, [character?.id, handleApiAction]);

    const handleUnequipItem = useCallback((slot) => {
        if (!character?.id || !handleApiAction) return;
         // Передаем функцию API и массив аргументов
         handleApiAction(
             apiService.unequipItem,
             [character.id, slot],
             `Предмет снят`, `Ошибка снятия`
         );
    }, [character?.id, handleApiAction]);

     const handleDropItem = useCallback((inventoryItemId, quantity = 1) => {
        if (!character?.id || !handleApiAction) return;
         // Передаем функцию API и массив аргументов
         handleApiAction(
             apiService.removeItemFromInventory,
             [character.id, inventoryItemId, quantity],
             `Предмет удален (x${quantity})`, `Ошибка удаления предмета`
         );
    }, [character?.id, handleApiAction]);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---


    if (!character) return null;

    // Функция рендеринга контента вкладки
    const renderSheetTabContent = () => {
        switch (activeSheetTab) {
            case 'status':
                // Передаем handleApiAction напрямую
                return ( <CharacterStatusSection character={character} handleApiAction={handleApiAction} onLevelUpClick={null} refreshCharacterData={null} /> );
            case 'actions':
                 // Передаем handleApiAction напрямую
                 return ( <CharacterActionTab character={character} handleApiAction={handleApiAction} onAbilityClick={null} /> );
            case 'skills':
                 // Передаем refresh=null, т.к. обновления через WS
                 return <CharacterSkillsTab character={character} refreshCharacterData={null} />;
            case 'equipment':
                 // Передаем обработчик снятия
                 return <CharacterEquipmentTab character={character} handleUnequip={handleUnequipItem} />;
            case 'inventory':
                 // Передаем все необходимые обработчики
                 return <CharacterInventoryTab
                            character={character}
                            handleEquip={handleEquipItem}
                            handleUnequip={handleUnequipItem}
                            handleDropItem={handleDropItem}
                            onAddItemClick={null} // Добавление из справочника не нужно здесь
                            handleApiAction={handleApiAction} // Для кастомных предметов
                        />;
            case 'notes':
                 // Редактирование отключено
                 return <CharacterNotesTab character={character} onEditNotesClick={null} />;
            default:
                return <p>Выберите вкладку</p>;
        }
    };

    return (
        <div style={styles.sheetContainer}>
            <button onClick={onClose} style={styles.closeButtonSheet} title="Свернуть"><CloseIcon /></button>
            <div style={styles.sheetHeader}>
                 <h3 style={styles.sheetTitle}>{character.name}</h3>
                 <div style={styles.sheetTabButtons}>
                     <button onClick={() => setActiveSheetTab('status')} style={activeSheetTab === 'status' ? styles.sheetTabButtonActive : styles.sheetTabButton}>Статус</button>
                     <button onClick={() => setActiveSheetTab('actions')} style={activeSheetTab === 'actions' ? styles.sheetTabButtonActive : styles.sheetTabButton}>Действия</button>
                     <button onClick={() => setActiveSheetTab('skills')} style={activeSheetTab === 'skills' ? styles.sheetTabButtonActive : styles.sheetTabButton}>Навыки</button>
                     <button onClick={() => setActiveSheetTab('equipment')} style={activeSheetTab === 'equipment' ? styles.sheetTabButtonActive : styles.sheetTabButton}>Экипировка</button>
                     <button onClick={() => setActiveSheetTab('inventory')} style={activeSheetTab === 'inventory' ? styles.sheetTabButtonActive : styles.sheetTabButton}>Инвентарь</button>
                     <button onClick={() => setActiveSheetTab('notes')} style={activeSheetTab === 'notes' ? styles.sheetTabButtonActive : styles.sheetTabButton}>Заметки</button>
                 </div>
            </div>
            <div style={styles.sheetContent}>
                {renderSheetTabContent()}
            </div>
        </div>
    );
};

// Стили (без изменений)
const styles = {
    sheetContainer: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', animation: 'fadeInSheet 0.4s ease-out', background: theme.colors.surface, borderRadius: '12px', border: `1px solid ${theme.colors.surfaceVariant}`, overflow: 'hidden', },
    '@keyframes fadeInSheet': { 'from': { opacity: 0, transform: 'translateY(10px)' }, 'to': { opacity: 1, transform: 'translateY(0)' } },
    closeButtonSheet: { position: 'absolute', top: '10px', right: '10px', background: theme.colors.surfaceVariant + 'aa', border: `1px solid ${theme.colors.textSecondary}55`, color: theme.colors.textSecondary, borderRadius: '50%', width: '28px', height: '28px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease', zIndex: 10, ':hover': { background: theme.colors.error + '88', color: theme.colors.text, transform: 'scale(1.1)', } },
    sheetHeader: { padding: '15px 20px 10px 20px', borderBottom: `1px solid ${theme.colors.surfaceVariant}`, flexShrink: 0, },
    sheetTitle: { margin: '0 0 15px 0', color: theme.colors.primary, fontSize: '1.3rem', textAlign: 'center', fontWeight: '600', },
    sheetTabButtons: { display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' },
    sheetTabButton: { padding: '6px 15px', background: 'transparent', color: theme.colors.textSecondary, border: 'none', borderBottom: '2px solid transparent', borderRadius: '0', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.95rem', ':hover': { color: theme.colors.primary, borderBottomColor: `${theme.colors.primary}88` } },
    sheetTabButtonActive: { padding: '6px 15px', background: 'transparent', color: theme.colors.primary, border: 'none', borderBottom: `2px solid ${theme.colors.primary}`, borderRadius: '0', cursor: 'default', fontSize: '0.95rem', fontWeight: 'bold', },
    sheetContent: { flexGrow: 1, overflowY: 'auto', padding: '20px', scrollbarWidth: 'thin', scrollbarColor: `${theme.colors.primary} ${theme.colors.surface}` },
    placeholder: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: '30px 0', }
};

export default ExpandedCharacterSheet;
