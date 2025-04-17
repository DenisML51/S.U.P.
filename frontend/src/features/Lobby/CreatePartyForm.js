// src/features/Lobby/CreatePartyForm.js
import React, { useState } from 'react';
import * as apiService from '../../api/apiService';
import { theme } from '../../styles/theme'; // Обновленный импорт

const CreatePartyForm = ({ onClose, onSuccess }) => {
  const [maxPlayers, setMaxPlayers] = useState(4); // Значение по умолчанию
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdParty, setCreatedParty] = useState(null); // Для отображения ключа

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await apiService.createParty(maxPlayers);
      setCreatedParty(res.data); // Сохраняем данные созданной партии
      // Не закрываем сразу, показываем ключ
       // onSuccess(res.data); // Вызываем onSuccess уже после показа ключа, если нужно
    } catch (err) {
      console.error("Create party error:", err);
      setError(err.response?.data?.detail || "Не удалось создать партию");
       setIsLoading(false); // Оставляем форму открытой при ошибке
    }
     // setIsLoading(false); // Убираем отсюда, т.к. не закрываем при успехе сразу
  };

  const handleCloseAndProceed = () => {
      if (createdParty && onSuccess) {
          onSuccess(createdParty); // Передаем данные в callback при закрытии
      }
      onClose(); // Закрываем модалку
  }

  return (
    // Оверлей и базовое модальное окно
    <div style={styles.overlay}>
      <div style={styles.modal}>
         {/* Кнопка закрытия (крестик) */}
         <button onClick={handleCloseAndProceed} style={styles.closeButton} disabled={isLoading}>×</button>

        <h2 style={styles.title}>Создать партию</h2>

        {createdParty ? (
          // Отображение после успешного создания
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: theme.colors.secondary, fontWeight: 'bold' }}>Лобби успешно создано!</p>
            <p>Ключ для подключения:</p>
            <p style={styles.lobbyKeyDisplay}>{createdParty.lobby_key}</p>
            {/* Кнопка "Продолжить" или "Закрыть" */}
            <button onClick={handleCloseAndProceed} style={styles.submitButton}>
                {onSuccess ? "Войти в лобби" : "Закрыть"}
             </button>
          </div>
        ) : (
          // Форма для создания
          <form onSubmit={handleSubmit} style={styles.form}>
            <div>
              <label htmlFor="maxPlayers" style={styles.label}>Максимум игроков:</label>
              <input
                type="number"
                id="maxPlayers"
                min="2"
                max="10"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                style={styles.input}
                required // Добавим required
                disabled={isLoading}
              />
            </div>
            {error && <p style={styles.errorText}>{error}</p>}
            <button type="submit" disabled={isLoading} style={styles.submitButton}>
              {isLoading ? 'Создание...' : 'Создать'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// Стили
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', color: theme.colors.text, position: 'relative', boxShadow: theme.effects.shadow },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer', ':disabled': { opacity: 0.5 } },
    title: { textAlign: 'center', marginBottom: '25px', color: theme.colors.primary },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' },
    input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', ':disabled': { opacity: 0.5 } },
    errorText: { color: theme.colors.error, textAlign: 'center', margin: '0', fontSize: '0.9rem' },
    submitButton: { padding: '12px 24px', borderRadius: '8px', background: theme.colors.primary, color: theme.colors.background, border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', transition: theme.transitions.default, ':disabled': { opacity: 0.5, cursor: 'not-allowed' }, marginTop: '10px' },
    lobbyKeyDisplay: { background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', fontSize: '1.3rem', fontWeight: 'bold', letterSpacing: '3px', margin: '10px 0 25px 0', border: `1px dashed ${theme.colors.primary}` },
};

export default CreatePartyForm;