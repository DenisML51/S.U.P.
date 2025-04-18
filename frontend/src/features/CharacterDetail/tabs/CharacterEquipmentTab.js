// src/features/CharacterDetail/tabs/CharacterEquipmentTab.js
import React, { useState } from 'react'; // Добавили useState для hover эффекта
import EquippedItemDisplay from '../components/EquippedItemDisplay';
import { theme } from '../../../styles/theme';

// --- Иконки для слотов ---
const SlotIcon = ({ type }) => {
    // Сделаем иконку чуть крупнее и ярче
    const iconStyle = { width: '28px', height: '28px', fill: theme.colors.primary, marginRight: '12px', flexShrink: 0 };
    switch (type) {
        case 'armor':
             return <svg style={iconStyle} viewBox="0 0 24 24"><path d="M12,1A1,1,0,0,0,11,2V5.08A7,7,0,0,0,6,12v5a1,1,0,0,0,.25.66l3,2.84A1,1,0,0,0,10,21h4a1,1,0,0,0,.75-.3l3-2.84A1,1,0,0,0,18,17V12A7,7,0,0,0,13,5.08V2A1,1,0,0,0,12,1Zm4,11a5,5,0,0,1-8,0V12h8Z"/></svg>;
        case 'shield':
             return <svg style={iconStyle} viewBox="0 0 24 24"><path d="M12,1A10,10,0,0,0,2,11v3.54a1,1,0,0,0,.41.81l7,4.46A1,1,0,0,0,10,20h4a1,1,0,0,0,.59-.19l7-4.46A1,1,0,0,0,22,14.54V11A10,10,0,0,0,12,1Zm0,17.74L5.88,15.51,5,15.17V11a7,7,0,0,1,14,0v4.17l-.88.34Z"/></svg>;
        case 'weapon':
             return <svg style={iconStyle} viewBox="0 0 24 24"><path d="M21.71,5.29l-4-4a1,1,0,0,0-1.42,0l-12,12a1,1,0,0,0,0,1.42l4,4a1,1,0,0,0,1.42,0l12-12A1,1,0,0,0,21.71,5.29ZM11,18.59l-2-2L12.59,13,14,14.41ZM18.59,10,17,11.59l-4-4L14.59,6Zm-4-4L16,7.41,10.41,13,9,11.59Z"/></svg>;
        default: return <div style={{width: '28px', height: '28px', marginRight: '12px', flexShrink: 0}}></div>; // Пустышка для выравнивания
    }
};

// --- Новая иконка для снятия предмета ---
const UnequipIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        {/* Простая иконка "выхода" или "снятия" */}
        <path d="M16 13v-2h-5v-2h5V7l4 4-4 4zm-4-1H4v-2h8V8H4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3h-2v3z"/>
    </svg>
);


const CharacterEquipmentTab = ({ character, handleUnequip, apiActionError }) => {
    // Состояние для отслеживания наведения на слот
    const [hoveredSlot, setHoveredSlot] = useState(null);

    if (!character) return null;

    const equipmentSlots = [
        { key: 'armor', label: 'Броня', itemData: character.equipped_armor, iconType: 'armor' },
        { key: 'shield', label: 'Щит', itemData: character.equipped_shield, iconType: 'shield' },
        { key: 'weapon1', label: 'Оружие 1', itemData: character.equipped_weapon1, iconType: 'weapon' },
        { key: 'weapon2', label: 'Оружие 2', itemData: character.equipped_weapon2, iconType: 'weapon' }
    ];

     const relevantError = typeof apiActionError === 'string' && apiActionError && (apiActionError.includes('экипиров') || apiActionError.includes('снятия')) ? (
         <p style={styles.apiActionErrorStyle}>{apiActionError}</p>
     ) : null;


    return (
        <div style={styles.tabContent}>
            <h4 style={styles.tabHeaderNoBorder}>Экипировка</h4>
             {relevantError}
            <div style={styles.equipmentSlotsContainer}>
                {equipmentSlots.map(slot => {
                    const isHovered = hoveredSlot === slot.key;
                    return (
                        // Обертка для каждого слота
                        <div
                            key={slot.key}
                            style={{
                                ...styles.equipmentSlotWrapper,
                                // Применяем стили при наведении
                                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: isHovered ? theme.effects.shadow.replace('4px', '8px').replace('0.3', '0.5') : theme.effects.shadow, // Увеличиваем тень
                            }}
                            onMouseEnter={() => setHoveredSlot(slot.key)}
                            onMouseLeave={() => setHoveredSlot(null)}
                        >
                            {/* Заголовок слота с иконкой */}
                            <div style={styles.slotHeader}>
                                <SlotIcon type={slot.iconType} />
                                <span style={styles.slotLabel}>{slot.label}</span>
                                {/* Кнопка снятия теперь справа от заголовка */}
                                {slot.itemData && (
                                    <button
                                        onClick={() => handleUnequip(slot.key)}
                                        style={styles.unequipButtonHeader}
                                        title={`Снять ${slot.itemData?.item?.name}`}
                                    >
                                        <UnequipIcon /> {/* Используем новую иконку */}
                                    </button>
                                )}
                            </div>
                            {/* Карточка с предметом (или пустой слот) */}
                            <div style={{...styles.slotItemCard, background: slot.itemData ? styles.slotItemCard.background : styles.emptySlotBackground }}> {/* Разный фон для пустого */}
                                <EquippedItemDisplay itemData={slot.itemData} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Обновленные стили
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out' },
    tabHeaderNoBorder: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', color: theme.colors.primary, fontSize: '1.1rem', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surface}cc` },
    equipmentSlotsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '25px',
    },
    equipmentSlotWrapper: {
        background: theme.effects.glass,
        backdropFilter: 'blur(5px)',
        borderRadius: '12px',
        padding: '20px', // Увеличили паддинг
        boxShadow: theme.effects.shadow, // Базовая тень
        border: `1px solid ${theme.colors.surface}99`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out', // Плавный переход
        cursor: 'default', // Убираем курсор по умолчанию для обертки
    },
    slotHeader: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '15px',
        paddingBottom: '10px',
        borderBottom: `1px dashed ${theme.colors.surface}aa`,
    },
    slotLabel: {
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontSize: '1rem',
        flexGrow: 1,
    },
    slotItemCard: { // Контейнер для EquippedItemDisplay
        background: 'rgba(0,0,0,0.2)', // Фон для непустого слота
        borderRadius: '8px',
        padding: '5px',
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1, // Занимает доступное пространство по высоте
    },
    emptySlotBackground: 'rgba(0,0,0,0.1)', // Другой фон для пустого слота
    unequipButtonHeader: { // Кнопка снятия в заголовке
        background: theme.colors.surface, // Фон кнопки
        color: theme.colors.error, // Цвет иконки
        border: `1px solid ${theme.colors.surface}cc`,
        borderRadius: '6px', // Чуть менее круглый
        width: '30px', // Размер кнопки
        height: '30px',
        padding: '0',
        display: 'flex', // Центрируем иконку
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        opacity: 0.8, // Полупрозрачный
        transition: theme.transitions.default,
        marginLeft: '10px',
        flexShrink: 0,
        ':hover': { // Псевдокласс hover не работает в inline-стилях
            background: `${theme.colors.error}33`, // Фон при наведении
            opacity: 1,
            borderColor: theme.colors.error,
            boxShadow: `0 0 5px ${theme.colors.error}55` // Легкая тень
        }
    },
    apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' },
    // Стили для EquippedItemDisplay находятся в его файле
};

export default CharacterEquipmentTab;

