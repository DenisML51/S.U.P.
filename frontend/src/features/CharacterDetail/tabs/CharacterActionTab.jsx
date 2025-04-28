// frontend/src/features/CharacterDetail/tabs/CharacterActionTab.js
import React, { useState, useCallback, useMemo } from 'react';
import { theme } from '../../../styles/theme';
import * as apiService from '../../../api/apiService';

// Импорт компонентов
import AbilitySlotDisplay from '../components/AbilitySlotDisplay';
import AbilitySelectionModal from '../modals/AbilitySelectionModal';

// Иконка для кнопки завершения хода
const EndTurnIcon = () => (
    <svg style={styles.endTurnIcon} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
    </svg>
);

const CharacterActionTab = ({
    character,       // Текущие данные персонажа
    handleApiAction, // Обработчик для API вызовов (из useApiActionHandler)
    // onAbilityClick больше не нужен для этой вкладки
}) => {
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [targetSlotForSelection, setTargetSlotForSelection] = useState(null); // Номер слота (1-5)

    // --- Извлечение и обработка способностей ---

    // Данные для 5 назначаемых слотов
    const activeSlotsData = useMemo(() => [
        { slotNumber: 1, data: character?.active_slot_1 },
        { slotNumber: 2, data: character?.active_slot_2 },
        { slotNumber: 3, data: character?.active_slot_3 },
        { slotNumber: 4, data: character?.active_slot_4 },
        { slotNumber: 5, data: character?.active_slot_5 },
    ], [
        character?.active_slot_1, // Явно перечисляем зависимости
        character?.active_slot_2,
        character?.active_slot_3,
        character?.active_slot_4,
        character?.active_slot_5,
    ]);

    // Уникальные способности от оружия (с логами для отладки)
    const weaponAbilities = useMemo(() => {
        console.log("Character data for weapon abilities:", character);
        const abilitiesMap = new Map();
        const processWeapon = (weaponInvItem, weaponSlotName) => {
            const weapon = weaponInvItem?.item;
            console.log(`Processing ${weaponSlotName}:`, weapon);
            if (weapon?.item_type === 'weapon' && Array.isArray(weapon.granted_abilities)) {
                console.log(`  Granted abilities for ${weapon.name}:`, weapon.granted_abilities);
                weapon.granted_abilities.forEach(ab => {
                    if (ab && typeof ab === 'object' && ab.id != null && !abilitiesMap.has(ab.id)) {
                        console.log(`  Adding weapon ability: ${ab.name} (ID: ${ab.id})`);
                        abilitiesMap.set(ab.id, ab);
                    } else if (ab && abilitiesMap.has(ab.id)) {
                         console.log(`  Skipping duplicate weapon ability: ${ab.name} (ID: ${ab.id})`);
                    } else {
                         console.warn(`  Invalid ability structure found in ${weaponSlotName}:`, ab);
                    }
                });
            } else {
                 console.log(`  No valid weapon or abilities found in ${weaponSlotName}.`);
            }
        };

        processWeapon(character?.equipped_weapon1, "Weapon 1");
        processWeapon(character?.equipped_weapon2, "Weapon 2");

        const result = Array.from(abilitiesMap.values());
        console.log("Final weapon abilities array:", result);
        return result;
    }, [character?.equipped_weapon1, character?.equipped_weapon2]); // Зависимости

    // --- Коллбэки ---

    // Открыть модалку выбора при клике на пустой назначаемый слот
    const handleAssignClick = useCallback((slotNumber) => {
        setTargetSlotForSelection(slotNumber);
        setIsSelectionModalOpen(true);
    }, []);

    // Закрыть модалку выбора
    const handleCloseSelectionModal = useCallback(() => {
        setIsSelectionModalOpen(false);
        setTargetSlotForSelection(null);
    }, []);

    // Очистить слот по клику на кнопку "x"
    const handleClearClick = useCallback((slotNumber) => {
        if (!character?.id) return;
        // Можно убрать confirm, если кнопка маленькая и случайное нажатие маловероятно
        // if (window.confirm(`Очистить слот ${slotNumber}?`)) {
            handleApiAction(
                apiService.setCharacterAbilitySlot(character.id, slotNumber, null), // null для очистки
                `Слот ${slotNumber} очищен`,
                `Ошибка очистки слота ${slotNumber}`
            );
        // }
    }, [character?.id, handleApiAction]);

    // Назначить выбранную способность из модалки
    const handleSelectAbilityFromModal = useCallback((abilityId) => {
        if (!character?.id || targetSlotForSelection === null) return;
        handleApiAction(
            apiService.setCharacterAbilitySlot(character.id, targetSlotForSelection, abilityId),
            `Способность назначена в слот ${targetSlotForSelection}`,
            `Ошибка назначения способности в слот ${targetSlotForSelection}`
        );
        handleCloseSelectionModal(); // Закрываем модалку
    }, [character?.id, targetSlotForSelection, handleApiAction, handleCloseSelectionModal]);

    // Завершить ход
    const handleEndTurnClick = useCallback(() => {
        if (!character?.id) return;
        handleApiAction(
            apiService.endCharacterTurn(character.id),
            "Ход завершен, кулдауны обновлены",
            "Ошибка завершения хода"
        );
    }, [character?.id, handleApiAction]);

    // --- Рендеринг ---

    if (!character) {
        return <p style={styles.placeholderText}>Нет данных персонажа.</p>;
    }

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

            {/* Основная область с двумя колонками */}
            <div style={styles.mainArea}>

                {/* Левая часть: Слоты персонажа */}
                <div style={styles.slotsSection}>
                    <h3 style={styles.sectionTitle}>Активные Слоты</h3>
                    <div style={styles.slotsGrid}>
                        {activeSlotsData.map(({ slotNumber, data }) => (
                            <AbilitySlotDisplay
                                key={`slot-${slotNumber}`}
                                slotData={data} // { ability, cooldown_remaining }
                                slotNumber={slotNumber}
                                isAssignableSlot={true} // Это назначаемый слот
                                characterId={character.id}
                                onAssignClick={handleAssignClick} // Открыть модалку
                                onClearClick={handleClearClick}   // Очистить слот
                                handleApiAction={handleApiAction} // Активировать способность
                            />
                        ))}
                    </div>
                </div>

                {/* Правая часть: Слоты оружия */}
                <div style={styles.weaponSlotsSection}>
                     <h3 style={styles.sectionTitle}>Способности Оружия</h3>
                     <div style={styles.slotsGridWeapon}> {/* Отдельный стиль для сетки оружия */}
                         {weaponAbilities.length > 0 ? (
                             weaponAbilities.map(ability => (
                                 ability && ability.id ? ( // Проверка на валидность объекта
                                     <AbilitySlotDisplay
                                         key={`weapon-${ability.id}`}
                                         slotData={ability} // Сам объект AbilityOut
                                         slotNumber={null}
                                         isAssignableSlot={false} // Не назначаемый
                                         characterId={character.id}
                                         onAssignClick={null}
                                         onClearClick={null}
                                         handleApiAction={handleApiAction} // Активировать способность
                                     />
                                 ) : null
                             ))
                         ) : (
                             <p style={styles.placeholderTextSmall}>Нет способностей от экипированного оружия.</p>
                         )}
                     </div>
                </div>
            </div>

            {/* Нижняя часть: Кнопка завершения хода */}
            <div style={styles.endTurnContainer}>
                <button
                    onClick={handleEndTurnClick}
                    style={styles.endTurnButton}
                    title="Завершить ход и уменьшить кулдауны на 1"
                >
                    <EndTurnIcon />
                    Завершить Ход
                </button>
            </div>
        </div>
    );
};

