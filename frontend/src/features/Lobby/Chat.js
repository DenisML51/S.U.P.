// src/features/Lobby/Chat.js
import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../../styles/theme';

const Chat = ({ socket, username }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const isMountedRef = useRef(true); // Ref для отслеживания монтирования

  // Прокрутка вниз
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Установка и очистка слушателей WebSocket
  useEffect(() => {
    isMountedRef.current = true; // Компонент смонтирован

    if (!socket) {
        console.log("Chat: No socket provided.");
        // Устанавливаем сообщение об отсутствии соединения, только если компонент все еще смонтирован
        if (isMountedRef.current) {
             setMessages([{ type: 'system', text: 'Соединение с чатом отсутствует.' }]);
        }
        return; // Выходим, если сокета нет
    }

    console.log("Chat: Setting up socket listeners for socket:", socket);
    // Очищаем старые сообщения при установке *нового* сокета
    setMessages([{ type: 'system', text: 'Подключение к чату...' }]);

    const messageHandler = (event) => {
         // Проверяем монтирование перед обновлением state
         if (!isMountedRef.current) {
             console.log("Chat: message received but component unmounted.");
             return;
         }
         console.log("Chat: Received message data:", event.data);
         let incomingMessage = '';
         let messageType = 'chat';
         let sender = null;

         try {
             const data = JSON.parse(event.data);
             if (data.type === 'players_update' || data.type === 'character_update') {
                 console.log("Chat: Ignoring system message type:", data.type);
                 return;
             }
             if (data.type === 'system') { messageType = 'system'; incomingMessage = data.text || event.data; }
             else if (typeof data === 'string') { incomingMessage = data; }
             else if (typeof data.text === 'string') { incomingMessage = data.text; sender = data.sender || null; }
             else { incomingMessage = JSON.stringify(data); }
         } catch (e) {
             incomingMessage = event.data;
             const match = incomingMessage.match(/^([^:]+):\s*(.*)$/);
             if (match) { sender = match[1]; incomingMessage = match[2]; }
         }

         if (!incomingMessage || !String(incomingMessage).trim()) return;

         setMessages(prev => [...prev, { type: messageType, text: incomingMessage, sender: sender }]);
    };

    const openHandler = () => {
        if (isMountedRef.current) {
             console.log("Chat: WebSocket opened.");
             setMessages(prev => [...prev, { type: 'system', text: 'Соединение установлено.' }]);
        }
    };
    const closeHandler = (event) => {
         if (isMountedRef.current) {
            console.log("Chat: WebSocket closed.", event.code, event.reason);
            setMessages(prev => [...prev, { type: 'system', text: `Соединение закрыто (${event.code}).` }]);
         }
    };
    const errorHandler = (error) => {
         if (isMountedRef.current) {
            console.error("Chat: WebSocket error:", error);
            setMessages(prev => [...prev, { type: 'system', text: 'Ошибка соединения.' }]);
         }
    };

    socket.addEventListener('message', messageHandler);
    socket.addEventListener('open', openHandler);
    socket.addEventListener('close', closeHandler);
    socket.addEventListener('error', errorHandler);

    // Функция очистки
    return () => {
        isMountedRef.current = false; // Компонент размонтирован
        console.log("Chat: Cleaning up socket listeners for socket:", socket);
        // Удаляем слушатели с того же экземпляра сокета
        socket.removeEventListener('message', messageHandler);
        socket.removeEventListener('open', openHandler);
        socket.removeEventListener('close', closeHandler);
        socket.removeEventListener('error', errorHandler);
    };

  }, [socket]); // Зависим только от сокета

  // Отправка сообщения
  const sendMessage = () => {
    if (socket?.readyState === WebSocket.OPEN && input.trim()) {
      const messageToSend = input.trim();
      socket.send(messageToSend);
      // Локальное добавление
      setMessages(prev => [...prev, { type: 'my_chat', text: messageToSend, sender: username }]);
      setInput("");
    } else {
        console.warn("Chat: Cannot send message.");
    }
  };

  const connectionStatus = socket?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';

  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatHeader}>
        <h3 style={{ margin: 0 }}>Игровой чат</h3>
        <div style={{ ...styles.statusIndicator, color: connectionStatus === 'connected' ? theme.colors.secondary : theme.colors.error }}>
          <div style={{ ...styles.statusDot, background: connectionStatus === 'connected' ? theme.colors.secondary : theme.colors.error }} />
          {connectionStatus === 'connected' ? 'Online' : 'Offline'}
        </div>
      </div>
      <div style={styles.chatMessages}>
        {messages.map((msg, i) => {
            // Определяем, мое ли это сообщение (по типу или по имени отправителя, если тип не 'my_chat')
            const isMy = msg.type === 'my_chat' || (msg.type !== 'system' && msg.sender === username);
            const isSystem = msg.type === 'system';
            // Формируем префикс имени отправителя
            const senderPrefix = !isMy && !isSystem && msg.sender ? msg.sender : null;

            return (
              <div
                key={i}
                style={{
                  ...styles.messageBubble,
                  ...(isSystem ? styles.systemMessage : {}),
                  ...(isMy ? styles.myMessage : {}),
                  alignSelf: isMy ? 'flex-end' : (isSystem ? 'center' : 'flex-start'),
                }}
              >
                {/* Отображаем имя отправителя, если оно есть и это не мое сообщение */}
                {senderPrefix && <strong style={styles.senderName}>{senderPrefix}</strong>}
                {/* Текст сообщения */}
                {msg.text}
              </div>
            );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div style={styles.chatInputContainer}>
        <input
          type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          style={styles.chatInput} placeholder="Напишите сообщение..."
          disabled={connectionStatus !== 'connected'}
        />
        <button onClick={sendMessage} disabled={connectionStatus !== 'connected'} style={styles.sendButton}>➔</button>
      </div>
    </div>
  );
};

// Стили (без изменений)
const styles = {
    chatContainer: { background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '15px', boxShadow: theme.effects.shadow, display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', height: '100%', boxSizing: 'border-box', minHeight: '400px' },
    chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surface}` },
    statusIndicator: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' },
    statusDot: { width: '10px', height: '10px', borderRadius: '50%' },
    chatMessages: { flexGrow: 1, overflowY: 'auto', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', scrollbarWidth: 'thin', scrollbarColor: `${theme.colors.primary} ${theme.colors.surface}` },
    messageBubble: { background: theme.colors.surface, borderRadius: '12px', padding: '8px 12px', wordBreak: 'break-word', maxWidth: '85%', animation: 'messageIn 0.3s ease-out', fontSize: '0.9rem', position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' },
    myMessage: { background: theme.colors.primary, color: theme.colors.background, alignSelf: 'flex-end' },
    systemMessage: { fontStyle: 'italic', color: theme.colors.textSecondary, background: 'none', padding: '2px 0', fontSize: '0.85rem', textAlign: 'center', alignSelf: 'center', boxShadow: 'none' },
    senderName: { display: 'block', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '3px', color: theme.colors.secondary, opacity: 0.9, },
    chatInputContainer: { display: 'flex', gap: '10px', width: '100%', alignItems: 'center' },
    chatInput: { flex: 1, padding: '10px 15px', background: 'rgba(255, 255, 255, 0.1)', border: `1px solid ${theme.colors.textSecondary}`, borderRadius: '20px', color: theme.colors.text, transition: theme.transitions.default, outline: 'none', ':focus': { borderColor: theme.colors.primary }, ':disabled': { opacity: 0.5 } },
    sendButton: { padding: '8px 16px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '20px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '1.2rem', ':disabled': { opacity: 0.5, cursor: 'not-allowed' }, ':hover:not(:disabled)': { transform: 'scale(1.1)' } },
};

export default Chat;
