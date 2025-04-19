// src/features/CharacterList/CharactersPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as apiService from '../../api/apiService';
import CreateCharacterModal from './CreateCharacterModal'; // Импорт модалки
import CreatePartyForm from '../Lobby/CreatePartyForm'; // Импорт форм лобби
import JoinPartyForm from '../Lobby/JoinPartyForm';     // Импорт форм лобби
import { theme } from '../../styles/theme';
// --- ИЗМЕНЕНИЕ: Импортируем useAuth ---
import { useAuth } from '../../hooks/useAuth';
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

const CharactersPage = () => {
  // --- ИЗМЕНЕНИЕ: Используем useAuth для получения пользователя и logout ---
  const { user, logout, isLoading: authLoading } = useAuth(); // Получаем пользователя и функцию logout
  // Убираем локальное состояние userData, если оно больше не нужно кроме имени
  // const [userData, setUserData] = useState({ username: "" });
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---

  const [characters, setCharacters] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true); // Переименовали isLoading во избежание конфликта
  const [error, setError] = useState(null);
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [showJoinParty, setShowJoinParty] = useState(false);
  const [showCreateCharacter, setShowCreateCharacter] = useState(false);
  const navigate = useNavigate();

  const fetchCharacterData = useCallback(async () => { // Переименовали fetchInitialData
    // Не нужно запрашивать пользователя здесь, он уже есть из useAuth
    setIsLoadingData(true);
    setError(null);
    try {
      console.log("CharactersPage: Fetching characters...");
      const charsRes = await apiService.getMyCharacters();
      setCharacters(charsRes.data || []); // Убедимся, что это массив
      console.log("CharactersPage: Characters loaded:", charsRes.data);
    } catch (err) {
      console.error("Failed to fetch characters", err);
       let errorMessage = "Ошибка загрузки персонажей.";
       if (err.response?.data?.detail) { errorMessage = String(err.response.data.detail); }
       else if (err.message) { errorMessage = err.message; }
       setError(errorMessage);

      // Ошибка 401 должна обрабатываться в apiService или useAuth для автоматического logout
      // if (err.response && err.response.status === 401) { ... }
    } finally {
      setIsLoadingData(false);
    }
  }, []); // Убрали navigate из зависимостей

  useEffect(() => {
    // Данные пользователя загружаются в useAuth
    // Загружаем только список персонажей
    fetchCharacterData();
  }, [fetchCharacterData]); // Зависимость от fetchCharacterData

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
      fetchCharacterData(); // Обновляем список персонажей после создания
  };

  // --- ИЗМЕНЕНИЕ: Используем logout из useAuth ---
  const handleLogout = () => {
    logout(); // Вызываем функцию logout из контекста
    // Редирект теперь должен произойти автоматически в App.js из-за изменения isAuthenticated
    // navigate("/login"); // Эту строку можно убрать, если App.js настроен правильно
    // Или оставить для немедленного перехода, если App.js не успевает среагировать
    navigate("/login", { replace: true }); // Используем replace для надежности
  };
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---

  // --- Рендеринг ---
  // Используем isLoadingData для данных персонажей и authLoading для статуса аутентификации
  if (authLoading || isLoadingData) {
      return <div style={styles.loading}>Загрузка...</div>;
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.contentWrapper}>
        <header style={styles.header}>
          <h1 style={styles.mainTitle}>Панель персонажей</h1>
          <div style={styles.userInfo}>
            {/* Используем имя пользователя из useAuth */}
            <span>Пользователь: {user?.username || '...'}</span>
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

// Стили (оставляем ваши стили)
const styles = {
    pageContainer: { minHeight: '100vh', background: theme.colors.background, color: theme.colors.text, padding: '40px 20px' },
    contentWrapper: { maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', boxShadow: theme.effects.shadow },
    mainTitle: { margin: 0, fontSize: '1.8rem', color: theme.colors.primary },
    userInfo: { display: 'flex', alignItems: 'center', gap: '15px', color: theme.colors.textSecondary },
    logoutButton: { padding: '8px 16px', background: theme.colors.error, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, ':hover': { opacity: 0.9 } },
    actionButtons: { display: 'flex', gap: '20px' },
    button: { flex: 1, padding: '14px', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: theme.transitions.default, color: theme.colors.background, fontWeight: 'bold', fontSize: '1rem' },
    createPartyButton: { background: theme.colors.primary },
    joinPartyButton: { background: theme.colors.secondary },
    characterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
    createCharacterCard: { background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '20px', boxShadow: theme.effects.shadow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: '160px', textAlign: 'center', transition: theme.transitions.default, border: `2px dashed ${theme.colors.primary}`, opacity: 0.7 },
    createCharacterIcon: { fontSize: '3rem', color: theme.colors.primary, marginBottom: '10px', lineHeight: 1 },
    createCharacterText: { color: theme.colors.textSecondary },
    link: { textDecoration: 'none', color: 'inherit' },
    characterCard: { background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '20px', boxShadow: theme.effects.shadow, minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: theme.transitions.default, cursor: 'pointer' },
    characterName: { margin: '0 0 15px 0', textAlign: 'center', color: theme.colors.primary, fontSize: '1.2rem' },
    characterStats: { display: 'flex', justifyContent: 'space-around', color: theme.colors.textSecondary, fontSize: '0.9rem' },
    loading: { textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: theme.colors.text },
    errorBanner: { background: `${theme.colors.error}44`, color: theme.colors.error, padding: '10px 15px', borderRadius: '8px', border: `1px solid ${theme.colors.error}`, textAlign: 'center', marginBottom: '20px' },
};

export default CharactersPage;
