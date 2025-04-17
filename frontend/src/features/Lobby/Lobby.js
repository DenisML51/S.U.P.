// frontend/src/features/Lobby/Lobby.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { theme } from '../../styles/theme';
import PlayerCard from './components/PlayerCard';
import Chat from './Chat';
// Импортируем apiService, если нужно получать имя пользователя
import * as apiService from '../../api/apiService';

const Section = ({ title, children }) => ( <section style={{ ...styles.section, background: theme.effects.glass, backdropFilter: theme.effects.blur }}><h2 style={styles.sectionTitle}>{title}</h2><div style={styles.sectionContent}>{children}</div></section> );

const Lobby = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { party } = location.state || {};
    const token = localStorage.getItem("token");

    const [lobbyMaster, setLobbyMaster] = useState(null);
    const [otherPlayers, setOtherPlayers] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // Имя текущего юзера для чата

    // --- Получение имени пользователя ---
    useEffect(() => {
        const fetchUser = async () => {
            if(token){
               try {
                   const res = await apiService.getCurrentUser();
                   setCurrentUser(res.data.username);
                   console.log("Lobby: Current user fetched:", res.data.username);
               } catch (error) {
                    console.error("Lobby: Failed to fetch current user:", error);
                    if (error.response && error.response.status === 401) {
                        localStorage.removeItem("token");
                        navigate("/login");
                    }
               }
            } else {
                 navigate("/login"); // Если токена нет, редирект
            }
        };
        fetchUser();
    }, [token, navigate]);

    // --- Инициализация состояний ---
    useEffect(() => {
        if (party && party.creator_username && party.max_players) {
            console.log("Lobby: Initializing state with party data:", party);
            setLobbyMaster({ username: party.creator_username });
            setOtherPlayers(Array((party.max_players || 1) - 1).fill(null));
            setIsConnected(false);
        } else if (!location.state) { // Проверка, были ли переданы state
             console.warn("Lobby: No party data found in location state, redirecting...");
             navigate("/");
        }
         // Нет зависимости от token, т.к. он проверяется в другом useEffect
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [party]); // Зависимость только от party

    // --- Обработчик обновления списка ---
    const handlePlayersUpdate = useCallback((data) => {
        console.log("Lobby: Received players_update message:", data); // Логируем полученные данные
        if (data.master) {
            console.log("  Updating master to:", data.master);
            setLobbyMaster(data.master);
        } else {
             console.warn("  No 'master' key found in players_update data.");
        }
        if (data.players && Array.isArray(data.players)) {
            const targetSlots = (party?.max_players || 1) - 1;
            const updatedPlayers = [...data.players];
            // Дополняем/обрезаем до нужного кол-ва слотов
            while (updatedPlayers.length < targetSlots) updatedPlayers.push(null);
            const finalPlayers = updatedPlayers.slice(0, targetSlots);
            console.log(`  Updating otherPlayers (target slots: ${targetSlots}):`, finalPlayers);
            setOtherPlayers(finalPlayers);
        } else {
             console.warn("  No 'players' array found in players_update data.");
        }
    }, [party?.max_players]);

    // --- Установка WebSocket ---
    useEffect(() => {
        // Ensure previous socket is closed if dependencies change
        // This prevents potential duplicate connections if party data re-triggers the effect
        if (socket) {
            console.log("Lobby WS Effect: Closing previous socket due to dependency change or re-render.");
            socket.close(1000, "Component re-rendering or dependencies changed");
            setSocket(null); // Clear socket state immediately
        }

        // Exit early if required data is missing
        if (!token || !party?.lobby_key || !party?.creator_username || !party?.max_players) {
            console.log("Lobby WS Effect: Missing token or party data, cannot connect.");
            return; // Do not proceed with connection
        }

        const wsUrl = `ws://localhost:8000/ws?token=${encodeURIComponent(token)}&lobbyKey=${encodeURIComponent(party.lobby_key)}&masterUsername=${encodeURIComponent(party.creator_username)}&maxPlayers=${encodeURIComponent(party.max_players)}`;
        console.log("Lobby WS Effect: Attempting to connect to:", wsUrl);
        let ws = null; // Define ws locally
        try {
            ws = new WebSocket(wsUrl);
        } catch (error) {
             console.error("Lobby WS Effect: WebSocket constructor failed:", error);
             setSocket(null);
             return;
        }

        console.log("Lobby WS Effect: WebSocket instance created. Setting state...");
        // Set socket state immediately after creation
        setSocket(ws);


        // --- DEFINE handlePlayersUpdate INSIDE useEffect ---
        // This ensures it always uses the current setLobbyMaster, setOtherPlayers, and party state
        const handlePlayersUpdateInEffect = (data) => {
            console.log(">>> handlePlayersUpdateInEffect received:", data);
            let masterUpdated = false;
            let playersUpdated = false;

            if (data.master) {
                // Use functional update to be safe with potential batching
                setLobbyMaster(prevMaster => {
                    if (JSON.stringify(prevMaster) !== JSON.stringify(data.master)) {
                        console.log("  >>> Updating master state:", data.master);
                        masterUpdated = true;
                        return {...data.master};
                    }
                    console.log("  >>> Master state unchanged.");
                    return prevMaster;
                });
            } else { console.warn("  >>> No 'master' key found."); }

            if (data.players && Array.isArray(data.players)) {
                const max_players_current = party?.max_players; // Get current value
                if (!max_players_current) {
                    console.error("  >>> Cannot update players, max_players is missing from party state!");
                    return;
                }
                const targetSlots = max_players_current - 1;
                const finalPlayers = [...data.players]; // Create copy
                while (finalPlayers.length < targetSlots) finalPlayers.push(null); // Pad
                const slicedFinalPlayers = finalPlayers.slice(0, targetSlots); // Slice

                // Use functional update
                setOtherPlayers(prevPlayers => {
                    if (JSON.stringify(prevPlayers) !== JSON.stringify(slicedFinalPlayers)) {
                        console.log(`  >>> Updating otherPlayers state (target: ${targetSlots}):`, slicedFinalPlayers);
                        playersUpdated = true;
                        return slicedFinalPlayers;
                    }
                    console.log("  >>> OtherPlayers state unchanged.");
                    return prevPlayers;
                });
            } else { console.warn("  >>> No 'players' array found."); }

            if (!masterUpdated && !playersUpdated) {
                 console.log("  >>> handlePlayersUpdate: No actual state changes detected.");
             }
        };

        ws.onopen = () => {
            console.log("Lobby WS Effect: WebSocket onopen event received.");
            setIsConnected(true); // <<<=== УСТАНАВЛИВАЕМ СТАТУС
        };

        ws.onmessage = (event) => {
            console.log("Lobby WS Effect: WebSocket onmessage received:", event.data); // Логируем ВСЕ сообщения
            try {
                const data = JSON.parse(event.data);
                if (data.type === "players_update") {
                    handlePlayersUpdate(data); // Вызываем обработчик
                } else {
                    // Другие типы сообщений (чат и т.д.) будут обработаны в Chat.js
                    // Нет необходимости обрабатывать их здесь повторно
                    console.log("Lobby WS Effect: Forwarding message to Chat component.");
                }
            } catch (e) {
                console.error("Lobby WS Effect: Error parsing message or non-JSON message received.", e);
                // Просто текстовые сообщения тоже передаются в Chat
            }
        };

        ws.onerror = (error) => {
            console.error("Lobby WS Effect: WebSocket onerror event:", error);
            setIsConnected(false);
        };

        ws.onclose = (event) => {
            console.log("Lobby WS Effect: WebSocket onclose event received:", event.code, event.reason);
            setIsConnected(false);
            setSocket(null); // Очищаем сокет
        };

        // Очистка при размонтировании
        return () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log("Lobby Cleanup: Closing WebSocket.");
                ws.close(1000, "Component unmounted"); // Код 1000 - нормальное закрытие
            }
            // Сбрасываем состояние при размонтировании, чтобы избежать утечек
            setSocket(null);
            setIsConnected(false);
            console.log("Lobby Cleanup: WebSocket states reset.");
        };
    }, [token, party, handlePlayersUpdate]); // Зависимости WebSocket эффекта

    // Обработчик выхода
    const handleExit = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close(1000, "User exited lobby");
        } else {
             console.warn("Lobby: handleExit called but socket is not open or null.");
        }
        navigate("/");
    };

    if (!party || !currentUser) { // Добавил проверку currentUser
        return <div style={styles.loading}>Загрузка данных лобби и пользователя...</div>;
    }

    // Определяем текущее количество игроков
    const playerCount = (lobbyMaster ? 1 : 0) + otherPlayers.filter(p => p != null).length;

    return (
        <div style={styles.pageContainer}>
            <div style={styles.contentWrapper}>
                <header style={styles.header}>
                     <h1 style={styles.mainTitle}>Лобби</h1>
                     <div style={styles.headerInfo}>
                         <div style={styles.lobbyKeyBadge}>
                            Ключ: <strong>{party.lobby_key}</strong> ({playerCount}/{party.max_players})
                         </div>
                         {/* --- ИНДИКАТОР СТАТУСА --- */}
                         <div style={{ ...styles.statusIndicator, color: isConnected ? theme.colors.secondary : theme.colors.error }}>
                             <div style={{ ...styles.statusDot, background: isConnected ? theme.colors.secondary : theme.colors.error }} />
                             {isConnected ? 'Подключено' : 'Отключено'} {/* Используем isConnected */}
                         </div>
                         <button onClick={handleExit} style={styles.exitButton}>Выйти</button>
                     </div>
                </header>

                <div style={styles.mainContentLayout}>
                    <Section title="Участники">
                         <div style={styles.participantsGrid}>
                             {lobbyMaster && <PlayerCard player={lobbyMaster} isMaster={true} />}
                             {otherPlayers.map((p, i) => (
                                 <PlayerCard key={`player-${i}`} player={p} isMaster={false} />
                             ))}
                         </div>
                    </Section>
                    <Section title="Чат">
                         {/* Передаем socket и currentUser в Chat */}
                         <Chat socket={socket} username={currentUser} />
                    </Section>
                </div>
            </div>
        </div>
    );
};

