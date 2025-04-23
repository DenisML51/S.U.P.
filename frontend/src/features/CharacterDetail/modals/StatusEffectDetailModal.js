// src/features/CharacterDetail/modals/StatusEffectDetailModal.js
import React from 'react';
// --- ИЗМЕНЕНИЕ: Убедитесь, что путь к theme правильный ---
import { theme } from '../../../styles/theme'; // <--- Проверьте этот путь

// --- Иконки ---
// Можно использовать иконку, соответствующую типу эффекта, если передавать тип
// Пока оставим общую иконку
const StatusIcon = () => (<svg style={styles.titleIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>); // Иконка Info
const ACMoIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>); // Shield icon
const AttackModIcon = () => (<svg style={styles.modIcon} viewBox="0 0 24 24"><path d="M19.78 2.22a.75.75 0 0 0-1.06 0l-2.22 2.22-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41L4 15.06V19a1 1 0 0 0 1 1h3.94l10.84-10.84L19.78 3.28a.75.75 0 0 0 0-1.06zM8.5 18H6v-2.5l7.37-7.37 2.5 2.5L8.5 18z"/></svg>); // Sword/Attack icon
const AdvantageIcon = () => ( <svg style={styles.modTagIcon} /* ... */ >{/* ... */}</svg> );
const DisadvantageIcon = () => ( <svg style={styles.modTagIcon} /* ... */ >{/* ... */}</svg> );
// --- Вспомогательная функция для форматирования целей модификатора ---
const formatModifierTargets = (targets) => {
    if (!targets || typeof targets !== 'object') return null;

    const formattedTargets = [];
    for (const [key, value] of Object.entries(targets)) {
        let formattedValue = '';
        if (value === true) {
            // Просто ключ, если значение true (например, "strength_saves": true)
            formattedValue = key;
        } else if (Array.isArray(value) && value.length > 0) {
            // Ключ и список значений (например, "skills": ["acrobatics", "stealth"])
            formattedValue = `${key}: ${value.join(', ')}`;
        } else if (typeof value === 'string') {
             // Ключ и строковое значение (например, "attack_rolls": "melee")
             formattedValue = `${key}: ${value}`;
        }
        // Игнорируем, если value === false или пустой массив/строка

        if (formattedValue) {
            // Простое преобразование ключей для читаемости (можно расширить)
            const readableKey = key
                .replace(/_/g, ' ') // Заменяем _ на пробел
                .replace('saves', 'спасброски') // Переводим
                .replace('checks', 'проверки')
                .replace('skills', 'навыки')
                .replace('attack rolls', 'броски атаки');
                // Добавьте другие переводы по необходимости

            formattedTargets.push(readableKey + (value === true ? '' : `: ${Array.isArray(value) ? value.join(', ') : value}`));
        }
    }


    if (formattedTargets.length === 0) return null;

    return (
        <ul style={styles.modifierTargetList}>
            {formattedTargets.map((target, index) => (
                <li key={index} style={styles.modifierTargetItem}>{target}</li>
            ))}
        </ul>
    );
};


