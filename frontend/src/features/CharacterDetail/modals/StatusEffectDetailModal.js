// src/features/CharacterDetail/modals/StatusEffectDetailModal.js
import React from 'react';
// --- ИЗМЕНЕНИЕ: Убедитесь, что путь к theme правильный ---
import { theme } from '../../../styles/theme'; // <--- Проверьте этот путь

// --- Иконки ---
// Можно использовать иконку, соответствующую типу эффекта, если передавать тип
// Пока оставим общую иконку
const StatusIcon = () => (<svg style={styles.titleIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>); // Иконка Info

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

    return (
        <>
            <style>{animationStyle}</style>
            {/* Overlay */}
            <div style={styles.overlay} onClick={onClose}>
                {/* Modal Container */}
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    {/* Close Button (Top Right) */}
                    <button onClick={onClose} style={styles.closeButton} title="Закрыть">×</button>

                    {/* Header Section */}
                    <div style={styles.headerSection}>
                        <div style={styles.iconContainer}>
                            <StatusIcon />
                        </div>
                        <h2 style={styles.title}>{effect.name}</h2>
                    </div>

                    {/* Content Section (Scrollable) */}
                    <div style={styles.contentSection}>
                        {/* Описание */}
                        <p style={styles.descriptionText}>
                            {effect.description || "Описание отсутствует."}
                        </p>

                        {/* --- НОВОЕ: Секция Модификатора Броска --- */}
                        {effect.roll_modifier_type && (
                            <div style={styles.modifierSection}>
                                <h3 style={styles.modifierTitle}>Модификатор Броска</h3>
                                <p style={styles.modifierType}>
                                    Тип: <span style={effect.roll_modifier_type === 'advantage' ? styles.advantageText : styles.disadvantageText}>
                                        {effect.roll_modifier_type === 'advantage' ? 'Преимущество' : 'Помеха'}
                                    </span>
                                </p>
                                {formattedTargets ? (
                                    <>
                                        <p style={styles.modifierTargetsLabel}>Цели:</p>
                                        {formattedTargets}
                                    </>
                                ) : (
                                    <p style={styles.modifierTargetsLabel}>Цели: Не указаны</p>
                                )}
                            </div>
                        )}
                        {/* --- КОНЕЦ НОВОЙ СЕКЦИИ --- */}

                        {/* Можно добавить сюда другие детали эффекта, если они есть */}
                        {/* Например:
                        {effect.duration && <p style={styles.detailText}>Длительность: {effect.duration}</p>}
                        {effect.source && <p style={styles.detailText}>Источник: {effect.source}</p>}
                        */}
                    </div>

                    {/* Footer Section */}
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
    modifierSection: {
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: `1px dashed ${theme.colors.surfaceVariant}88`, // Разделитель
        background: `${theme.colors.surfaceVariant}1A`, // Легкий фон для секции
        borderRadius: '8px',
        padding: '15px',
    },
    modifierTitle: {
        margin: '0 0 10px 0',
        fontSize: '1.1rem',
        fontWeight: '600',
        color: theme.colors.secondary, // Используем вторичный цвет для подзаголовка
    },
    modifierType: {
        margin: '0 0 10px 0',
        fontSize: '1rem',
        color: theme.colors.textSecondary,
    },
    advantageText: { // Стиль для "Преимущество"
        color: theme.colors.success || '#66BB6A',
        fontWeight: 'bold',
    },
    disadvantageText: { // Стиль для "Помеха"
        color: theme.colors.error || '#CF6679',
        fontWeight: 'bold',
    },
    modifierTargetsLabel: {
        margin: '10px 0 5px 0',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
    },
    modifierTargetList: { // Список целей
        margin: 0,
        paddingLeft: '20px', // Отступ для маркеров списка
        listStyle: 'disc', // Маркеры списка
        color: theme.colors.text,
    },
    modifierTargetItem: { // Элемент списка целей
        marginBottom: '5px',
        fontSize: '0.95rem',
        lineHeight: 1.5,
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
