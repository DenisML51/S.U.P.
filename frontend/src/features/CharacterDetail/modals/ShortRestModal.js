// src/features/CharacterDetail/modals/ShortRestModal.js
import React, { useState } from 'react';
import { theme } from '../../../styles/theme'; // Путь к теме

const ShortRestModal = ({ currentStamina, maxStamina, onClose, onSubmit }) => {
    // Инициализируем 1, если есть хотя бы 1 ОС, иначе 0
    const initialDice = currentStamina > 0 ? 1 : 0;
    const [diceToSpend, setDiceToSpend] = useState(initialDice);
    const [error, setError] = useState('');

    const handleDiceChange = (e) => {
        const value = parseInt(e.target.value, 10);
        // Ограничиваем ввод между 1 и доступным количеством ОС
        if (isNaN(value)) {
            setDiceToSpend(''); // Очищаем, если не число
        } else {
            setDiceToSpend(Math.max(1, Math.min(value, currentStamina)));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        const dice = parseInt(diceToSpend, 10);
        if (isNaN(dice) || dice <= 0 || dice > currentStamina) {
            setError(`Введите корректное число ОС (от 1 до ${currentStamina}).`);
            return;
        }
        onSubmit(dice); // Вызываем колбэк с количеством кубиков
        onClose(); // Закрываем модалку
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h3 style={styles.title}>Короткий Отдых</h3>
                <button onClick={onClose} style={styles.closeButton}>×</button>

                <form onSubmit={handleSubmit}>
                    <p style={styles.infoText}>
                        Доступно Очков Стойкости (ОС): <strong style={{color: theme.colors.primary}}>{currentStamina}</strong> / {maxStamina}
                    </p>
                    <div style={styles.formGroup}>
                        <label htmlFor="diceInput" style={styles.label}>Сколько ОС потратить на лечение?</label>
                        <input
                            type="number"
                            id="diceInput"
                            min="1"
                            max={currentStamina} // Максимум - доступные ОС
                            value={diceToSpend}
                            onChange={handleDiceChange}
                            style={styles.input}
                            required
                            disabled={currentStamina <= 0} // Нельзя вводить, если ОС нет
                        />
                         <p style={styles.hintText}>Восстановит {diceToSpend || 0}к10 + Мод.Вын ПЗ и 1к4 ПУ.</p>
                    </div>

                    {error && <p style={styles.errorText}>{error}</p>}

                    <div style={styles.buttonGroup}>
                        <button type="button" onClick={onClose} style={styles.cancelButton}>Отмена</button>
                        <button
                            type="submit"
                            style={styles.submitButton}
                            disabled={!diceToSpend || diceToSpend <= 0 || diceToSpend > currentStamina}
                        >
                            Отдохнуть ({diceToSpend || 0} ОС)
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Стили (похожи на другие модалки)
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 },
    modal: { background: theme.colors.surface, padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '400px', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text },
    title: { textAlign: 'center', marginBottom: '15px', color: theme.colors.secondary, fontSize: '1.2rem' },
    closeButton: { position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer' },
    infoText: { textAlign: 'center', color: theme.colors.textSecondary, marginBottom: '20px', fontSize: '0.9rem' },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' },
    input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', textAlign: 'center', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
    hintText: { fontSize: '0.8rem', color: theme.colors.textSecondary, marginTop: '5px', textAlign: 'center' },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '10px', fontWeight: 'bold', minHeight: '1.2em', fontSize: '0.9rem' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '25px', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surface}cc` },
    cancelButton: { padding: '8px 18px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8 },
    submitButton: { padding: '8px 18px', background: theme.colors.secondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
};

export default ShortRestModal;

