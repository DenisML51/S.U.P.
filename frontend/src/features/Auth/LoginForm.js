// src/features/Auth/LoginForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
// Убираем импорт apiService, если loginUser больше не нужен напрямую
// import * as apiService from '../../api/apiService';
import { theme } from '../../styles/theme'; // Обновленный импорт
// --- ИЗМЕНЕНИЕ: Импортируем useAuth ---
import { useAuth } from '../../hooks/useAuth';
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  // --- ИЗМЕНЕНИЕ: Получаем login и isAuthenticated из useAuth ---
  const { login, isAuthenticated } = useAuth();
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---

  useEffect(() => {
    setIsMounted(true);
    // --- ИЗМЕНЕНИЕ: Проверяем isAuthenticated из useAuth ---
    // Если пользователь уже аутентифицирован (по данным из useAuth), перенаправляем
    if (isAuthenticated) {
        console.log("LoginForm: User already authenticated via useAuth, redirecting...");
        navigate("/");
    }
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    return () => setIsMounted(false);
    // Добавляем isAuthenticated в зависимости, чтобы среагировать, если статус изменится пока компонент монтирован
  }, [navigate, isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      // --- ИЗМЕНЕНИЕ: Вызываем login из useAuth ---
      await login(username, password);
      console.log("Login successful via useAuth");
      // Навигация теперь не нужна здесь, App.js обработает изменение isAuthenticated
      // navigate("/");
      // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    } catch (err) {
      console.error("Login error:", err);
      // Ошибка будет содержать detail от бэкенда, если login ее пробросил
      setError(err.response?.data?.detail || err.message || "Ошибка входа");
    } finally {
      setIsLoading(false);
    }
  };

  // Если пользователь вошел В ПРОЦЕССЕ отображения формы, перенаправляем
  // Это может случиться, если проверка токена в useAuth завершилась после начального рендера LoginForm
  if (isAuthenticated) {
      return <Navigate to="/" replace />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(45deg, ${theme.colors.background}, #2D2D2D)` }}>
      <div style={{ background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '40px', boxShadow: theme.effects.shadow, transform: isMounted ? 'translateY(0)' : 'translateY(20px)', opacity: isMounted ? 1 : 0, transition: theme.transitions.default, width: '100%', maxWidth: '400px' }}>
        <h2 style={{ color: theme.colors.text, marginBottom: '30px', textAlign: 'center', fontSize: '2rem' }}>Добро пожаловать</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input style={styles.input} type="text" placeholder="Логин" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={isLoading} />
          <input style={styles.input} type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
          {error && <p style={styles.errorText}>{error}</p>}
          <button type="submit" disabled={isLoading} style={{ ...styles.button, background: theme.colors.primary, opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p style={styles.linkText}>
          Нет аккаунта? <Link to="/register" style={styles.link}>Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
};

// Стили (оставляем ваши стили)
const styles = {
    input: {
        padding: '12px 16px',
        borderRadius: '8px',
        border: `1px solid ${theme.colors.textSecondary}`,
        background: 'rgba(255, 255, 255, 0.1)',
        color: theme.colors.text,
        fontSize: '1rem',
        transition: theme.transitions.default,
        outline: 'none',
         ':disabled': { // Стиль для неактивного поля
             opacity: 0.6,
             cursor: 'not-allowed',
         }
    },
    button: {
        padding: '12px 24px',
        borderRadius: '8px',
        color: theme.colors.background, // Изменил на background для контраста с primary
        border: 'none',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        transition: theme.transitions.default,
        ':disabled': { // Стиль для неактивной кнопки
             opacity: 0.6,
             cursor: 'not-allowed',
             filter: 'grayscale(50%)',
        }
    },
    errorText: {
        color: theme.colors.error,
        textAlign: 'center',
        margin: '-10px 0 10px 0',
        fontSize: '0.9rem', // Сделал чуть меньше
        fontWeight: '500',
    },
    linkText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '0.9rem', // Сделал чуть меньше
    },
    link: {
        color: theme.colors.primary,
        textDecoration: 'none',
        fontWeight: 'bold',
         ':hover': {
             textDecoration: 'underline'
         }
    },
};

export default LoginForm;
