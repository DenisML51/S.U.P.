// src/features/CharacterDetail/modals/StatusEffectDetailModal.js
import React from 'react';
// --- ИЗМЕНЕНИЕ: Убедитесь, что путь к theme правильный ---
import { theme } from '../../../styles/theme'; // <--- Проверьте этот путь

// --- Иконки ---
// Используем ту же иконку, что и в AddStatusModal или другую подходящую
const StatusIcon = () => (<svg style={styles.titleIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>);

const StatusEffectDetailModal = ({ effect, onClose }) => {
    if (!effect) return null;

    // Анимация для overlay и modal
    const animationStyle = `
        @keyframes fadeInBlur { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(5px); } }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;

    return (
        <>
            <style>{animationStyle}</style>
            <div style={styles.overlay} onClick={onClose}>
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <button onClick={onClose} style={styles.closeButton} title="Закрыть">×</button>

                    {/* Заголовок с иконкой */}
                    <div style={styles.titleContainer}>
                        <StatusIcon />
                        <h2 style={styles.title}>{effect.name}</h2>
                    </div>

                    {/* Секция описания */}
                    <div style={styles.descriptionSection}>
                        {/* Убрали подзаголовок "Описание", т.к. он очевиден */}
                        <p style={styles.descriptionText}>{effect.description || "Описание отсутствует."}</p>
                    </div>

                    {/* Кнопка Закрыть */}
                    <div style={styles.buttonGroup}>
                        <button onClick={onClose} style={styles.closeBottomButton}>Закрыть</button>
                    </div>
                </div>
            </div>
        </>
    );
};

// --- Стили ---
const styles = {
    // Стили overlay и modal как в других модалках
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1050, animation: 'fadeInBlur 0.3s ease-out forwards', opacity: 0,
        backdropFilter: 'blur(5px)',
    },
    modal: {
        background: theme.colors.surface, padding: '30px', borderRadius: '12px',
        width: '90%', maxWidth: '600px', // Немного шире для описаний
        maxHeight: '85vh', overflowY: 'auto', position: 'relative',
        boxShadow: '0 5px 25px rgba(0,0,0,0.4)', color: theme.colors.text,
        border: `1px solid ${theme.colors.surfaceVariant}`, display: 'flex', flexDirection: 'column',
        animation: 'scaleUp 0.3s ease-out forwards', transform: 'scale(0.9)', opacity: 0,
        '::-webkit-scrollbar': { width: '8px' },
        '::-webkit-scrollbar-track': { background: theme.colors.surface, borderRadius: '4px' },
        '::-webkit-scrollbar-thumb': { background: theme.colors.surfaceVariant, borderRadius: '4px' },
        '::-webkit-scrollbar-thumb:hover': { background: theme.colors.textSecondary }
    },
    '@keyframes scaleUp': { 'from': { transform: 'scale(0.9)', opacity: 0 }, 'to': { transform: 'scale(1)', opacity: 1 } },
    '@keyframes fadeInBlur': { 'from': { opacity: 0, backdropFilter: 'blur(0px)' }, 'to': { opacity: 1, backdropFilter: 'blur(5px)' } },
    titleContainer: { // Контейнер для заголовка и иконки
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center', // Центрируем
        gap: '12px', // Отступ между иконкой и текстом
        marginBottom: '20px', // Отступ снизу
        paddingBottom: '15px', // Отступ для линии
        borderBottom: `1px solid ${theme.colors.surfaceVariant}`, // Линия под заголовком
    },
    titleIcon: { // Стиль иконки в заголовке
        width: '24px', // Размер иконки
        height: '24px',
        fill: theme.colors.primary, // Цвет иконки как у заголовка
        flexShrink: 0,
    },
    title: {
        margin: 0, // Убираем отступы у h2
        color: theme.colors.primary, // Цвет заголовка
        fontSize: '1.4rem', // Размер шрифта
        fontWeight: '600',
        textAlign: 'center',
    },
    closeButton: {
        position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none',
        color: theme.colors.textSecondary, fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1,
        padding: '0 5px', transition: 'color 0.2s', ':hover': { color: theme.colors.primary }
    },
    descriptionSection: {
        marginBottom: '25px', // Отступ до кнопок
        flexGrow: 1, // Занимает доступное пространство
    },
    // Убрали subHeader, т.к. он не нужен
    descriptionText: {
        margin: 0,
        lineHeight: 1.7, // Увеличил межстрочный интервал
        fontSize: '1rem', // Увеличил шрифт описания
        whiteSpace: 'pre-wrap', // Сохраняем переносы строк
        color: theme.colors.text, // Основной цвет текста
        background: theme.colors.background, // Фон чуть темнее
        padding: '15px', // Внутренние отступы
        borderRadius: '8px', // Скругление
        border: `1px solid ${theme.colors.surfaceVariant}`, // Рамка
    },
    buttonGroup: {
        display: 'flex',
        justifyContent: 'flex-end', // Кнопка справа
        marginTop: 'auto', // Прижимаем к низу
        paddingTop: '20px', // Отступ сверху
        borderTop: `1px solid ${theme.colors.surfaceVariant}` // Разделитель
    },
    closeBottomButton: { // Стиль кнопки "Закрыть"
        padding: '10px 25px',
        background: theme.colors.textSecondary, // Серый фон
        color: theme.colors.background,
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: theme.transitions.default,
        opacity: 0.8,
        fontWeight: '500',
        fontSize: '0.9rem',
        ':hover': { opacity: 1 }
    },
};

export default StatusEffectDetailModal;
