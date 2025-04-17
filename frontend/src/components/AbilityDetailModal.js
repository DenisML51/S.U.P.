import React from 'react';
import { theme } from '../theme';

const AbilityDetailModal = ({ ability, onClose }) => {
    if (!ability) return null;

    // Безопасная попытка распарсить требования
    let requirementsDetails = null;
    if (ability.skill_requirements) {
        try {
            const parsedReqs = JSON.parse(ability.skill_requirements);
            requirementsDetails = Object.entries(parsedReqs)
                                      .map(([key, value]) => `${key.replace('skill_', '')} ${value}`)
                                      .join(', ');
        } catch (e) {
            console.error("Failed to parse skill_requirements in modal:", ability.skill_requirements, e);
            requirementsDetails = ability.skill_requirements; // Показываем как есть при ошибке парсинга
        }
    }


    return (
        <div style={styles.overlay} onClick={onClose}>
            {/* Предотвращаем закрытие при клике внутри модалки */}
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} style={styles.closeButton}>×</button>
                <h2 style={styles.title}>{ability.name}</h2>

                <div style={styles.detailsGrid}>
                    <StatRow label="Ветка" value={`${ability.branch} (Ур. ${ability.level_required})`} />
                    <StatRow label="Тип действия" value={ability.action_type} />
                    {ability.cooldown && <StatRow label="Кулдаун" value={ability.cooldown} />}
                    {requirementsDetails && <StatRow label="Треб. Навыков" value={requirementsDetails} />}
                    {ability.range && <StatRow label="Дальность" value={ability.range} />}
                    {ability.target && <StatRow label="Цель" value={ability.target} />}
                    {ability.duration && <StatRow label="Длительность" value={`${ability.duration}${ability.concentration ? ' (Конц.)' : ''}`} />}
                     {ability.saving_throw_attribute && (
                        <StatRow label="Спасбросок" value={`${ability.saving_throw_attribute} (СЛ: ${ability.saving_throw_dc_formula || '?'})`} />
                     )}
                </div>

                <div style={styles.descriptionSection}>
                    <h4 style={styles.subHeader}>Описание:</h4>
                    <p style={styles.descriptionText}>{ability.description}</p>
                </div>

                 {ability.effect_on_save_fail && (
                    <div style={styles.descriptionSection}>
                        <h4 style={styles.subHeader}>Эффект при провале спасброска:</h4>
                        <p style={styles.failEffect}>{ability.effect_on_save_fail}</p>
                    </div>
                 )}
                 {ability.effect_on_save_success && (
                     <div style={styles.descriptionSection}>
                        <h4 style={styles.subHeader}>Эффект при успехе спасброска:</h4>
                        <p style={styles.successEffect}>{ability.effect_on_save_success}</p>
                     </div>
                 )}

            </div>
        </div>
    );
};

// Вспомогательный компонент для строки стат в модалке
const StatRow = ({ label, value }) => (
    <div style={styles.statRow}>
        <span style={styles.statLabel}>{label}:</span>
        <span style={styles.statValue}>{value}</span>
    </div>
);

// Стили для AbilityDetailModal
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }, // zIndex выше других модалок
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 },
    title: { textAlign: 'center', marginBottom: '25px', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}55`, paddingBottom: '10px' },
    detailsGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '20px', borderBottom: `1px solid ${theme.colors.surface}cc`, paddingBottom: '15px' },
    statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', fontSize: '0.95rem' },
    statLabel: { color: theme.colors.textSecondary, marginRight: '10px', whiteSpace: 'nowrap' },
    statValue: { fontWeight: '500', textAlign: 'right', marginLeft: 'auto' },
    descriptionSection: { marginBottom: '15px'},
    subHeader: { margin: '0 0 8px 0', color: theme.colors.primary, fontSize: '1rem' },
    descriptionText: { margin: 0, lineHeight: 1.6, fontSize: '0.95rem' },
    failEffect: { margin: 0, lineHeight: 1.6, fontSize: '0.9rem', color: theme.colors.error },
    successEffect: { margin: 0, lineHeight: 1.6, fontSize: '0.9rem', color: theme.colors.secondary },
};


export default AbilityDetailModal;