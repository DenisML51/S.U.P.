// src/features/CharacterDetail/components/ItemCard.js
import React, { useMemo } from 'react';
import { theme } from '../../../styles/theme';
import * as apiService from '../../../api/apiService';

// --- Вспомогательные Функции и Иконки ---
const getRarityColor = (rarity) => {
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

const getTypeColor = (itemType) => {
     switch (itemType) {
        case 'weapon': return theme.colors.error || '#CF6679';
        case 'armor': return '#64B5F6'; // Голубой
        case 'shield': return '#81C784'; // Зеленый
        case 'general': return theme.colors.primary || '#BB86FC';
        case 'ammo': return theme.colors.warning || '#FFA726';
        default: return theme.colors.textSecondary;
    }
};

const ITEM_TYPES = {
    all: 'Все',
    weapon: 'Оружие',
    armor: 'Броня',
    shield: 'Щиты',
    general: 'Общее',
    ammo: 'Патроны'
};

// --- Иконки для деталей ---
const WeightIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm-1-8h2v3h-2zm0-4h2v2h-2z"/></svg> );
const AmmoIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 8c0-1.93-1.57-3.5-3.5-3.5S9.5 6.07 9.5 8H5.75C5.34 8 5 8.34 5 8.75V10c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75V8.75c0-.41-.34-.75-.75-.75H16.5zm0 2H7.5V9.5h9V10zm-5.5 2h-1v1h1v-1zm2 0h-1v1h1v-1zm2 0h-1v1h1v-1zm2 0h-1v1h1v-1zm-1.25 3H8.75C8.34 15 8 15.34 8 15.75v.5C8 16.66 8.34 17 8.75 17h6.5c.41 0 .75-.34.75-.75v-.5c0-.41-.34-.75-.75-.75z"/></svg> );
const RangeIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg> );
const StrengthReqIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 12.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zM12 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-7.5-7C3.12 12 2 13.12 2 14.5S3.12 17 4.5 17s2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zM12 1C8.13 1 5 4.13 5 8c0 1.44.48 2.77 1.29 3.88L12 20l5.71-8.12C18.52 10.77 19 9.44 19 8c0-3.87-3.13-7-7-7z"/></svg> );
const StealthDisIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3 3z"/></svg> );
const HandIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 15.5c.28 0 .5.22.5.5s-.22.5-.5.5H6.83l.88.88c.2.2.2.51 0 .71-.2.2-.51.2-.71 0l-1.75-1.75c-.2-.2-.2-.51 0-.71l1.75-1.75c.2-.2.51-.2.71 0 .2.2.2.51 0 .71l-.88.88h3.67zm3-9c.28 0 .5.22.5.5s-.22.5-.5.5h-3.67l.88.88c.2.2.2.51 0 .71-.2.2-.51.2-.71 0L8.21 9.35c-.2-.2-.2-.51 0-.71l1.75-1.75c.2-.2.51-.2.71 0 .2.2.2.51 0 .71l-.88.88h3.67zm6.5.5c0-3.31-2.69-6-6-6s-6 2.69-6 6v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7zm-2 10H8V7c0-2.21 1.79-4 4-4s4 1.79 4 4v10z"/></svg> );
const UsesIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M17 4h-3V2h-4v2H7c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 17H7V6h10v15z"/><path d="M9 11h6v2H9zm0 4h6v2H9z"/></svg> );
const StackIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-8h14V7H7v2z"/></svg> );

// --- Иконки для кнопок ---
const EquipIcon = () => ( <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zm0-14v4h12V5H9z"/></svg> );
const UnequipIcon = () => ( <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M15 16h4v2h-4v-2zm0-8h7v2h-7V8zm0 4h6v2h-6v-2zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12V5z"/></svg> );
const DropIcon = () => ( <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> );

// --- НОВЫЕ ИКОНКИ для Основных Деталей ---
const DamageIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M19.78 2.22a.75.75 0 0 0-1.06 0l-2.22 2.22-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41L4 15.06V19a1 1 0 0 0 1 1h3.94l10.84-10.84L19.78 3.28a.75.75 0 0 0 0-1.06zM8.5 18H6v-2.5l7.37-7.37 2.5 2.5L8.5 18z"/></svg> );
const ACIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg> );
const EffectIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M18 14.45V11c0-1.66-1.34-3-3-3 .35-.6.5-1.28.5-2 0-2.21-1.79-4-4-4S7.5 3.79 7.5 6c0 .72.15 1.4.5 2-1.66 0-3 1.34-3 3v3.45c-1.17.69-2 1.97-2 3.43V20h5v-2H6v-2.12c0-1.09.6-2.06 1.5-2.55V11c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v2.76c1.17.69 2 1.97 2 3.43V20h5v-2h-2v-2.12c0-1.46-.83-2.74-2-3.43zm-6-7c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/></svg> );
const FormulaIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.5L9 6 6 9 1.6 4.7C.7 7.1 1.1 10.1 3.1 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.4-.4.4-1.1 0-1.4z"/></svg> );
const AmmoTypeIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.01L3 11v2h18zM3 16h18v2H3zM21 6H3v2.01L21 8z"/></svg> );

// --- Основной Компонент ---
const ItemCard = ({
    character,
    invItem,
    onEquip,
    onDrop,
    onUnequip,
    handleApiAction
}) => {
    // ... (useMemo for equippedSlot, early return, destructuring - без изменений) ...
    const equippedSlot = useMemo(() => {
        if (!invItem || !character) return null;
        const inventoryItemId = invItem.id;
        if (character.equipped_armor?.id === inventoryItemId) return 'armor';
        if (character.equipped_shield?.id === inventoryItemId) return 'shield';
        if (character.equipped_weapon1?.id === inventoryItemId) return 'weapon1';
        if (character.equipped_weapon2?.id === inventoryItemId) return 'weapon2';
        return null;
    }, [character, invItem]);

    if (!invItem || !invItem.item) return null;
    const { item, quantity, id: inventoryItemId } = invItem;

    const isEquippable = ['weapon', 'armor', 'shield'].includes(item.item_type);
    const isEquipped = equippedSlot !== null;
    const isMedicalItem = item.category === 'Медицина';
    const isActivatable = item.item_type === 'general' && !!item.effect_dice_formula;

    const rarityColor = getRarityColor(item.rarity);
    const typeColor = getTypeColor(item.item_type);

    const cardStyle = {
        ...styles.itemCard,
        borderLeftColor: rarityColor,
        backgroundColor: isEquipped ? `${theme.colors.secondary}1A` : styles.itemCard.backgroundColor,
    };

    // ... (event handlers: handleEquipToggleClick, handleDropClick, handleActivateClick - без изменений) ...
     const handleEquipToggleClick = () => {
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
    const handleDropClick = () => {
        if(onDrop) {
            if (window.confirm(`Вы уверены, что хотите выбросить ${item.name}?`)) {
                 onDrop(inventoryItemId);
            }
        }
    };
    const handleActivateClick = () => {
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

    // --- Извлекаем данные для отображения ---
    const strengthRequirement = item?.strength_requirement ?? 0;
    const stealthDisadvantage = item?.stealth_disadvantage ?? false;
    const baseItemWeight = item?.weight; // Базовый вес 1 шт.
    const weaponAmmo = item.item_type === 'weapon' ? item.required_ammo_type : null;
    const weaponRange = item.item_type === 'weapon' && item.range_normal !== null
        ? `${item.range_normal}/${item.range_max ?? item.range_normal}м`
        : null;
    const isTwoHanded = item.item_type === 'weapon' ? item.is_two_handed : null;
    const maxUses = item.item_type === 'general' && item.uses !== null && item.uses !== undefined ? item.uses : null;
    // Определяем, является ли предмет стакающимся для отображения веса и кол-ва
    const isStackable = item.item_type === 'ammo' || (item.item_type === 'general' && maxUses === null); // Патроны или общие без uses
    const showQuantityTag = isStackable && quantity > 1; // Показываем тег кол-ва для стаков > 1
    const showUsesTag = item.item_type === 'general' && maxUses !== null; // Показываем тег uses для общих с uses

    // --- ИЗМЕНЕНИЕ: Расчет отображаемого веса ---
    const displayWeight = (baseItemWeight !== null && baseItemWeight !== undefined)
        ? (isStackable ? (baseItemWeight * quantity) : baseItemWeight)
        : null;
    const formattedWeight = displayWeight !== null ? displayWeight.toFixed(1) : null; // Форматируем до 1 знака
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    // Значение для тега uses/quantity
    const usesTagValue = isMedicalItem ? quantity : maxUses; // Для мед. - кол-во, для других - макс. uses
    const usesTagTitle = isMedicalItem ? "Осталось зарядов" : "Использований (макс)";

    // --- Флаг, есть ли вообще какие-то теги для отображения ---
    const hasTags = weaponAmmo || weaponRange || isTwoHanded !== null || displayWeight !== null || strengthRequirement > 0 || stealthDisadvantage || showUsesTag || showQuantityTag;

    return (
        <div style={cardStyle} title={item.description || item.name}>
            {/* Имя предмета */}
            <span style={styles.itemName}>{item.name}</span>

            {/* Заголовок: Тип + Теги | Категория/Редкость */}
            <div style={styles.itemCardHeader}>
                 <div style={styles.headerLeft}>
                     {/* Бейдж типа предмета */}
                     <span style={{...styles.itemTypeBadge, backgroundColor: `${typeColor}33`, color: typeColor, borderColor: `${typeColor}88`}}>
                         {ITEM_TYPES[item.item_type] || item.item_type}
                     </span>
                     {/* Теги */}
                     {hasTags && (
                         <>
                            {/* Детали оружия */}
                            {weaponAmmo && ( <span style={styles.detailTag} title="Требуемый тип патронов"> <AmmoIcon /> {weaponAmmo} </span> )}
                            {weaponRange && ( <span style={styles.detailTag} title="Дальность (норм./макс.)"> <RangeIcon /> {weaponRange} </span> )}
                            {isTwoHanded !== null && ( <span style={styles.detailTag} title={isTwoHanded ? "Двуручное" : "Одноручное"}> <HandIcon /> {isTwoHanded ? "Двуруч." : "Одноруч."} </span> )}
                            {/* Тег для Использований (general с uses) */}
                            {showUsesTag && usesTagValue !== null && (
                                <span style={styles.detailTag} title={usesTagTitle}>
                                    <UsesIcon /> {usesTagValue} исп.
                                </span>
                            )}
                            {/* Тег для Количества (стакающиеся) */}
                            {showQuantityTag && (
                                <span style={styles.detailTag} title="Количество"> <StackIcon /> x{quantity} </span>
                            )}
                            {/* --- ИЗМЕНЕНИЕ: Отображаем рассчитанный вес --- */}
                            {formattedWeight !== null && (
                                <span style={styles.detailTag} title="Общий вес"> <WeightIcon /> {formattedWeight} кг </span>
                            )}
                            {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                            {/* Требования */}
                            {strengthRequirement > 0 && ( <span style={{...styles.detailTag, ...styles.requirementTag}} title={`Требуется Сила: ${strengthRequirement}`}> <StrengthReqIcon /> {strengthRequirement} </span> )}
                            {stealthDisadvantage === true && ( <span style={{...styles.detailTag, ...styles.requirementTag}} title="Помеха Скрытности"> <StealthDisIcon /> Помеха </span> )}
                         </>
                     )}
                </div>
                 <span style={styles.itemCategory}>[{item.category} / {item.rarity}]</span>
            </div>

            {/* Основные детали (урон/AC/эффект) */}
            <div style={styles.mainDetailContainer}>
                {item.item_type === 'weapon' && ( <div style={styles.mainDetailWrapper}> <DamageIcon /> <span style={styles.mainDetailText}> Урон: <span style={styles.mainValue}>{item.damage}</span> ({item.damage_type}) </span> </div> )}
                {item.item_type === 'armor' && ( <div style={styles.mainDetailWrapper}> <ACIcon /> <span style={styles.mainDetailText}> AC: <span style={styles.mainValue}>{item.ac_bonus}</span> ({item.armor_type}) {item.max_dex_bonus !== null ? `[Ловк. +${item.max_dex_bonus}]` : ''} </span> </div> )}
                {item.item_type === 'shield' && ( <div style={styles.mainDetailWrapper}> <ACIcon /> <span style={styles.mainDetailText}> Бонус AC: <span style={styles.mainValue}>+{item.ac_bonus}</span> </span> </div> )}
                {item.item_type === 'general' && maxUses === null && item.effect && ( <div style={styles.mainDetailWrapper}> <EffectIcon /> <span style={styles.mainDetailText}> Эффект: {item.effect} </span> </div> )}
                {item.item_type === 'ammo' && item.ammo_type && ( <div style={styles.mainDetailWrapper}> <AmmoTypeIcon /> <span style={styles.mainDetailText}> Тип: <span style={styles.mainValue}>{item.ammo_type}</span> {item.effect ? `(${item.effect})` : ''} </span> </div> )}
                {item.effect_dice_formula && ( <div style={styles.mainDetailWrapper}> <FormulaIcon /> <span style={styles.mainDetailText}> Формула: <span style={styles.mainValue}>{item.effect_dice_formula}</span> </span> </div> )}
            </div>


            {/* Кнопки Действий */}
            <div style={styles.itemCardActions}>
                 {isActivatable && handleApiAction && ( <button onClick={handleActivateClick} style={styles.useButton} title="Использовать"> Исп. </button> )}
                 {isEquippable && (onEquip || onUnequip) && ( <button onClick={handleEquipToggleClick} style={isEquipped ? styles.unequipButton : styles.equipButton} title={isEquipped ? 'Снять' : 'Экипировать'}> {isEquipped ? <UnequipIcon /> : <EquipIcon />} </button> )}
                 {onDrop && ( <button onClick={handleDropClick} style={styles.dropButton} title="Выбросить"> <DropIcon /> </button> )}
            </div>
        </div>
    );
};

// --- Стили ---
const styles = {
    itemCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: '8px',
        padding: '10px 15px',
        boxShadow: theme.effects.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: theme.transitions.default,
        borderLeft: '5px solid grey',
        position: 'relative',
    },
    itemName: {
        fontWeight: 'bold',
        color: theme.colors.primary,
        wordBreak: 'break-word',
        fontSize: '1rem',
        lineHeight: 1.3,
        marginBottom: '4px',
    },
    itemCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        paddingBottom: '6px',
        borderBottom: `1px dashed ${theme.colors.surface}88`,
    },
    headerLeft: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '6px',
        overflow: 'hidden',
        flexGrow: 1,
    },
    itemTypeBadge: {
        fontSize: '0.7rem',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid',
        fontWeight: '500',
        textTransform: 'uppercase',
        display: 'inline-block',
        flexShrink: 0,
    },
    itemCategory: {
        fontSize: '0.75rem',
        color: theme.colors.textSecondary,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        textAlign: 'right',
    },
    mainDetailContainer: {
       paddingTop: '6px',
       minHeight: '1.5em',
       display: 'flex',
       alignItems: 'center',
       gap: '8px',
    },
    mainDetailWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
    },
    mainDetailIcon: {
        width: '16px',
        height: '16px',
        fill: theme.colors.textSecondary,
        flexShrink: 0,
        opacity: 0.9,
    },
    mainDetailText: {
        fontSize: '0.9rem',
        color: theme.colors.text,
        margin: '0',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    mainValue: {
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    detailTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.75rem',
        background: 'rgba(255,255,255,0.08)',
        color: theme.colors.textSecondary,
        padding: '3px 8px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)',
        whiteSpace: 'nowrap',
    },
    detailTagIcon: {
        width: '12px',
        height: '12px',
        fill: 'currentColor',
        flexShrink: 0,
        opacity: 0.8,
    },
    requirementTag: {
        color: theme.colors.warning,
        borderColor: `${theme.colors.warning}44`,
        background: `${theme.colors.warning}11`,
    },
    itemCardActions: {
        display: 'flex',
        gap: '8px',
        marginTop: 'auto',
        paddingTop: '8px',
        justifyContent: 'flex-end',
        borderTop: `1px solid ${theme.colors.surface}66`
    },
    actionButtonBase: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        padding: '5px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid transparent',
        cursor: 'pointer', transition: 'all 0.2s ease-in-out', fontWeight: '600',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)', minWidth: '40px', textAlign: 'center',
    },
    buttonIcon: {
        width: '14px',
        height: '14px',
        fill: 'currentColor',
    },
    equipButton: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        padding: '5px 10px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer',
        transition: 'all 0.2s ease-in-out', fontWeight: '600', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        minWidth: '40px', textAlign: 'center',
        background: theme.colors.success || '#4CAF50', color: '#fff', border: `1px solid ${theme.colors.success || '#388E3C'}`,
        ':hover': { background: '#66BB6A', boxShadow: '0 2px 5px rgba(0,0,0,0.4)', transform: 'translateY(-1px)' }
    },
    unequipButton: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        padding: '5px 10px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer',
        transition: 'all 0.2s ease-in-out', fontWeight: '600', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        minWidth: '40px', textAlign: 'center',
        background: theme.colors.warning || '#FFA000', color: '#000', border: `1px solid ${theme.colors.warning || '#F57C00'}`,
         ':hover': { background: '#FFB74D', boxShadow: '0 2px 5px rgba(0,0,0,0.4)', transform: 'translateY(-1px)' }
    },
    useButton: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        padding: '5px 10px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer',
        transition: 'all 0.2s ease-in-out', fontWeight: '600', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        minWidth: '40px', textAlign: 'center',
        background: theme.colors.secondary, color: theme.colors.background, border: `1px solid ${theme.colors.secondary}`,
         ':hover': { filter: 'brightness(1.1)', boxShadow: '0 2px 5px rgba(0,0,0,0.4)', transform: 'translateY(-1px)' }
    },
    dropButton: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        padding: '5px 10px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer',
        transition: 'all 0.2s ease-in-out', fontWeight: '600', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        minWidth: '40px', textAlign: 'center',
        background: theme.colors.error || '#D32F2F', color: '#fff', border: `1px solid ${theme.colors.error || '#B71C1C'}`,
         ':hover': { background: '#E57373', boxShadow: '0 2px 5px rgba(0,0,0,0.4)', transform: 'translateY(-1px)' }
    },
};

export default ItemCard;
