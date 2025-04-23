// src/features/CharacterDetail/modals/StatusEffectDetailModal.js
import React from 'react';
// Убедись, что путь к theme правильный
import { theme } from '../../../styles/theme';

// --- Иконки ---
// (Оставляем иконки StatusIcon, AdvantageIcon, DisadvantageIcon, ACMoIcon, AttackModIcon как были)
const StatusIcon = () => (<svg style={styles.titleIcon} viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>);
const AdvantageIcon = () => (<svg style={styles.modTagIcon} viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>);
const DisadvantageIcon = () => (<svg style={styles.modTagIcon} viewBox="0 0 24 24"><path d="m12 14.27l-5.74 3.52l1.48-6.41L2 6.85l6.44-.59L12 1l3.56 5.26l6.44.59l-5.74 4.53l1.48 6.41z"/></svg>);
const ACMoIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>); // Shield
const AttackModIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M19.78 2.22a.75.75 0 0 0-1.06 0l-2.22 2.22-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41L4 15.06V19a1 1 0 0 0 1 1h3.94l10.84-10.84L19.78 3.28a.75.75 0 0 0 0-1.06zM8.5 18H6v-2.5l7.37-7.37 2.5 2.5L8.5 18z"/></svg>); // Sword/Attack
// Новые иконки для Итерации 2
const SaveModIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>); // Checkmark/Save
const ActionRestrictionIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>); // Block/Minus

// --- Вспомогательные Функции Форматирования ---

// Форматирует цели для Преимущества/Помехи (как было)
const formatModifierTargets = (targets) => {
    if (!targets || typeof targets !== 'object' || Object.keys(targets).length === 0) return null;

    const renderList = (key, items) => {
        let title = key;
        if (key === 'attack_rolls') title = 'Броски Атаки';
        else if (key === 'saving_throws') title = 'Спасброски';
        else if (key === 'skill_checks') title = 'Проверки Навыков';

        if (items === true || items === 'all') return <li style={styles.modifierTargetItem}>Все {title.toLowerCase()}</li>;
        if (Array.isArray(items) && items.length > 0) {
            return <li style={styles.modifierTargetItem}>{title}: {items.join(', ')}</li>;
        }
        return null;
    };

    return (
        <ul style={styles.modifierTargetList}>
            {Object.entries(targets).map(([key, value]) => renderList(key, value)).filter(Boolean)}
        </ul>
    );
};

// --- НОВОЕ: Форматирует Модификаторы Спасбросков ---
const formatSavingThrowModifiers = (modifiers) => {
    if (!modifiers || typeof modifiers !== 'object' || Object.keys(modifiers).length === 0) return null;

    const renderModifier = (attr, mod) => {
        let attrText = attr.charAt(0).toUpperCase() + attr.slice(1); // Капитализация
        if (attr === 'strength') attrText = 'Силы';
        else if (attr === 'dexterity') attrText = 'Ловкости';
        else if (attr === 'endurance') attrText = 'Выносливости';
        else if (attr === 'intelligence') attrText = 'Интеллекта'; // Пример
        else if (attr === 'self_control') attrText = 'Самообладания'; // Пример
        else if (attr === 'all') attrText = 'Все'; // Для общих модификаторов

        let modText = '';
        let modStyle = {};

        if (mod === 'fail') {
            modText = 'Автопровал';
            modStyle = styles.negativeMod;
        } else if (mod === 'advantage') {
             modText = 'Преимущество';
             modStyle = styles.positiveMod;
        } else if (mod === 'disadvantage') {
             modText = 'Помеха';
             modStyle = styles.negativeMod;
        } else if (typeof mod === 'number') {
            modText = mod > 0 ? `+${mod}` : `${mod}`;
            modStyle = mod > 0 ? styles.positiveMod : styles.negativeMod;
        } else {
             modText = String(mod); // На всякий случай
        }

        return (
            <li key={attr} style={styles.modListItem}>
                <SaveModIcon /> Спасброски {attrText}: <span style={modStyle}>{modText}</span>
            </li>
        );
    };

    return (
        <ul style={styles.modList}>
            {Object.entries(modifiers).map(([attr, mod]) => renderModifier(attr, mod))}
        </ul>
    );
};

// --- НОВОЕ: Форматирует Ограничения Действий ---
const formatActionRestrictions = (restrictions) => {
    if (!restrictions || typeof restrictions !== 'object' || Object.keys(restrictions).length === 0) return null;

    const restrictionMap = {
        block_action: "Действия",
        block_bonus: "Бонусные действия",
        block_reaction: "Реакции",
        block_move: "Перемещение"
    };

    const blockedActions = Object.entries(restrictions)
        .filter(([key, value]) => value === true && restrictionMap[key])
        .map(([key]) => restrictionMap[key]);

    if (blockedActions.length === 0) return null;

    return (
        <div style={styles.restrictionBlock}>
            <ActionRestrictionIcon />
            <span style={styles.restrictionText}>Блокирует: {blockedActions.join(', ')}</span>
        </div>
    );
};


