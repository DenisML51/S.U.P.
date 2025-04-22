// src/features/CharacterDetail/components/ItemCard.js
import React, { useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Убедитесь, что путь правильный
import * as apiService from '../../../api/apiService'; // Убедитесь, что путь правильный

// --- Вспомогательные Функции и Иконки ---

const getRarityColor = (rarity) => {
    // ... (код функции без изменений)
    switch (rarity?.toLowerCase()) {
        case 'необычная': return theme.colors.success || '#66BB6A';
        case 'редкая': return '#2196F3'; // Синий
        case 'очень редкая': return theme.colors.primary || '#BB86FC'; // Фиолетовый
        case 'экзотика': return theme.colors.warning || '#FFA726'; // Оранжевый
        case 'легендарная': return '#FF7043'; // Коралловый/Оранжево-красный
        case 'обычная':
        default: return theme.colors.textSecondary || 'grey';
    }
};


// Иконки для тегов
const WeightIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm-1-8h2v3h-2zm0-4h2v2h-2z"/></svg> );
const AmmoIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 8c0-1.93-1.57-3.5-3.5-3.5S9.5 6.07 9.5 8H5.75C5.34 8 5 8.34 5 8.75V10c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75V8.75c0-.41-.34-.75-.75-.75H16.5zm0 2H7.5V9.5h9V10zm-5.5 2h-1v1h1v-1zm2 0h-1v1h1v-1zm2 0h-1v1h1v-1zm2 0h-1v1h1v-1zm-1.25 3H8.75C8.34 15 8 15.34 8 15.75v.5C8 16.66 8.34 17 8.75 17h6.5c.41 0 .75-.34.75-.75v-.5c0-.41-.34-.75-.75-.75z"/></svg> );
const RangeIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg> );
const StrengthReqIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 12.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zM12 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-7.5-7C3.12 12 2 13.12 2 14.5S3.12 17 4.5 17s2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zM12 1C8.13 1 5 4.13 5 8c0 1.44.48 2.77 1.29 3.88L12 20l5.71-8.12C18.52 10.77 19 9.44 19 8c0-3.87-3.13-7-7-7z"/></svg> );
const StealthDisIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3 3z"/></svg> );
const HandIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 15.5c.28 0 .5.22.5.5s-.22.5-.5.5H6.83l.88.88c.2.2.2.51 0 .71-.2.2-.51.2-.71 0l-1.75-1.75c-.2-.2-.2-.51 0-.71l1.75-1.75c.2-.2.51-.2.71 0 .2.2.2.51 0 .71l-.88.88h3.67zm3-9c.28 0 .5.22.5.5s-.22.5-.5.5h-3.67l.88.88c.2.2.2.51 0 .71-.2.2-.51.2-.71 0L8.21 9.35c-.2-.2-.2-.51 0-.71l1.75-1.75c.2-.2.51-.2.71 0 .2.2.2.51 0 .71l-.88.88h3.67zm6.5.5c0-3.31-2.69-6-6-6s-6 2.69-6 6v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7zm-2 10H8V7c0-2.21 1.79-4 4-4s4 1.79 4 4v10z"/></svg> );
const UsesIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M17 4h-3V2h-4v2H7c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 17H7V6h10v15z"/><path d="M9 11h6v2H9zm0 4h6v2H9z"/></svg> );
const StackIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-8h14V7H7v2z"/></svg> );

// Иконки для основных статов
const DamageIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M19.78 2.22a.75.75 0 0 0-1.06 0l-2.22 2.22-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41L4 15.06V19a1 1 0 0 0 1 1h3.94l10.84-10.84L19.78 3.28a.75.75 0 0 0 0-1.06zM8.5 18H6v-2.5l7.37-7.37 2.5 2.5L8.5 18z"/></svg> );
const ACIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg> );
const EffectIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M18 14.45V11c0-1.66-1.34-3-3-3 .35-.6.5-1.28.5-2 0-2.21-1.79-4-4-4S7.5 3.79 7.5 6c0 .72.15 1.4.5 2-1.66 0-3 1.34-3 3v3.45c-1.17.69-2 1.97-2 3.43V20h5v-2H6v-2.12c0-1.09.6-2.06 1.5-2.55V11c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v2.76c1.17.69 2 1.97 2 3.43V20h5v-2h-2v-2.12c0-1.46-.83-2.74-2-3.43zm-6-7c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/></svg> );
const FormulaIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.5L9 6 6 9 1.6 4.7C.7 7.1 1.1 10.1 3.1 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.4-.4.4-1.1 0-1.4z"/></svg> );

