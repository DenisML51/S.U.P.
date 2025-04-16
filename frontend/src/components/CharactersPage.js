import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as apiService from '../apiService'; // Используем apiService
import CreatePartyForm from './CreatePartyForm';
import JoinPartyForm from './JoinPartyForm';
import CreateCharacterModal from './CreateCharacterModal';
import { theme } from '../theme';

const CharactersPage = () => {
  const [userData, setUserData] = useState({ username: "" });
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [showJoinParty, setShowJoinParty] = useState(false);
  const [showCreateCharacter, setShowCreateCharacter] = useState(false);
  const navigate = useNavigate();

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const userRes = await apiService.getCurrentUser();
      setUserData({ username: userRes.data.username });
      const charsRes = await apiService.getMyCharacters();
      setCharacters(charsRes.data);
    } catch (error) {
      console.error("Failed to fetch initial data", error);
      if (error.response && error.response.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      fetchInitialData();
    }
  }, [navigate, fetchInitialData]);

  const handleCreatePartySuccess = (party) => {
    setShowCreateParty(false);
    navigate("/lobby", { state: { party } });
  };

  const handleJoinPartySuccess = (party) => {
    setShowJoinParty(false);
    navigate("/lobby", { state: { party } });
  };

  const handleCharacterCreated = () => {
      setShowCreateCharacter(false);
      fetchInitialData(); // Обновляем список персонажей
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (isLoading) {
      return <div style={{ /* Стиль для лоадера */ }}>Загрузка...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.background, color: theme.colors.text, padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '20px', background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', boxShadow: theme.effects.shadow }}>
          <h1 style={{ margin: 0 }}>Панель персонажей</h1>
          <p style={{ margin: 0 }}>Пользователь: {userData.username}</p>
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: theme.colors.error, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default }}>Выйти</button>
        </header>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <button onClick={() => setShowCreateParty(true)} style={{ flex: 1, padding: '16px', background: theme.colors.primary, color: theme.colors.text, border: 'none', borderRadius: '16px', cursor: 'pointer', transition: theme.transitions.default }}>Создать партию</button>
          <button onClick={() => setShowJoinParty(true)} style={{ flex: 1, padding: '16px', background: theme.colors.secondary, color: theme.colors.text, border: 'none', borderRadius: '16px', cursor: 'pointer', transition: theme.transitions.default }}>Подключиться к партии</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {/* Кнопка создания персонажа */}
          <div
             onClick={() => setShowCreateCharacter(true)}
             style={{
                 background: theme.effects.glass,
                 backdropFilter: theme.effects.blur,
                 borderRadius: '16px',
                 padding: '20px',
                 boxShadow: theme.effects.shadow,
                 display: 'flex',
                 flexDirection: 'column',
                 alignItems: 'center',
                 justifyContent: 'center',
                 cursor: 'pointer',
                 minHeight: '150px', // Увеличено
                 textAlign: 'center',
                 transition: theme.transitions.default,
                 border: `2px dashed ${theme.colors.primary}`, // Added border
                 opacity: 0.7, // Make it look less prominent
             }}
             onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
             onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
            >
            <span style={{ fontSize: '3rem', color: theme.colors.primary, marginBottom: '10px' }}>+</span>
            <span style={{ color: theme.colors.textSecondary }}>Создать персонажа</span>
          </div>

          {/* Карточки персонажей */}
          {characters.map(char => (
            <Link key={char.id} to={`/character/${char.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                  background: theme.effects.glass,
                  backdropFilter: theme.effects.blur,
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: theme.effects.shadow,
                  minHeight: '150px', // Увеличено
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between', // Align items
                  transition: theme.transitions.default,
                  cursor: 'pointer'
               }}
               onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 8px 15px rgba(0, 0, 0, 0.5)`}
               onMouseLeave={(e) => e.currentTarget.style.boxShadow = theme.effects.shadow}
              >
                 <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: theme.colors.primary }}>{char.name}</h3>
                 <div style={{ display: 'flex', justifyContent: 'space-around', color: theme.colors.textSecondary }}>
                    <span>Ур: {char.level}</span>
                    <span>ПЗ: {char.current_hp}/{char.max_hp}</span>
                 </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Модальные окна */}
      {showCreateParty && <CreatePartyForm onClose={() => setShowCreateParty(false)} onSuccess={handleCreatePartySuccess} />}
      {showJoinParty && <JoinPartyForm onClose={() => setShowJoinParty(false)} onSuccess={handleJoinPartySuccess} />}
      {showCreateCharacter && <CreateCharacterModal onClose={() => setShowCreateCharacter(false)} onCharacterCreated={handleCharacterCreated} />}
    </div>
  );
};

export default CharactersPage;