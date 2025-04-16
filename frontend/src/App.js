import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegisterForm from './components/RegisterForm';
import LoginForm from './components/LoginForm';
import CharactersPage from './components/CharactersPage';
import Lobby from './components/Lobby';
import CharacterDetailPage from './components/CharacterDetailPage'; // Новый компонент

function App() {
  // Простая проверка наличия токена для редиректа
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route
          path="/"
          element={<CharactersPage />}
        />
         <Route
          path="/character/:characterId" // Новый маршрут
          element={isAuthenticated ? <CharacterDetailPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/lobby"
          element={isAuthenticated ? <Lobby /> : <Navigate to="/login" />}
         />
         {/* Редирект на главную, если путь не найден */}
         <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;