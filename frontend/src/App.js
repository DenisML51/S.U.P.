// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// --- ИЗМЕНЕНИЕ: Импортируем AuthProvider и useAuth ---
import { AuthProvider, useAuth } from './hooks/useAuth'; // Убедитесь, что путь верный
// --- КОНЕЦ ИЗМЕНЕНИЯ ---
import { theme } from './styles/theme'; // Ваша тема

// Импортируем страницы
import LoginForm from './features/Auth/LoginForm';
import RegisterForm from './features/Auth/RegisterForm';
import CharactersPage from './features/CharacterList/CharactersPage';
import CharacterDetailPage from './features/CharacterDetail/CharacterDetailPage';
import Lobby from './features/Lobby/Lobby';
import AdminPage from './features/Admin/AdminPage'; // Страница админа

// Компонент для управления рендерингом на основе аутентификации
function AppContent() {
  // Получаем состояние аутентификации, админ-статус и флаг загрузки из хука
  const { user, isAdmin, isLoading, isAuthenticated } = useAuth();

  console.log("Auth State:", { isLoading, isAuthenticated, isAdmin, user }); // Лог для отладки

  // Показываем загрузку, пока проверяется токен/загружаются данные пользователя
  if (isLoading) {
    return <div style={styles.loading}>Загрузка...</div>;
  }

  // Теперь используем isAuthenticated и isAdmin из useAuth для защиты роутов
  return (
    <Routes>
      {/* Маршруты аутентификации */}
      <Route path="/login" element={!isAuthenticated ? <LoginForm /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!isAuthenticated ? <RegisterForm /> : <Navigate to="/" replace />} />

      {/* Основные маршруты - требуют аутентификации */}
      <Route
        path="/"
        element={isAuthenticated ? <CharactersPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/character/:characterId"
        element={isAuthenticated ? <CharacterDetailPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/lobby"
        element={isAuthenticated ? <Lobby /> : <Navigate to="/login" replace />}
       />

      {/* Маршрут админки */}
      <Route
          path="/admin"
          element={isAuthenticated && isAdmin ? <AdminPage /> : <Navigate to="/" replace />}
      />

       {/* Редирект на главную или на логин, если путь не найден */}
       <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  );
}

// Основной компонент приложения
function App() {
  return (
    <Router>
      {/* Оборачиваем все приложение в AuthProvider */}
      <AuthProvider>
        <AppContent /> {/* Компонент, использующий useAuth */}
      </AuthProvider>
    </Router>
  );
}

// Стили (оставляем ваши стили из предыдущего App.js)
const styles = {
    loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: theme.colors.background, color: theme.colors.text, fontSize: '1.5rem' },
    error: { textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: theme.colors.error },
    // Добавьте остальные стили из вашего App.js, если они там были
};


export default App;
