// src/features/CharacterList/CharactersPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as apiService from '../../api/apiService';
import CreateCharacterModal from './CreateCharacterModal'; // Импорт модалки
import CreatePartyForm from '../Lobby/CreatePartyForm'; // Импорт форм лобби
import JoinPartyForm from '../Lobby/JoinPartyForm';     // Импорт форм лобби
import { theme } from '../../styles/theme';

const CharactersPage = () => {
  const [userData, setUserData] = useState({ username: "" });
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // Состояние для ошибок загрузки
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [showJoinParty, setShowJoinParty] = useState(false);
  const [showCreateCharacter, setShowCreateCharacter] = useState(false);
  const navigate = useNavigate();

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Сбрасываем ошибку
    try {
      // Параллельно запрашиваем данные пользователя и персонажей
      const [userRes, charsRes] = await Promise.all([
          apiService.getCurrentUser(),
          apiService.getMyCharacters()
      ]);
      setUserData({ username: userRes.data.username });
      setCharacters(charsRes.data);
    } catch (err) {
      console.error("Failed to fetch initial data", err);
       let errorMessage = "Ошибка загрузки данных.";
       if (err.response?.data?.detail) { errorMessage = String(err.response.data.detail); }
       else if (err.message) { errorMessage = err.message; }
       setError(errorMessage); // Устанавливаем ошибку

      if (err.response && err.response.status === 401) {
        console.log("Unauthorized, redirecting to login.");
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]); // navigate остается в зависимостях useCallback

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      fetchInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchInitialData не меняется, убираем из зависимостей Effect

  const handleCreatePartySuccess = (party) => {
    setShowCreateParty(false);
    // Передаем party state при навигации
    navigate("/lobby", { state: { party } });
  };

  const handleJoinPartySuccess = (party) => {
    setShowJoinParty(false);
    // Передаем party state при навигации
    navigate("/lobby", { state: { party } });
  };

  const handleCharacterCreated = () => {
      setShowCreateCharacter(false);
      fetchInitialData(); // Обновляем список персонажей после создания
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // --- Рендеринг ---
  if (isLoading) {
      return <div style={styles.loading}>Загрузка...</div>;
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.contentWrapper}>
        <header style={styles.header}>
          <h1 style={styles.mainTitle}>Панель персонажей</h1>
          <div style={styles.userInfo}>
            <span>Пользователь: {userData.username}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>Выйти</button>
          </div>
        </header>

        {/* Отображение ошибки загрузки */}
        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.actionButtons}>
          <button onClick={() => setShowCreateParty(true)} style={{...styles.button, ...styles.createPartyButton}}>Создать партию</button>
          <button onClick={() => setShowJoinParty(true)} style={{...styles.button, ...styles.joinPartyButton}}>Подключиться к партии</button>
        </div>

        <div style={styles.characterGrid}>
          {/* Кнопка создания персонажа */}
          <div
            onClick={() => setShowCreateCharacter(true)}
            style={styles.createCharacterCard}
            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
           >
            <span style={styles.createCharacterIcon}>+</span>
            <span style={styles.createCharacterText}>Создать персонажа</span>
          </div>

          {/* Карточки персонажей */}
          {characters.map(char => (
            <Link key={char.id} to={`/character/${char.id}`} style={styles.link}>
              <div style={styles.characterCard}
                   onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 8px 15px rgba(0, 0, 0, 0.5)`}
                   onMouseLeave={(e) => e.currentTarget.style.boxShadow = theme.effects.shadow}
              >
                 <h3 style={styles.characterName}>{char.name}</h3>
                 <div style={styles.characterStats}>
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

// Стили
const styles = {
    pageContainer: { minHeight: '100vh', background: theme.colors.background, color: theme.colors.text, padding: '40px 20px' },
    contentWrapper: { maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }, // Уменьшен gap
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', boxShadow: theme.effects.shadow },
    mainTitle: { margin: 0, fontSize: '1.8rem', color: theme.colors.primary }, // Уменьшен размер
    userInfo: { display: 'flex', alignItems: 'center', gap: '15px', color: theme.colors.textSecondary },
    logoutButton: { padding: '8px 16px', background: theme.colors.error, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, ':hover': { opacity: 0.9 } },
    actionButtons: { display: 'flex', gap: '20px' },
    button: { flex: 1, padding: '14px', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: theme.transitions.default, color: theme.colors.background, fontWeight: 'bold', fontSize: '1rem' }, // Цвет текста изменен
    createPartyButton: { background: theme.colors.primary },
    joinPartyButton: { background: theme.colors.secondary },
    characterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
    createCharacterCard: { background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '20px', boxShadow: theme.effects.shadow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: '160px', textAlign: 'center', transition: theme.transitions.default, border: `2px dashed ${theme.colors.primary}`, opacity: 0.7 },
    createCharacterIcon: { fontSize: '3rem', color: theme.colors.primary, marginBottom: '10px', lineHeight: 1 },
    createCharacterText: { color: theme.colors.textSecondary },
    link: { textDecoration: 'none', color: 'inherit' },
    characterCard: { background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '20px', boxShadow: theme.effects.shadow, minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: theme.transitions.default, cursor: 'pointer' },
    characterName: { margin: '0 0 15px 0', textAlign: 'center', color: theme.colors.primary, fontSize: '1.2rem' }, // Уменьшен размер
    characterStats: { display: 'flex', justifyContent: 'space-around', color: theme.colors.textSecondary, fontSize: '0.9rem' }, // Уменьшен размер
    loading: { textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: theme.colors.text },
    errorBanner: { background: `${theme.colors.error}44`, color: theme.colors.error, padding: '10px 15px', borderRadius: '8px', border: `1px solid ${theme.colors.error}`, textAlign: 'center', marginBottom: '20px' },
};

export default CharactersPage;