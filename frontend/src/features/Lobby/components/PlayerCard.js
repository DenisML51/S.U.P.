// src/features/Lobby/components/PlayerCard.js
import React from 'react';
import { theme } from '../../../styles/theme'; // Импорт темы

const PlayerCard = ({ player, isMaster = false }) => {
  const isPlaceholder = !player && !isMaster; // Слот пуст, если нет игрока и это не мастер-слот (хотя мастер всегда должен быть)
  const name = isMaster ? `${player?.username || '??'} (Мастер)` : (player?.username || "Свободный слот");
  const indicatorColor = isMaster
                         ? theme.colors.primary
                         : (player ? theme.colors.secondary : theme.colors.textSecondary);
  const opacity = isPlaceholder ? 0.5 : 1;

  return (
    <div style={{...styles.playerCard, opacity: opacity}}>
      <div style={{ ...styles.playerIndicator, backgroundColor: indicatorColor }} />
      <span style={styles.playerName}>
        {name}
      </span>
      {/* Можно добавить сюда статус игрока (online/offline), если он передается */}
    </div>
  );
};

// Стили
const styles = {
     playerCard: {
         display: 'flex',
         alignItems: 'center',
         gap: '12px',
         padding: '12px 16px',
         borderRadius: '8px',
         background: 'rgba(255, 255, 255, 0.05)',
         boxShadow: 'inset 0 0 5px rgba(0,0,0,0.3)',
         minWidth: '180px', // Минимальная ширина карточки
         transition: 'opacity 0.3s ease-in-out' // Плавное появление/исчезание
     },
     playerIndicator: {
         width: '12px',
         height: '12px',
         borderRadius: '50%',
         flexShrink: 0,
         boxShadow: '0 0 6px rgba(255,255,255,0.5)', // Небольшое свечение
     },
     playerName: {
         fontSize: '0.95rem', // Чуть крупнее
         fontWeight: '500',
         whiteSpace: 'nowrap',
         overflow: 'hidden',
         textOverflow: 'ellipsis', // Обрезаем длинные имена
         color: theme.colors.text // Основной цвет текста
     },
};


export default PlayerCard;