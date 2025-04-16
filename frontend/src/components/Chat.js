// frontend/src/components/Chat.js
import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../theme';

const Chat = ({ token }) => {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  };


  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (token) {
      const socket = new WebSocket(`ws://localhost:8000/ws?token=${token}`);

      socket.onopen = () => {
        setConnectionStatus('connected');
        setMessages(prev => [...prev, 'Система: Вы подключены к чату']);
      };

      socket.onclose = () => {
        setConnectionStatus('disconnected');
        setMessages(prev => [...prev, 'Система: Соединение закрыто']);
      };

      socket.onerror = () => {
        setConnectionStatus('error');
        setMessages(prev => [...prev, 'Система: Ошибка соединения']);
      };

      socket.onmessage = (event) => {
        setMessages(prev => [...prev, event.data]);
      };

      setWs(socket);

      return () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
    }
  }, [token]);

  const sendMessage = () => {
    if (ws?.readyState === WebSocket.OPEN && input.trim()) {
      ws.send(input.trim());
      setInput("");
    }
  };

  return (
    <div style={{
      background: theme.effects.glass,
      backdropFilter: theme.effects.blur,
      borderRadius: '16px',
      padding: '12px',
      boxShadow: theme.effects.shadow,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      width: '100%',
      height: 'fit-content',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <h3 style={{ margin: 0 }}>Игровой чат</h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: connectionStatus === 'connected' ? theme.colors.secondary : theme.colors.error
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: connectionStatus === 'connected' ? theme.colors.secondary : theme.colors.error,
            animation: connectionStatus === 'connected' ? 'pulse 1.5s infinite' : 'none'
          }} />
          {connectionStatus === 'connected' ? 'Online' : 'Offline'}
        </div>
      </div>

        <div className="chat-messages" style={{
            height: '300px',
            overflowY: 'auto',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minHeight: '200px',
            scrollbarWidth: 'thin',
            scrollbarColor: `${theme.colors.primary} ${theme.colors.surface}`
        }}>
            {messages.map((msg, i) => (
                <div
                    key={i}
                    style={{
                        background: theme.colors.surface,
                        borderRadius: '8px',
                        padding: '12px',
                        wordBreak: 'break-word',
                        animation: 'messageIn 0.3s ease-out',
                        alignSelf: msg.startsWith('Вы:') ? 'flex-end' : 'flex-start',
                        maxWidth: '80%'
                    }}
                >
                    {msg}
                </div>
            ))}
            <div ref={messagesEndRef}/>
        </div>

        <div style={{display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${theme.colors.textSecondary}`,
            borderRadius: '8px',
            color: theme.colors.text,
            transition: theme.transitions.default,
            ':focus': {
              outline: 'none',
              borderColor: theme.colors.primary
            }
          }}
          placeholder="Напишите сообщение..."
        />
        <button
          onClick={sendMessage}
          disabled={connectionStatus !== 'connected'}
          style={{
            padding: '8px 16px',
            background: theme.colors.primary,
            color: theme.colors.text,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: theme.transitions.default,
            opacity: connectionStatus === 'connected' ? 1 : 0.5,
            ':hover': connectionStatus === 'connected' ? {
              transform: 'translateY(-2px)',
              boxShadow: theme.effects.shadow
            } : {}
          }}
        >
          ➔
        </button>
      </div>
    </div>
  );
};

export default Chat;