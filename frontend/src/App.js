// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Импортируем компоненты из их новых мест
import RegisterForm from './features/Auth/RegisterForm';
import LoginForm from './features/Auth/LoginForm';
import CharactersPage from './features/CharacterList/CharactersPage'; // Страница списка персонажей
import Lobby from './features/Lobby/Lobby';
import CharacterDetailPage from './features/CharacterDetail/CharacterDetailPage'; // Страница деталей персонажа

// Импортируем глобальные стили, если они есть
// import './styles/index.css'; // Пример

function App() {
  // Проверка аутентификации (можно вынести в хук useAuth)
  const isAuthenticated = !!localStorage.getItem("token");
  console.log("Is Authenticated:", isAuthenticated); // Лог для проверки

  return (
    <Router>
      <Routes>
        {/* Маршруты аутентификации */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />

        {/* Основной маршрут (список персонажей) - защищенный */}
        <Route
          path="/"
          element={isAuthenticated ? <CharactersPage /> : <Navigate to="/login" replace />}
        />

        {/* Маршрут деталей персонажа - защищенный */}
        <Route
          path="/character/:characterId"
          element={isAuthenticated ? <CharacterDetailPage /> : <Navigate to="/login" replace />}
        />

        {/* Маршрут лобби - защищенный */}
        <Route
          path="/lobby"
          element={isAuthenticated ? <Lobby /> : <Navigate to="/login" replace />}
         />

         {/* Редирект на главную или на логин, если путь не найден */}
         <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;