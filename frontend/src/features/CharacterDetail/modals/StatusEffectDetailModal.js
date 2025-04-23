// src/features/CharacterDetail/modals/StatusEffectDetailModal.js
import React from 'react';
// Убедись, что путь к theme правильный
import { theme } from '../../../styles/theme';

// --- Иконки ---
const StatusIcon = () => (<svg style={styles.titleIcon} viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>);
const AdvantageIcon = () => (<svg style={styles.modTagIcon} viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>);
const DisadvantageIcon = () => (<svg style={styles.modTagIcon} viewBox="0 0 24 24"><path d="m12 14.27l-5.74 3.52l1.48-6.41L2 6.85l6.44-.59L12 1l3.56 5.26l6.44.59l-5.74 4.53l1.48 6.41z"/></svg>);
const ACMoIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>); // Shield
const AttackModIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M19.78 2.22a.75.75 0 0 0-1.06 0l-2.22 2.22-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41L4 15.06V19a1 1 0 0 0 1 1h3.94l10.84-10.84L19.78 3.28a.75.75 0 0 0 0-1.06zM8.5 18H6v-2.5l7.37-7.37 2.5 2.5L8.5 18z"/></svg>); // Sword/Attack
const SaveModIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>); // Checkmark/Save
const ActionRestrictionIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>); // Block/Minus
const SpeedModIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.22-1.05-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7zM12 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>); // Speed/Tag Icon
const GenericModIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/></svg>); // Fallback +/- Icon


// --- Вспомогательные Функции Форматирования ---

// formatModifierTargets (для Adv/Disadv)
const formatModifierTargets = (targets) => {
    if (!targets || typeof targets !== 'object' || Object.keys(targets).length === 0) return null;
    // ... (код как в предыдущем ответе) ...
    const renderList = (key, items) => {
        let title = key;
        if (key === 'attack_rolls') title = 'Броски Атаки';
        else if (key === 'saving_throws') title = 'Спасброски';
        else if (key === 'skill_checks') title = 'Проверки Навыков';

        if (items === true || items === 'all') return <li style={styles.modifierTargetItem}>Все {title.toLowerCase()}</li>;
        if (Array.isArray(items) && items.length > 0) {
             // Пример перевода подтипов
             const translatedItems = items.map(item => {
                 if (item === 'melee') return 'Ближний бой';
                 if (item === 'ranged') return 'Дальний бой';
                 if (item === 'strength') return 'Сила';
                 if (item === 'dexterity') return 'Ловкость';
                 if (item === 'attention') return 'Внимание';
                 // Добавить другие переводы
                 return item;
             });
             return <li style={styles.modifierTargetItem}>{title}: {translatedItems.join(', ')}</li>;
        }
        return null;
    };
     return (
        <ul style={styles.modifierTargetList}>
            {Object.entries(targets).map(([key, value]) => renderList(key, value)).filter(Boolean)}
        </ul>
    );
};

// formatSavingThrowModifiers
const formatSavingThrowModifiers = (modifiers) => {
    if (!modifiers || typeof modifiers !== 'object' || Object.keys(modifiers).length === 0) return null;
     // ... (код как в предыдущем ответе) ...
     const renderModifier = (attr, mod) => {
        let attrText = attr.charAt(0).toUpperCase() + attr.slice(1);
        if (attr === 'strength') attrText = 'Силы';
        else if (attr === 'dexterity') attrText = 'Ловкости';
        else if (attr === 'endurance') attrText = 'Выносливости';
        else if (attr === 'self_control') attrText = 'Самообл.';
        else if (attr === 'all') attrText = 'Все';
        let modText = ''; let modStyle = {};
        if (mod === 'fail') { modText = 'Автопровал'; modStyle = styles.negativeMod; }
        else if (mod === 'advantage') { modText = 'Преимущество'; modStyle = styles.positiveMod; }
        else if (mod === 'disadvantage') { modText = 'Помеха'; modStyle = styles.negativeMod; }
        else if (typeof mod === 'number') { modText = mod > 0 ? `+${mod}` : `${mod}`; modStyle = mod > 0 ? styles.positiveMod : styles.negativeMod; }
        else { modText = String(mod); }
        return (<li key={attr} style={styles.modListItem}> <SaveModIcon /> Спасброски {attrText}: <span style={modStyle}>{modText}</span> </li>);
    };
     const rendered = Object.entries(modifiers).map(([attr, mod]) => renderModifier(attr, mod)).filter(Boolean);
     return rendered.length > 0 ? <ul style={styles.modList}>{rendered}</ul> : null;
};

