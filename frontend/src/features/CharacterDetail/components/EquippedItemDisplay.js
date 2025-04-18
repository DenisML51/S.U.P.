// src/features/CharacterDetail/components/EquippedItemDisplay.js
import React, { useMemo } from 'react';
import { theme } from '../../../styles/theme';

// --- Вспомогательные Функции и Иконки ---
const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
        case 'необычная': return theme.colors.success || '#66BB6A';
        case 'редкая': return '#2196F3';
        case 'очень редкая': return theme.colors.primary || '#BB86FC';
        case 'экзотика': return theme.colors.warning || '#FFA726';
        default: return theme.colors.textSecondary || 'grey';
    }
};
const getItemIcon = (itemType, styleOverride = {}) => {
    const baseStyle = { width: '20px', height: '20px', fill: theme.colors.primary, flexShrink: 0 };
    const iconStyle = { ...baseStyle, ...styleOverride };
    switch (itemType) {
        default: return <div style={{ ...iconStyle, fill: 'transparent' }}></div>;
    }
};
const StrengthIcon = ({ value }) => ( <svg title={`Требуется Сила ${value}`} style={styles.reqIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 1.83.63 3.49 1.69 4.76L12 22l5.31-8.24C18.37 12.49 19 10.83 19 9c0-3.87-3.13-7-7-7zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg> );
const StealthIcon = () => ( <svg title="Помеха Скрытности" style={styles.reqIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3 3z"/></svg> );
const UnequipIcon = () => ( <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> );

// Карта Модификаторов
const modMap = {
    'Сил': 'strength_mod', 'Лов': 'dexterity_mod', 'Вни': 'attention_mod',
    'Мед': 'medicine_mod', 'Вын': 'endurance_mod', /* ... */
};

// Функция Расчета Урона
const getCalculatedDamage = (formula, modifiers, currentItem) => {
    if (!formula || !modifiers || !currentItem) return formula || '?';
    let calculatedFormula = String(formula);

    // Обработка "См. оружие"
    if (calculatedFormula.toLowerCase().includes('см. оружие')) {
        const baseDamage = currentItem.damage || '?';
        if (calculatedFormula.toLowerCase().includes('+1к')) {
             const diceMatch = baseDamage.match(/(\d+к\d+)/);
             calculatedFormula = diceMatch ? `${baseDamage} + ${diceMatch[0]}` : `${baseDamage} + доп. кость`;
        } else {
             calculatedFormula = baseDamage;
        }
    }

    // Подстановка модификатора
    const modMatch = calculatedFormula.match(/([\+\-])Мод\.(\w+)/);
    if (modMatch) {
        const sign = modMatch[1];
        const modKeyShort = modMatch[2];
        const modAttr = modMap[modKeyShort];
        if (modAttr && typeof modifiers[modAttr] === 'number') {
            const modValue = modifiers[modAttr];
            const modString = modValue === 0 ? '' : (modValue > 0 ? `+${modValue}` : `${modValue}`);
            calculatedFormula = calculatedFormula.replace(modMatch[0], modString);
            calculatedFormula = calculatedFormula.replace('--', '+').replace('+-', '-').replace('-+', '-');
            if (calculatedFormula.startsWith('+')) { calculatedFormula = calculatedFormula.substring(1); }
            if (calculatedFormula.endsWith('+') || calculatedFormula.endsWith('-')) { calculatedFormula = calculatedFormula.slice(0, -1).trim(); }
        } else {
            calculatedFormula = calculatedFormula.replace(modMatch[0], `(Мод.${modKeyShort}?)`);
        }
    }
    return calculatedFormula.trim() || '?';
};

// --- Основной Компонент ---
const EquippedItemDisplay = ({ itemData, character, onUnequip, slotKey }) => {

    // ===>>> ПЕРЕНОС ХУКОВ В НАЧАЛО КОМПОНЕНТА <<<===
    // Фильтруем атаки оружия (мемоизируем)
    const weaponAttacks = useMemo(() => {
        // Добавляем проверку itemData?.item внутри useMemo
        return (itemData?.item?.granted_abilities || [])
                 .filter(ab => ab && ab.is_weapon_attack === true)
                 .sort((a, b) => a.name.localeCompare(b.name));
        // Зависимость теперь включает itemData и его поле
    }, [itemData?.item?.granted_abilities]);

    // Извлекаем свойства предмета (мемоизируем)
    const properties = useMemo(() => {
        // Добавляем проверку itemData?.item внутри useMemo
        const item = itemData?.item;
        if (!item) return []; // Возвращаем пустой массив, если нет item

        const props = item.properties?.split(',').map(p => p.trim().toLowerCase()) || [];
        const tags = [];
        if (item.is_two_handed) tags.push({ key: 'twohanded', label: 'Двуручное' });
        else if (props.includes('легкое')) tags.push({ key: 'light', label: 'Легкое' });
        if (props.includes('фехтовальное')) tags.push({ key: 'finesse', label: 'Фехт.' });
        if (props.includes('тяжелое')) tags.push({ key: 'heavy', label: 'Тяжелое' });
        if (props.includes('точное')) tags.push({ key: 'precision', label: 'Точное' });
        if (props.includes('пробивание')) tags.push({ key: 'piercing', label: 'Пробив.' });
        if (props.includes('разрывное')) tags.push({ key: 'rending', label: 'Разрыв.' });
        if (props.includes('особое')) tags.push({ key: 'special', label: 'Особое' });
        return tags;
        // Зависимости теперь включают itemData и его поля
    }, [itemData?.item?.properties, itemData?.item?.is_two_handed]);
    // ===>>> КОНЕЦ ПЕРЕНОСА ХУКОВ <<<===

    // Отображение пустого слота (теперь ПОСЛЕ хуков)
    if (!itemData || !itemData.item) {
        return (
            <div style={styles.emptySlotContainer}>
                 <span style={styles.emptySlotIcon}> ⛶ </span>
                 <p style={styles.emptySlotText}>Слот пуст</p>
            </div>
        );
    }

    // Теперь можно безопасно извлечь item
    const { item } = itemData;
    const rarityColor = getRarityColor(item.rarity);

    // Определяем основной стат (AC)
    let mainStatDisplay = null;
    if (item.item_type === 'armor') mainStatDisplay = `AC: ${item.ac_bonus}`;
    else if (item.item_type === 'shield') mainStatDisplay = `AC: +${item.ac_bonus}`;

    // Обработчик снятия
    const handleUnequipClick = (e) => {
        e.stopPropagation();
        if (onUnequip && slotKey) { onUnequip(slotKey); }
        else { console.error("Ошибка: не передан onUnequip или slotKey в EquippedItemDisplay"); }
    };

    // --- Рендеринг Карточки ---
    return (
        <div style={{ ...styles.card, borderLeftColor: rarityColor, background: `${rarityColor}1A` }}>
            {onUnequip && slotKey && (
                <button onClick={handleUnequipClick} style={styles.unequipButtonCard} title={`Снять ${item.name}`}>
                    <UnequipIcon />
                </button>
            )}
            <div style={styles.cardHeader}>
                {getItemIcon(item.item_type, { marginRight: '8px', fill: rarityColor })}
                <span style={styles.itemName}>{item.name}</span>
            </div>

            {mainStatDisplay && (
                <div style={styles.mainStat}>
                     {mainStatDisplay}
                     {item.item_type === 'armor' && ` (${item.armor_type})`}
                </div>
            )}

             <div style={styles.tagsContainer}>
                {item.strength_requirement > 0 && <span style={{...styles.tag, ...styles.tagRequirement}} title={`Требуется Сила ${item.strength_requirement}`}>Требование Силы: {item.strength_requirement}</span>}
                {item.stealth_disadvantage === true && <span style={{...styles.tag, ...styles.tagRequirement}} title="Помеха Скрытности"><StealthIcon/></span>}
                {properties.map(prop => ( // Используем мемоизированные properties
                    <span key={prop.key} style={styles.tag} title={prop.label}>{prop.label}</span>
                ))}
                {item.item_type === 'armor' && item.max_dex_bonus !== null && <span style={styles.tag} title={`Макс. бонус Ловкости: +${item.max_dex_bonus}`}>Ловк: +{item.max_dex_bonus}</span>}
            </div>

            {item.item_type === 'weapon' && weaponAttacks.length > 0 && ( // Используем мемоизированные weaponAttacks
                <div style={styles.attacksContainer}>
                     <h6 style={styles.attacksTitle}>Доступные атаки:</h6>
                     <div style={styles.attacksGrid}>
                        {weaponAttacks.map(attack => {
                            if (!attack) return null;
                            // Передаем item в функцию расчета
                            const calculatedDamage = getCalculatedDamage(attack.damage_formula, character?.skill_modifiers, item);
                            const damageType = (attack.damage_type?.toLowerCase() === 'см. оружие' ? item.damage_type : attack.damage_type) || '?';
                            const attackSkillAbbr = attack.attack_skill ? attack.attack_skill.substring(0, 3) : '?';
                            return (
                                <div key={attack.id || attack.name} style={styles.attackMiniBlock} title={attack.description || attack.name}>
                                    <span style={styles.attackMiniBlockName}>
                                         {attack.name.replace('Удар ', '').replace('Выстрел из ', '')}
                                         {` (${attackSkillAbbr})`}
                                    </span>
                                    <span style={styles.attackMiniBlockDamage}>
                                        {calculatedDamage} <span style={styles.damageType}>({damageType})</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {item.item_type === 'weapon' && weaponAttacks.length === 0 && item.damage && (
                 <div style={styles.attacksContainer}>
                      <h6 style={styles.attacksTitle}>Базовая атака:</h6>
                      <div style={styles.attacksGrid}>
                            <div style={styles.attackMiniBlock}>
                                <span style={styles.attackMiniBlockName}>Атака</span>
                                <span style={styles.attackMiniBlockDamage}>{item.damage} <span style={styles.damageType}>({item.damage_type || '?'})</span></span>
                            </div>
                      </div>
                 </div>
             )}
        </div>
    );
};


// --- Стили ---
const styles = {
    emptySlotContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '120px', opacity: 0.5, background: 'rgba(0,0,0,0.1)', borderRadius: '10px' },
    emptySlotIcon: { fontSize: '2rem', color: theme.colors.textSecondary, marginBottom: '5px' },
    emptySlotText: { fontStyle: 'italic', color: theme.colors.textSecondary, fontSize: '0.9rem', margin: 0 },
    card: { width: '100%', boxSizing: 'border-box', background: theme.colors.surface, borderRadius: '10px', padding: '15px', boxShadow: theme.effects.shadow, borderLeft: `5px solid ${theme.colors.textSecondary}`, position: 'relative', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'background 0.3s ease, border-color 0.3s ease' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surface}cc`, marginBottom: '5px' }, // Уменьшил marginBottom
    itemName: { fontWeight: '600', color: theme.colors.text, fontSize: '1.15rem', flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    mainStat: { fontSize: '1rem', fontWeight: '600', color: theme.colors.primary, padding: '0px 0 0px 0', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }, // Убрал паддинг снизу
    tagsContainer: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', minHeight: '22px' }, // Убрал разделитель снизу
    tag: { fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', color: theme.colors.textSecondary, padding: '3px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(255,255,255,0.1)' },
    tagRequirement: { color: theme.colors.warning, borderColor: `${theme.colors.warning}44`, background: `${theme.colors.warning}11` },
    reqIcon: { width: '14px', height: '14px', fill: 'currentColor', opacity: 0.8 },
    attacksContainer: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px', paddingTop: '10px', borderTop: `1px dashed ${theme.colors.surface}88` },
    attacksTitle: { margin: '0 0 2px 0', fontSize: '0.75rem', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 },
    attacksGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '8px' },
    attackMiniBlock: { background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '8px 10px', border: `1px solid ${theme.colors.surface}55`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '0.9rem' },
    attackMiniBlockName: { fontWeight: '500', color: theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 },
    attackMiniBlockDamage: { color: theme.colors.primary, fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.95rem' },
    damageType: { color: theme.colors.textSecondary, fontWeight: 'normal', fontSize: '0.8rem', marginLeft: '4px' },
    unequipButtonCard: { position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.1)', color: theme.colors.error, border: '1px solid transparent', borderRadius: '50%', width: '24px', height: '24px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.6, transition: theme.transitions.default, ':hover': { background: `${theme.colors.error}44`, borderColor: theme.colors.error, opacity: 1 } }
};

export default EquippedItemDisplay;