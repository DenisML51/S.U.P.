// src/features/CharacterDetail/tabs/CharacterInventoryTab.js
import React, { useState, useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Убедитесь, что путь правильный
import ItemCard from '../components/ItemCard'; // Карточка для стандартных предметов
import CustomItemCard from '../components/CustomItemCard'; // <-- НОВАЯ карточка для произвольных
import * as apiService from '../../../api/apiService'; // <-- Импорт для вызовов API

// Добавляем 'custom' в ITEM_TYPES
const ITEM_TYPES = {
    all: 'Все',
    weapon: 'Оружие',
    armor: 'Броня',
    shield: 'Щиты',
    general: 'Общее',
    ammo: 'Патроны',
    custom: 'Прочее' // <-- Новая категория
};

const CharacterInventoryTab = ({
    character,
    handleEquip, // Для ItemCard (стандартные предметы)
    handleUnequip, // Для ItemCard (стандартные предметы)
    handleDropItem, // Для ItemCard (стандартные предметы)
    onAddItemClick, // Для открытия модалки добавления стандартных предметов
    apiActionError, // Для отображения ошибок API
    handleApiAction // Универсальный обработчик API для показа уведомлений и обновления данных
}) => {
    const [activeSubTab, setActiveSubTab] = useState('all');

    // --- Состояние для формы добавления произвольного предмета ---
    const [customName, setCustomName] = useState('');
    const [customDesc, setCustomDesc] = useState('');
    const [customQuantity, setCustomQuantity] = useState(1);
    const [isAddingCustom, setIsAddingCustom] = useState(false);
    // -------------------------------------------------------------

    // Разделяем инвентарь на обычные и кастомные предметы
    const { regularInventory, customInventory } = useMemo(() => {
        const regInv = character?.inventory || []; // Это предметы из справочника
        const custInv = character?.custom_items || []; // Это произвольные предметы
        return { regularInventory: regInv, customInventory: custInv };
    }, [character?.inventory, character?.custom_items]);

    // Фильтруем отображаемые предметы в зависимости от вкладки
    const filteredItems = useMemo(() => {
        if (activeSubTab === 'all') {
            // На вкладке "Все" показываем сначала обычные, потом кастомные
            return [...regularInventory, ...customInventory];
        }
        if (activeSubTab === 'custom') {
            return customInventory; // Только кастомные для вкладки "Прочее"
        }
        // Фильтруем обычные предметы для остальных вкладок
        return regularInventory.filter(invItem => invItem.item?.item_type === activeSubTab);
    }, [regularInventory, customInventory, activeSubTab]);

    if (!character) return null;

    // --- Обработчик добавления произвольного предмета ---
    const handleAddCustomSubmit = async (e) => {
        e.preventDefault();
        if (!customName.trim()) return; // Простая валидация имени
        setIsAddingCustom(true);
        await handleApiAction(
            apiService.addCustomItemToInventory(character.id, customName, customDesc, customQuantity),
            `Предмет "${customName}" добавлен`,
            `Ошибка добавления произвольного предмета`
            // refreshCharacterData() будет вызван внутри handleApiAction при успехе
        );
        // Очищаем форму
        setCustomName('');
        setCustomDesc('');
        setCustomQuantity(1);
        setIsAddingCustom(false);
    };
    // ----------------------------------------------------

    // --- Обработчик удаления произвольного предмета ---
    const handleDropCustomItem = (customItemId, name, quantity = 1) => {
        // Запрос подтверждения происходит внутри CustomItemCard
        handleApiAction(
            apiService.removeCustomItemFromInventory(character.id, customItemId, quantity),
            `Предмет "${name}" удален (x${quantity})`,
            `Ошибка удаления произвольного предмета`
             // refreshCharacterData() будет вызван внутри handleApiAction при успехе
        );
    };
    // -------------------------------------------------

    // Обработка ошибок API
    const relevantError = typeof apiActionError === 'string' && apiActionError &&
        (apiActionError.includes('предмет') || apiActionError.includes('инвентар') || apiActionError.includes('экипир'))
        ? apiActionError : null;

    return (
        <div style={styles.tabContent}>
            {/* Шапка с кнопкой "Добавить Справочник" */}
            <div style={styles.mainHeader}>
                <h4 style={styles.tabTitle}>Инвентарь</h4>
                <button onClick={onAddItemClick} style={styles.addItemButton} title="Добавить предмет из справочника">
                    Справочник
                </button>
            </div>

            {/* Подвкладки */}
            <div style={styles.subTabContainer}>
                {Object.entries(ITEM_TYPES).map(([key, name]) => (
                    <button
                        key={key}
                        onClick={() => setActiveSubTab(key)}
                        style={activeSubTab === key ? styles.subTabButtonActive : styles.subTabButton}
                    >
                        {name}
                    </button>
                ))}
            </div>

            {/* Отображение ошибок API */}
            {relevantError && <p style={styles.apiActionErrorStyle}>{relevantError}</p>}

            {/* --- Форма добавления произвольного предмета (только на вкладке "Прочее") --- */}
            {activeSubTab === 'custom' && (
                <form onSubmit={handleAddCustomSubmit} style={styles.addCustomForm}>
                    <input
                        type="text"
                        placeholder="Название предмета *"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        style={{...styles.addCustomInput, flexGrow: 2}} // Имя пошире
                        maxLength={150}
                        required
                        disabled={isAddingCustom}
                    />
                    <input
                        type="text" // Можно заменить на <textarea>, если нужно многострочное описание
                        placeholder="Описание (опционально)"
                        value={customDesc}
                        onChange={(e) => setCustomDesc(e.target.value)}
                        style={{...styles.addCustomInput, flexGrow: 3}} // Описание самое широкое
                        maxLength={1000}
                        disabled={isAddingCustom}
                    />
                    <input
                        type="number"
                        placeholder="Кол-во"
                        value={customQuantity}
                        min="1"
                        onChange={(e) => setCustomQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{...styles.addCustomInput, width: '70px', flexGrow: 0}} // Фикс. ширина
                        disabled={isAddingCustom}
                    />
                    <button type="submit" style={styles.addCustomButton} disabled={isAddingCustom || !customName.trim()}>
                        {isAddingCustom ? '...' : '+ Добавить'}
                    </button>
                </form>
            )}
            {/* ------------------------------------------------------------------------ */}

            {/* Список предметов */}
            <div style={styles.inventoryList}>
                {filteredItems.length > 0 ? (
                    filteredItems.map((itemOrCustom) => {
                        // Проверяем, есть ли поле 'item', чтобы отличить обычный от кастомного
                        // В массиве filteredItems теперь могут быть объекты двух структур:
                        // 1. { id: invId, item: { ... }, quantity: N } - обычный
                        // 2. { id: customId, name: '...', description: '...', quantity: N, character_id: X } - кастомный
                        if (itemOrCustom.item && itemOrCustom.item.item_type) { // Обычный предмет инвентаря
                            return (
                                <ItemCard
                                    key={`item-${itemOrCustom.id}`}
                                    character={character}
                                    invItem={itemOrCustom}
                                    onEquip={handleEquip}
                                    onUnequip={handleUnequip}
                                    onDrop={(quantity = 1) => handleDropItem(itemOrCustom.id, quantity)} // handleDropItem ожидает inventory_item_id
                                    handleApiAction={handleApiAction}
                                />
                            );
                        } else if (itemOrCustom.name && itemOrCustom.character_id) { // Произвольный предмет
                            // Отображаем только если мы на вкладке 'custom' или 'all'
                            if (activeSubTab === 'custom' || activeSubTab === 'all') {
                                return (
                                    <CustomItemCard // Используем новую карточку
                                        key={`custom-${itemOrCustom.id}`}
                                        customItem={itemOrCustom}
                                        // onDrop принимает количество для удаления
                                        onDrop={(quantityToDrop = 1) => handleDropCustomItem(itemOrCustom.id, itemOrCustom.name, quantityToDrop)}
                                    />
                                );
                            }
                            return null; // Не отображаем кастомные на других вкладках, кроме 'all'
                        }
                        // Если структура неизвестна, не рендерим ничего
                        console.warn("Unknown item structure in inventory list:", itemOrCustom);
                        return null;
                    })
                ) : (
                    <p style={styles.placeholderText}>
                        {activeSubTab === 'all' ? 'Инвентарь пуст.' :
                         activeSubTab === 'custom' ? 'Нет произвольных предметов.' :
                         `Нет предметов типа "${ITEM_TYPES[activeSubTab]}".`}
                    </p>
                )}
            </div>
        </div>
    );
};

// Стили (включая стили для новой формы)
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' },
    mainHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surface}66`, flexShrink: 0, },
    tabTitle: { margin: 0, color: theme.colors.primary, fontSize: '1.1rem' },
    addItemButton: { padding: '6px 12px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: theme.transitions.default, ':hover': {opacity: 0.9} },
    subTabContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surface}44`, flexShrink: 0, },
    subTabButton: { padding: '5px 12px', background: 'transparent', color: theme.colors.textSecondary, border: `1px solid ${theme.colors.surface}88`, borderRadius: '15px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.8rem', ':hover': { background: `${theme.colors.primary}22`, color: theme.colors.primary, borderColor: `${theme.colors.primary}55`, } },
    subTabButtonActive: { padding: '5px 12px', background: theme.colors.primary, color: theme.colors.background, border: `1px solid ${theme.colors.primary}`, borderRadius: '15px', cursor: 'default', transition: theme.transitions.default, fontSize: '0.8rem', fontWeight: 'bold', },
    apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem', flexShrink: 0 },
    // --- Стили для формы добавления произвольного предмета ---
    addCustomForm: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px', // Отступ после формы
        paddingBottom: '15px', // Отступ для разделителя
        borderBottom: `1px solid ${theme.colors.surface}66`, // Разделитель
        flexWrap: 'wrap', // Перенос на маленьких экранах
        alignItems: 'center', // Выравнивание по центру по вертикали
    },
    addCustomInput: {
        padding: '8px 12px', // Увеличим паддинг
        borderRadius: '6px',
        border: `1px solid ${theme.colors.textSecondary}88`,
        background: 'rgba(255, 255, 255, 0.05)',
        color: theme.colors.text,
        fontSize: '0.9rem',
        height: '36px', // Фикс высота для выравнивания
        boxSizing: 'border-box',
        ':disabled': { opacity: 0.5, cursor: 'not-allowed' }
    },
    addCustomButton: {
        padding: '8px 15px',
        height: '36px', // Фикс высота для выравнивания
        background: theme.colors.secondary,
        color: theme.colors.background,
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: theme.transitions.default,
        whiteSpace: 'nowrap', // Чтобы текст не переносился
        ':disabled': { opacity: 0.5, cursor: 'not-allowed'},
        ':hover:not(:disabled)': { opacity: 0.9 }
    },
    // ------------------------------------------------------
    inventoryList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px', // Увеличим отступ
        flexGrow: 1,
        overflowY: 'auto',
        padding: '5px 10px 5px 5px',
        marginRight: '-10px', // Компенсация правого паддинга для скроллбара
        // --- Стили скроллбара ---
        scrollbarWidth: 'thin', /* Firefox */
        scrollbarColor: `${theme.colors.primary}33 ${theme.colors.surface}55`, /* Firefox */
        '&::-webkit-scrollbar': {
            width: '8px'
        },
        '&::-webkit-scrollbar-track': {
            background: `${theme.colors.surface}55`,
            borderRadius: '4px'
        },
        '&::-webkit-scrollbar-thumb': {
            background: `${theme.colors.primary}55`,
            borderRadius: '4px',
            border: `1px solid ${theme.colors.surface}88`
        },
        '&::-webkit-scrollbar-thumb:hover': {
            background: `${theme.colors.primary}88`
        }
        // -------------------------
    },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '30px', flexGrow: 1 },
};

export default CharacterInventoryTab;