// formatActionRestrictions
const formatActionRestrictions = (restrictions) => {
    if (!restrictions || typeof restrictions !== 'object' || Object.keys(restrictions).length === 0) return null;
    // ... (код как в предыдущем ответе) ...
    const restrictionMap = { block_action: "Действия", block_bonus: "Бонусные действия", block_reaction: "Реакции", block_move: "Перемещение" };
    const blockedActions = Object.entries(restrictions).filter(([key, value]) => value === true && restrictionMap[key]).map(([key]) => restrictionMap[key]);
    if (blockedActions.length === 0) return null;
    return (<div style={styles.restrictionBlock}> <ActionRestrictionIcon /> <span style={styles.restrictionText}>Блокирует: {blockedActions.join(', ')}</span> </div>);
};

// formatNumericModifiers (Обновленная версия из предыдущего ответа)
const formatNumericModifiers = (modifiers) => {
    if (!modifiers || typeof modifiers !== 'object' || Object.keys(modifiers).length === 0) return null;
    // ... (код перевода ключей и рендеринга как в предыдущем ответе) ...
     const keyTranslations = { 'attack_rolls': 'Атаки', 'skill_checks': 'Навыки', 'saving_throws': 'Спасброски', 'melee': 'Ближний бой', 'ranged': 'Дальний бой', 'strength': 'Сила', 'dexterity': 'Ловкость', 'endurance': 'Выносливость', 'reaction': 'Реакция', 'technique': 'Техника', 'adaptation': 'Адаптация', 'logic': 'Логика', 'attention': 'Внимание', 'erudition': 'Эрудиция', 'culture': 'Культура', 'science': 'Наука', 'medicine': 'Медицина', 'suggestion': 'Внушение', 'insight': 'Проницательность', 'authority': 'Авторитет', 'self_control': 'Самообл.', 'religion': 'Религия', 'flow': 'Поток', };
     const renderModifier = (key, value) => {
        if (typeof value !== 'number' || value === 0) return null;
        const keyParts = key.split('.');
        const readableKey = keyParts.map(part => keyTranslations[part] || part).join(' ');
        const modStyle = value > 0 ? styles.positiveMod : styles.negativeMod;
        const modValueStr = value > 0 ? `+${value}` : `${value}`;
        let IconComponent = GenericModIcon;
        if (key.includes('attack')) IconComponent = AttackModIcon; else if (key.includes('saving')) IconComponent = SaveModIcon;
        return (<li key={key} style={styles.modListItem}><IconComponent /> {readableKey}: <span style={modStyle}>{modValueStr}</span></li>);
     };
     const renderedModifiers = Object.entries(modifiers).map(([key, value]) => renderModifier(key, value)).filter(Boolean);
     return renderedModifiers.length > 0 ? <ul style={styles.modList}>{renderedModifiers}</ul> : null;
};

// --- НОВОЕ: Форматирует Модификатор Скорости ---
const formatSpeedModifier = (modifier) => {
    if (!modifier || typeof modifier !== 'string') return null;
    let text = '';
    if (modifier === '0') {
        text = 'Скорость = 0';
    } else if (modifier === '/2') {
        text = 'Скорость / 2';
    } else if (modifier.startsWith('-') && modifier.endsWith('m')) {
        text = `Скорость ${modifier.replace('m', ' м')}`;
    } else {
         text = modifier; // Отображаем как есть, если формат неизвестен
    }
    return (
        <div style={styles.speedModBlock}>
            <SpeedModIcon />
            <span style={styles.speedModText}>{text}</span>
        </div>
    );
}

