import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { theme } from "../theme";

// Компонент для отображения мастера (создателя лобби)
const MasterCard = ({ master }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "12px",
      borderRadius: "8px",
      background: theme.effects.glass,
      boxShadow: theme.effects.shadow,
      minWidth: "180px",
    }}
  >
    <div
      style={{
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        backgroundColor: theme.colors.primary,
      }}
    />
    <span style={{ fontSize: "1rem", fontWeight: "500" }}>
      {master.username} (мастер)
    </span>
  </div>
);

// Компонент для отображения остальных игроков (если слот пустой – placeholder)
const PlayerCard = ({ player }) => {
  const isPlaceholder = player === null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px",
        borderRadius: "8px",
        background: theme.effects.glass,
        boxShadow: theme.effects.shadow,
        minWidth: "180px",
      }}
    >
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          backgroundColor: isPlaceholder ? theme.colors.error : theme.colors.secondary,
        }}
      />
      <span style={{ fontSize: "1rem", fontWeight: "500" }}>
        {isPlaceholder ? "Игрок" : player.username}
      </span>
    </div>
  );
};

const Lobby = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Объект party должен содержать { id, lobby_key, max_players, creator_username }
  const { party } = location.state || {};
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!party) {
      navigate("/");
    } else {
      console.log("Получен объект party:", party);
    }
  }, [party, navigate]);

  // Если поле creator_username отсутствует, это приведет к "???" для мастера
  const [lobbyMaster, setLobbyMaster] = useState({
    username: party?.creator_username || "???",
  });
  const [otherPlayers, setOtherPlayers] = useState(Array(party?.max_players || 0).fill(null));
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [socket, setSocket] = useState(null);

  const handlePlayersUpdate = useCallback((data) => {
    if (data.master) {
      console.log("WS update master:", data.master);
      setLobbyMaster(data.master);
    }
    console.log("WS update players:", data.players);
    setOtherPlayers(data.players);
  }, []);

  useEffect(() => {
    if (!token || !party) return;
    const wsUrl = `ws://localhost:8000/ws?token=${token}&lobbyKey=${party.lobby_key}&masterUsername=${party.creator_username}&maxPlayers=${party.max_players}`;
    console.log("Подключаюсь по WS:", wsUrl);
    const ws = new WebSocket(wsUrl);
    setSocket(ws);

    ws.onopen = () => {
      console.log("WS подключён к лобби");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "players_update") {
          handlePlayersUpdate(data);
        }
      } catch {
        setChatMessages((prev) => [...prev, event.data]);
      }
    };

    ws.onerror = (error) => {
      console.error("WS ошибка:", error);
    };

    return () => {
      ws.close();
    };
  }, [token, party, handlePlayersUpdate]);

  const sendMessage = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !inputMessage.trim()) return;
    socket.send(inputMessage.trim());
    setInputMessage("");
  };

  const handleExit = () => {
    navigate("/");
  };

  if (!party) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.colors.background,
        color: theme.colors.text,
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "40px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px",
            background: theme.effects.glass,
            backdropFilter: theme.effects.blur,
            borderRadius: "16px",
            boxShadow: theme.effects.shadow,
          }}
        >
          <h1 style={{ margin: 0 }}>Лобби</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <p style={{ margin: 0, fontSize: "1rem" }}>
              Ключ: {party.lobby_key}
            </p>
            <button
              onClick={handleExit}
              style={{
                padding: "8px 16px",
                background: theme.colors.error,
                color: theme.colors.text,
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: theme.transitions.default,
              }}
            >
              Выйти из лобби
            </button>
          </div>
        </header>

        <section>
          <h2 style={{ marginBottom: "20px" }}>Участники</h2>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <MasterCard master={lobbyMaster} />
            {otherPlayers.map((p, i) => (
              <PlayerCard key={i} player={p} />
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: "20px" }}>Чат</h2>
          <div
            style={{
              background: "rgba(0, 0, 0, 0.2)",
              borderRadius: "8px",
              padding: "12px",
              height: "300px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  background: theme.colors.surface,
                  borderRadius: "8px",
                  padding: "12px",
                  wordBreak: "break-word",
                  maxWidth: "80%",
                }}
              >
                {msg}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Напишите сообщение..."
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: `1px solid ${theme.colors.textSecondary}`,
                background: "rgba(255, 255, 255, 0.1)",
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: "8px 16px",
                background: theme.colors.primary,
                color: theme.colors.text,
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: theme.transitions.default,
              }}
            >
              ➔
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Lobby;
