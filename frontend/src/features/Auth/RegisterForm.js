// src/features/Auth/RegisterForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as apiService from '../../api/apiService';
import { theme } from '../../styles/theme'; // Обновленный импорт

const RegisterForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); // Сбрасываем ошибку перед новой попыткой
    if (password.length < 4) {
        setError("Пароль должен быть не менее 4 символов");
        return;
    }
    setIsLoading(true);
    try {
      await apiService.registerUser(username, password);
      alert("Регистрация прошла успешно! Теперь выполните вход.");
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.detail || "Ошибка регистрации");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(45deg, ${theme.colors.background}, #2D2D2D)` }}>
      <div style={{ background: theme.effects.glass, backdropFilter: theme.effects.blur, borderRadius: '16px', padding: '40px', boxShadow: theme.effects.shadow, transform: isMounted ? 'translateY(0)' : 'translateY(20px)', opacity: isMounted ? 1 : 0, transition: theme.transitions.default, width: '100%', maxWidth: '400px' }}>
        <h2 style={{ color: theme.colors.text, marginBottom: '30px', textAlign: 'center', fontSize: '2rem' }}>Создать аккаунт</h2>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input style={styles.input} type="text" placeholder="Логин" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Пароль (мин. 4 симв.)" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p style={styles.errorText}>{error}</p>}
          <button type="submit" disabled={isLoading} style={{ ...styles.button, background: theme.colors.secondary, opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p style={styles.linkText}>
          Уже есть аккаунт? <Link to="/login" style={styles.link}>Войти</Link>
        </p>
      </div>
    </div>
  );
};

// Стили (копируем из LoginForm для консистентности)
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
        color: theme.colors.text, // Цвет текста кнопки
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
        fontWeight: 'bold',
    },
};


export default RegisterForm;