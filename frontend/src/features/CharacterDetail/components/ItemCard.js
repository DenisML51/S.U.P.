// src/features/CharacterDetail/components/ItemCard.js
import React, { useMemo } from 'react';
import { theme } from '../../../styles/theme';
// <<< ИЗМЕНЕНИЕ НАЧАЛО: Импортируем apiService для вызова activateAction >>>
import * as apiService from '../../../api/apiService';
// <<< ИЗМЕНЕНИЕ КОНЕЦ >>>

// --- Вспомогательные Функции ---

// Функция для получения цвета по редкости
const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
        case 'необычная': return theme.colors.success || '#66BB6A';
        case 'редкая': return '#2196F3';
        case 'очень редкая': return theme.colors.primary || '#BB86FC';
        case 'экзотика': return theme.colors.warning || '#FFA726';
        case 'обычная':
        default: return theme.colors.textSecondary || 'grey';
    }
};

// Функция для получения цвета по типу предмета
const getTypeColor = (itemType) => {
     switch (itemType) {
        case 'weapon': return theme.colors.error || '#CF6679';
        case 'armor': return '#64B5F6';
        case 'shield': return '#81C784';
        case 'general': return theme.colors.primary || '#BB86FC';
        case 'ammo': return theme.colors.warning || '#FFA726';
        default: return theme.colors.textSecondary;
    }
};

// Русские названия типов
const ITEM_TYPES = {
    all: 'Все',
    weapon: 'Оружие',
    armor: 'Броня',
    shield: 'Щиты',
    general: 'Общее',
    ammo: 'Патроны'
};

// --- Основной Компонент ---

