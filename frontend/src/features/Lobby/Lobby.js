import React, { useState, useEffect, useCallback, useRef, memo, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { theme } from '../../styles/theme';
import PlayerCardComponent from './components/PlayerCard';
import Chat from './Chat';
import * as apiService from '../../api/apiService';
import ExpandedCharacterSheet from './components/ExpandedCharacterSheet';
import { useApiActionHandler } from '../../hooks/useApiActionHandler';
import { useAuth } from '../../hooks/useAuth';

const PlayerCard = memo(PlayerCardComponent);

const Section = ({ title, children, style = {} }) => (
    <section style={{ ...styles.section, background: theme.effects.glass, backdropFilter: theme.effects.blur, ...style }}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {children}
    </section>
);

const Lobby = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const partyData = location.state?.party;
    const initialCharacterIdRef = useRef(location.state?.characterId);
    const token = localStorage.getItem("token");

    const lobbyKey = partyData?.lobby_key;
    const masterUsername = partyData?.creator_username;
    const maxPlayers = partyData?.max_players;

    const [lobbyMaster, setLobbyMaster] = useState(null);
    const [otherPlayers, setOtherPlayers] = useState([]);
    const socketRef = useRef(null);
    const [isConnectedStatus, setIsConnectedStatus] = useState(false);
    const [lobbyError, setLobbyError] = useState('');
    const [participantDetails, setParticipantDetails] = useState({});
    const [expandedCharacterId, setExpandedCharacterId] = useState(null);

    // Pass null for refreshDataCallback, rely on WebSocket for updates in lobby
    const { handleApiAction: handleLobbyAction, actionError: lobbyActionError } = useApiActionHandler(null);

    // --- Callbacks ---

    const updateLocalCharacterDetails = useCallback((updatedCharData) => {
        if (updatedCharData && updatedCharData.id) {
            setParticipantDetails(prev => {
                if (JSON.stringify(prev[updatedCharData.id]) !== JSON.stringify(updatedCharData)) {
                    // console.log(`Lobby: Updating local details for CharID ${updatedCharData.id}`);
                    return { ...prev, [updatedCharData.id]: updatedCharData };
                }
                return prev;
            });
        }
    }, []);

    const handlePlayersUpdate = useCallback((data) => {
        // console.log("[WS Handler] handlePlayersUpdate received:", JSON.stringify(data));
        if (maxPlayers === undefined || maxPlayers === null) {
            console.error("Lobby: Cannot process player update: maxPlayers is missing!");
            return;
        }
        if (data.master) {
            setLobbyMaster(prevMaster => JSON.stringify(prevMaster) !== JSON.stringify(data.master) ? data.master : prevMaster);
        } else {
             console.warn("Lobby: No 'master' key found in players_update.");
             if (!lobbyMaster && masterUsername) setLobbyMaster({ username: masterUsername, character_id: null });
        }
        if (data.players && Array.isArray(data.players)) {
            const targetSlots = Math.max(0, maxPlayers - 1);
            const finalPlayers = Array.from({ length: targetSlots }, (_, i) => data.players[i] ? { ...data.players[i] } : null);
            // console.log(`Lobby: Setting otherPlayers state (target slots: ${targetSlots}):`, JSON.stringify(finalPlayers));
            setOtherPlayers(prevPlayers => JSON.stringify(prevPlayers) !== JSON.stringify(finalPlayers) ? finalPlayers : prevPlayers);
        } else {
            console.warn("Lobby: No valid 'players' array found in players_update.");
            setOtherPlayers(prevPlayers => {
                 const emptySlots = Array(Math.max(0, maxPlayers - 1)).fill(null);
                 return JSON.stringify(prevPlayers) !== JSON.stringify(emptySlots) ? emptySlots : prevPlayers;
            });
        }
    }, [maxPlayers, masterUsername, lobbyMaster]);

    const handleCharacterUpdate = useCallback((characterData) => {
        // console.log("[WS Handler] handleCharacterUpdate received for CharID:", characterData?.id);
        updateLocalCharacterDetails(characterData);
    }, [updateLocalCharacterDetails]);

    const handleInitialSync = useCallback((charactersArray) => {
        if (!Array.isArray(charactersArray)) {
            console.error("Lobby: Initial sync data is not an array:", charactersArray);
            return;
        }
        console.log(`Lobby: Received initial sync with ${charactersArray.length} characters.`);
        setParticipantDetails(prevDetails => {
            const newDetails = { ...prevDetails };
            let updated = false;
            charactersArray.forEach(charData => {
                if (charData && charData.id) {
                    if (JSON.stringify(newDetails[charData.id]) !== JSON.stringify(charData)) {
                         newDetails[charData.id] = charData;
                         updated = true;
                     }
                }
            });
            if (updated) {
                 console.log("Lobby: Updated participantDetails after initial sync:", Object.keys(newDetails));
                 return newDetails;
            }
            return prevDetails;
        });
    }, []);

    useEffect(() => {
        if (partyData && masterUsername && typeof maxPlayers === 'number') {
            // console.log("Lobby: Initializing state with party data:", partyData);
            setLobbyMaster({ username: masterUsername, character_id: null });
            setOtherPlayers(Array(Math.max(0, maxPlayers - 1)).fill(null));
            setIsConnectedStatus(false);
            setLobbyError('');
            setParticipantDetails({});
            setExpandedCharacterId(null);
        } else if (!partyData && currentUser === null) {
            console.log("Lobby: No party data or user, navigating away.");
             const timer = setTimeout(() => navigate("/"), 50);
             return () => clearTimeout(timer);
        }
    }, [partyData, masterUsername, maxPlayers, navigate, currentUser]);

    useEffect(() => {
        if (!currentUser) {
            // console.log("Lobby WS Effect: Waiting for currentUser...");
            return;
        }

        const currentUsername = currentUser.username;
        const isMasterConnecting = currentUsername === masterUsername;
        const charId = initialCharacterIdRef.current;
        const canConnect = token && lobbyKey && masterUsername && typeof maxPlayers === 'number' && currentUsername && (isMasterConnecting || charId !== undefined);

        // console.log("Lobby WS Effect (v5): Checking connection readiness:", { canConnect, isMasterConnecting, token: !!token, lobbyKey, masterUsername, maxPlayers, charId, currentUsername });

        if (!canConnect) {
            // console.log("Lobby WS Effect (v5): Skipping connection.");
            if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
                socketRef.current.close(1000, "Missing connection data");
                socketRef.current = null;
                setIsConnectedStatus(false);
            }
            return;
        }

        const characterIdParam = isMasterConnecting ? '' : `&characterId=${encodeURIComponent(charId ?? '')}`;
        const wsUrl = `ws://localhost:8000/ws?token=${encodeURIComponent(token)}&lobbyKey=${encodeURIComponent(lobbyKey)}&masterUsername=${encodeURIComponent(masterUsername)}&maxPlayers=${encodeURIComponent(maxPlayers)}${characterIdParam}`;

        if (socketRef.current && socketRef.current.url === wsUrl && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
            // console.log("Lobby WS Effect (v5): WebSocket already connected or connecting.");
            return;
        }

        if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
            console.log("Lobby WS Effect (v5): Closing previous WebSocket.");
            socketRef.current.close(1000, "Reinitializing");
            socketRef.current = null;
        }

        console.log("Lobby WS Effect (v5): Attempting to connect to:", wsUrl);
        let ws = null;
        try {
            ws = new WebSocket(wsUrl);
            socketRef.current = ws;
            setIsConnectedStatus(false);
        } catch (error) {
            console.error("Lobby WS Effect (v5): WebSocket constructor failed:", error);
            setLobbyError(`Ошибка WebSocket: ${error.message}`);
            socketRef.current = null;
            setIsConnectedStatus(false);
            return;
        }

        let currentWs = ws;

        currentWs.onopen = () => {
            if (socketRef.current === currentWs) {
                console.log("<<< WebSocket OPEN (v5) >>>");
                setIsConnectedStatus(true);
                setLobbyError('');
            } else {
                console.log("<<< Stale WebSocket OPEN ignored (v5) >>>");
                if (currentWs.readyState !== WebSocket.CLOSED) currentWs.close(1000, "Stale onopen");
            }
        };

        currentWs.onmessage = (event) => {
            if (socketRef.current !== currentWs) return;
            try {
                const data = JSON.parse(event.data);
                // console.log("[WS Handler] Received message:", data.type);
                switch (data.type) {
                    case "players_update":
                        handlePlayersUpdate(data);
                        break;
                    case "character_update":
                        handleCharacterUpdate(data.character);
                        break;
                    case "initial_character_sync":
                        handleInitialSync(data.characters);
                        break;
                    case "chat": break; // Ignored here
                    default: console.warn("Lobby received unhandled WS message type:", data.type);
                }
            } catch (e) {
                // console.log("Lobby received non-JSON WS message:", event.data);
            }
        };

        currentWs.onerror = (error) => {
            if (socketRef.current === currentWs) {
                console.error("<<< WebSocket ERROR (v5) >>>:", error);
                setIsConnectedStatus(false);
                setLobbyError("Ошибка WebSocket соединения.");
                socketRef.current = null;
            } else {
                 console.log("<<< Stale WebSocket ERROR ignored (v5) >>>");
            }
        };

        currentWs.onclose = (event) => {
            if (socketRef.current === currentWs) {
                console.log("<<< WebSocket CLOSE (v5) >>> Code:", event.code, "Reason:", event.reason);
                setIsConnectedStatus(false);
                socketRef.current = null;
                if (!event.wasClean && event.code !== 1000 && event.code !== 1001) {
                     let reason = `Соединение разорвано (Код: ${event.code}).`;
                     if (event.reason) reason += ` Причина: ${event.reason}`;
                     setLobbyError(reason + " Попробуйте обновить страницу.");
                }
            } else {
                console.log("<<< Stale WebSocket CLOSE ignored (v5) >>>");
            }
        };

        return () => {
            console.log("<<< Lobby Cleanup (v5): Closing WebSocket >>>", currentWs?.url);
            if (currentWs && currentWs.readyState !== WebSocket.CLOSED) {
                currentWs.onopen = null; currentWs.onmessage = null; currentWs.onerror = null; currentWs.onclose = null;
                currentWs.close(1000, "Component unmounting or dependency change");
            }
            if (socketRef.current === currentWs) {
                socketRef.current = null;
            }
        };
    }, [ token, lobbyKey, masterUsername, maxPlayers, currentUser, navigate, handleCharacterUpdate, handleInitialSync, handlePlayersUpdate ]);


    const handleExit = () => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.close(1000, "User exited");
        }
        navigate("/");
    };

    const toggleCharacterSheet = useCallback((charIdToToggle) => {
        if (charIdToToggle === null || charIdToToggle === undefined || !currentUser) {
            console.warn("toggleCharacterSheet: Missing charIdToToggle or currentUser");
            return;
        }
        const iAmMaster = currentUser.username === masterUsername;
        const detailsAvailable = !!participantDetails[charIdToToggle];
        const myIdForThisSession = initialCharacterIdRef.current;
        const isMySheet = Number(myIdForThisSession) === Number(charIdToToggle);

        console.log(
            `Toggle Sheet Check (v3): \n`,
            ` - charIdToToggle: ${charIdToToggle} (Type: ${typeof charIdToToggle})\n`,
            ` - currentUser: ${currentUser?.username}\n`,
            ` - masterUsername: ${masterUsername}\n`,
            ` - iAmMaster: ${iAmMaster}\n`,
            ` - initialCharacterIdRef.current (myIdForThisSession): ${myIdForThisSession} (Type: ${typeof myIdForThisSession})\n`,
            ` - isMySheet (Comparison Result): ${isMySheet}\n`,
            ` - detailsAvailable: ${detailsAvailable}`
        );

        if (detailsAvailable && (iAmMaster || isMySheet)) {
             setExpandedCharacterId(prevId => (prevId === charIdToToggle ? null : charIdToToggle));
             setLobbyError('');
        } else if (!detailsAvailable) {
             console.warn("Cannot expand sheet: Details not loaded yet for CharID", charIdToToggle);
             setLobbyError(`Данные для персонажа ${charIdToToggle} еще не загружены.`);
             setTimeout(() => setLobbyError(''), 3000);
        } else {
             console.warn("Cannot expand sheet: Not authorized (not master or owner for this session).");
             setLobbyError("Вы не можете просматривать лист этого персонажа.");
             setTimeout(() => setLobbyError(''), 3000);
        }
    }, [currentUser, masterUsername, participantDetails]);

    // --- ИЗМЕНЕНИЕ: Обновляем handleSheetApiActionWrapper ---
    const handleSheetApiActionWrapper = useCallback(async (
        // Принимаем либо Promise, либо функцию и аргументы
        actionOrPromise,
        argsOrSuccessMsg, // Может быть массивом аргументов или строкой успеха
        successMsgOrErrorPrefix, // Может быть строкой успеха или префиксом ошибки
        errorPrefixOrOptions, // Может быть префиксом ошибки или опциями
        optionsArg // Опциональный объект опций
    ) => {
        let actionPromise;
        let successMessage;
        let errorMessagePrefix;
        let options = { skipRefresh: true }; // Default skipRefresh to true for lobby actions

        // Определяем, как были переданы аргументы
        if (typeof actionOrPromise === 'function') {
            // Передана функция и массив аргументов
            const apiCallFunction = actionOrPromise;
            const args = Array.isArray(argsOrSuccessMsg) ? argsOrSuccessMsg : [];
            successMessage = typeof successMsgOrErrorPrefix === 'string' ? successMsgOrErrorPrefix : '';
            errorMessagePrefix = typeof errorPrefixOrOptions === 'string' ? errorPrefixOrOptions : 'Ошибка';
            options = typeof optionsArg === 'object' ? { ...options, ...optionsArg } : options;

            // Добавляем lobbyKey к аргументам для вызова API
            const argsWithLobbyKey = [...args, lobbyKey];
            // Вызываем API функцию, чтобы получить Promise
            actionPromise = apiCallFunction(...argsWithLobbyKey);
            console.log(`Sheet Action Wrapper: Called API function ${apiCallFunction.name} with args:`, argsWithLobbyKey);

        } else if (actionOrPromise instanceof Promise) {
            // Передан уже созданный Promise
            actionPromise = actionOrPromise;
            successMessage = typeof argsOrSuccessMsg === 'string' ? argsOrSuccessMsg : '';
            errorMessagePrefix = typeof successMsgOrErrorPrefix === 'string' ? successMsgOrErrorPrefix : 'Ошибка';
            options = typeof errorPrefixOrOptions === 'object' ? { ...options, ...errorPrefixOrOptions } : options;
             console.log(`Sheet Action Wrapper: Received pre-called Promise.`);
        } else {
            console.error("handleSheetApiActionWrapper received invalid first argument. Expected function or Promise.", actionOrPromise);
            setLobbyError("Внутренняя ошибка: Неверный вызов действия.");
            return; // Выходим, если передан некорректный первый аргумент
        }

        // Вызываем базовый обработчик handleLobbyAction с Promise
        const resultData = await handleLobbyAction(
            actionPromise,
            successMessage,
            errorMessagePrefix,
            options // Передаем опции (включая skipRefresh: true)
        );

        // Оптимистичное обновление локальных данных
        if (resultData) {
            // console.log("Optimistically updating local details after sheet action:", resultData.id);
            updateLocalCharacterDetails(resultData);
        }
    // Зависимости: handleLobbyAction, lobbyKey, updateLocalCharacterDetails
    }, [handleLobbyAction, lobbyKey, updateLocalCharacterDetails]);
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---


    // --- Rendering ---
    if (!currentUser || !partyData || !lobbyKey || typeof maxPlayers !== 'number') {
        return <div style={styles.loading}>{lobbyError || 'Загрузка лобби...'}</div>;
    }

    const isConnected = isConnectedStatus;
    const playerCount = (lobbyMaster ? 1 : 0) + otherPlayers.filter(p => p != null).length;
    const expandedCharacterData = expandedCharacterId ? participantDetails[expandedCharacterId] : null;

    const isMyCardCheck = (playerUsername) => currentUser?.username === playerUsername;
    // const isMyCardForSheetCheck = (charId) => initialCharacterIdRef.current === charId; // Больше не нужна, логика в toggle

    return (
        <Fragment>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
            <div style={styles.pageContainer}>
                <div style={styles.contentWrapper}>
                    <header style={styles.header}>
                        <h1 style={styles.mainTitle}>Лобби</h1>
                        <div style={styles.headerInfo}>
                            <div style={styles.lobbyKeyBadge}>
                                Ключ: <strong>{lobbyKey}</strong> ({playerCount}/{maxPlayers})
                            </div>
                            <div style={{ ...styles.statusIndicator, color: isConnected ? theme.colors.secondary : theme.colors.error }}>
                                <div style={{ ...styles.statusDot, background: isConnected ? theme.colors.secondary : theme.colors.error }} />
                                {isConnected ? 'Подключено' : 'Отключено'}
                            </div>
                            <button onClick={handleExit} style={styles.exitButton}>Выйти</button>
                        </div>
                    </header>

                    {lobbyError && <p style={styles.errorBanner}>{lobbyError}</p>}
                    {lobbyActionError && <p style={styles.errorBanner}>{lobbyActionError}</p>}

                    <div style={styles.mainContentLayout}>
                        <Section title="Участники" style={styles.participantsSection}>
                            <div style={styles.participantsGrid}>
                                {lobbyMaster && (
                                    <PlayerCard
                                        key={lobbyMaster.username || 'master-placeholder'}
                                        playerInfo={lobbyMaster}
                                        characterData={lobbyMaster.character_id ? participantDetails[lobbyMaster.character_id] : null}
                                        isMaster={true}
                                        isExpanded={expandedCharacterId === lobbyMaster.character_id}
                                        onToggleExpand={toggleCharacterSheet}
                                        isMyCard={isMyCardCheck(lobbyMaster.username)}
                                        iAmMaster={currentUser?.username === masterUsername}
                                    />
                                )}
                                {otherPlayers.map((player, index) => {
                                    const characterData = player?.character_id ? participantDetails[player.character_id] : null;
                                    // console.log(`Rendering PlayerCard slot ${index} for CharID ${player?.character_id}: Has details?`, !!characterData);
                                    return (
                                        <PlayerCard
                                            key={`player-slot-${index}`}
                                            playerInfo={player}
                                            characterData={characterData}
                                            isMaster={false}
                                            isExpanded={expandedCharacterId === player?.character_id}
                                            onToggleExpand={toggleCharacterSheet}
                                            isMyCard={isMyCardCheck(player?.username)}
                                            iAmMaster={currentUser?.username === masterUsername}
                                        />
                                    );
                                })}
                            </div>
                        </Section>

                        <div style={styles.rightPanel}>
                            {expandedCharacterData ? (
                                <Section title={`Персонаж: ${expandedCharacterData.name}`} style={styles.expandedSheetSection}>
                                    <ExpandedCharacterSheet
                                        character={expandedCharacterData}
                                        onClose={() => setExpandedCharacterId(null)}
                                        handleApiAction={handleSheetApiActionWrapper} // Передаем обновленную обертку
                                        iAmMaster={currentUser?.username === masterUsername}
                                    />
                                </Section>
                            ) : (
                                <Section title="Чат" style={styles.chatSection}>
                                    <Chat socket={socketRef.current} username={currentUser?.username} />
                                </Section>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

// --- Styles --- (No changes needed here)
const styles = {
    pageContainer: {
        minHeight: '100vh',
        background: theme.colors.background,
        color: theme.colors.text,
        padding: '20px', // Reduced padding
        boxSizing: 'border-box',
        display: 'flex', // Added for centering contentWrapper potentially
        flexDirection: 'column', // Added
    },
    contentWrapper: {
        maxWidth: "1500px", // Slightly wider max-width
        width: '100%', // Ensure it takes full width up to max
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "20px", // Reduced gap
        flexGrow: 1, // Allow content to grow
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 25px', // Adjusted padding
        background: theme.effects.glass,
        backdropFilter: theme.effects.blur,
        borderRadius: '12px', // Slightly less rounded
        boxShadow: theme.effects.shadow,
        flexShrink: 0, // Prevent header from shrinking
    },
    mainTitle: {
        margin: 0,
        fontSize: '1.5rem', // Slightly smaller title
        color: theme.colors.primary,
        fontWeight: '600',
    },
    headerInfo: {
        display: "flex",
        alignItems: "center",
        gap: "15px", // Reduced gap
        flexWrap: 'wrap' // Allow wrapping on smaller screens
    },
    lobbyKeyBadge: {
        margin: 0,
        fontSize: "0.85rem", // Slightly smaller
        background: 'rgba(0,0,0,0.3)',
        padding: '5px 10px', // Adjusted padding
        borderRadius: '6px',
        border: `1px solid ${theme.colors.surfaceVariant}88`, // More subtle border
        whiteSpace: 'nowrap', // Prevent wrapping
    },
    statusIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px', // Reduced gap
        fontSize: '0.85rem',
        fontWeight: '500',
    },
    statusDot: {
        width: '9px', // Slightly smaller
        height: '9px',
        borderRadius: '50%',
        boxShadow: '0 0 4px currentColor', // Add subtle glow
    },
    exitButton: {
        padding: '6px 14px', // Adjusted padding
        background: theme.colors.error + 'AA', // More transparent
        color: theme.colors.text,
        border: `1px solid ${theme.colors.error}55`,
        borderRadius: '6px',
        cursor: 'pointer',
        transition: theme.transitions.default,
        fontSize: '0.85rem',
        fontWeight: '500',
        ':hover': { background: theme.colors.error, borderColor: theme.colors.error }
    },
    errorBanner: {
        background: `${theme.colors.error}22`, // More subtle background
        color: theme.colors.error,
        padding: '10px 15px',
        borderRadius: '8px',
        border: `1px solid ${theme.colors.error}55`,
        textAlign: 'center',
        fontSize: '0.9rem',
        animation: 'fadeIn 0.3s ease-out',
        flexShrink: 0, // Prevent banner from shrinking
    },
    mainContentLayout: {
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 1fr) 2fr', // Adjusted columns for responsiveness
        gap: '20px', // Reduced gap
        flexGrow: 1, // Allow layout to fill space
        overflow: 'hidden', // Hide overflow at this level
        // Media query for stacking columns
        '@media (max-width: 992px)': {
            gridTemplateColumns: '1fr', // Stack columns
            overflow: 'visible', // Allow content to overflow when stacked
        }
    },
    participantsSection: {
        minHeight: '400px', // Ensure minimum height
        maxHeight: 'calc(100vh - 200px)', // Limit height relative to viewport
        overflow: 'hidden', // Hide overflow for the section itself
        display: 'flex', // Needed for flexGrow on participantsGrid
        flexDirection: 'column', // Needed for flexGrow on participantsGrid
    },
    rightPanel: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0, // Prevent flex item overflow
        minHeight: '400px', // Ensure minimum height
        maxHeight: 'calc(100vh - 200px)', // Limit height relative to viewport
        overflow: 'hidden', // Hide overflow for the section itself
    },
    chatSection: {
        flexGrow: 1, // Allow chat to fill space
        display: 'flex', // Ensure flex properties work
        flexDirection: 'column', // Ensure flex properties work
        overflow: 'hidden', // Hide internal overflow if Chat manages its own scroll
    },
    expandedSheetSection: {
        flexGrow: 1, // Allow sheet to fill space
        display: 'flex', // Ensure flex properties work
        flexDirection: 'column', // Ensure flex properties work
        overflow: 'hidden', // Hide internal overflow if Sheet manages its own scroll
    },
    section: {
        borderRadius: '12px',
        padding: '15px', // Reduced padding
        boxShadow: theme.effects.shadow,
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1, // Allow section to grow
        overflow: 'hidden', // Hide overflow within section
        border: `1px solid ${theme.colors.surfaceVariant}44`, // More subtle border
    },
    sectionTitle: {
        margin: '0 0 12px 0', // Reduced margin
        color: theme.colors.secondary,
        borderBottom: `1px solid ${theme.colors.secondary}55`, // More subtle border
        paddingBottom: '8px', // Reduced padding
        fontSize: '1.1rem', // Slightly smaller
        fontWeight: '600',
        textAlign: 'center',
        flexShrink: 0, // Prevent title from shrinking
    },
    participantsGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px', // Reduced gap
        overflowY: 'auto', // Enable scrolling for participants
        flexGrow: 1, // Allow grid to fill space within section
        padding: '5px', // Add padding for scrollbar spacing
        margin: '-5px', // Counteract padding for visual alignment
        // --- Custom Scrollbar ---
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.colors.primary}55 ${theme.colors.surface}55`,
        '&::-webkit-scrollbar': { width: '8px' },
        '&::-webkit-scrollbar-track': { background: `${theme.colors.surface}55`, borderRadius: '4px' },
        '&::-webkit-scrollbar-thumb': { background: `${theme.colors.primary}55`, borderRadius: '4px', border: `1px solid ${theme.colors.surface}88` },
        '&::-webkit-scrollbar-thumb:hover': { background: `${theme.colors.primary}88` }
        // --- End Scrollbar ---
    },
    loading: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: theme.colors.background,
        color: theme.colors.text,
        fontSize: '1.5rem'
    },
};

export default Lobby;
