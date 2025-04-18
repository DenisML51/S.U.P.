// frontend/src/features/Lobby/Lobby.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { theme } from '../../styles/theme'; // Импорт темы
import PlayerCard from './components/PlayerCard'; // Импорт карточки игрока
import Chat from './Chat'; // Импорт чата
import * as apiService from '../../api/apiService'; // Импорт API сервиса

// Компонент-обертка для секций
const Section = ({ title, children }) => (
    <section style={{ ...styles.section, background: theme.effects.glass, backdropFilter: theme.effects.blur }}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <div style={styles.sectionContent}>
            {children}
        </div>
    </section>
);

const Lobby = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // Получаем данные партии из state, переданного при навигации
    // Добавляем проверку на null/undefined перед доступом к свойствам
    const party = location.state?.party;
    const token = localStorage.getItem("token");

    // Состояния компонента
    const [lobbyMaster, setLobbyMaster] = useState(null); // Информация о мастере
    const [otherPlayers, setOtherPlayers] = useState([]); // Массив остальных игроков
    const socketRef = useRef(null); // Ref для хранения экземпляра WebSocket
    const [isConnectedStatus, setIsConnectedStatus] = useState(false); // State для статуса подключения (для UI)
    const [currentUser, setCurrentUser] = useState(null); // Имя текущего пользователя для чата
    const [lobbyError, setLobbyError] = useState(''); // Состояние для отображения ошибок лобби

    // --- Получение имени пользователя ---
    useEffect(() => {
        let isMounted = true;
        const fetchUser = async () => {
            if (token) {
               try {
                   const res = await apiService.getCurrentUser();
                   if (isMounted) setCurrentUser(res.data.username);
                   console.log("Lobby: Current user fetched:", res.data.username);
               } catch (error) {
                    console.error("Lobby: Failed to fetch current user:", error);
                    if (isMounted) {
                        setLobbyError("Ошибка получения данных пользователя.");
                        if (error.response && error.response.status === 401) {
                            localStorage.removeItem("token");
                            navigate("/login");
                        }
                    }
               }
            } else {
                 // Если нет токена, сразу редирект
                 if (isMounted) {
                     console.log("Lobby: No token found, redirecting to login.");
                     navigate("/login");
                 }
            }
        };
        fetchUser();
        return () => { isMounted = false; }; // Очистка
    }, [token, navigate]);

    // --- Инициализация состояний лобби при получении данных партии ---
    useEffect(() => {
        // Проверяем наличие всех необходимых данных party
        if (party && party.creator_username && typeof party.max_players === 'number') {
            console.log("Lobby: Initializing state with party data:", party);
            setLobbyMaster({ username: party.creator_username });
            // Инициализируем массив нужной длины (max_players - 1) сразу
            setOtherPlayers(Array(Math.max(0, party.max_players - 1)).fill(null));
            setIsConnectedStatus(false); // Сбрасываем статус при инициализации
            setLobbyError(''); // Сбрасываем ошибку
        } else if (!location.state?.party) { // Проверяем именно location.state.party
             // Перенаправляем, только если данных действительно нет
             console.warn("Lobby: No party data found in location state, redirecting...");
             navigate("/");
        }
    }, [party, navigate, location.state]); // Добавили location.state

    // --- Обработчик обновления списка игроков ---
    // Используем useCallback, но зависимости включают party?.max_players
    const handlePlayersUpdate = useCallback((data) => {
        console.log(">>> handlePlayersUpdate received:", data);
        const max_players_current = party?.max_players;
        if (max_players_current === undefined || max_players_current === null) {
            console.error("  Cannot process player update: party.max_players is not available!");
            return;
        }
        let masterUpdated = false;
        let playersUpdated = false;

        if (data.master) {
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
            const targetSlots = Math.max(0, max_players_current - 1);
            const finalPlayers = Array(targetSlots).fill(null);
            for (let i = 0; i < Math.min(data.players.length, targetSlots); i++) {
                 if (data.players[i]) finalPlayers[i] = {...data.players[i]};
            }
            setOtherPlayers(prevPlayers => {
                if (JSON.stringify(prevPlayers) !== JSON.stringify(finalPlayers)) {
                    console.log(`  >>> Updating otherPlayers state (target: ${targetSlots}):`, finalPlayers);
                    playersUpdated = true;
                    return finalPlayers;
                }
                 console.log("  >>> OtherPlayers state unchanged.");
                return prevPlayers;
            });
        } else { console.warn("  >>> No 'players' array found."); }

         if (!masterUpdated && !playersUpdated) {
             console.log("  >>> handlePlayersUpdate: No actual state changes detected.");
         }
    }, [party?.max_players]); // Зависимость от max_players

    // --- Установка и управление WebSocket соединением ---
    useEffect(() => {
        // Выходим, если нет токена или данных партии
        if (!token || !party?.lobby_key || !party?.creator_username || typeof party?.max_players !== 'number') {
            console.log("Lobby WS Effect: Skipping connection (missing token/party data).");
            if (socketRef.current) { // Закрываем старый сокет, если он был
                 if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
                     socketRef.current.close(1000, "Missing data for connection");
                 }
                 socketRef.current = null;
                 setIsConnectedStatus(false);
            }
            return;
        }

        // Закрываем предыдущий сокет, если он есть (на случай смены party)
        if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
            console.log("Lobby WS Effect: Closing previous socket before creating new one.");
            socketRef.current.close(1000, "Reinitializing connection");
            // Не ставим в null здесь, onclose сделает это
        }

        // Создаем новый WebSocket
        const wsUrl = `ws://localhost:8000/ws?token=${encodeURIComponent(token)}&lobbyKey=${encodeURIComponent(party.lobby_key)}&masterUsername=${encodeURIComponent(party.creator_username)}&maxPlayers=${encodeURIComponent(party.max_players)}`;
        console.log("Lobby WS Effect: Attempting to connect to:", wsUrl);
        let ws = null;
        try {
            ws = new WebSocket(wsUrl);
            socketRef.current = ws; // Присваиваем рефу
            setIsConnectedStatus(false); // Начальный статус
            console.log("Lobby WS Effect: WebSocket instance created and stored in ref.");
        } catch (error) {
             console.error("Lobby WS Effect: WebSocket constructor failed:", error);
             setLobbyError(`Ошибка создания WebSocket: ${error.message}`);
             socketRef.current = null;
             setIsConnectedStatus(false);
             return;
        }

        // Устанавливаем обработчики
        ws.onopen = () => {
            console.log("<<< WebSocket OPEN >>> - ReadyState:", ws.readyState);
            if (socketRef.current === ws) { // Проверяем актуальность сокета
                console.log("  Setting connection status to TRUE");
                setIsConnectedStatus(true);
                setLobbyError('');
            } else { console.log("  onopen received for an OLD socket instance."); ws.close(); }
        };

        ws.onmessage = (event) => {
             if (socketRef.current !== ws) { console.log("<<< WebSocket MESSAGE >>> received for OLD socket, ignoring:", event.data); return; }
            console.log("<<< WebSocket MESSAGE >>>:", event.data);
            try {
                const data = JSON.parse(event.data);
                if (data.type === "players_update") {
                    handlePlayersUpdate(data); // Вызываем обработчик
                }
            } catch (e) { console.log("  (Non-JSON message received, likely chat)"); }
        };

        ws.onerror = (error) => {
            console.error("<<< WebSocket ERROR >>>:", error);
             if (socketRef.current === ws) {
                console.log("  Setting connection status to FALSE due to error");
                setIsConnectedStatus(false);
                setLobbyError("Произошла ошибка WebSocket соединения.");
            } else { console.log("  onerror received for an OLD socket instance."); }
        };

        ws.onclose = (event) => {
            console.log("<<< WebSocket CLOSE >>> - Code:", event.code, "Reason:", event.reason, "Clean:", event.wasClean);
             if (socketRef.current === ws) {
                console.log("  Setting connection status to FALSE and clearing socketRef");
                setIsConnectedStatus(false);
                socketRef.current = null; // Очищаем реф
                if (!event.wasClean && event.code !== 1000 && event.code !== 1001) { // Код 1001 - уход со страницы
                     setLobbyError(`Соединение с лобби разорвано (Код: ${event.code}).`);
                }
            } else { console.log("  onclose received for an OLD socket instance."); }
        };

        // Функция очистки
        return () => {
            console.log("<<< Lobby Cleanup >>> - Effect dependencies changed or component unmounted.");
            const socketToClose = ws; // Используем сокет из замыкания эффекта
            if (socketToClose && socketToClose.readyState !== WebSocket.CLOSED) {
                console.log(`  Closing WebSocket instance (readyState: ${socketToClose.readyState})`);
                socketToClose.close(1000, "Component cleanup");
            }
            // Очищаем реф, если он все еще указывает на этот сокет
            if (socketRef.current === socketToClose) {
                console.log("  Clearing socketRef in cleanup.");
                socketRef.current = null;
                setIsConnectedStatus(false);
            }
             console.log("  Cleanup finished.");
        };
        // Перезапускаем эффект при изменении ключевых данных
    }, [token, party?.lobby_key, party?.creator_username, party?.max_players, navigate, handlePlayersUpdate]); // Включаем handlePlayersUpdate


    // --- Обработчик выхода из лобби ---
    const handleExit = () => {
        console.log("Exiting lobby...");
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.close(1000, "User exited lobby");
        }
        navigate("/");
    };

    // --- Рендеринг ---
    if (!party || !currentUser) {
        // Показываем ошибку, если она есть во время загрузки
        return <div style={styles.loading}>{lobbyError || 'Загрузка данных лобби и пользователя...'}</div>;
    }

    // Используем isConnectedStatus для индикатора
    const isConnected = isConnectedStatus;
    // Пересчитываем количество игроков перед каждым рендером
    const playerCount = (lobbyMaster ? 1 : 0) + otherPlayers.filter(p => p != null).length;

    // Лог перед рендером
    console.log(`--- Lobby RENDER --- isConnected=${isConnected}, playerCount=${playerCount}, Master=${JSON.stringify(lobbyMaster)}, Players=${JSON.stringify(otherPlayers)}`);

    return (
        <div style={styles.pageContainer}>
            <div style={styles.contentWrapper}>
                <header style={styles.header}>
                     <h1 style={styles.mainTitle}>Лобби</h1>
                     <div style={styles.headerInfo}>
                         <div style={styles.lobbyKeyBadge}>
                             Ключ: <strong>{party.lobby_key}</strong> ({playerCount}/{party.max_players})
                         </div>
                         <div style={{ ...styles.statusIndicator, color: isConnected ? theme.colors.secondary : theme.colors.error }}>
                             <div style={{ ...styles.statusDot, background: isConnected ? theme.colors.secondary : theme.colors.error }} />
                             {isConnected ? 'Подключено' : 'Отключено'}
                         </div>
                         <button onClick={handleExit} style={styles.exitButton}>Выйти</button>
                     </div>
                </header>

                 {/* Отображение ошибки лобби (если не во время загрузки) */}
                {lobbyError && <p style={styles.errorBanner}>{lobbyError}</p>}

                <div style={styles.mainContentLayout}>
                    <Section title="Участники">
                        <div style={styles.participantsGrid}>
                            {lobbyMaster && <PlayerCard player={lobbyMaster} isMaster={true} />}
                            {otherPlayers.map((player, index) => (
                                <PlayerCard
                                    key={player?.username ?? `player-slot-${index}`}
                                    player={player}
                                    isMaster={false}
                                />
                            ))}
                        </div>
                    </Section>
                    <Section title="Чат">
                         {/* Передаем текущий сокет из рефа */}
                         <Chat socket={socketRef.current} username={currentUser} />
                    </Section>
                </div>
            </div>
        </div>
    );
};

