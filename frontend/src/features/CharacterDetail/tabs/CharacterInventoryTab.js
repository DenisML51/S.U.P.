// src/features/CharacterDetail/tabs/CharacterInventoryTab.js
import React, { useState, useMemo } from 'react';
import { theme } from '../../../styles/theme';
import ItemCard from '../components/ItemCard'; // Импортируем ItemCard

const ITEM_TYPES = {
    all: 'Все',
    weapon: 'Оружие',
    armor: 'Броня',
    shield: 'Щиты',
    general: 'Общее',
    ammo: 'Патроны'
};

const CharacterInventoryTab = ({
    character,
    handleEquip,
    handleUnequip,
    handleDropItem,
    onAddItemClick,
    apiActionError,
    handleApiAction
}) => {
    const [activeSubTab, setActiveSubTab] = useState('all');

    const filteredInventory = useMemo(() => {
        const inventory = character?.inventory || [];
        if (activeSubTab === 'all') {
            return inventory;
        }
        return inventory.filter(invItem => invItem.item?.item_type === activeSubTab);
    }, [character?.inventory, activeSubTab]);


    if (!character) return null;

    const inventory = character.inventory || []; // Для ItemCard все еще нужен полный инвентарь для проверки экипировки

    const relevantError = typeof apiActionError === 'string' && apiActionError &&
         (apiActionError.includes('предмет') || apiActionError.includes('инвентар') || apiActionError.includes('экипир'))
         ? apiActionError : null;

    return (
        <div style={styles.tabContent}>
            {/* Заголовок и кнопка добавления */}
            <div style={styles.mainHeader}>
                <h4 style={styles.tabTitle}>Инвентарь</h4>
                <button onClick={onAddItemClick} style={styles.addItemButton} title="Добавить предмет">+</button>
            </div>

            {/* Подвкладки для фильтрации */}
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

            {/* Отображение релевантной ошибки */}
            {relevantError && <p style={styles.apiActionErrorStyle}>{relevantError}</p>}

            {/* --- ИЗМЕНЕН КОНТЕЙНЕР ДЛЯ КАРТОЧЕК --- */}
            {filteredInventory.length > 0 ? (
                // Используем flex-контейнер для вертикального расположения
                <div style={styles.inventoryList}>
                    {filteredInventory.map((invItem) => (
                        <ItemCard
                            key={invItem.id}
                            character={character} // Передаем полные данные персонажа
                            invItem={invItem}
                            onEquip={handleEquip}
                            onUnequip={handleUnequip}
                            onDrop={handleDropItem}
                            handleApiAction={handleApiAction}
                            // onUse={...}
                        />
                    ))}
                </div>
            ) : (
                <p style={styles.placeholderText}>
                    {activeSubTab === 'all' ? 'Инвентарь пуст.' : `Нет предметов типа "${ITEM_TYPES[activeSubTab]}".`}
                </p>
            )}
            {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
        </div>
    );
};

// Обновленные стили
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out', display: 'flex', flexDirection: 'column', height: '100%' },
    mainHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surface}66`, flexShrink: 0, },
    tabTitle: { margin: 0, color: theme.colors.primary, fontSize: '1.1rem' },
    addItemButton: { padding: '6px 12px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: theme.transitions.default, ':hover': {opacity: 0.9} },
    subTabContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surface}44`, flexShrink: 0, },
    subTabButton: { padding: '5px 12px', background: 'transparent', color: theme.colors.textSecondary, border: `1px solid ${theme.colors.surface}88`, borderRadius: '15px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.8rem', ':hover': { background: `${theme.colors.primary}22`, color: theme.colors.primary, borderColor: `${theme.colors.primary}55`, } },
    subTabButtonActive: { padding: '5px 12px', background: theme.colors.primary, color: theme.colors.background, border: `1px solid ${theme.colors.primary}`, borderRadius: '15px', cursor: 'default', transition: theme.transitions.default, fontSize: '0.8rem', fontWeight: 'bold', },
    // --- ИЗМЕНЕН СТИЛЬ inventoryGrid на inventoryList ---
    inventoryList: { // Был inventoryGrid
        display: 'flex', // Используем flex
        flexDirection: 'column', // Элементы в столбик
        gap: '10px', // Отступ между карточками
        flexGrow: 1, // Занимает оставшееся место
        overflowY: 'auto', // Добавляем прокрутку
        padding: '5px 10px 5px 5px', // Паддинг (справа больше для скроллбара)
        marginRight: '-10px', // Компенсация правого паддинга
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.colors.primary} ${theme.colors.surface}`
    },
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '30px', flexGrow: 1 },
    apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem', flexShrink: 0 },
};

export default CharacterInventoryTab;
