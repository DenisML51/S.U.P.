// src/components/UI/PlayerStatusIndicator.js
import React from 'react';
import { theme } from '../../styles/theme';

const statusColors = {
  online: theme.colors.success || '#66BB6A', // Добавил fallback
  ready: theme.colors.secondary,
  preparing: theme.colors.warning || '#FFA726', // Добавил fallback
  offline: theme.colors.textSecondary
};

const PlayerStatusIndicator = ({ status = 'offline' }) => { // Добавил значение по умолчанию
  const currentStatus = statusColors[status] ? status : 'offline'; // Проверка на валидный статус

  return (
    <div style={{
      position: 'relative',
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: statusColors[currentStatus],
        boxShadow: `0 0 8px ${statusColors[currentStatus]}`,
        // Анимацию лучше добавить через CSS классы для производительности
        // animation: status === 'online' ? 'pulse 1.5s infinite' : 'none'
      }} />
      {/* Можно добавить @keyframes pulse в глобальный CSS */}
    </div>
  );
};

export default PlayerStatusIndicator;