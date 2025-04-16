import React from 'react';
import { theme } from '../theme';

const statusColors = {
  online: theme.colors.success,
  ready: theme.colors.secondary,
  preparing: theme.colors.warning,
  offline: theme.colors.textSecondary
};

const PlayerStatusIndicator = ({ status }) => {
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
        background: statusColors[status],
        boxShadow: `0 0 8px ${statusColors[status]}`,
        animation: status === 'online' ? 'pulse 1.5s infinite' : 'none'
      }} />
    </div>
  );
};

export default PlayerStatusIndicator;