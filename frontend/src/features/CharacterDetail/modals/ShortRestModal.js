// src/features/CharacterDetail/modals/ShortRestModal.js
import React, { useState, useMemo } from 'react';
// --- ИЗМЕНЕНИЕ: Убедитесь, что путь к theme правильный ---
import { theme } from '../../../styles/theme'; // <--- Проверьте этот путь

// --- Иконки ---
const ShortRestIcon = () => ( <svg style={styles.titleIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> ); // Иконка для заголовка
const StaminaIcon = () => ( <svg style={styles.staminaIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> ); // Иконка сердца/выносливости

const ShortRestModal = ({ currentStamina, maxStamina, onClose, onSubmit }) => {
    // Инициализируем 1, если есть хотя бы 1 ОС, иначе 0
    const initialDice = currentStamina > 0 ? 1 : 0;
    const [diceToSpend, setDiceToSpend] = useState(initialDice);
    const [error, setError] = useState('');

    const handleDiceChange = (e) => {
        let value = e.target.value;
        // Убираем ведущие нули и нечисловые символы
        value = value.replace(/^0+|[^\d]/g, '');

        if (value === '') {
            setDiceToSpend(''); // Позволяем очистить поле
            setError(''); // Сбрасываем ошибку при очистке
        } else {
            let numValue = parseInt(value, 10);
            // Ограничиваем ввод между 1 и доступным количеством ОС
            numValue = Math.max(1, Math.min(numValue, currentStamina));
            setDiceToSpend(numValue);
            setError(''); // Сбрасываем ошибку при корректном вводе
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        // Проверяем, что значение не пустое перед парсингом
        if (diceToSpend === '') {
             setError(`Введите количество ОС для траты.`);
             return;
        }
        const dice = parseInt(diceToSpend, 10);
        // Дополнительная проверка на NaN (хотя handleDiceChange должен это предотвращать)
        if (isNaN(dice) || dice <= 0 || dice > currentStamina) {
            setError(`Введите корректное число ОС (от 1 до ${currentStamina}).`);
            return;
        }
        onSubmit(dice); // Вызываем колбэк с количеством кубиков
        // onClose(); // Закрытие окна теперь в onSubmit или onSuccess родителя
    };

    // Анимация для overlay
    const animationStyle = `
        @keyframes fadeInBlur { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(5px); } }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;

    return (
        <>
            <style>{animationStyle}</style>
            <div style={styles.overlay} onClick={onClose}>
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.titleContainer}> {/* Контейнер для заголовка и иконки */}
                        <ShortRestIcon />
                        <h3 style={styles.title}>Короткий Отдых</h3>
                    </div>
                    <button onClick={onClose} style={styles.closeButton} title="Закрыть">×</button>

                    <form onSubmit={handleSubmit}>
                        {/* Отображение ОС */}
                        <div style={styles.staminaInfoContainer}>
                             <StaminaIcon />
                             <p style={styles.infoText}>
                                 Доступно Очков Стойкости (ОС):
                                 <strong style={styles.staminaValue}> {currentStamina}</strong> / {maxStamina}
                             </p>
                        </div>

                        {/* Поле ввода */}
                        <div style={styles.formGroup}>
                            <label htmlFor="diceInput" style={styles.label}>Сколько ОС потратить на лечение?</label>
                            <input
                                type="number" // Оставляем number для мобильных клавиатур
                                id="diceInput"
                                min="1"
                                max={currentStamina}
                                value={diceToSpend}
                                onChange={handleDiceChange}
                                style={styles.input}
                                required
                                disabled={currentStamina <= 0}
                                placeholder="1" // Плейсхолдер
                                // pattern="\d*" // Можно добавить для HTML5 валидации
                            />
                             <p style={styles.hintText}>
                                 Восстановит <strong style={{color: theme.colors.primary}}>{diceToSpend || 0}к10</strong> + Мод.Вын ПЗ и <strong style={{color: theme.colors.primary}}>1к4</strong> ПУ.
                             </p>
                        </div>

                        {/* Ошибка */}
                        {error && <p style={styles.errorText}>{error}</p>}

                        {/* Кнопки */}
                        <div style={styles.buttonGroup}>
                            <button type="button" onClick={onClose} style={styles.cancelButton}>Отмена</button>
                            <button
                                type="submit"
                                style={(!diceToSpend || diceToSpend <= 0 || diceToSpend > currentStamina) ? {...styles.submitButton, ...styles.submitButtonDisabled} : styles.submitButton}
                                disabled={!diceToSpend || diceToSpend <= 0 || diceToSpend > currentStamina}
                            >
                                Отдохнуть ({diceToSpend || 0} ОС)
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

// --- Стили ---
const styles = {
    // Стили overlay и modal как в SelectMedkitModal
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1050, animation: 'fadeInBlur 0.3s ease-out forwards', opacity: 0,
        backdropFilter: 'blur(5px)', // Добавляем блюр сразу, т.к. opacity 0
    },
    modal: {
        background: theme.colors.surface, padding: '30px', borderRadius: '12px',
        width: '90%', maxWidth: '420px', // Чуть уже
        maxHeight: '80vh', overflowY: 'auto', position: 'relative',
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
        gap: '10px', // Отступ между иконкой и текстом
        marginBottom: '20px', // Отступ снизу
        paddingBottom: '15px', // Отступ для линии
        borderBottom: `1px solid ${theme.colors.surfaceVariant}`, // Линия под заголовком
    },
    titleIcon: { // Стиль иконки в заголовке
        width: '24px',
        height: '24px',
        fill: theme.colors.secondary, // Цвет иконки как у заголовка
    },
    title: {
        margin: 0, // Убираем отступы у h3
        color: theme.colors.secondary, // Цвет заголовка
        fontSize: '1.3rem',
        fontWeight: '600',
    },
    closeButton: {
        position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none',
        color: theme.colors.textSecondary, fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1,
        padding: '0 5px', transition: 'color 0.2s', ':hover': { color: theme.colors.primary }
    },
    staminaInfoContainer: { // Контейнер для отображения ОС
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        background: theme.colors.surfaceVariant, // Легкий фон
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '25px', // Отступ до формы
    },
    staminaIcon: { // Иконка ОС
        width: '18px',
        height: '18px',
        fill: theme.colors.primary, // Цвет иконки
    },
    infoText: { // Текст про ОС
        margin: 0, // Убираем отступы у p
        color: theme.colors.textSecondary,
        fontSize: '0.95rem', // Чуть крупнее
    },
    staminaValue: { // Выделение текущих ОС
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: '1rem',
    },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '1rem', color: theme.colors.text }, // Крупнее и белый цвет
    input: { // Стиль поля ввода
        width: '100%',
        padding: '12px 15px', // Увеличил паддинг
        borderRadius: '8px',
        border: `1px solid ${theme.colors.surfaceVariant}`, // Рамка как у модалки
        background: theme.colors.background, // Фон как у страницы
        color: theme.colors.text,
        fontSize: '1.1rem', // Крупнее шрифт
        boxSizing: 'border-box',
        textAlign: 'center',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ':focus': { // Стиль при фокусе
            borderColor: theme.colors.primary,
            boxShadow: `0 0 0 2px ${theme.colors.primary}44`,
            outline: 'none',
        },
        ':disabled': { opacity: 0.5, cursor: 'not-allowed', background: theme.colors.surface } // Стиль для неактивного
    },
    hintText: { fontSize: '0.85rem', color: theme.colors.textSecondary, marginTop: '8px', textAlign: 'center' },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '12px', fontWeight: 'bold', minHeight: '1.2em', fontSize: '0.9rem' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surfaceVariant}` }, // Увеличил отступ сверху
    // Стили кнопок как в SelectMedkitModal
    cancelButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, fontWeight: '500', fontSize: '0.9rem', ':hover': { opacity: 1 } },
    submitButton: { padding: '10px 20px', background: theme.colors.secondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', fontSize: '0.9rem', ':hover': { filter: 'brightness(1.1)' } },
    submitButtonDisabled: { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(50%)', boxShadow: 'none' },
};

export default ShortRestModal;