// === Основной Компонент Модалки ===
const StatusEffectDetailModal = ({ effect, onClose }) => {
    if (!effect) return null;

    const animationStyle = `@keyframes fadeInBlur { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop_filter: blur(5px); } } @keyframes scaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`;

    // Форматируем все данные
    const formattedRollTargets = formatModifierTargets(effect.roll_modifier_targets);
    const formattedNumericModifiers = formatNumericModifiers(effect.numeric_modifiers);
    const formattedSaveModifiers = formatSavingThrowModifiers(effect.saving_throw_modifiers);
    const formattedActionRestrictions = formatActionRestrictions(effect.action_restrictions);
    const formattedSpeedModifier = formatSpeedModifier(effect.speed_modifier);

    // Получаем AC модификатор
    const acModifier = effect.ac_modifier;

    // Проверяем, есть ли ЧТО отображать в секции модификаторов
    const hasAnyModifiers = effect.roll_modifier_type ||
                            (acModifier !== null && acModifier !== 0) ||
                            formattedNumericModifiers ||
                            formattedSaveModifiers ||
                            formattedActionRestrictions ||
                            formattedSpeedModifier;

    return (
        <>
            <style>{animationStyle}</style>
            {/* Overlay */}
            <div style={styles.overlay} onClick={onClose}>
                {/* Modal Container */}
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    {/* Close Button */}
                    <button onClick={onClose} style={styles.closeButton} title="Закрыть">×</button>
                    {/* Header */}
                    <div style={styles.headerSection}>
                         <div style={styles.iconContainer}><StatusIcon /></div>
                         <h2 style={styles.title}>{effect.name}</h2>
                    </div>
                    {/* Content (Scrollable) */}
                    <div style={styles.contentSection}>
                        {/* Описание */}
                        <p style={styles.descriptionText}>
                            {effect.description || "Описание отсутствует."}
                        </p>

                        {/* --- ОБНОВЛЕННАЯ СЕКЦИЯ МОДИФИКАТОРОВ --- */}
                        {hasAnyModifiers && (
                            <div style={styles.modifierSection}>
                                <h3 style={styles.modifierTitle}>Эффекты и Модификаторы</h3>

                                {/* Блок Преимущества/Помехи */}
                                {effect.roll_modifier_type && (
                                    <div style={styles.modifierSubSection}>
                                        <p style={styles.modifierType}>
                                            Броски: <span style={effect.roll_modifier_type === 'advantage' ? styles.advantageText : styles.disadvantageText}>
                                                {effect.roll_modifier_type === 'advantage' ? <><AdvantageIcon /> Преимущество</> : <><DisadvantageIcon /> Помеха</>}
                                            </span>
                                        </p>
                                        {formattedRollTargets || <p style={styles.modifierTargetsLabel}>Цели: Все применимые броски</p>}
                                    </div>
                                )}

                                {/* Блок Числовых Модификаторов (AC + из JSON) */}
                                {( (acModifier !== null && acModifier !== 0) || formattedNumericModifiers ) && (
                                    <div style={styles.modifierSubSection}>
                                        {/* AC Модификатор */}
                                        {acModifier !== null && acModifier !== 0 && (
                                            <ul style={styles.modList}>
                                                <li style={styles.modListItem}>
                                                    <ACMoIcon /> КЗ (AC): <span style={acModifier > 0 ? styles.positiveMod : styles.negativeMod}>{acModifier > 0 ? `+${acModifier}` : acModifier}</span>
                                                </li>
                                            </ul>
                                        )}
                                        {/* Модификаторы из JSON */}
                                        {formattedNumericModifiers}
                                    </div>
                                )}

                                {/* Блок Модификаторов Спасбросков */}
                                {formattedSaveModifiers && (
                                    <div style={styles.modifierSubSection}>
                                        {formattedSaveModifiers}
                                    </div>
                                )}

                                {/* Блок Ограничений Действий */}
                                {formattedActionRestrictions && (
                                     <div style={styles.modifierSubSection}>
                                        {formattedActionRestrictions}
                                     </div>
                                )}

                                {/* --- НОВОЕ: Блок Модификатора Скорости --- */}
                                {formattedSpeedModifier && (
                                     <div style={styles.modifierSubSection}>
                                         {formattedSpeedModifier}
                                     </div>
                                )}
                                {/* --- КОНЕЦ БЛОКА Скорости --- */}

                            </div>
                        )}
                        {/* --- КОНЕЦ ОБНОВЛЕННОЙ СЕКЦИИ --- */}

                    </div>
                    {/* Footer */}
                    <div style={styles.footerSection}>
                        <button onClick={onClose} style={styles.closeBottomButton}>Закрыть</button>
                    </div>
                </div>
            </div>
        </>
    );
};

