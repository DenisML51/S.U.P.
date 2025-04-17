// src/features/Auth/LoginForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as apiService from '../../api/apiService';
import { theme } from '../../styles/theme'; // Обновленный импорт

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isMounted, setIsMounted] = useState(false); // Для анимации появления
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setIsMounted(true);
    // Проверка, если пользователь уже залогинен
    if (localStorage.getItem("token")) {
        console.log("User already logged in, redirecting...");
        navigate("/"); // Перенаправляем на главную, если токен уже есть
    }
    return () => setIsMounted(false);
  }, [navigate]); // Добавили navigate в зависимости

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await apiService.loginUser(username, password);
      console.log("Login successful, received token:", res.data.access_token);
      localStorage.setItem("token", res.data.access_token);
      console.log("Token saved to localStorage:", localStorage.getItem("token"));
      navigate("/"); // Перенаправляем на главную страницу
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.detail || "Ошибка входа");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(45deg, ${theme.colors.background}, #2D2D2D)` }}>
      <div style={{ background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '40px', boxShadow: theme.effects.shadow, transform: isMounted ? 'translateY(0)' : 'translateY(20px)', opacity: isMounted ? 1 : 0, transition: theme.transitions.default, width: '100%', maxWidth: '400px' }}>
        <h2 style={{ color: theme.colors.text, marginBottom: '30px', textAlign: 'center', fontSize: '2rem' }}>Добро пожаловать</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input style={styles.input} type="text" placeholder="Логин" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
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

// Стили
const styles = {
    input: {
        padding: '12px 16px',
        borderRadius: '8px',
        border: `1px solid ${theme.colors.textSecondary}`,
        background: 'rgba(255, 255, 255, 0.1)',
        color: theme.colors.text,
        fontSize: '1rem',
        transition: theme.transitions.default,
        outline: 'none'
    },
    button: {
        padding: '12px 24px',
        borderRadius: '8px',
        color: theme.colors.text, // Изменен на text для лучшей читаемости на фоне primary
        border: 'none',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        transition: theme.transitions.default,
    },
    errorText: {
        color: theme.colors.error,
        textAlign: 'center',
        margin: '-10px 0 10px 0'
    },
    linkText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: '20px'
    },
    link: {
        color: theme.colors.primary,
        textDecoration: 'none',
        fontWeight: 'bold', // Добавлено для выделения
         ':hover': { // Псевдокласс hover не работает в inline-стилях, лучше использовать CSS классы или styled-components
             textDecoration: 'underline'
         }
    },
};

export default LoginForm;