// === Основной Компонент Модалки ===
const StatusEffectDetailModal = ({ effect, onClose }) => {
    if (!effect) return null;

    // Анимация
    const animationStyle = `@keyframes fadeInBlur { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop_filter: blur(5px); } } @keyframes scaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`;

    // Форматируем данные для отображения
    const formattedRollTargets = formatModifierTargets(effect.roll_modifier_targets);
    const formattedSaveModifiers = formatSavingThrowModifiers(effect.saving_throw_modifiers);
    const formattedActionRestrictions = formatActionRestrictions(effect.action_restrictions);

    // Получаем числовые модификаторы
    const acModifier = effect.ac_modifier;
    const attackRollModifier = effect.attack_roll_modifier;

    // Проверяем, есть ли вообще какие-либо модификаторы для отображения секции
    const hasAnyModifiers = effect.roll_modifier_type || acModifier !== null || attackRollModifier !== null || formattedSaveModifiers || formattedActionRestrictions;

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

                                {/* Блок Числовых Модификаторов */}
                                {(acModifier !== null || attackRollModifier !== null) && (
                                    <div style={styles.modifierSubSection}>
                                        <ul style={styles.modList}>
                                            {acModifier !== null && (
                                                <li style={styles.modListItem}>
                                                    <ACMoIcon /> КЗ (AC): <span style={acModifier > 0 ? styles.positiveMod : styles.negativeMod}>{acModifier > 0 ? `+${acModifier}` : acModifier}</span>
                                                </li>
                                            )}
                                            {attackRollModifier !== null && (
                                                <li style={styles.modListItem}>
                                                    <AttackModIcon /> Бросок Атаки: <span style={attackRollModifier > 0 ? styles.positiveMod : styles.negativeMod}>{attackRollModifier > 0 ? `+${attackRollModifier}` : attackRollModifier}</span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                )}

                                {/* --- НОВОЕ: Блок Модификаторов Спасбросков --- */}
                                {formattedSaveModifiers && (
                                    <div style={styles.modifierSubSection}>
                                        {formattedSaveModifiers}
                                    </div>
                                )}
                                {/* --- КОНЕЦ БЛОКА Спасбросков --- */}

                                {/* --- НОВОЕ: Блок Ограничений Действий --- */}
                                {formattedActionRestrictions && (
                                     <div style={styles.modifierSubSection}>
                                        {formattedActionRestrictions}
                                     </div>
                                )}
                                {/* --- КОНЕЦ БЛОКА Ограничений --- */}

                            </div>
                        )}
                        {/* --- КОНЕЦ ОБНОВЛЕННОЙ СЕКЦИИ --- */}

                        {/* Можно добавить другие детали, если они есть */}

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
    // Стили Overlay, Modal, CloseButton, HeaderSection, IconContainer, TitleIcon, Title, ContentSection, DescriptionText, FooterSection, CloseBottomButton (как в предыдущем ответе)
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, animation: 'fadeInBlur 0.3s ease-out forwards', opacity: 0, backdropFilter: 'blur(5px)', },
    modal: { background: `${theme.colors.surfaceVariant || '#3a3a3e'}4D`, borderRadius: '16px', width: '90%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 15px 50px rgba(0,0,0,0.6)', color: theme.colors.text || '#e0e0e0', border: `1px solid ${theme.colors.surfaceVariant || '#444'}66`, animation: 'scaleUp 0.3s ease-out forwards', transform: 'scale(0.9)', opacity: 0, overflow: 'hidden', },
    closeButton: { position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: theme.colors.textSecondary || '#aaa', fontSize: '2rem', cursor: 'pointer', lineHeight: 1, padding: '5px', borderRadius: '50%', transition: 'all 0.2s ease', zIndex: 10, ':hover': { color: theme.colors.primary || '#bb86fc', background: `${theme.colors.primary || '#bb86fc'}22` } },
    headerSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 25px 20px 25px', background: theme.colors.surfaceVariant || '#3a3a3e', borderBottom: `1px solid ${theme.colors.outline || '#555'}`, textAlign: 'center', },
    iconContainer: { width: '50px', height: '50px', borderRadius: '50%', background: `${theme.colors.primary || '#bb86fc'}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', },
    titleIcon: { width: '28px', height: '28px', fill: theme.colors.primary || '#bb86fc', },
    title: { margin: 0, color: theme.colors.primary || '#bb86fc', fontSize: '1.6rem', fontWeight: '600', lineHeight: 1.3, },
    contentSection: { padding: '25px', flexGrow: 1, overflowY: 'auto', background: theme.colors.surface || '#2a2a2e', '::-webkit-scrollbar': { width: '8px' }, '::-webkit-scrollbar-track': { background: `${theme.colors.surfaceVariant || '#444'}44`, borderRadius: '4px' }, '::-webkit-scrollbar-thumb': { background: theme.colors.textSecondary || '#888', borderRadius: '4px' }, '::-webkit-scrollbar-thumb:hover': { background: theme.colors.primary || '#bb86fc' } },
    descriptionText: { margin: '0 0 25px 0', lineHeight: 1.7, fontSize: '1rem', whiteSpace: 'pre-wrap', color: theme.colors.text || '#e0e0e0', },
    footerSection: { display: 'flex', justifyContent: 'flex-end', padding: '15px 25px', borderTop: `1px solid ${theme.colors.outline || '#555'}`, background: theme.colors.surfaceVariant || '#3a3a3e', },
    closeBottomButton: { padding: '10px 25px', background: theme.colors.primary || '#bb86fc', color: theme.colors.onPrimary || '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: '600', fontSize: '0.95rem', ':hover': { opacity: 0.85, boxShadow: `0 4px 15px ${theme.colors.primary || '#bb86fc'}55` } },

    // --- Стили для секции модификаторов ---
    modifierSection: { // Вся секция эффектов
        marginTop: '20px',
        padding: '20px', // Увеличили отступы
        border: `1px solid ${theme.colors.surfaceVariant || '#444'}`, // Рамка для выделения
        borderRadius: '12px', // Скругление
        background: `${theme.colors.surfaceVariant || '#3a3a3e'}4D`, // Полупрозрачный фон
        display: 'flex',
        flexDirection: 'column',
        gap: '18px' // Отступ между подсекциями
    },
    modifierTitle: { // Заголовок секции "Эффекты и Модификаторы"
        margin: '-5px 0 5px 0', // Сдвинули чуть выше, уменьшили нижний отступ
        fontSize: '1.2rem', // Крупнее
        fontWeight: '600',
        color: theme.colors.secondary || '#03DAC6', // Акцентный цвет
        paddingBottom: '8px',
        borderBottom: `1px solid ${theme.colors.secondary || '#03DAC6'}66`
    },
    modifierSubSection: { // Контейнер для одного типа (Adv/Disadv, Числа, Спасбр, Ограничения)
        paddingLeft: '10px', // Небольшой отступ слева для вложенности
        borderLeft: `3px solid ${theme.colors.surfaceVariant || '#555'}`, // Линия слева
    },
    modifierType: { // Текст "Броски: Преимущество/Помеха"
        margin: '0 0 8px 0',
        fontSize: '1rem',
        color: theme.colors.text,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
     advantageText: { color: theme.colors.success || '#66BB6A', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' },
     disadvantageText: { color: theme.colors.error || '#CF6679', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' },
     modTagIcon: { width: '16px', height: '16px', fill: 'currentColor', verticalAlign: 'bottom', marginRight: '4px' }, // Добавлен отступ
     modifierTargetsLabel: { margin: '5px 0 5px 0', fontSize: '0.9rem', fontWeight: 'bold', color: theme.colors.textSecondary || '#aaa', },
     modifierTargetList: { margin: '0 0 0 5px', paddingLeft: '20px', listStyle: 'circle', color: theme.colors.text, },
     modifierTargetItem: { marginBottom: '4px', fontSize: '0.95rem', lineHeight: 1.5, },

    // Стили для списков модификаторов (Числа, Спасбр.)
    modList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px', // Отступ между элементами списка
    },
    modListItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '1rem',
        color: theme.colors.text,
    },
    modIcon: { // Общий стиль для иконок модов
        width: '18px',
        height: '18px',
        fill: theme.colors.textSecondary || '#aaa',
        opacity: 0.9,
        flexShrink: 0, // Предотвращает сжатие иконки
    },
    positiveMod: { fontWeight: 'bold', color: theme.colors.success || '#66BB6A' },
    negativeMod: { fontWeight: 'bold', color: theme.colors.error || '#CF6679' },

    // Стили для ограничений действий
    restrictionBlock: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: theme.colors.warning || '#FFA726', // Предупреждающий цвет
        fontSize: '1rem',
    },
    restrictionText: {
         fontWeight: '500',
    }
};

export default StatusEffectDetailModal;