// --- Стили ---
const styles = {
    tabContent: {
        animation: 'fadeIn 0.5s ease-out',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: '20px',
        boxSizing: 'border-box'
    },
    mainArea: {
        display: 'flex',
        flexDirection: 'row',
        gap: '25px',
        flexGrow: 1,
        overflow: 'hidden',
        '@media (max-width: 900px)': {
             flexDirection: 'column',
             overflow: 'visible',
             gap: '20px',
        }
    },
    slotsSection: { // Левая колонка (слоты)
        flex: '1 1 60%',
        display: 'flex',
        flexDirection: 'column',
        padding: '15px',
        background: 'rgba(0,0,0,0.1)',
        borderRadius: '10px',
        border: `1px solid ${theme.colors.surfaceVariant}`,
        minWidth: 0,
    },
    weaponSlotsSection: { // Правая колонка (оружие)
        flex: '1 1 35%',
        display: 'flex',
        flexDirection: 'column',
        padding: '15px',
        background: 'rgba(0,0,0,0.05)',
        borderRadius: '10px',
        border: `1px solid ${theme.colors.surfaceVariant}`,
        minWidth: 0,
        // --- Убрали maxHeight и overflowY отсюда, чтобы не было двойного скролла ---
        // overflowY: 'auto',
        // maxHeight: '400px',
        // scrollbarWidth: 'thin',
        // scrollbarColor: `${theme.colors.secondary}55 ${theme.colors.surface}33`,
    },
    sectionTitle: {
        margin: '0 0 15px 0',
        color: theme.colors.primary,
        textAlign: 'center',
        fontSize: '1.1rem',
        borderBottom: `1px dashed ${theme.colors.primary}55`,
        paddingBottom: '10px',
        flexShrink: 0,
    },
    slotsGrid: { // Сетка для 5 активных слотов
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap',
        padding: '10px 0',
    },
    slotsGridWeapon: { // Сетка для оружейных способностей
        display: 'flex',
        justifyContent: 'flex-start', // Начинаем слева
        alignItems: 'center',
        gap: '15px', // Меньше отступ
        flexWrap: 'wrap',
        padding: '10px 0',
        // Добавляем скролл для этой сетки, если она в правой колонке
        overflowY: 'auto',
        maxHeight: 'calc(100% - 50px)', // Занимает всю высоту колонки минус заголовок (примерно)
        paddingRight: '5px', // Отступ для скроллбара
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.colors.secondary}55 ${theme.colors.surface}33`,
        '&::-webkit-scrollbar': { width: '6px' },
        '&::-webkit-scrollbar-track': { background: `${theme.colors.surface}33`, borderRadius: '3px' },
        '&::-webkit-scrollbar-thumb': { background: `${theme.colors.secondary}55`, borderRadius: '3px' },
        '&::-webkit-scrollbar-thumb:hover': { background: `${theme.colors.secondary}88` }
    },
     placeholderTextSmall: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        fontSize: '0.9rem',
        padding: '10px 0',
        width: '100%', // Занимает всю ширину контейнера
    },
    endTurnContainer: {
        marginTop: 'auto',
        paddingTop: '20px',
        borderTop: `1px solid ${theme.colors.surfaceVariant}`,
        display: 'flex',
        justifyContent: 'center',
        flexShrink: 0,
    },
    endTurnButton: {
        padding: '10px 25px',
        fontSize: '1rem',
        fontWeight: 'bold',
        background: `linear-gradient(45deg, ${theme.colors.secondary}, ${theme.colors.primary})`,
        color: theme.colors.background,
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
        ':hover': {
            filter: 'brightness(1.15)',
            boxShadow: `0 4px 10px ${theme.colors.secondary}55`,
            transform: 'scale(1.03)',
        },
    },
    endTurnIcon: {
        width: '18px',
        height: '18px',
        fill: 'currentColor',
    },
    placeholderText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: '30px'
    },
};

export default CharacterActionTab;
