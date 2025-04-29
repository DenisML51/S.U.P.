import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../../styles/theme';

const Chat = ({ socket, username }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);
    const isMountedRef = useRef(true); // Ref to track component mount status

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages]);

    // Effect to set up and clean up WebSocket listeners
    useEffect(() => {
        isMountedRef.current = true; // Mark as mounted

        if (!socket) {
            console.log("Chat: No socket provided.");
            if (isMountedRef.current) {
                 setMessages([{ type: 'system', text: 'Соединение с чатом отсутствует.' }]);
            }
            return; // Exit if no socket
        }

        console.log("Chat (v3): Setting up socket listeners for socket:", socket);
        // Clear previous messages and indicate connection attempt
        setMessages([{ type: 'system', text: 'Подключение к чату...' }]);

        // --- Message Handler ---
        const messageHandler = (event) => {
            if (!isMountedRef.current) {
                console.log("Chat (v3): message received but component unmounted.");
                return;
            }
            // console.log("Chat (v3): Raw message data:", event.data); // Reduce logging noise

            let msgData = null;
            try {
                 msgData = JSON.parse(event.data);
            } catch (e) {
                 // If not JSON, treat as a simple text message (though backend sends JSON for chat)
                 console.warn("Chat (v3): Received non-JSON message:", event.data);
                 // Avoid displaying raw system messages potentially caught here
                 if (event.data && !event.data.startsWith('{')) { // Basic check if it looks like system JSON
                    setMessages(prev => [...prev, { type: 'chat', text: event.data, sender: 'Unknown' }]);
                 }
                 return;
            }

            // Process parsed JSON data
            if (msgData && typeof msgData === 'object' && msgData.type) {
                const messageType = msgData.type;

                // --- ИЗМЕНЕНИЕ: Добавляем initial_character_sync в игнор ---
                if (messageType === 'players_update' || messageType === 'character_update' || messageType === 'initial_character_sync') {
                    // console.log(`Chat (v3): Ignoring Lobby message type: ${messageType}`); // Reduce logging noise
                    return;
                }
                // --- КОНЕЦ ИЗМЕНЕНИЯ ---

                // Process chat messages
                else if (messageType === 'chat') {
                    const sender = msgData.sender || 'Аноним';
                    const text = msgData.text || '';
                    if (text.trim()) { // Add only non-empty messages
                         const isMy = sender === username;
                         setMessages(prev => [...prev, { type: isMy ? 'my_chat' : 'chat', text: text, sender: sender }]);
                     } else {
                         console.warn("Chat (v3): Received empty chat message.");
                     }
                }
                // Process system messages intended for chat (if any)
                else if (messageType === 'system') {
                     const text = msgData.text || '';
                     if (text.trim()) {
                         setMessages(prev => [...prev, { type: 'system', text: text, sender: null }]);
                     }
                }
                 // Handle unknown JSON types
                 else {
                    console.warn(`Chat (v3): Received unknown JSON message type: ${messageType}`, msgData);
                    setMessages(prev => [...prev, { type: 'system', text: `Неизвестное системное сообщение.`, sender: null }]);
                }
            } else {
                // Handle JSON without 'type' field
                console.warn("Chat (v3): Received JSON message without 'type' field:", msgData);
                setMessages(prev => [...prev, { type: 'system', text: `Неструктурированное системное сообщение.`, sender: null }]);
            }
        };

        // --- Other Handlers (Open, Close, Error) ---
        const openHandler = () => {
             if (isMountedRef.current) {
                 console.log("Chat (v3): WebSocket opened.");
                 // Avoid duplicate "Connected" messages if Lobby also shows status
                 // setMessages(prev => [...prev, { type: 'system', text: 'Соединение установлено.' }]);
             }
        };

        const closeHandler = (event) => {
             if (isMountedRef.current) {
                console.log("Chat (v3): WebSocket closed.", event.code, event.reason);
                setMessages(prev => [...prev, { type: 'system', text: `Чат отключен (Код: ${event.code}).` }]);
             }
        };

        const errorHandler = (error) => {
             if (isMountedRef.current) {
                console.error("Chat (v3): WebSocket error:", error);
                setMessages(prev => [...prev, { type: 'system', text: 'Ошибка соединения с чатом.' }]);
             }
        };

        // Add event listeners
        socket.addEventListener('message', messageHandler);
        socket.addEventListener('open', openHandler);
        socket.addEventListener('close', closeHandler);
        socket.addEventListener('error', errorHandler);

        // Cleanup function
        return () => {
            isMountedRef.current = false; // Mark as unmounted
            console.log("Chat (v3): Cleaning up socket listeners for socket:", socket);
            // Remove the *same* handler functions used above
            socket.removeEventListener('message', messageHandler);
            socket.removeEventListener('open', openHandler);
            socket.removeEventListener('close', closeHandler);
            socket.removeEventListener('error', errorHandler);
        };
    }, [socket, username]); // Dependency on socket and username

    // Function to send a message
    const sendMessage = () => {
        if (socket?.readyState === WebSocket.OPEN && input.trim()) {
            const messageToSend = input.trim();
            // Backend expects simple text for chat messages now
            socket.send(messageToSend);
            // Optimistically add the message to the local state
            // Note: Backend will broadcast it back with sender info,
            // Chat's messageHandler will add it again. This might cause duplicates
            // unless we add a message ID system or rely solely on the broadcast.
            // For simplicity now, we'll rely on the broadcast.
            // setMessages(prev => [...prev, { type: 'my_chat', text: messageToSend, sender: username }]);
            setInput("");
        } else {
            console.warn("Chat (v3): Cannot send message. Socket state:", socket?.readyState);
            // Optionally provide user feedback (e.g., disable input/button visually)
        }
    };

    // Determine connection status for UI feedback
    const connectionStatus = socket?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';

    return (
        <div style={styles.chatContainer}>
            {/* Chat Header */}
            <div style={styles.chatHeader}>
                <h3 style={{ margin: 0 }}>Игровой чат</h3>
                <div style={{ ...styles.statusIndicator, color: connectionStatus === 'connected' ? theme.colors.secondary : theme.colors.error }}>
                    <div style={{ ...styles.statusDot, background: connectionStatus === 'connected' ? theme.colors.secondary : theme.colors.error }} />
                    {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                </div>
            </div>

            {/* Chat Messages Area */}
            <div style={styles.chatMessages}>
                {messages.map((msg, i) => {
                    const isMy = msg.type === 'my_chat'; // Backend now adds sender, so we only need 'my_chat' type if we add locally
                    const isSystem = msg.type === 'system';
                    // Determine sender prefix ONLY for non-system, non-my messages
                    const senderPrefix = !isMy && !isSystem && msg.sender ? msg.sender : null;
                    const messageKey = `${msg.sender || 'system'}-${i}-${msg.text.slice(0, 10)}`; // More robust key

                    return (
                        <div
                            key={messageKey} // Use a more unique key
                            style={{
                                ...styles.messageBubble,
                                ...(isSystem ? styles.systemMessage : {}),
                                ...(isMy ? styles.myMessage : {}),
                                // Align based on type
                                alignSelf: isMy ? 'flex-end' : (isSystem ? 'center' : 'flex-start'),
                            }}
                        >
                            {/* Display sender name if it's not my message and not system */}
                            {senderPrefix && <strong style={styles.senderName}>{senderPrefix}</strong>}
                            {/* Message text */}
                            {msg.text}
                        </div>
                    );
                })}
                {/* Invisible div to scroll to */}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <div style={styles.chatInputContainer}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    style={styles.chatInput}
                    placeholder="Напишите сообщение..."
                    disabled={connectionStatus !== 'connected'} // Disable input if not connected
                    maxLength={200} // Add a max length
                />
                <button
                    onClick={sendMessage}
                    disabled={connectionStatus !== 'connected' || !input.trim()} // Disable button if not connected or input is empty
                    style={styles.sendButton}
                    title="Отправить"
                >
                     ➔ {/* Send arrow */}
                </button>
            </div>
        </div>
    );
};

