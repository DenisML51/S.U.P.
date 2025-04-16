import React, { useState } from 'react';
import axios from 'axios';
import { theme } from '../theme';
const API_URL = "http://localhost:8000";
const CreatePartyForm = ({ onClose, onSuccess }) => {
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [lobbyKey, setLobbyKey] = useState("");
  const token = localStorage.getItem("token");
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/parties`, { max_players: maxPlayers }, { headers: { Authorization: `Bearer ${token}` } });
      setLobbyKey(res.data.lobby_key);
      if(onSuccess) onSuccess(res.data);
    } catch (error) {
      alert(error.response?.data?.detail || error.message);
    }
  };
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: theme.colors.surface, padding: '20px', borderRadius: '16px', width: '300px' }}>
        <h2 style={{ textAlign: 'center', color: theme.colors.text }}>Создать партию</h2>
        {lobbyKey ? (
          <div style={{ textAlign: 'center', color: theme.colors.text }}>
            <p>Лобби создано!</p>
            <p>Ключ: <strong>{lobbyKey}</strong></p>
            <button onClick={onClose} style={{ padding: '8px 16px', background: theme.colors.primary, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Закрыть</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ color: theme.colors.text }}>Максимум игроков:</label>
            <input type="number" min="2" max="10" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}` }} />
            <button type="submit" style={{ padding: '8px 16px', background: theme.colors.primary, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Создать</button>
          </form>
        )}
      </div>
    </div>
  );
};
export default CreatePartyForm;