const ItemCard = ({
    character,
    invItem,
    onEquip,
    onDrop,
    onUnequip,
    handleApiAction // Принимаем общий обработчик API вместо onUse
}) => {

    // Определяем, экипирован ли данный предмет и в каком слоте
    const equippedSlot = useMemo(() => {
        if (!invItem || !character) return null;
        const inventoryItemId = invItem.id;
        if (character.equipped_armor?.id === inventoryItemId) return 'armor';
        if (character.equipped_shield?.id === inventoryItemId) return 'shield';
        if (character.equipped_weapon1?.id === inventoryItemId) return 'weapon1';
        if (character.equipped_weapon2?.id === inventoryItemId) return 'weapon2';
        return null;
    }, [character, invItem]);

    // Ранний выход, если нет данных
    if (!invItem || !invItem.item) return null;

    const { item, quantity, id: inventoryItemId } = invItem; // Деструктурируем данные

    // Определяем флаги для отображения кнопок и логики
    const isEquippable = ['weapon', 'armor', 'shield'].includes(item.item_type);
    const isEquipped = equippedSlot !== null;
    const isMedicalItem = item.category === 'Медицина'; // Для отображения зарядов

    // <<< ИЗМЕНЕНИЕ НАЧАЛО: Определяем, можно ли активировать предмет >>>
    // Активируем, если это GeneralItem и у него есть формула эффекта
    console.log("Checking activatable:", item.name, item.item_type, item.effect_dice_formula);
    const isActivatable = item.item_type === 'general' && !!item.effect_dice_formula;
    // <<< ИЗМЕНЕНИЕ КОНЕЦ >>>

    // Получаем цвета для стилизации
    const rarityColor = getRarityColor(item.rarity);
    const typeColor = getTypeColor(item.item_type);

    // Определяем стиль карточки (подсветка, если экипировано)
    const cardStyle = {
        ...styles.itemCard,
        borderLeftColor: rarityColor,
        backgroundColor: isEquipped ? `${theme.colors.secondary}1A` : styles.itemCard.backgroundColor,
    };

    // --- Обработчики Действий ---

    // Экипировка/Снятие (логика немного упрощена для ясности)
    const handleEquipToggleClick = () => {
        if (isEquipped) {
            if (onUnequip && equippedSlot) onUnequip(equippedSlot);
        } else if (isEquippable) {
            if (onEquip) {
                // Простая логика выбора слота для оружия
                let targetSlot = item.item_type;
                if (item.item_type === 'weapon') {
                    targetSlot = !character?.equipped_weapon1 ? 'weapon1' : (!character?.equipped_weapon2 ? 'weapon2' : 'weapon1');
                }
                onEquip(inventoryItemId, targetSlot);
            }
        }
    };

    // Выбросить предмет
    const handleDropClick = () => {
        if(onDrop) {
            // Добавляем подтверждение перед удалением
            if (window.confirm(`Вы уверены, что хотите выбросить ${item.name}?`)) {
                 onDrop(inventoryItemId);
            }
        }
    };

    // <<< ИЗМЕНЕНИЕ НАЧАЛО: Обработчик для кнопки "Использовать/Активировать" >>>
    const handleActivateClick = () => {
        // Проверяем, передан ли обработчик и можно ли активировать предмет
        if (!handleApiAction || !isActivatable) return;

        // Формируем данные для запроса активации на бэкенд
        const activationData = {
            activation_type: 'item',      // Указываем, что активируем предмет
            target_id: inventoryItemId, // Передаем ID записи инвентаря
            // target_entities: [] // Пока не реализуем выбор целей
        };

        // Вызываем общий обработчик API, переданный из props
        // Он выполнит вызов apiService.activateAction и обработает результат/ошибку
        handleApiAction(
            apiService.activateAction(character.id, activationData), // Промис API вызова
            `Предмет '${item.name}' использован`, // Сообщение при успехе (бэкенд может вернуть более детальное)
            `Ошибка использования предмета '${item.name}'` // Префикс для сообщения об ошибке
        );
    };
    // <<< ИЗМЕНЕНИЕ КОНЕЦ >>>

    // Получаем требования предмета для отображения
    const strengthRequirement = item?.strength_requirement ?? 0;
    const stealthDisadvantage = item?.stealth_disadvantage ?? false;

    // --- Рендеринг Карточки ---
    return (
        <div style={cardStyle} title={item.description || item.name}>
            {/* Заголовок: Имя, Количество, Тип, Категория/Редкость */}
            <div style={styles.itemCardHeader}>
                <div style={styles.headerLeft}>
                     <span style={styles.itemName}>
                         {item.name}
                         {/* Показываем количество только если > 1 И предмет не мед. И не экипирован */}
                         {!isMedicalItem && !isEquipped && quantity > 1 && ` (x${quantity})`}
                     </span>
                     <span style={{...styles.itemTypeBadge, backgroundColor: `${typeColor}33`, color: typeColor, borderColor: `${typeColor}88`}}>
                         {ITEM_TYPES[item.item_type] || item.item_type}
                     </span>
                </div>
                 <span style={styles.itemCategory}>[{item.category} / {item.rarity}]</span>
            </div>

            {/* Детали: Урон/AC, Заряды/Эффект, Требования */}
            <div style={styles.detailsContainer}>
                {/* Детали для Оружия */}
                {item.item_type === 'weapon' && <span style={styles.itemDetails}>Урон: {item.damage} ({item.damage_type}) {item.is_two_handed ? '[Двуруч.]' : ''}</span>}
                {/* Детали для Брони */}
                {item.item_type === 'armor' && <span style={styles.itemDetails}>AC: {item.ac_bonus} ({item.armor_type}) {item.max_dex_bonus !== null ? `[Ловк. макс +${item.max_dex_bonus}]` : ''}</span>}
                {/* Детали для Щита */}
                {item.item_type === 'shield' && <span style={styles.itemDetails}>Бонус AC: +{item.ac_bonus}</span>}
                {/* Детали для Медицины (Заряды) */}
                {isMedicalItem && <span style={styles.itemDetails}>Заряды: {quantity}</span>}
                {/* Детали для Общих предметов (Исп./Эффект) */}
                {item.item_type === 'general' && !isMedicalItem && item.uses && <span style={styles.itemDetails}>Исп.: {item.uses}</span>}
                {item.item_type === 'general' && !isMedicalItem && item.effect && <span style={styles.itemDetails}>Эффект: {item.effect}</span>}
                {/* Детали для Патронов */}
                {item.item_type === 'ammo' && item.ammo_type && <span style={styles.itemDetails}>Тип: {item.ammo_type}</span>}
                {item.item_type === 'ammo' && item.effect && <span style={styles.itemDetails}>Эффект: {item.effect}</span>}

                {/* Отображение формулы эффекта, если она есть */}
                {item.effect_dice_formula && <span style={styles.itemDetails}>Формула: {item.effect_dice_formula}</span>}

                {/* Требования */}
                {strengthRequirement > 0 && <span style={styles.itemRequirement}>Треб. Силы: {strengthRequirement}</span>}
                {stealthDisadvantage === true && <span style={styles.itemRequirement}>Помеха Скрытности</span>}
            </div>

            {/* Кнопки Действий */}
            <div style={styles.itemCardActions}>
                 {/* Кнопка "Использовать" (теперь вызывает activateAction) */}
                 {isActivatable && handleApiAction && (
                      <button onClick={handleActivateClick} style={{...styles.actionButton, ...styles.useButton}}>Исп.</button>
                 )}
                 {/* Кнопка "Экипировать"/"Снять" */}
                 {isEquippable && (onEquip || onUnequip) && (
                     <button onClick={handleEquipToggleClick} style={styles.actionButton}>
                         {isEquipped ? 'Снять' : 'Экип.'}
                     </button>
                 )}
                 {/* Кнопка "Выбросить" */}
                 {onDrop && <button onClick={handleDropClick} style={{...styles.actionButton, ...styles.dropButton}}>Выбр.</button>}
            </div>
        </div>
    );
};

// --- Стили ---
// Используем компактные стили из предыдущих итераций
const styles = {
    itemCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: '6px',
        padding: '8px 12px',
        boxShadow: theme.effects.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        transition: theme.transitions.default,
        borderLeft: '4px solid grey', // Цвет рамки определяется редкостью
        position: 'relative',
    },
    itemCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: `1px dashed ${theme.colors.surface}66`,
        paddingBottom: '4px',
        marginBottom: '4px',
        gap: '8px',
    },
    headerLeft: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '3px',
        overflow: 'hidden',
        marginRight: '5px',
    },
    itemName: {
        fontWeight: 'bold',
        color: theme.colors.primary,
        wordBreak: 'break-word',
        fontSize: '0.9rem',
        lineHeight: 1.2,
    },
    itemTypeBadge: {
        fontSize: '0.65rem',
        padding: '1px 5px',
        borderRadius: '4px',
        border: '1px solid', // Цвет рамки определяется типом
        fontWeight: '500',
        textTransform: 'uppercase',
        display: 'inline-block',
    },
    itemCategory: {
        fontSize: '0.7rem',
        color: theme.colors.textSecondary,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        textAlign: 'right',
        paddingTop: '1px',
    },
    detailsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        marginTop: '2px',
    },
    itemDetails: {
        fontSize: '0.75rem',
        color: theme.colors.textSecondary,
        margin: '0',
        fontStyle: 'italic',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    itemRequirement: {
        fontSize: '0.7rem',
        color: theme.colors.warning || theme.colors.error,
        margin: '0',
        fontStyle: 'italic',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
    },
    itemCardActions: {
        display: 'flex',
        gap: '6px',
        marginTop: '6px',
        paddingTop: '6px',
        justifyContent: 'flex-end',
        borderTop: `1px solid ${theme.colors.surface}44`
    },
    actionButton: {
        padding: '3px 8px',
        fontSize: '0.75rem',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        transition: theme.transitions.default,
        whiteSpace: 'nowrap',
        background: theme.colors.textSecondary,
        color: theme.colors.background
    },
    useButton: { // Стиль для кнопки "Исп."
        background: theme.colors.secondary,
        color: theme.colors.background
    },
    dropButton: { // Стиль для кнопки "Выбр."
        background: theme.colors.error,
        color: theme.colors.text
    },
};

export default ItemCard;