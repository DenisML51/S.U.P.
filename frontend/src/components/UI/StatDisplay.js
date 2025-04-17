// src/components/UI/StatDisplay.js
import React from 'react';
import { theme } from '../../styles/theme'; // Импорт темы

const StatDisplay = ({ label, value, className = '', style }) => (
    <div style={{ ...styles.statItem, ...style }} className={className}>
        <span style={styles.statLabel}>{label}:</span>
        <span style={styles.statValue}>{value ?? '-'}</span>
    </div>
);

// Стили для компонента
const styles = {
    statItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '6px 0',
        borderBottom: `1px solid ${theme.colors.surface}33`,
        fontSize: '0.95rem'
    },
    statLabel: {
        color: theme.colors.textSecondary,
        marginRight: '10px',
        whiteSpace: 'nowrap'
    },
    statValue: {
        fontWeight: 'bold',
        textAlign: 'right',
        wordBreak: 'break-word'
    },
};

export default StatDisplay;