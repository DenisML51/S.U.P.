import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as apiService from '../apiService'; // Используем apiService
import { theme } from '../theme';

const LoginForm = () => {
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await apiService.loginUser(username, password);
      localStorage.setItem("token", res.data.access_token);
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
          <input style={{ padding: '12px 16px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', transition: theme.transitions.default, outline: 'none' }} type="text" placeholder="Логин" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input style={{ padding: '12px 16px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', transition: theme.transitions.default }} type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p style={{ color: theme.colors.error, textAlign: 'center', margin: '-10px 0 10px 0' }}>{error}</p>}
          <button type="submit" disabled={isLoading} style={{ padding: '12px 24px', borderRadius: '8px', background: theme.colors.primary, color: theme.colors.text, border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', transition: theme.transitions.default, opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: '20px' }}>
          Нет аккаунта? <Link to="/register" style={{ color: theme.colors.primary, textDecoration: 'none' }}>Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;