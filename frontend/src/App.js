import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RegisterForm from './components/RegisterForm';
import LoginForm from './components/LoginForm';
import CharactersPage from './components/CharactersPage';
import Lobby from './components/Lobby';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CharactersPage />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/lobby" element={<Lobby />} />
      </Routes>
    </Router>
  );
}
export default App;
