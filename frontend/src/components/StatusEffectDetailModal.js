import React from 'react';
import { theme } from '../theme';

const StatusEffectDetailModal = ({ effect, onClose }) => {
    if (!effect) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            {/* Предотвращаем закрытие при клике внутри модалки */}
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} style={styles.closeButton}>×</button>
                <h2 style={styles.title}>{effect.name}</h2>

                <div style={styles.descriptionSection}>
                    <h4 style={styles.subHeader}>Описание:</h4>
                    <p style={styles.descriptionText}>{effect.description}</p>
                </div>

                 {/* Можно добавить кнопку "Закрыть" для удобства */}
                 <div style={styles.buttonGroup}>
                     <button onClick={onClose} style={styles.closeBottomButton}>Закрыть</button>
                 </div>

            </div>
        </div>
    );
};

// Стили для StatusEffectDetailModal
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 },
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '550px', maxHeight: '85vh', overflowY: 'auto', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 },
    title: { textAlign: 'center', marginBottom: '20px', color: theme.colors.primary, borderBottom: `1px solid ${theme.colors.primary}55`, paddingBottom: '10px' },
    descriptionSection: { marginBottom: '25px'},
    subHeader: { margin: '0 0 10px 0', color: theme.colors.secondary, fontSize: '1rem' },
    descriptionText: { margin: 0, lineHeight: 1.6, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }, // whiteSpace для сохранения переносов строк из описания
     buttonGroup: { display: 'flex', justifyContent: 'flex-end', marginTop: '20px' },
     closeBottomButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, ':hover': { opacity: 1 } },
};

export default StatusEffectDetailModal;