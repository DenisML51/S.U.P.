import React, { useState } from 'react';
import axios from 'axios';
import { theme } from '../theme';
const API_URL = "http://localhost:8000";
const JoinPartyForm = ({ onClose, onSuccess }) => {
  const [lobbyKey, setLobbyKey] = useState("");
  const [party, setParty] = useState(null);
  const token = localStorage.getItem("token");
  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/parties/join`, { lobby_key: lobbyKey }, { headers: { Authorization: `Bearer ${token}` } });
      setParty(res.data);
      if(onSuccess) onSuccess(res.data);
    } catch (error) {
      alert(error.response?.data?.detail || error.message);
    }
  };
  return (
    <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background: theme.colors.surface, padding: '20px', borderRadius: '16px', width: '300px' }}>
        <h2 style={{ textAlign: 'center', color: theme.colors.text }}>Подключиться к партии</h2>
        {party ? (
          <div style={{ textAlign: 'center', color: theme.colors.text }}>
            <p>Вы подключены к партии!</p>
            <p>Ключ: <strong>{party.lobby_key}</strong></p>
            <button onClick={onClose} style={{ padding: '8px 16px', background: theme.colors.secondary, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Закрыть</button>
          </div>
        ) : (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ color: theme.colors.text }}>Ключ лобби:</label>
            <input type="text" value={lobbyKey} onChange={(e) => setLobbyKey(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}` }} />
            <button type="submit" style={{ padding: '8px 16px', background: theme.colors.secondary, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Подключиться</button>
          </form>
        )}
      </div>
    </div>
  );
};
export default JoinPartyForm;