// --- Стили ---
const styles = {
    // Основные стили overlay, modal, headerSection и т.д. (как в предыдущих ответах)
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, animation: 'fadeInBlur 0.3s ease-out forwards', opacity: 0, backdropFilter: 'blur(5px)' },
    modal: { background: theme.colors.surface || '#2a2a2e', borderRadius: '16px', width: '90%', maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 15px 50px rgba(0,0,0,0.6)', color: theme.colors.text || '#e0e0e0', border: `1px solid ${theme.colors.surfaceVariant || '#444'}66`, animation: 'scaleUp 0.3s ease-out forwards', transform: 'scale(0.9)', opacity: 0, overflow: 'hidden' },
    closeButton: { position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: theme.colors.textSecondary || '#aaa', fontSize: '2rem', cursor: 'pointer', lineHeight: 1, padding: '5px', borderRadius: '50%', transition: 'all 0.2s ease', zIndex: 10, ':hover': { color: theme.colors.primary || '#bb86fc', background: `${theme.colors.primary || '#bb86fc'}22` } },
    headerSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 25px 20px 25px', background: theme.colors.surfaceVariant || '#3a3a3e', borderBottom: `1px solid ${theme.colors.outline || '#555'}`, textAlign: 'center' },
    iconContainer: { width: '50px', height: '50px', borderRadius: '50%', background: `${theme.colors.primary || '#bb86fc'}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' },
    titleIcon: { width: '28px', height: '28px', fill: theme.colors.primary || '#bb86fc' },
    title: { margin: 0, color: theme.colors.primary || '#bb86fc', fontSize: '1.6rem', fontWeight: '600', lineHeight: 1.3 },
    contentSection: { padding: '25px', flexGrow: 1, overflowY: 'auto', background: theme.colors.surface || '#2a2a2e', '::-webkit-scrollbar': { width: '8px' }, '::-webkit-scrollbar-track': { background: `${theme.colors.surfaceVariant || '#444'}44`, borderRadius: '4px' }, '::-webkit-scrollbar-thumb': { background: theme.colors.textSecondary || '#888', borderRadius: '4px' }, '::-webkit-scrollbar-thumb:hover': { background: theme.colors.primary || '#bb86fc' } },
    descriptionText: { margin: '0 0 25px 0', lineHeight: 1.7, fontSize: '1rem', whiteSpace: 'pre-wrap', color: theme.colors.text || '#e0e0e0' },
    footerSection: { display: 'flex', justifyContent: 'flex-end', padding: '15px 25px', borderTop: `1px solid ${theme.colors.outline || '#555'}`, background: theme.colors.surfaceVariant || '#3a3a3e' },
    closeBottomButton: { padding: '10px 25px', background: theme.colors.primary || '#bb86fc', color: theme.colors.onPrimary || '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: '600', fontSize: '0.95rem', ':hover': { opacity: 0.85, boxShadow: `0 4px 15px ${theme.colors.primary || '#bb86fc'}55` } },

    // Стили для секции модификаторов (немного изменены)
    modifierSection: {
        marginTop: '20px', padding: '20px',
        border: `1px solid ${theme.colors.surfaceVariant || '#444'}88`, borderRadius: '12px',
        background: `${theme.colors.surfaceVariant || '#3a3a3e'}33`, // Чуть менее прозрачный
        display: 'flex', flexDirection: 'column', gap: '20px' // Увеличен gap
    },
    modifierTitle: {
        margin: '-5px 0 5px 0', fontSize: '1.2rem', fontWeight: '600',
        color: theme.colors.secondary || '#03DAC6', paddingBottom: '10px',
        borderBottom: `1px solid ${theme.colors.secondary || '#03DAC6'}88` // Ярче линия
    },
    modifierSubSection: { // Подсекции для группировки
        paddingLeft: '10px',
        borderLeft: `3px solid ${theme.colors.surfaceVariant || '#555'}`,
        paddingBottom: '10px', // Добавим отступ снизу для разделения
        marginBottom: '10px', // Отступ между подсекциями
        ':last-child': { marginBottom: 0, paddingBottom: 0, borderBottom: 'none' } // Убираем у последнего элемента
    },
    modifierType: { margin: '0 0 8px 0', fontSize: '1rem', color: theme.colors.text, display: 'flex', alignItems: 'center', gap: '8px' },
    advantageText: { color: theme.colors.success || '#66BB6A', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' },
    disadvantageText: { color: theme.colors.error || '#CF6679', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' },
    modTagIcon: { width: '16px', height: '16px', fill: 'currentColor', verticalAlign: 'bottom', marginRight: '4px' },
    modifierTargetsLabel: { margin: '5px 0 5px 0', fontSize: '0.9rem', fontWeight: 'bold', color: theme.colors.textSecondary || '#aaa', },
    modifierTargetList: { margin: '0 0 0 5px', paddingLeft: '20px', listStyle: 'circle', color: theme.colors.text, },
    modifierTargetItem: { marginBottom: '4px', fontSize: '0.95rem', lineHeight: 1.5, },
    modList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }, // Увеличили gap
    modListItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: theme.colors.text }, // Увеличили gap
    modIcon: { width: '18px', height: '18px', fill: theme.colors.textSecondary || '#aaa', opacity: 0.9, flexShrink: 0 },
    positiveMod: { fontWeight: 'bold', color: theme.colors.success || '#66BB6A' },
    negativeMod: { fontWeight: 'bold', color: theme.colors.error || '#CF6679' },
    restrictionBlock: { display: 'flex', alignItems: 'center', gap: '10px', color: theme.colors.warning || '#FFA726', fontSize: '1rem' },
    restrictionText: { fontWeight: '500' },
    // Новые стили для скорости
    speedModBlock: { display: 'flex', alignItems: 'center', gap: '10px', color: theme.colors.text, fontSize: '1rem' },
    speedModText: { fontWeight: '500' }
};

export default StatusEffectDetailModal;