const StatusEffectDetailModal = ({ effect, onClose }) => {
    if (!effect) return null;

    // Анимация для overlay и modal (оставляем как есть)
    const animationStyle = `
        @keyframes fadeInBlur { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(5px); } }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;

    // Форматируем цели модификатора
    const formattedTargets = formatModifierTargets(effect.roll_modifier_targets);

    const acModifier = effect.ac_modifier;
    const attackRollModifier = effect.attack_roll_modifier;

return (
        <>
            <style>{animationStyle}</style>
            {/* Overlay */}
            <div style={styles.overlay} onClick={onClose}> {/* Источник: [Source: 1435] */}
                {/* Modal Container */}
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}> {/* Источник: [Source: 1435] */}
                    {/* Close Button (Top Right) */}
                    <button onClick={onClose} style={styles.closeButton} title="Закрыть">×</button> {/* Источник: [Source: 1436] */}
                    {/* Header Section */}
                    <div style={styles.headerSection}> {/* Источник: [Source: 1436] */}
                         <div style={styles.iconContainer}><StatusIcon /></div> {/* Источник: [Source: 1436-1437] */}
                         <h2 style={styles.title}>{effect.name}</h2> {/* Источник: [Source: 1437] */}
                    </div>
                    {/* Content Section (Scrollable) */}
                    <div style={styles.contentSection}> {/* Источник: [Source: 1437] */}
                        {/* Описание */}
                        <p style={styles.descriptionText}> {/* Источник: [Source: 1438-1439] */}
                            {effect.description || "Описание отсутствует."}
                        </p>
                        {/* --- ОБНОВЛЕННАЯ СЕКЦИЯ МОДИФИКАТОРА --- */}
                        {(effect.roll_modifier_type || acModifier !== null || attackRollModifier !== null) && ( // Показываем секцию, если есть ЛЮБОЙ модификатор
                            <div style={styles.modifierSection}> {/* Источник: [Source: 1440] */}
                                <h3 style={styles.modifierTitle}>Модификаторы</h3> {/* Изменили заголовок */}

                                {effect.roll_modifier_type && ( // Показываем блок Преимущества/Помехи только если он есть
                                    <div style={styles.modifierBlock}>
                                        <p style={styles.modifierType}>
                                            Броски: <span style={effect.roll_modifier_type === 'advantage' ? styles.advantageText : styles.disadvantageText}> {/* Источник: [Source: 1441-1443] */}
                                                {effect.roll_modifier_type === 'advantage' ? <><AdvantageIcon /> Преимущество</> : <><DisadvantageIcon /> Помеха</>}
                                            </span>
                                        </p>
                                        {formattedTargets ? (
                                            <>
                                                <p style={styles.modifierTargetsLabel}>Цели:</p> {/* Источник: [Source: 1444] */}
                                                {formattedTargets} {/* Источник: [Source: 1445] */}
                                            </>
                                        ) : (
                                             <p style={styles.modifierTargetsLabel}>Цели: Все броски</p> // Уточнено
                                        )}
                                    </div>
                                )}

                                {/* --- НОВЫЙ БЛОК: Числовые модификаторы --- */}
                                {acModifier !== null && (
                                     <div style={styles.modifierBlock}>
                                         <p style={styles.modifierNumeric}>
                                             <ACMoIcon /> КЗ (AC): <span style={acModifier > 0 ? styles.positiveMod : styles.negativeMod}>{acModifier > 0 ? `+${acModifier}` : acModifier}</span>
                                         </p>
                                     </div>
                                )}
                                {attackRollModifier !== null && (
                                    <div style={styles.modifierBlock}>
                                        <p style={styles.modifierNumeric}>
                                            <AttackModIcon /> Бросок Атаки: <span style={attackRollModifier > 0 ? styles.positiveMod : styles.negativeMod}>{attackRollModifier > 0 ? `+${attackRollModifier}` : attackRollModifier}</span>
                                        </p>
                                    </div>
                                )}
                                {/* --- КОНЕЦ НОВОГО БЛОКА --- */}

                            </div>
                        )}
                        {/* --- КОНЕЦ ОБНОВЛЕННОЙ СЕКЦИИ --- */}

                         {/* Другие детали эффекта... */} {/* Источник: [Source: 1447-1448] */}

                    </div>
                    {/* Footer Section */}
                    <div style={styles.footerSection}> {/* Источник: [Source: 1449] */}
                        <button onClick={onClose} style={styles.closeBottomButton}>Закрыть</button> {/* Источник: [Source: 1449] */}
                    </div>
                </div>
            </div>
        </>
    );

};

// --- Стили ---
const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', // Чуть темнее фон
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1050, animation: 'fadeInBlur 0.3s ease-out forwards', opacity: 0,
        backdropFilter: 'blur(5px)',
    },
    modal: {
        background: theme.colors.surface, // Основной фон модалки
        borderRadius: '16px', // Более скругленные углы
        width: '90%', maxWidth: '550px', // Немного уже
        maxHeight: '85vh', // Ограничение по высоте
        display: 'flex', flexDirection: 'column', // Вертикальная компоновка
        position: 'relative',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)', // Более выраженная тень
        color: theme.colors.text,
        border: `1px solid ${theme.colors.surfaceVariant}44`, // Тонкая рамка
        animation: 'scaleUp 0.3s ease-out forwards', transform: 'scale(0.9)', opacity: 0,
        overflow: 'hidden', // Скрываем overflow здесь, скролл будет внутри contentSection
    },
    closeButton: { // Кнопка "X"
        position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none',
        color: theme.colors.textSecondary, fontSize: '2rem', // Крупнее
        cursor: 'pointer', lineHeight: 1,
        padding: '5px', borderRadius: '50%', // Круглый фон при наведении
        transition: 'all 0.2s ease', zIndex: 10, // Поверх всего
        ':hover': { color: theme.colors.primary, background: `${theme.colors.primary}22` }
    },
    // --- Header ---
    headerSection: {
        display: 'flex',
        flexDirection: 'column', // Иконка над текстом
        alignItems: 'center',
        padding: '30px 25px 20px 25px', // Отступы
        background: theme.colors.surfaceVariant, // Другой фон для шапки
        borderBottom: `1px solid ${theme.colors.surfaceVariant}88`, // Разделитель
        textAlign: 'center',
    },
    iconContainer: {
        width: '50px', // Размер контейнера иконки
        height: '50px',
        borderRadius: '50%', // Круглый
        background: `${theme.colors.primary}33`, // Полупрозрачный фон основного цвета
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '15px', // Отступ до заголовка
    },
    titleIcon: { // Сама иконка
        width: '28px', // Размер иконки внутри круга
        height: '28px',
        fill: theme.colors.primary, // Основной цвет
    },
    title: {
        margin: 0,
        color: theme.colors.primary, // Основной цвет
        fontSize: '1.6rem', // Крупнее
        fontWeight: '600',
        lineHeight: 1.3,
    },
    // --- Content ---
    contentSection: {
        padding: '25px', // Отступы
        flexGrow: 1, // Занимает доступное пространство
        overflowY: 'auto', // Включаем скроллбар для этого блока
        background: theme.colors.surface, // Фон как у модалки
        // Стилизация скроллбара (Webkit)
        '::-webkit-scrollbar': { width: '8px' },
        '::-webkit-scrollbar-track': { background: `${theme.colors.surfaceVariant}22`, borderRadius: '4px' },
        '::-webkit-scrollbar-thumb': { background: theme.colors.textSecondary, borderRadius: '4px' },
        '::-webkit-scrollbar-thumb:hover': { background: theme.colors.primary }
    },
    descriptionText: {
        margin: '0 0 20px 0', // Добавлен отступ снизу перед секцией модификатора
        lineHeight: 1.7, // Улучшенная читаемость
        fontSize: '1rem',
        whiteSpace: 'pre-wrap',
        color: theme.colors.text,
    },
    detailText: { // Стиль для доп. деталей (если будут)
        fontSize: '0.9rem',
        color: theme.colors.textSecondary,
        marginTop: '10px',
        borderTop: `1px dashed ${theme.colors.surfaceVariant}55`,
        paddingTop: '10px',
    },
    // --- НОВЫЕ СТИЛИ: Секция Модификатора ---
    modifierSection: { // Стиль всей секции модификаторов
        marginTop: '20px',
        paddingTop: '15px',
        borderTop: `1px dashed ${theme.colors.surfaceVariant}88`,
        background: `${theme.colors.surfaceVariant}1A`,
        borderRadius: '8px',
        padding: '15px',
        display: 'flex', // Используем flex для блоков внутри
        flexDirection: 'column', // Блоки идут друг под другом
        gap: '15px' // Отступ между блоками
    },
    modifierTitle: { // Заголовок секции "Модификаторы"
        margin: '0 0 10px 0',
        fontSize: '1.1rem',
        fontWeight: '600',
        color: theme.colors.secondary,
        paddingBottom: '5px',
        borderBottom: `1px solid ${theme.colors.secondary}44` // Тонкая линия под заголовком секции
    },
    modifierBlock: { // Контейнер для одного типа модификатора (Adv/Disadv, AC, Attack)
        // Убрали рамку, фон и т.д. отсюда
    },
    modifierType: { // Текст "Броски: Преимущество/Помеха"
        margin: '0 0 5px 0', // Уменьшен нижний отступ
        fontSize: '1rem',
        color: theme.colors.text, // Белый цвет для "Броски:"
        display: 'flex',
        alignItems: 'center',
        gap: '8px' // Отступ между "Броски:" и иконкой/текстом
    },
     advantageText: { // Стиль для "Преимущество"
        color: theme.colors.success || '#66BB6A',
        fontWeight: 'bold',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px'
    },
    disadvantageText: { // Стиль для "Помеха"
        color: theme.colors.error || '#CF6679',
        fontWeight: 'bold',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px'
    },
    modTagIcon: { // Иконка для Преим/Помехи
        width: '16px', // Чуть больше
        height: '16px',
        fill: 'currentColor',
        verticalAlign: 'bottom' // Выравнивание
    },
    modifierTargetsLabel: { // Текст "Цели:"
        margin: '5px 0 5px 0', // Отступы
        fontSize: '0.9rem',
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
    },
    modifierTargetList: { // Список целей
        margin: 0,
        paddingLeft: '20px',
        listStyle: 'disc',
        color: theme.colors.text,
    },
    modifierTargetItem: { // Элемент списка целей
        marginBottom: '5px',
        fontSize: '0.95rem',
        lineHeight: 1.5,
    },
    // --- НОВЫЕ СТИЛИ для числовых модификаторов ---
    modifierNumeric: { // Стиль строки с числовым модификатором
        margin: '0',
        fontSize: '1rem',
        color: theme.colors.text,
        display: 'flex',
        alignItems: 'center',
        gap: '8px' // Отступ между иконкой и текстом
    },
    modIcon: { // Иконка для AC/Attack мода
        width: '16px',
        height: '16px',
        fill: theme.colors.textSecondary, // Серая иконка по умолчанию
        opacity: 0.8
    },
    positiveMod: { // Стиль для положительного значения мода
        fontWeight: 'bold',
        color: theme.colors.success || '#66BB6A',
    },
    negativeMod: { // Стиль для отрицательного значения мода
        fontWeight: 'bold',
        color: theme.colors.error || '#CF6679',
    },
    // --- КОНЕЦ НОВЫХ СТИЛЕЙ ---

    // --- Footer ---
    footerSection: {
        display: 'flex',
        justifyContent: 'flex-end', // Кнопка справа
        padding: '15px 25px', // Отступы
        borderTop: `1px solid ${theme.colors.surfaceVariant}44`, // Разделитель
        background: theme.colors.surface, // Фон как у модалки
    },
    closeBottomButton: { // Кнопка "Закрыть" внизу
        padding: '10px 25px',
        background: theme.colors.primary, // Основной цвет фона
        color: theme.colors.background || theme.colors.text, // Цвет текста (белый или черный в зависимости от фона)
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: theme.transitions.default,
        fontWeight: '600', // Жирнее
        fontSize: '0.95rem',
        ':hover': {
            opacity: 0.85, // Легкое затемнение/осветление при наведении
            boxShadow: `0 4px 15px ${theme.colors.primary}55` // Тень при наведении
        }
    },
};

export default StatusEffectDetailModal;
