import React, { useState } from 'react';
import * as apiService from '../apiService'; // Используем apiService
import { theme } from '../theme';

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
      setIsLoading(false); // Оставляем модалку открытой при ошибке
    }
    // setIsLoading(false); // Убрано, т.к. закрываем при успехе
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', color: theme.colors.text, position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        <h2 style={{ textAlign: 'center', marginBottom: '25px', color: theme.colors.secondary }}>Подключиться к партии</h2>
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="lobbyKey" style={{ display: 'block', marginBottom: '8px' }}>Ключ лобби:</label>
            <input
              type="text"
              id="lobbyKey"
              value={lobbyKey}
              onChange={(e) => setLobbyKey(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', textTransform: 'uppercase' }}
              maxLength={6}
              required
              placeholder="ABCDEF"
            />
          </div>
          {error && <p style={{ color: theme.colors.error, textAlign: 'center', margin: '0' }}>{error}</p>}
          <button type="submit" disabled={isLoading} style={{ padding: '12px 24px', borderRadius: '8px', background: theme.colors.secondary, color: theme.colors.text, border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', transition: theme.transitions.default, opacity: isLoading ? 0.7 : 1, marginTop: '10px' }}>
            {isLoading ? 'Подключение...' : 'Подключиться'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinPartyForm;