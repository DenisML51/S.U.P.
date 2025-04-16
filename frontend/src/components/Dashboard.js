import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Chat from './Chat';
import CreatePartyForm from './CreatePartyForm';
import JoinPartyForm from './JoinPartyForm';
import CreateCharacterModal from './CreateCharacterModal';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme';
const API_URL = "http://localhost:8000";
const Dashboard = () => {
  const [data, setData] = useState({ message: "", characters: [] });
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [showJoinParty, setShowJoinParty] = useState(false);
  const [showCreateCharacter, setShowCreateCharacter] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  useEffect(() => {
    if (!token) {
      navigate("/login");
    } else {
      axios.get(`${API_URL}/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setData(res.data))
      .catch(() => navigate("/login"));
    }
  }, [token, navigate]);
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
  return (
    <div style={{ minHeight: '100vh', background: theme.colors.background, color: theme.colors.text, padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '20px', background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', boxShadow: theme.effects.shadow }}>
          <h1 style={{ margin: 0 }}>Игровая панель</h1>
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: theme.colors.error, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default }}>Выйти</button>
        </header>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <button onClick={() => setShowCreateParty(true)} style={{ flex: 1, padding: '16px', background: theme.colors.primary, color: theme.colors.text, border: 'none', borderRadius: '16px', cursor: 'pointer', transition: theme.transitions.default }}>Создать партию</button>
          <button onClick={() => setShowJoinParty(true)} style={{ flex: 1, padding: '16px', background: theme.colors.secondary, color: theme.colors.text, border: 'none', borderRadius: '16px', cursor: 'pointer', transition: theme.transitions.default }}>Подключиться к партии</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
          <div onClick={() => setShowCreateCharacter(true)} style={{ background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '20px', boxShadow: theme.effects.shadow, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: '120px' }}>
            <span style={{ fontSize: '2rem', color: theme.colors.primary }}>+</span>
          </div>
          {data.characters.map(char => (
            <div key={char.id} style={{ background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '20px', boxShadow: theme.effects.shadow, minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <h3 style={{ margin: '0 0 8px 0' }}>{char.name}</h3>
              <p style={{ margin: 0 }}>Уровень: {char.level}</p>
              <p style={{ margin: 0 }}>ПЗ: {char.hp}</p>
            </div>
          ))}
        </div>
        <Chat token={token} />
      </div>
      {showCreateParty && <CreatePartyForm onClose={() => setShowCreateParty(false)} />}
      {showJoinParty && <JoinPartyForm onClose={() => setShowJoinParty(false)} />}
      {showCreateCharacter && <CreateCharacterModal onClose={() => setShowCreateCharacter(false)} />}
    </div>
  );
};
export default Dashboard;
