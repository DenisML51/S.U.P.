import React from 'react';
import { theme } from '../theme';
const CreateCharacterModal = ({ onClose }) => {
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background: theme.colors.surface, padding: '20px', borderRadius:'16px', width:'300px' }}>
        <h2 style={{ textAlign:'center', color: theme.colors.text }}>Создание персонажа</h2>
        <p style={{ textAlign:'center', color: theme.colors.textSecondary }}>Форма создания персонажа (пока пуста)</p>
        <button onClick={onClose} style={{ display:'block', margin:'20px auto 0 auto', padding:'8px 16px', background: theme.colors.primary, color: theme.colors.text, border:'none', borderRadius:'8px', cursor:'pointer' }}>Закрыть</button>
      </div>
    </div>
  );
};
export default CreateCharacterModal;