// Стили styles (остаются без изменений)
const styles = {
    pageContainer: { minHeight: '100vh', background: theme.colors.background, color: theme.colors.text, padding: '40px 20px', boxSizing: 'border-box' },
     contentWrapper: { maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "30px" },
     header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', boxShadow: theme.effects.shadow },
     mainTitle: { margin: 0, fontSize: '1.8rem', color: theme.colors.primary },
     headerInfo: { display: "flex", alignItems: "center", gap: "16px" },
     lobbyKeyBadge: { margin: 0, fontSize: "1rem", background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.surface}` },
     statusIndicator: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' },
     statusDot: { width: '10px', height: '10px', borderRadius: '50%'/*, animation: 'pulse 1.5s infinite'*/ },
     exitButton: { padding: '8px 16px', background: theme.colors.error, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, ':hover': { opacity: 0.9 } },
     errorBanner: { background: `${theme.colors.error}44`, color: theme.colors.error, padding: '10px 15px', borderRadius: '8px', border: `1px solid ${theme.colors.error}`, textAlign: 'center', marginBottom: '0px' },
     mainContentLayout: { display: 'grid', gridTemplateColumns: '1fr', gap: '30px', '@media (min-width: 992px)': { gridTemplateColumns: '300px 1fr' } },
     section: { borderRadius: '16px', padding: '20px', boxShadow: theme.effects.shadow, display: 'flex', flexDirection: 'column' },
     sectionTitle: { margin: '0 0 15px 0', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}`, paddingBottom: '10px', fontSize: '1.2rem' },
     sectionContent: { flexGrow: 1 },
     participantsGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },
     loading: { textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: theme.colors.text },
};

export default Lobby;