// Стили styles остаются без изменений
const styles = {
    pageContainer: { minHeight: '100vh', background: theme.colors.background, color: theme.colors.text, padding: '40px 20px', boxSizing: 'border-box' },
     contentWrapper: { maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "30px" },
     header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', boxShadow: theme.effects.shadow },
     mainTitle: { margin: 0, fontSize: '1.8rem', color: theme.colors.primary },
     headerInfo: { display: "flex", alignItems: "center", gap: "16px" },
     lobbyKeyBadge: { margin: 0, fontSize: "1rem", background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.surface}` },
     statusIndicator: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' },
     statusDot: { width: '10px', height: '10px', borderRadius: '50%', animation: 'pulse 1.5s infinite' },
     exitButton: { padding: '8px 16px', background: theme.colors.error, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, ':hover': { opacity: 0.9 } },
     mainContentLayout: { display: 'grid', gridTemplateColumns: '1fr', gap: '30px', '@media (min-width: 992px)': { gridTemplateColumns: '300px 1fr' } },
     section: { borderRadius: '16px', padding: '20px', boxShadow: theme.effects.shadow, display: 'flex', flexDirection: 'column' }, // Добавил display flex
     sectionTitle: { margin: '0 0 15px 0', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}`, paddingBottom: '10px', fontSize: '1.2rem' },
     sectionContent: { flexGrow: 1 }, // Чтобы контент занимал доступное место
     participantsGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },
     loading: { textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: theme.colors.text },
};

export default Lobby;