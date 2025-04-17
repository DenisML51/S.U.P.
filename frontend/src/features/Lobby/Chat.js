// src/features/Lobby/Chat.js
import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../../styles/theme'; // Обновленный импорт

const Chat = ({ socket, username }) => { // Принимаем socket и username как props
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end" // Прокрутка к концу блока
    });
  }, [messages]);

  // Обработка входящих сообщений от WebSocket
  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
         let incomingMessage = '';
         let messageType = 'chat'; // По умолчанию считаем сообщением чата

         try {
             // Пытаемся распарсить JSON (для системных сообщений или структурированных данных)
             const data = JSON.parse(event.data);
             // Исключаем обновление списка игроков из чата
             if (data.type === 'players_update') {
                 return; // Не показываем это в чате
             }
             // Если есть поле text, используем его
             if (typeof data.text === 'string') {
                 incomingMessage = data.text;
             } else {
                 incomingMessage = event.data; // Показываем как есть, если структура другая
             }
             if (data.type === 'system') {
                 messageType = 'system';
             }

         } catch (e) {
             // Если не JSON, считаем просто текстовым сообщением
             incomingMessage = event.data;
         }

         // Исключаем системные сообщения о подключении/отключении самого себя, если они приходят
         if (incomingMessage.includes(`Система: ${username} отключился`) || incomingMessage.includes(`Система: ${username} подключился`)) {
              // Можно добавить свое системное сообщение или проигнорировать
              // setMessages(prev => [...prev, { type: 'system', text: 'Вы подключены.' }]); // Пример
              return;
         }


         // Добавляем сообщение, ИСКЛЮЧАЯ свои же (если они не приходят с префиксом)
          // Бэкенд теперь добавляет префикс "username: ", так что это условие может быть не нужно
         // if (!incomingMessage.startsWith(`${username}: `)) {
             setMessages(prev => [...prev, { type: messageType, text: incomingMessage }]);
         // }
      };

      // Также можно добавить обработчики onopen, onclose, onerror сюда, если они не обрабатываются в Lobby.js
      socket.onopen = () => {
          setMessages(prev => [...prev, { type: 'system', text: 'Соединение с чатом установлено.' }]);
      };
       socket.onclose = () => {
           setMessages(prev => [...prev, { type: 'system', text: 'Соединение с чатом потеряно.' }]);
       };
        socket.onerror = () => {
            setMessages(prev => [...prev, { type: 'system', text: 'Ошибка соединения с чатом.' }]);
        };

    }
     // Функция очистки не нужна, т.к. управление сокетом в Lobby.js
  }, [socket, username]); // Зависим от сокета и имени пользователя

  const sendMessage = () => {
    if (socket?.readyState === WebSocket.OPEN && input.trim()) {
      socket.send(input.trim());
      // ОПЦИОНАЛЬНО: Локально добавлять свое сообщение для мгновенного отображения
      // setMessages(prev => [...prev, {type: 'my_chat', text: `Вы: ${input.trim()}`}]);
      setInput("");
    }
  };

  // Проверка статуса соединения для UI
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
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.messageBubble,
              ...(msg.type === 'system' ? styles.systemMessage : {}),
              // Определяем свои сообщения по префиксу (если бэкенд его не ставит для своих)
              // ...(msg.text.startsWith(`Вы: `) ? styles.myMessage : {}),
              // Определяем свои сообщения по типу, если добавляем локально
               ...(msg.type === 'my_chat' ? styles.myMessage : {}),
               // Выравнивание в зависимости от типа
               alignSelf: msg.type === 'my_chat' ? 'flex-end' : (msg.type === 'system' ? 'center' : 'flex-start'),
            }}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* Элемент для автопрокрутки */}
      </div>

      <div style={styles.chatInputContainer}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          style={styles.chatInput}
          placeholder="Напишите сообщение..."
          disabled={connectionStatus !== 'connected'}
        />
        <button
          onClick={sendMessage}
          disabled={connectionStatus !== 'connected'}
          style={styles.sendButton}
        >
           ➔
         </button>
      </div>
    </div>
  );
};

// Стили для Chat
const styles = {
    chatContainer: { background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '15px', boxShadow: theme.effects.shadow, display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', height: '100%', boxSizing: 'border-box' },
    chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surface}` },
    statusIndicator: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' },
    statusDot: { width: '10px', height: '10px', borderRadius: '50%', animation: 'pulse 1.5s infinite' /* Анимацию pulse нужно определить в CSS */ },
    chatMessages: { flexGrow: 1, overflowY: 'auto', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '300px', scrollbarWidth: 'thin', scrollbarColor: `${theme.colors.primary} ${theme.colors.surface}` },
    messageBubble: { background: theme.colors.surface, borderRadius: '12px', padding: '8px 12px', wordBreak: 'break-word', maxWidth: '80%', animation: 'messageIn 0.3s ease-out' /* Анимацию messageIn нужно определить в CSS */, fontSize: '0.9rem'},
    myMessage: { background: theme.colors.primary, color: theme.colors.background },
    systemMessage: { fontStyle: 'italic', color: theme.colors.textSecondary, background: 'none', padding: '2px 0', fontSize: '0.85rem', textAlign: 'center' },
    chatInputContainer: { display: 'flex', gap: '10px', width: '100%', alignItems: 'center' },
    chatInput: { flex: 1, padding: '10px 15px', background: 'rgba(255, 255, 255, 0.1)', border: `1px solid ${theme.colors.textSecondary}`, borderRadius: '20px', color: theme.colors.text, transition: theme.transitions.default, outline: 'none', ':focus': { borderColor: theme.colors.primary }, ':disabled': { opacity: 0.5 } },
    sendButton: { padding: '8px 16px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '20px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '1.2rem', ':disabled': { opacity: 0.5, cursor: 'not-allowed' }, ':hover:not(:disabled)': { transform: 'scale(1.1)' } },
};


export default Chat;