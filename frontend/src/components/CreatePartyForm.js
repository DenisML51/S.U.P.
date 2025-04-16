import React, { useState } from 'react';
import * as apiService from '../apiService'; // Используем apiService
import { theme } from '../theme';

const CreatePartyForm = ({ onClose, onSuccess }) => {
  const [maxPlayers, setMaxPlayers] = useState(4);
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
      if (onSuccess) onSuccess(res.data); // Передаем данные в callback
       // Не закрываем сразу, показываем ключ
    } catch (err) {
      console.error("Create party error:", err);
      setError(err.response?.data?.detail || "Не удалось создать партию");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', color: theme.colors.text, position: 'relative' }}>
         <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        <h2 style={{ textAlign: 'center', marginBottom: '25px', color: theme.colors.primary }}>Создать партию</h2>
        {createdParty ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: theme.colors.secondary, fontWeight: 'bold' }}>Лобби успешно создано!</p>
            <p>Ключ для подключения:</p>
            <p style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px', margin: '10px 0 20px 0' }}>{createdParty.lobby_key}</p>
            <button onClick={onClose} style={{ padding: '10px 20px', background: theme.colors.secondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Закрыть</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label htmlFor="maxPlayers" style={{ display: 'block', marginBottom: '8px' }}>Максимум игроков:</label>
              <input
                type="number"
                id="maxPlayers"
                min="2"
                max="10"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box' }}
              />
            </div>
            {error && <p style={{ color: theme.colors.error, textAlign: 'center', margin: '0' }}>{error}</p>}
            <button type="submit" disabled={isLoading} style={{ padding: '12px 24px', borderRadius: '8px', background: theme.colors.primary, color: theme.colors.text, border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', transition: theme.transitions.default, opacity: isLoading ? 0.7 : 1, marginTop: '10px' }}>
              {isLoading ? 'Создание...' : 'Создать'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreatePartyForm;