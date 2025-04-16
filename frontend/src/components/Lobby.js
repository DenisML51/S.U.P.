import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { theme } from "../theme";

// Компонент для отображения мастера (создателя лобби)
const MasterCard = ({ master }) => (
  <div style={styles.playerCard}>
    <div style={{ ...styles.playerIndicator, backgroundColor: theme.colors.primary }} />
    <span style={styles.playerName}>
      {master?.username || "???"} (Мастер)
    </span>
  </div>
);

// Компонент для отображения остальных игроков (если слот пустой – placeholder)
const PlayerCard = ({ player }) => {
  const isPlaceholder = player === null;
  return (
    <div style={styles.playerCard}>
      <div style={{
          ...styles.playerIndicator,
          backgroundColor: isPlaceholder ? theme.colors.textSecondary : theme.colors.secondary,
          opacity: isPlaceholder ? 0.5 : 1,
       }} />
      <span style={{...styles.playerName, opacity: isPlaceholder ? 0.5 : 1 }}>
        {isPlaceholder ? "Свободный слот" : player.username}
      </span>
    </div>
  );
};

const Lobby = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { party } = location.state || {}; // { id, lobby_key, max_players, creator_username }
  const token = localStorage.getItem("token");

  const [lobbyMaster, setLobbyMaster] = useState(null);
  const [otherPlayers, setOtherPlayers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Если нет данных о партии, возвращаем на главную
    if (!party || !token) {
      console.warn("Нет данных о партии или токена, редирект...");
      navigate("/");
    } else {
       // Изначально ставим мастера из переданных данных
       setLobbyMaster({ username: party.creator_username });
       // Изначально создаем пустые слоты
       setOtherPlayers(Array(party.max_players - 1).fill(null));
    }
  }, [party, token, navigate]);

  const handlePlayersUpdate = useCallback((data) => {
      console.log("Обработка player_update:", data);
    if (data.master) {
      setLobbyMaster(data.master);
    }
    if (data.players) {
       // Заполняем массив нужной длины
       const updatedPlayers = [...data.players];
       while (updatedPlayers.length < (party?.max_players || 1) - 1) {
           updatedPlayers.push(null);
       }
      setOtherPlayers(updatedPlayers);
    }
  }, [party?.max_players]);


  // WebSocket Connection Effect
  useEffect(() => {
    if (!token || !party) return;

    const wsUrl = `ws://localhost:8000/ws?token=${encodeURIComponent(token)}&lobbyKey=${encodeURIComponent(party.lobby_key)}&masterUsername=${encodeURIComponent(party.creator_username)}&maxPlayers=${party.max_players}`;
    console.log("Подключение к WebSocket:", wsUrl);

    const ws = new WebSocket(wsUrl);
    setSocket(ws);

    ws.onopen = () => {
      console.log("WebSocket подключен к лобби");
      setChatMessages((prev) => [...prev, { type: 'system', text: 'Вы подключились к лобби.' }]);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "players_update") {
          handlePlayersUpdate(data);
        } else {
           // Если не players_update, считаем обычным сообщением чата (хотя структура может быть сложнее)
           setChatMessages((prev) => [...prev, { type: 'chat', text: event.data }]);
        }
      } catch (e) {
        // Если не JSON, считаем текстовым сообщением
        setChatMessages((prev) => [...prev, { type: 'chat', text: event.data }]);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket ошибка:", error);
      setChatMessages((prev) => [...prev, { type: 'system', text: 'Ошибка WebSocket соединения.' }]);
    };

    ws.onclose = (event) => {
        console.log("WebSocket соединение закрыто:", event.code, event.reason);
        setChatMessages((prev) => [...prev, { type: 'system', text: 'Вы отключены от лобби.' }]);
        setSocket(null); // Убираем сокет
    };

    // Очистка при размонтировании
    return () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
             console.log("Закрытие WebSocket соединения...");
             ws.close();
        }
         setSocket(null);
    };
  }, [token, party, handlePlayersUpdate]); // Добавили handlePlayersUpdate в зависимости

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);


  const sendMessage = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !inputMessage.trim()) return;
    socket.send(inputMessage.trim());
    // Добавляем свое сообщение локально для мгновенного отображения
    setChatMessages((prev) => [...prev, {type: 'my_chat', text: `Вы: ${inputMessage.trim()}`}])
    setInputMessage("");
  };

  const handleExit = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    }
    navigate("/");
  };

  // Если нет данных о партии, не рендерим ничего осмысленного
  if (!party) return <div style={styles.loading}>Загрузка данных лобби...</div>;

  return (
    <div style={styles.pageContainer}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "40px" }}>
        <header style={styles.header}>
          <h1 style={{ margin: 0 }}>Лобби</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <p style={{ margin: 0, fontSize: "1rem", background: 'rgba(0,0,0,0.2)', padding: '5px 10px', borderRadius: '6px' }}>
              Ключ: <strong>{party.lobby_key}</strong>
            </p>
            <button onClick={handleExit} style={styles.exitButton}>
              Выйти из лобби
            </button>
          </div>
        </header>

        <Section title="Участники">
          <div style={styles.participantsGrid}>
            {lobbyMaster && <MasterCard master={lobbyMaster} />}
            {otherPlayers.map((p, i) => (
              <PlayerCard key={i} player={p} />
            ))}
          </div>
        </Section>

        <Section title="Чат">
          <div style={styles.chatBox}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{ ...styles.chatMessage, ...(msg.type === 'system' ? styles.systemMessage : {}), ...(msg.type === 'my_chat' ? styles.myChatMessage : {}) }}>
                {msg.text}
              </div>
            ))}
             <div ref={chatEndRef} />
          </div>
          <div style={styles.chatInputContainer}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Напишите сообщение..."
              style={styles.chatInput}
              disabled={!socket || socket.readyState !== WebSocket.OPEN}
            />
            <button onClick={sendMessage} style={styles.sendButton} disabled={!socket || socket.readyState !== WebSocket.OPEN}>
               ➔
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
};

// --- Стили (Объединены для краткости) ---
const Section = ({ title, children }) => (
     <section style={{ ...styles.section, background: theme.effects.glass, backdropFilter: theme.effects.blur }}>
         <h2 style={styles.sectionTitle}>{title}</h2>
         <div style={styles.sectionContent}>
             {children}
         </div>
     </section>
 );

 const styles = {
     pageContainer: { minHeight: '100vh', background: theme.colors.background, color: theme.colors.text, padding: '40px 20px' },
     header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', boxShadow: theme.effects.shadow, marginBottom: '40px' },
     exitButton: { padding: '8px 16px', background: theme.colors.error, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default },
     section: { borderRadius: '16px', padding: '25px', boxShadow: theme.effects.shadow, marginBottom: '30px' }, // Added margin bottom
     sectionTitle: { margin: '0 0 20px 0', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}`, paddingBottom: '10px' },
     sectionContent: {},
     participantsGrid: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
     playerCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', boxShadow: 'inset 0 0 5px rgba(0,0,0,0.3)', minWidth: '180px' },
     playerIndicator: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
     playerName: { fontSize: '1rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'},
     chatBox: { background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '12px', height: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' },
     chatMessage: { background: theme.colors.surface, borderRadius: '8px', padding: '10px 15px', wordBreak: 'break-word', maxWidth: '85%', alignSelf: 'flex-start' },
     myChatMessage: { alignSelf: 'flex-end', background: theme.colors.primary, color: theme.colors.background },
     systemMessage: { alignSelf: 'center', fontStyle: 'italic', color: theme.colors.textSecondary, background: 'none', padding: '5px 0'},
     chatInputContainer: { display: 'flex', gap: '10px' },
     chatInput: { flex: 1, padding: '10px 15px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', outline: 'none' },
     sendButton: { padding: '10px 16px', background: theme.colors.primary, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '1.2rem' },
     loading: { textAlign: 'center', padding: '50px', fontSize: '1.5rem' },
 };

export default Lobby;