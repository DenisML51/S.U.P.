// src/components/UI/SkillDisplay.js
import React from 'react';
import { theme } from '../../styles/theme'; // Импорт темы

const SkillDisplay = ({ name, level, modifier }) => (
    <div style={styles.skillItemDetail}>
        <span style={styles.skillName}>{name}:</span>
        <span style={styles.skillLevel}>{level}</span>
        <span style={styles.skillModifier}>({modifier >= 0 ? `+${modifier}` : modifier})</span>
    </div>
);

// Стили
const styles = {
     skillItemDetail: {
         display: 'flex',
         alignItems: 'center',
         padding: '5px 0',
         fontSize: '0.9rem',
         borderBottom: `1px dashed ${theme.colors.surface}66`
     },
     skillName: {
         flexGrow: 1,
         color: theme.colors.textSecondary,
         textTransform: 'capitalize'
     },
     skillLevel: {
         fontWeight: 'bold',
         margin: '0 10px 0 5px',
         color: theme.colors.text,
         minWidth: '15px',
         textAlign: 'right'
     },
     skillModifier: {
         color: theme.colors.secondary, // Используем вторичный цвет для модификатора
         width: '35px', // Фиксированная ширина для выравнивания
         textAlign: 'right'
     },
};


export default SkillDisplay;