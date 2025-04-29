// src/features/Lobby/Lobby.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { theme } from '../../styles/theme';
import PlayerCard from './components/PlayerCard';
import Chat from './Chat'; // Убедимся, что Chat импортирован правильно
import * as apiService from '../../api/apiService';
import ExpandedCharacterSheet from './components/ExpandedCharacterSheet';
import { useApiActionHandler } from '../../hooks/useApiActionHandler'; // Импортируем хук

// Компонент-обертка для секций
const Section = ({ title, children }) => (
    <section style={{ ...styles.section, background: theme.effects.glass, backdropFilter: theme.effects.blur }}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {children}
    </section>
);

const Lobby = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const partyData = location.state?.party;
    const initialCharacterId = location.state?.characterId; // Может быть undefined для мастера
    const token = localStorage.getItem("token");

    // Состояния
    const [lobbyMaster, setLobbyMaster] = useState(null); // { username, character_id }
    const [otherPlayers, setOtherPlayers] = useState([]); // Array of { username, character_id } or null
    const socketRef = useRef(null); // Ref для хранения *текущего* активного сокета
    const [isConnectedStatus, setIsConnectedStatus] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // { username, id }
    const [isUserLoading, setIsUserLoading] = useState(true); // Флаг загрузки пользователя
    const [lobbyError, setLobbyError] = useState('');
    const [participantDetails, setParticipantDetails] = useState({}); // { characterId: CharacterDetailedOut }
    const [expandedCharacterId, setExpandedCharacterId] = useState(null);

    // Используем useApiActionHandler БЕЗ колбэка обновления данных
    const { handleApiAction: handleLobbyAction, actionError: lobbyActionError } = useApiActionHandler(null);

    // Получение данных текущего пользователя
    useEffect(() => {
        let isMounted = true;
        setIsUserLoading(true);
        const fetchUser = async () => {
            if (token) {
               try {
                   const res = await apiService.getCurrentUser();
                   if (isMounted) setCurrentUser({username: res.data.username, id: res.data.id});
                   console.log("Lobby: Current user fetched:", res.data.username);
               } catch (error) {
                    console.error("Lobby: Failed fetch user:", error);
                    if (isMounted) { setLobbyError("Ошибка данных пользователя."); if (error.response?.status === 401) { localStorage.removeItem("token"); navigate("/login"); } }
               } finally {
                    if (isMounted) setIsUserLoading(false);
               }
            } else { if (isMounted) { setIsUserLoading(false); navigate("/login"); } }
        };
        fetchUser();
        return () => { isMounted = false; };
    }, [token, navigate]);

    // Инициализация лобби (зависит от partyData)
    useEffect(() => {
        if (partyData?.creator_username && typeof partyData?.max_players === 'number') {
            console.log("Lobby: Initializing state with party data:", partyData);
            setLobbyMaster({ username: partyData.creator_username, character_id: null });
            setOtherPlayers(Array(Math.max(0, partyData.max_players - 1)).fill(null));
            setIsConnectedStatus(false); setLobbyError(''); setParticipantDetails({}); setExpandedCharacterId(null);
        } else if (!location.state?.party && !isUserLoading) {
             console.warn("Lobby: No party data found after user load, redirecting...");
             navigate("/");
        }
    }, [partyData, navigate, location.state, isUserLoading]);

    // Обработчики сообщений WebSocket
    const handlePlayersUpdate = useCallback((data) => {
        console.log("[WS Handler] handlePlayersUpdate received:", data);
        const max_players_current = partyData?.max_players;
        if (max_players_current === undefined || max_players_current === null) return;
        if (data.master) setLobbyMaster(prev => ({ ...prev, ...data.master }));
        if (data.players && Array.isArray(data.players)) {
            const targetSlots = Math.max(0, max_players_current - 1);
            const finalPlayers = Array.from({ length: targetSlots }, (_, i) => data.players[i] ? { ...data.players[i] } : null );
            setOtherPlayers(finalPlayers);
        }
    }, [partyData?.max_players]);

    const handleCharacterUpdate = useCallback((characterData) => {
        if (!characterData?.id) return;
        console.log(`[WS Handler] handleCharacterUpdate received for CharID: ${characterData.id}`);
        setParticipantDetails(prevDetails => ({ ...prevDetails, [characterData.id]: characterData }));
    }, []);

    // --- Установка и управление WebSocket ---
    useEffect(() => {
        if (isUserLoading) { console.log("Lobby WS Effect: Waiting for user data..."); return; }

        const lobbyKey = partyData?.lobby_key;
        const masterUsername = partyData?.creator_username;
        const maxPlayers = partyData?.max_players;
        const charId = initialCharacterId;
        const currentUsername = currentUser?.username;
        const isMasterConnecting = currentUsername === masterUsername;

        const canConnect = token && lobbyKey && masterUsername && typeof maxPlayers === 'number' && currentUsername && (isMasterConnecting || charId !== undefined);

        console.log("Lobby WS Effect: Checking connection readiness:", { canConnect, isMasterConnecting, token: !!token, lobbyKey, masterUsername, maxPlayers, charId, currentUsername });

        if (!canConnect) {
            console.log("Lobby WS Effect: Skipping connection (missing required data).");
            if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) { socketRef.current.close(1000, "Missing data"); socketRef.current = null; setIsConnectedStatus(false); }
            if (currentUser && !partyData) { navigate("/"); }
            return;
        }

        const characterIdParam = isMasterConnecting ? '' : `&characterId=${encodeURIComponent(charId)}`;
        const wsUrl = `ws://localhost:8000/ws?token=${encodeURIComponent(token)}&lobbyKey=${encodeURIComponent(lobbyKey)}&masterUsername=${encodeURIComponent(masterUsername)}&maxPlayers=${encodeURIComponent(maxPlayers)}${characterIdParam}`;
        console.log("Lobby WS Effect: Attempting to connect to:", wsUrl);

        if (socketRef.current && socketRef.current.url === wsUrl && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
            console.log("Lobby WS Effect: Already connected or connecting.");
            setIsConnectedStatus(socketRef.current.readyState === WebSocket.OPEN);
            return;
        }
        if (socketRef.current && socketRef.current.url !== wsUrl && socketRef.current.readyState !== WebSocket.CLOSED) {
            console.log("Lobby WS Effect: Closing previous socket (URL changed).");
            socketRef.current.close(1000, "Reinitializing");
            socketRef.current = null;
        }

        let ws = null;
        try { ws = new WebSocket(wsUrl); socketRef.current = ws; setIsConnectedStatus(false); }
        catch (error) { console.error("Lobby WS Effect: WebSocket constructor failed:", error); setLobbyError(`Ошибка WebSocket: ${error.message}`); socketRef.current = null; setIsConnectedStatus(false); return; }
        let currentWs = ws;

        ws.onopen = () => { if (socketRef.current === currentWs) { console.log("<<< WebSocket OPEN >>>"); setIsConnectedStatus(true); setLobbyError(''); } else { currentWs.close(1000, "Stale onopen"); }};
        ws.onmessage = (event) => {
             if (socketRef.current !== currentWs) return;
            // console.log("<<< WebSocket MESSAGE >>>:", event.data);
            try {
                const data = JSON.parse(event.data);
                if (data.type === "players_update") handlePlayersUpdate(data);
                else if (data.type === "character_update") handleCharacterUpdate(data.character);
            } catch (e) { /* Chat handles non-JSON */ }
        };
        ws.onerror = (error) => { if (socketRef.current === currentWs) { console.error("<<< WebSocket ERROR >>>:", error); setIsConnectedStatus(false); setLobbyError("Ошибка WebSocket соединения."); socketRef.current = null; }};
        ws.onclose = (event) => { if (socketRef.current === currentWs) { console.log("<<< WebSocket CLOSE >>> Code:", event.code); setIsConnectedStatus(false); socketRef.current = null; if (!event.wasClean && event.code !== 1000 && event.code !== 1001) { setLobbyError(`Соединение разорвано (Код: ${event.code}).`); } }};

        return () => {
            console.log("<<< Lobby Cleanup >>>");
            if (currentWs && currentWs.readyState !== WebSocket.CLOSED) { currentWs.close(1000, "Component cleanup / Re-running effect"); }
            if (socketRef.current === currentWs) { socketRef.current = null; }
        };
    }, [ token, partyData?.lobby_key, partyData?.creator_username, partyData?.max_players, initialCharacterId, isUserLoading, currentUser, navigate, handlePlayersUpdate, handleCharacterUpdate ]);

    // Выход из лобби
    const handleExit = () => { if (socketRef.current?.readyState === WebSocket.OPEN) { socketRef.current.close(1000, "User exited"); } navigate("/"); };

    // Развернуть/свернуть лист
    const toggleCharacterSheet = useCallback((charIdToToggle) => {
        const myUserId = currentUser?.id;
        // Используем participantDetails для получения owner_id, если он есть
        const charOwnerId = participantDetails[charIdToToggle]?.owner_id;
        const isMyCharacter = myUserId === charOwnerId;
        const iAmMaster = currentUser?.username === lobbyMaster?.username;

        console.log(`Toggle Sheet: charId=${charIdToToggle}, myUserId=${myUserId}, ownerId=${charOwnerId}, isMy=${isMyCharacter}, isMaster=${iAmMaster}`);

        // Разрешаем, если это мой персонаж ИЛИ я мастер И персонаж существует в деталях
        if (charIdToToggle && participantDetails[charIdToToggle] && (isMyCharacter || iAmMaster)) {
             setExpandedCharacterId(prevId => (prevId === charIdToToggle ? null : charIdToToggle));
        } else if (charIdToToggle) {
             console.warn("Cannot expand sheet: Not owner or master, or details not loaded yet.");
             // Можно показать уведомление пользователю
        }
    }, [currentUser?.id, currentUser?.username, lobbyMaster?.username, participantDetails]);

    // Обработчик для API действий, вызываемых из ExpandedCharacterSheet
     const handleSheetApiAction = useCallback(async (actionPromise, successMsg, errorPrefix) => {
        // Добавляем lobby_key к вызовам API, если это необходимо для бэкенда
        // (Сейчас предполагаем, что эндпоинты activate и end_turn принимают lobby_key)
        // Пример: Модификация промиса (если actionPromise это функция)
        // const modifiedActionPromise = () => actionPromise(partyData?.lobby_key);
        // await handleLobbyAction(modifiedActionPromise(), successMsg, errorPrefix, { skipRefresh: true });

        // Пока просто вызываем переданный обработчик без авто-рефреша
        await handleLobbyAction(actionPromise, successMsg, errorPrefix, { skipRefresh: true });

    }, [handleLobbyAction, partyData?.lobby_key]); // Зависит от обработчика и ключа лобби


    // --- Рендеринг ---
    if (isUserLoading || !partyData || !currentUser) { return <div style={styles.loading}>{lobbyError || 'Загрузка данных...'}</div>; }

    const isConnected = isConnectedStatus;
    const playerCount = (lobbyMaster ? 1 : 0) + otherPlayers.filter(p => p != null).length;
    const expandedCharacterData = expandedCharacterId ? participantDetails[expandedCharacterId] : null;

    console.log(`--- Lobby RENDER --- isConnected=${isConnected}, playerCount=${playerCount}, Master=${JSON.stringify(lobbyMaster)}, Players=${JSON.stringify(otherPlayers)}, Details=${Object.keys(participantDetails)}, Expanded=${expandedCharacterId}`);

    return (
        <div style={styles.pageContainer}>
            <div style={styles.contentWrapper}>
                <header style={styles.header}>
                     <h1 style={styles.mainTitle}>Лобби</h1>
                     <div style={styles.headerInfo}>
                         <div style={styles.lobbyKeyBadge}> Ключ: <strong>{partyData.lobby_key}</strong> ({playerCount}/{partyData.max_players}) </div>
                         <div style={{ ...styles.statusIndicator, color: isConnected ? theme.colors.secondary : theme.colors.error }}>
                             <div style={{ ...styles.statusDot, background: isConnected ? theme.colors.secondary : theme.colors.error }} /> {isConnected ? 'Подключено' : 'Отключено'}
                         </div>
                         <button onClick={handleExit} style={styles.exitButton}>Выйти</button>
                     </div>
                </header>
                {/* Отображение ошибок */}
                {lobbyError && <p style={styles.errorBanner}>{lobbyError}</p>}
                {lobbyActionError && <p style={styles.errorBanner}>{lobbyActionError}</p>}

                <div style={{...styles.mainContentLayout, '@media (maxWidth: 992px)': { gridTemplateColumns: '1fr' } }}>
                    {/* Секция Участники */}
                    <Section title="Участники">
                        <div style={styles.participantsGrid}>
                            {lobbyMaster && (
                                <PlayerCard
                                    playerInfo={lobbyMaster}
                                    characterData={lobbyMaster.character_id ? participantDetails[lobbyMaster.character_id] : null}
                                    isMaster={true} isExpanded={expandedCharacterId === lobbyMaster.character_id}
                                    onToggleExpand={toggleCharacterSheet} isMyCard={currentUser?.username === lobbyMaster.username}
                                />
                            )}
                            {otherPlayers.map((player, index) => (
                                <PlayerCard
                                    key={player?.username ?? `slot-${index}`}
                                    playerInfo={player}
                                    characterData={player?.character_id ? participantDetails[player.character_id] : null}
                                    isMaster={false} isExpanded={expandedCharacterId === player?.character_id}
                                    onToggleExpand={toggleCharacterSheet} isMyCard={currentUser?.username === player?.username}
                                />
                            ))}
                        </div>
                    </Section>

                    {/* Секция Чат или Развернутый Лист */}
                    <div style={styles.rightPanel}>
                        {expandedCharacterData ? (
                            <Section title={`Персонаж: ${expandedCharacterData.name}`}>
                                <ExpandedCharacterSheet
                                    character={expandedCharacterData}
                                    onClose={() => setExpandedCharacterId(null)}
                                    // Передаем обработчик и ключ лобби
                                    handleApiAction={handleSheetApiAction}
                                    lobbyKey={partyData?.lobby_key}
                                />
                            </Section>
                        ) : (
                            <Section title="Чат">
                                <Chat socket={socketRef.current} username={currentUser?.username} />
                            </Section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Стили
const styles = {
    pageContainer: { minHeight: '100vh', background: theme.colors.background, color: theme.colors.text, padding: '30px 20px', boxSizing: 'border-box' },
    contentWrapper: { maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "25px" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', boxShadow: theme.effects.shadow },
    mainTitle: { margin: 0, fontSize: '1.6rem', color: theme.colors.primary },
    headerInfo: { display: "flex", alignItems: "center", gap: "16px", flexWrap: 'wrap' }, // Added flexWrap
    lobbyKeyBadge: { margin: 0, fontSize: "0.9rem", background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.surface}` },
    statusIndicator: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' },
    statusDot: { width: '10px', height: '10px', borderRadius: '50%' },
    exitButton: { padding: '8px 16px', background: theme.colors.error, color: theme.colors.text, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, ':hover': { opacity: 0.9 } },
    errorBanner: { background: `${theme.colors.error}44`, color: theme.colors.error, padding: '10px 15px', borderRadius: '8px', border: `1px solid ${theme.colors.error}`, textAlign: 'center', marginBottom: '0px', marginTop: '10px' }, // Added marginTop
    mainContentLayout: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '25px', minHeight: 'calc(100vh - 180px)' }, // Removed @media here, apply globally or via CSS module
    rightPanel: { display: 'flex', flexDirection: 'column', minWidth: 0, },
    section: { borderRadius: '16px', padding: '20px', boxShadow: theme.effects.shadow, display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }, // Added overflow hidden
    sectionTitle: { margin: '0 0 15px 0', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}88`, paddingBottom: '10px', fontSize: '1.2rem', flexShrink: 0 },
    participantsGrid: { display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '5px', flexGrow: 1 }, // Added flexGrow
    loading: { textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: theme.colors.text },
};

export default Lobby;