// --- Styles --- (Copied from previous version, ensure theme is correctly imported)
const styles = {
    chatContainer: { background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '15px', boxShadow: theme.effects.shadow, display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', height: '100%', boxSizing: 'border-box', minHeight: '400px', overflow:'hidden' }, // Added overflow hidden
    chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surfaceVariant}88`, flexShrink: 0 }, // Added flexShrink
    statusIndicator: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' },
    statusDot: { width: '10px', height: '10px', borderRadius: '50%' },
    chatMessages: {
        flexGrow: 1,
        overflowY: 'auto', // Enable scrolling
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column', // Messages stack vertically
        gap: '10px',
        // Custom scrollbar styles
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.colors.primary}55 ${theme.colors.surface}55`,
        '&::-webkit-scrollbar': { width: '8px' },
        '&::-webkit-scrollbar-track': { background: `${theme.colors.surface}55`, borderRadius: '4px' },
        '&::-webkit-scrollbar-thumb': { background: `${theme.colors.primary}55`, borderRadius: '4px', border: `1px solid ${theme.colors.surface}88` },
        '&::-webkit-scrollbar-thumb:hover': { background: `${theme.colors.primary}88` }
    },
    messageBubble: {
        background: theme.colors.surface,
        borderRadius: '12px', // Consistent rounding
        padding: '8px 12px',
        wordBreak: 'break-word',
        maxWidth: '85%', // Prevent messages from taking full width
        animation: 'messageIn 0.3s ease-out', // Simple fade-in/slide-up
        fontSize: '0.9rem',
        position: 'relative', // For potential future elements like timestamps
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        border: `1px solid ${theme.colors.surfaceVariant}33`, // Subtle border
        lineHeight: 1.4, // Improve readability
    },
    myMessage: {
        background: theme.colors.primary,
        color: theme.colors.background, // Text color for my messages
        alignSelf: 'flex-end', // Align my messages to the right
        border: `1px solid ${theme.colors.primary}55`,
    },
    systemMessage: {
        fontStyle: 'italic',
        color: theme.colors.textSecondary,
        background: 'none', // No background for system messages
        padding: '2px 0',
        fontSize: '0.85rem',
        textAlign: 'center',
        alignSelf: 'center', // Center system messages
        boxShadow: 'none', // No shadow for system messages
        border: 'none',
    },
    senderName: { // Style for sender name (if shown)
        display: 'block',
        fontWeight: 'bold',
        fontSize: '0.8rem',
        marginBottom: '3px',
        color: theme.colors.secondary, // Use secondary color for sender name
        opacity: 0.9,
    },
    chatInputContainer: {
        display: 'flex',
        gap: '10px',
        width: '100%',
        alignItems: 'center',
        paddingTop: '10px', // Add some space above input
        borderTop: `1px solid ${theme.colors.surfaceVariant}88`, // Separator line
        flexShrink: 0, // Prevent input area from shrinking
    },
    chatInput: {
        flex: 1, // Take available space
        padding: '10px 15px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: `1px solid ${theme.colors.textSecondary}88`, // Subtle border
        borderRadius: '20px', // Rounded input
        color: theme.colors.text,
        transition: theme.transitions.default,
        outline: 'none',
        fontSize: '0.95rem',
        ':focus': {
            borderColor: theme.colors.primary,
            boxShadow: `0 0 0 2px ${theme.colors.primary}44`, // Focus indicator
        },
        ':disabled': { opacity: 0.5 }
    },
    sendButton: {
        padding: '0', // Remove padding, use width/height
        width: '40px', // Fixed size
        height: '40px', // Fixed size
        background: theme.colors.primary,
        color: theme.colors.background,
        border: 'none',
        borderRadius: '50%', // Circular button
        cursor: 'pointer',
        transition: theme.transitions.default + ', transform 0.1s ease',
        fontSize: '1.5rem', // Icon size
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0, // Prevent button shrinking
        ':disabled': {
            opacity: 0.5,
            cursor: 'not-allowed',
            background: theme.colors.textSecondary, // Grey out disabled button
        },
        ':hover:not(:disabled)': {
            filter: 'brightness(1.1)',
            transform: 'scale(1.05)',
        },
         ':active:not(:disabled)': {
             transform: 'scale(0.95)', // Click effect
         }
    },
    // Keyframes for message animation
    '@keyframes messageIn': {
        'from': { opacity: 0, transform: 'translateY(5px)' },
        'to': { opacity: 1, transform: 'translateY(0)' }
    }
};


export default Chat;