// Иконки для кнопок действий
const EquipIcon = () => ( <svg style={styles.actionIcon} viewBox="0 0 24 24"><path d="M10.94 2.94A1.5 1.5 0 0 0 9.5 4.06V11H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5.5v6.94a1.5 1.5 0 0 0 2.12 1.32l10-5a1.5 1.5 0 0 0 0-2.64l-10-5a1.5 1.5 0 0 0-1.18-.1z"/></svg> );
const UnequipIcon = () => ( <svg style={styles.actionIcon} viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.22-1.05-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg> );
const UseIcon = () => ( <svg style={styles.actionIcon} viewBox="0 0 24 24"><path d="M11 20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-3H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3h8a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-8v6zm0-12h8V8h-8v4zM7 8v8h2v-8H7z"/></svg> );
const DropIcon = () => ( <svg style={styles.actionIcon} viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> );

// Иконка статуса "Экипировано"
const EquippedStatusIcon = () => (
    <svg style={styles.equippedIcon} viewBox="0 0 24 24">
        <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
    </svg>
);

// Карта для отображения русских названий типов
const ITEM_TYPES_MAP = {
    weapon: 'Оружие', armor: 'Броня', shield: 'Щиты',
    general: 'Общее', ammo: 'Патроны'
};

// --- Основной Компонент ---
const ItemCard = ({
    character,
    invItem,
    onEquip,
    onDrop,
    onUnequip,
    handleApiAction
}) => {

    // !! ИСПРАВЛЕНИЕ: Вызываем хуки ДО раннего возврата !!
    const equippedSlot = useMemo(() => {
        // Добавим проверку на существование invItem и character прямо здесь
        if (!invItem || !character) return null;
        const inventoryItemId = invItem.id;
        if (character.equipped_armor?.id === inventoryItemId) return 'armor';
        if (character.equipped_shield?.id === inventoryItemId) return 'shield';
        if (character.equipped_weapon1?.id === inventoryItemId) return 'weapon1';
        if (character.equipped_weapon2?.id === inventoryItemId) return 'weapon2';
        return null;
    }, [character, invItem]);

    // !! КОНЕЦ ИСПРАВЛЕНИЯ !!

    // Ранний выход, если нет данных
    if (!invItem || !invItem.item) return null;
    const { item, quantity, id: inventoryItemId } = invItem;

    // Флаги состояния
    const isEquippable = ['weapon', 'armor', 'shield'].includes(item.item_type);
    const isEquipped = equippedSlot !== null;
    const isActivatable = item.item_type === 'general' && !!item.effect_dice_formula;

    // Получение цвета редкости
    const rarityColor = getRarityColor(item.rarity);

    // Динамические стили карточки
    const cardStyle = {
        ...styles.itemCardBase,
        borderLeftColor: rarityColor, // Рамка редкости
        ...(isEquipped ? styles.itemCardEquipped : {}), // Стиль для экипированного
    };

    // Обработчики действий (без изменений в логике)
     const handleEquipToggleClick = (e) => {
        e.stopPropagation();
        if (isEquipped) {
            if (onUnequip && equippedSlot) onUnequip(equippedSlot);
        } else if (isEquippable) {
            if (onEquip) {
                let targetSlot = item.item_type;
                if (item.item_type === 'weapon') {
                    targetSlot = !character?.equipped_weapon1 ? 'weapon1' : (!character?.equipped_weapon2 ? 'weapon2' : 'weapon1');
                }
                onEquip(inventoryItemId, targetSlot);
            }
        }
    };
    const handleDropClick = (e) => {
        e.stopPropagation();
        if(onDrop) {
             let quantityToDrop = 1;
             if (quantity > 1) {
                 const input = prompt(`Сколько "${item.name}" выбросить? (Максимум ${quantity})`, '1');
                 const num = parseInt(input, 10);
                 if (input === null) return;
                 if (!isNaN(num) && num > 0 && num <= quantity) {
                     quantityToDrop = num;
                 } else if (!isNaN(num) && num > quantity) {
                    alert(`Нельзя выбросить больше, чем есть (${quantity}). Будет выброшено ${quantity}.`);
                    quantityToDrop = quantity;
                 } else {
                    alert("Некорректное количество. Будет выброшен 1 предмет.");
                    quantityToDrop = 1;
                 }
             }
             onDrop(inventoryItemId, quantityToDrop);
        }
    };
    const handleActivateClick = (e) => {
        e.stopPropagation();
        if (!handleApiAction || !isActivatable) return;
        const activationData = {
            activation_type: 'item',
            target_id: inventoryItemId,
        };
        handleApiAction(
            apiService.activateAction(character.id, activationData),
            `Предмет '${item.name}' использован`,
            `Ошибка использования предмета '${item.name}'`
        );
    };

    // --- Данные для тегов и деталей (без изменений) ---
    const strengthRequirement = item?.strength_requirement ?? 0;
    const stealthDisadvantage = item?.stealth_disadvantage ?? false;
    const baseItemWeight = item?.weight;
    const weaponAmmo = item.item_type === 'weapon' ? item.required_ammo_type : null;
    const weaponRange = item.item_type === 'weapon' && item.range_normal !== null
        ? `${item.range_normal}/${item.range_max ?? item.range_normal}м`
        : null;
    const isTwoHanded = item.item_type === 'weapon' ? item.is_two_handed : null;
    const maxUses = item.item_type === 'general' && item.uses !== null && item.uses !== undefined ? item.uses : null;
    const isStackable = item.item_type === 'ammo' || (item.item_type === 'general' && maxUses === null);
    const showQuantityTag = isStackable && quantity > 1;
    const showUsesTag = item.item_type === 'general' && maxUses !== null;
    const displayWeight = (baseItemWeight !== null && baseItemWeight !== undefined)
        ? (isStackable ? (baseItemWeight * quantity) : baseItemWeight)
        : null;
    const formattedWeight = displayWeight !== null ? displayWeight.toFixed(1) : null;
    const usesTagValue = (item.item_type === 'general' && maxUses !== null) ? quantity : null; // Показываем ТЕКУЩЕЕ количество зарядов
    const usesTagTitle = "Осталось зарядов/использований";
    const hasTags = weaponAmmo || weaponRange || isTwoHanded !== null || formattedWeight !== null || strengthRequirement > 0 || stealthDisadvantage || showUsesTag || showQuantityTag;


    return (
        <div style={cardStyle} title={item.description || item.name} className="item-card">

             {/* Индикатор экипировки */}
             {isEquipped && (
                <div style={styles.equippedIndicator} title={`Экипировано: ${equippedSlot}`}>
                    <EquippedStatusIcon />
                </div>
             )}

            {/* Центральная часть: Статы и Теги */}
            <div style={styles.centerSection}>
                <div>
                    <span style={styles.itemName}>
                        {item.name}
                            <EquippedStatusIcon />
                    </span>
                </div>
                {/* Основные детали */}
                <div style={styles.mainDetailContainer}>
                    {item.item_type === 'weapon' && item.damage && (
                        <div style={styles.mainDetailWrapper}><DamageIcon/> <span style={styles.mainDetailText}> <span
                            style={styles.mainValue}>{item.damage}</span> ({item.damage_type}) </span></div>)}
                    {item.item_type === 'armor' && typeof item.ac_bonus === 'number' && (
                        <div style={styles.mainDetailWrapper}><ACIcon/> <span style={styles.mainDetailText}> AC <span
                            style={styles.mainValue}>{item.ac_bonus}</span> {item.max_dex_bonus !== null ? `[Лвк+${item.max_dex_bonus}]` : ''} </span>
                        </div>)}
                    {item.item_type === 'shield' && typeof item.ac_bonus === 'number' && (
                        <div style={styles.mainDetailWrapper}><ACIcon/> <span style={styles.mainDetailText}> AC <span
                            style={styles.mainValue}>+{item.ac_bonus}</span> </span></div>)}
                    {item.item_type === 'general' && item.effect && !item.effect_dice_formula && (
                        <div style={styles.mainDetailWrapper}><EffectIcon/> <span style={styles.mainDetailText}
                                                                                  title={item.effect}> {item.effect.length > 40 ? item.effect.substring(0, 37) + '...' : item.effect} </span>
                        </div>)}
                    {item.item_type === 'ammo' && item.ammo_type && (
                        <div style={styles.mainDetailWrapper}><span style={styles.mainDetailText}> Тип: <span
                            style={styles.mainValue}>{item.ammo_type}</span> </span></div>)}
                    {item.effect_dice_formula && (<div style={styles.mainDetailWrapper}><FormulaIcon/> <span
                        style={styles.mainDetailText}> Формула: <span
                        style={styles.mainValue}>{item.effect_dice_formula}</span> </span></div>)}
                </div>

                {/* Теги */}
                {hasTags && (
                    <div style={styles.tagsContainer}>
                        {weaponAmmo && (<span style={styles.detailTag}
                                              title={`Патроны: ${weaponAmmo}`}> {weaponAmmo.substring(0, 10)}{weaponAmmo.length > 10 ? '...' : ''} </span>)}
                        {weaponRange && (
                            <span style={styles.detailTag} title="Дальность"> <RangeIcon/> {weaponRange} </span>)}
                        {isTwoHanded !== null && (<span style={styles.detailTag}
                                                        title={isTwoHanded ? "Двуручное" : "Одноручное"}> <HandIcon/> {isTwoHanded ? "2H" : "1H"} </span>)}
                        {showUsesTag && usesTagValue !== null && (
                            <span style={styles.detailTag} title={usesTagTitle}> <UsesIcon/> {usesTagValue} </span>)}
                        {showQuantityTag && (
                            <span style={styles.detailTag} title="Количество"> <StackIcon/> x{quantity} </span>)}
                        {formattedWeight !== null && (<span style={styles.detailTag}
                                                            title="Общий вес"> <WeightIcon/> {formattedWeight}кг </span>)}
                        {strengthRequirement > 0 && (<span style={{...styles.detailTag, ...styles.requirementTag}}
                                                           title={`Сила: ${strengthRequirement}`}> <StrengthReqIcon/> {strengthRequirement} </span>)}
                        {stealthDisadvantage === true && (<span style={{...styles.detailTag, ...styles.requirementTag}}
                                                                title="Помеха Скрытности"> <StealthDisIcon/> Помеха </span>)}
                    </div>
                )}
            </div>

            {/* Правая часть: Кнопки действий */}
            <div style={styles.actionsContainer}>
                 {isActivatable && handleApiAction && (
                    <button onClick={handleActivateClick} style={styles.actionButton} className="action-button use-button" title="Использовать">
                        <UseIcon />
                    </button>
                 )}
                 {isEquippable && (onEquip || onUnequip) && (
                    <button onClick={handleEquipToggleClick} style={styles.actionButton} className={`action-button ${isEquipped ? 'unequip-button' : 'equip-button'}`} title={isEquipped ? 'Снять' : 'Экипировать'}>
                        {isEquipped ? <UnequipIcon /> : <EquipIcon />}
                    </button>
                 )}
                 {onDrop && (
                     <button onClick={handleDropClick} style={styles.actionButton} className="action-button drop-button" title="Выбросить">
                         <DropIcon />
                     </button>
                 )}
            </div>

            {/* CSS для hover эффектов кнопок */}
            <style>{`
                /* ... CSS из предыдущего ответа для hover кнопок ... */
                .item-card .actions-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 5px;
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    bottom: 5px;
                    padding-left: 5px;
                }
                .item-card .action-button {
                    opacity: 0;
                    transform: scale(0.8);
                    transition: opacity 0.15s ease-out, transform 0.15s ease-out;
                    pointer-events: none;
                    flex-shrink: 0;
                }
                .item-card:hover .action-button {
                    opacity: 0.7;
                    transform: scale(1);
                    pointer-events: auto;
                }
                .item-card .action-button:hover {
                    opacity: 1;
                    transform: scale(1.05);
                    &.equip-button { background-color: ${theme.colors.success || '#66BB6A'}; color: #fff; }
                    &.unequip-button { background-color: ${theme.colors.warning || '#FFA726'}; color: #000; }
                    &.use-button { background-color: ${theme.colors.secondary}; color: ${theme.colors.background}; }
                    &.drop-button { background-color: ${theme.colors.error}; color: #fff; }
                }
            `}</style>
        </div>
    );
};

// --- Стили ---
const styles = {
    itemCardBase: {
        backgroundColor: theme.colors.surface + 'cc',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: theme.effects.shadowSmall,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'all 0.2s ease-out',
        border: `1px solid ${theme.colors.surfaceVariant}`,
        borderLeft: '4px solid grey',
        position: 'relative',
        overflow: 'visible',
        minHeight: '70px',
    },
    itemCardEquipped: {
        borderColor: theme.colors.secondary,
        borderWidth: '1px',
        borderLeftWidth: '4px',
        boxShadow: `0 0 8px ${theme.colors.secondary}33`,
    },
    equippedIndicator: {
        position: 'flex',
        top: '4px',
        // left: '-1px', // Слегка налезает на рамку
        width: '18px',
        height: '18px',
        backgroundColor: theme.colors.secondary + 'dd',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // zIndex: 2,
        border: `1px solid ${theme.colors.surface}`,
    },
    equippedIcon: {
        width: '10px',
        height: '10px',
        fill: theme.colors.background,
    },
    leftSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        flexShrink: 0,
        width: '55px',
        textAlign: 'center',
    },
    typeIconContainer: {
        width: '34px',
        height: '34px',
        borderRadius: '6px',
        backgroundColor: theme.colors.surface,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${theme.colors.surfaceVariant}`,
    },
    typeIcon: {
        width: '20px',
        height: '20px',
        fill: theme.colors.textSecondary,
    },
    itemName: {
        fontWeight: '600',
        color: theme.colors.text,
        fontSize: '0.9rem',
        lineHeight: 1.2,
        width: '100%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginTop: '2px',
    },
    centerSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        flexGrow: 1,
        overflow: 'hidden',
        minWidth: 0,
        paddingRight: '35px', // Добавляем отступ справа, чтобы кнопки не накладывались
    },
    mainDetailContainer: {
       display: 'flex',
       alignItems: 'center',
       gap: '6px',
       minHeight: '20px',
       whiteSpace: 'nowrap',
       overflow: 'hidden',
       textOverflow: 'ellipsis',
    },
    mainDetailIcon: {
        width: '14px',
        height: '14px',
        fill: theme.colors.textSecondary,
        flexShrink: 0,
        opacity: 0.8,
    },
    mainDetailText: {
        fontSize: '0.85rem',
        color: theme.colors.text,
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    mainValue: {
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginLeft: '4px',
    },
    tagsContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 5px',
        alignItems: 'center',
        maxHeight: '22px',
        overflow: 'hidden',
    },
    detailTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        fontSize: '0.7rem',
        background: 'rgba(255,255,255,0.06)',
        color: theme.colors.textSecondary,
        padding: '2px 7px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    detailTagIcon: {
        width: '10px',
        height: '10px',
        fill: 'currentColor',
        flexShrink: 0,
        opacity: 0.7,
    },
    requirementTag: {
        color: theme.colors.warning,
        borderColor: `${theme.colors.warning}44`,
        background: `${theme.colors.warning}11`,
    },
    actionsContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        flexShrink: 0,
        width: '30px', // Ширина контейнера под кнопки
        position: 'absolute', // Абсолютное позиционирование
        top: '0',
        right: '5px', // Отступ справа
        bottom: '0',
    },
    actionButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        padding: '0',
        borderRadius: '50%',
        border: '1px solid transparent',
        background: theme.colors.surface + 'bb',
        color: theme.colors.textSecondary,
        cursor: 'pointer',
        // transition управляется через CSS
        // opacity и transform управляются через CSS
    },
    actionIcon: {
        width: '15px',
        height: '15px',
        fill: 'currentColor',
    },
};

export default ItemCard;