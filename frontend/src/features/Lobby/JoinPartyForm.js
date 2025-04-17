// src/features/Lobby/JoinPartyForm.js
import React, { useState } from 'react';
import * as apiService from '../../api/apiService';
import { theme } from '../../styles/theme'; // Обновленный импорт

const JoinPartyForm = ({ onClose, onSuccess }) => {
  const [lobbyKey, setLobbyKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await apiService.joinParty(lobbyKey.toUpperCase()); // Ключ обычно в верхнем регистре
      if (onSuccess) onSuccess(res.data); // Передаем данные в callback
      onClose(); // Закрываем при успехе
    } catch (err) {
      console.error("Join party error:", err);
      setError(err.response?.data?.detail || "Не удалось подключиться к лобби");
      // Оставляем модалку открытой при ошибке
       setIsLoading(false);
    }
     // setIsLoading(false); // Не нужно здесь, т.к. либо закроется, либо ошибка обработана
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
          <button onClick={onClose} style={styles.closeButton} disabled={isLoading}>×</button>
        <h2 style={styles.title}>Подключиться к партии</h2>
        <form onSubmit={handleJoin} style={styles.form}>
          <div>
            <label htmlFor="lobbyKey" style={styles.label}>Ключ лобби:</label>
            <input
              type="text"
              id="lobbyKey"
              value={lobbyKey}
              onChange={(e) => setLobbyKey(e.target.value.toUpperCase())} // Приводим к верхнему регистру при вводе
              style={styles.input}
              maxLength={6}
              required
              placeholder="ABCDEF"
              autoCapitalize="characters" // Для мобильных устройств
              disabled={isLoading}
            />
          </div>
          {error && <p style={styles.errorText}>{error}</p>}
          <button type="submit" disabled={isLoading || lobbyKey.length !== 6} style={styles.submitButton}>
            {isLoading ? 'Подключение...' : 'Подключиться'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Стили (аналогично CreatePartyForm)
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', color: theme.colors.text, position: 'relative', boxShadow: theme.effects.shadow },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer', ':disabled': { opacity: 0.5 } },
    title: { textAlign: 'center', marginBottom: '25px', color: theme.colors.secondary }, // Используем secondary цвет
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' },
    input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', ':disabled': { opacity: 0.5 } }, // Стили для ключа
    errorText: { color: theme.colors.error, textAlign: 'center', margin: '0', fontSize: '0.9rem' },
    submitButton: { padding: '12px 24px', borderRadius: '8px', background: theme.colors.secondary, color: theme.colors.background, border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', transition: theme.transitions.default, ':disabled': { opacity: 0.5, cursor: 'not-allowed' }, marginTop: '10px' },
};


export default JoinPartyForm;