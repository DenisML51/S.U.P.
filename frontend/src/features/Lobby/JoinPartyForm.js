// src/features/Lobby/JoinPartyForm.js
import React, { useState, useEffect } from 'react'; // Добавили useEffect
import * as apiService from '../../api/apiService';
import { theme } from '../../styles/theme';

const JoinPartyForm = ({ onClose, onSuccess }) => {
  const [lobbyKey, setLobbyKey] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState(""); // <-- НОВОЕ: ID выбранного персонажа
  const [userCharacters, setUserCharacters] = useState([]); // <-- НОВОЕ: Список персонажей пользователя
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(""); // Ошибка загрузки персонажей
  const [joinError, setJoinError] = useState(""); // Ошибка подключения

  // --- НОВОЕ: Загрузка персонажей пользователя ---
  useEffect(() => {
    let isMounted = true;
    const fetchCharacters = async () => {
        setIsLoading(true); // Начинаем загрузку
        setFetchError("");
        try {
            const res = await apiService.getMyCharacters();
            if (isMounted) {
                setUserCharacters(res.data || []);
                // Автоматически выбрать первого персонажа, если он есть
                if (res.data && res.data.length > 0) {
                    setSelectedCharacterId(String(res.data[0].id));
                }
            }
        } catch (err) {
            console.error("Failed to fetch user characters", err);
            if (isMounted) {
                setFetchError("Ошибка загрузки списка персонажей.");
            }
        } finally {
            if (isMounted) {
                setIsLoading(false); // Завершаем загрузку
            }
        }
    };
    fetchCharacters();
    return () => { isMounted = false };
  }, []); // Пустая зависимость - загрузка один раз
  // --- КОНЕЦ НОВОГО ---

  const handleJoin = async (e) => {
    e.preventDefault();
    // --- НОВОЕ: Проверка выбора персонажа ---
    if (!selectedCharacterId) {
        setJoinError("Пожалуйста, выберите персонажа для входа в лобби.");
        return;
    }
    // --- КОНЕЦ НОВОГО ---
    setIsLoading(true);
    setJoinError("");
    try {
      const res = await apiService.joinParty(lobbyKey.toUpperCase());
      if (onSuccess) {
          // --- НОВОЕ: Передаем и ID персонажа ---
          onSuccess(res.data, selectedCharacterId);
          // --- КОНЕЦ НОВОГО ---
      }
      onClose(); // Закрываем при успехе
    } catch (err) {
      console.error("Join party error:", err);
      setJoinError(err.response?.data?.detail || "Не удалось подключиться к лобби");
      setIsLoading(false); // Оставляем модалку открытой при ошибке
    }
    // Не сбрасываем isLoading здесь, т.к. окно закроется при успехе
  };

  const isSubmitDisabled = isLoading || lobbyKey.length !== 6 || !selectedCharacterId || userCharacters.length === 0;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
          <button onClick={onClose} style={styles.closeButton} disabled={isLoading}>×</button>
        <h2 style={styles.title}>Подключиться к партии</h2>
        <form onSubmit={handleJoin} style={styles.form}>
          {/* --- НОВОЕ: Выпадающий список персонажей --- */}
          <div style={styles.formGroup}>
            <label htmlFor="characterSelect" style={styles.label}>Выберите персонажа:</label>
            {fetchError && <p style={{...styles.errorText, marginBottom: '10px'}}>{fetchError}</p>}
            <select
                id="characterSelect"
                value={selectedCharacterId}
                onChange={(e) => setSelectedCharacterId(e.target.value)}
                style={styles.selectInput}
                required
                disabled={isLoading || userCharacters.length === 0}
            >
                {userCharacters.length === 0 && !isLoading && <option value="" disabled>Нет доступных персонажей</option>}
                {isLoading && <option value="" disabled>Загрузка персонажей...</option>}
                {userCharacters.map(char => (
                    <option key={char.id} value={String(char.id)}>
                        {char.name} (Ур. {char.level})
                    </option>
                ))}
            </select>
          </div>
          {/* --- КОНЕЦ НОВОГО --- */}

          <div style={styles.formGroup}>
            <label htmlFor="lobbyKey" style={styles.label}>Ключ лобби:</label>
            <input
              type="text" id="lobbyKey" value={lobbyKey}
              onChange={(e) => setLobbyKey(e.target.value.toUpperCase())}
              style={styles.input} maxLength={6} required placeholder="ABCDEF"
              autoCapitalize="characters" disabled={isLoading}
            />
          </div>

          {joinError && <p style={styles.errorText}>{joinError}</p>}

          <button type="submit" disabled={isSubmitDisabled} style={styles.submitButton}>
            {isLoading ? 'Подключение...' : 'Подключиться'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Стили
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '450px', color: theme.colors.text, position: 'relative', boxShadow: theme.effects.shadow }, // Чуть шире
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer', ':disabled': { opacity: 0.5 } },
    title: { textAlign: 'center', marginBottom: '25px', color: theme.colors.secondary },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    formGroup: { marginBottom: '5px' }, // Уменьшили отступ между группами
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' },
    input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', ':disabled': { opacity: 0.5 } },
    // --- НОВЫЙ СТИЛЬ для select ---
    selectInput: {
        width: '100%', padding: '10px 12px', borderRadius: '8px',
        border: `1px solid ${theme.colors.textSecondary}`,
        background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text,
        fontSize: '1rem', boxSizing: 'border-box', cursor: 'pointer',
        ':disabled': { opacity: 0.5, cursor: 'not-allowed' }
    },
    // --- КОНЕЦ НОВОГО ---
    errorText: { color: theme.colors.error, textAlign: 'center', margin: '0', fontSize: '0.9rem' },
    submitButton: { padding: '12px 24px', borderRadius: '8px', background: theme.colors.secondary, color: theme.colors.background, border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', transition: theme.transitions.default, ':disabled': { opacity: 0.5, cursor: 'not-allowed' }, marginTop: '10px' },
};

export default JoinPartyForm;
