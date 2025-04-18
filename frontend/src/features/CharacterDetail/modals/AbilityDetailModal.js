// src/features/CharacterDetail/modals/AbilityDetailModal.js
import React from 'react';
import { theme } from '../../../styles/theme'; // Обновленный путь

// Вспомогательный компонент для строки стат (можно вынести, если используется еще где-то)
const StatRow = ({ label, value }) => (
    // Добавляем проверку на null/undefined для value, чтобы не рендерить пустые строки
    value !== null && value !== undefined && value !== '' ? (
        <div style={styles.statRow}>
            <span style={styles.statLabel}>{label}:</span>
            <span style={styles.statValue}>{value}</span>
        </div>
    ) : null
);

const AbilityDetailModal = ({ ability, onClose, character }) => { // Принимаем character
    if (!ability) return null;

    // Безопасная попытка распарсить требования навыков
    let requirementsDetails = null;
    if (ability.skill_requirements) {
        try {
            if (typeof ability.skill_requirements === 'string' && ability.skill_requirements.trim()) {
                const parsedReqs = JSON.parse(ability.skill_requirements);
                requirementsDetails = Object.entries(parsedReqs)
                                          // Убираем 'skill_', делаем первую букву заглавной
                                          .map(([key, value]) => `${key.replace('skill_', '').charAt(0).toUpperCase() + key.replace('skill_', '').slice(1)} ${value}`)
                                          .join(', ');
            } else {
                 requirementsDetails = "-"; // Показываем прочерк, если поле пустое
            }
        } catch (e) {
            console.error("Failed to parse skill_requirements in modal:", ability.skill_requirements, e);
            requirementsDetails = `Ошибка: ${ability.skill_requirements}`; // Показываем как есть при ошибке
        }
    }

    // Хелпер для расчета строки урона с модификатором персонажа
    // TODO: Вынести в utils/calculations.js
    const getCalculatedDamageString = (formula, modifiers) => {
        if (!formula || !modifiers) return formula || 'Нет данных'; // Возвращаем формулу как есть, если нет модификаторов

        const modMap = {
            'Сил': 'strength_mod', 'Лов': 'dexterity_mod', 'Вын': 'endurance_mod',
            'Реа': 'reaction_mod', 'Тех': 'technique_mod', 'Ада': 'adaptation_mod',
            'Лог': 'logic_mod', 'Вни': 'attention_mod', 'Эру': 'erudition_mod',
            'Кул': 'culture_mod', 'Нау': 'science_mod', 'Мед': 'medicine_mod',
            'Вну': 'suggestion_mod', 'Про': 'insight_mod', 'Авт': 'authority_mod',
            'Сам': 'self_control_mod', 'Рел': 'religion_mod', 'Пот': 'flow_mod'
        };

        let calculatedFormula = formula;

        // Заменяем "+Мод.XYZ" на "+ЧИСЛО" или "-ЧИСЛО"
        const modMatch = formula.match(/([\+\-])Мод\.(\w+)/); // Учитываем знак + или -
        if (modMatch) {
            const sign = modMatch[1]; // '+' or '-'
            const modKeyShort = modMatch[2]; // 'Сил', 'Лов', etc.
            const modAttr = modMap[modKeyShort];
            if (modAttr && typeof modifiers[modAttr] === 'number') {
                const modValue = modifiers[modAttr];
                // Формируем строку с учетом знака модификатора
                const modString = modValue === 0 ? '' : (modValue > 0 ? `+${modValue}` : `${modValue}`); // Если 0, не добавляем ничего
                // Заменяем всю часть "+Мод.XYZ" или "-Мод.XYZ"
                calculatedFormula = formula.replace(modMatch[0], modString);
            } else {
                calculatedFormula = formula.replace(modMatch[0], `(Мод.${modKeyShort}?)`); // Показываем ошибку, если модификатор не найден
            }
        }

         // Обработка "См. оружие" - здесь не нужна, это для отображения в списке
         // if (calculatedFormula.toLowerCase().includes('см. оружие')) { ... }

        return calculatedFormula;
    };

    // --- Рендеринг Модального Окна ---
    return (
        <div style={styles.overlay} onClick={onClose}>
            {/* Предотвращаем закрытие при клике внутри модалки */}
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} style={styles.closeButton}>×</button>
                <h2 style={styles.title}>{ability.name}</h2>

                {/* Сетка с деталями */}
                <div style={styles.detailsGrid}>
                    <StatRow label="Ветка" value={`${ability.branch} (Ур. ${ability.level_required})`} />
                    <StatRow label="Тип действия" value={ability.action_type} />
                    {/* Отображаем строку только если значение существует */}
                    <StatRow label="Кулдаун" value={ability.cooldown} />
                    <StatRow label="Треб. Навыков" value={requirementsDetails === "-" ? null : requirementsDetails} />

                    {/* Отображение Урона и Типа */}
                    {ability.damage_formula && (
                         <StatRow
                             label="Урон"
                             // Вызываем хелпер для подстановки модификатора
                             value={`${getCalculatedDamageString(ability.damage_formula, character?.skill_modifiers)}${ability.damage_type && ability.damage_type.toLowerCase() !== 'см. оружие' ? ` (${ability.damage_type})` : ''}`}
                         />
                     )}

                    <StatRow label="Дальность" value={ability.range} />
                    <StatRow label="Цель" value={ability.target} />
                    <StatRow label="Длительность" value={ability.duration ? `${ability.duration}${ability.concentration ? ' (Конц.)' : ''}` : null} />
                    {ability.saving_throw_attribute && (
                        <StatRow label="Спасбросок" value={`${ability.saving_throw_attribute} (СЛ: ${ability.saving_throw_dc_formula || '?'})`} />
                     )}
                </div>

                {/* Описание */}
                <div style={styles.descriptionSection}>
                    <h4 style={styles.subHeader}>Описание:</h4>
                    <p style={styles.descriptionText}>{ability.description}</p>
                </div>

                {/* Эффекты спасброска */}
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

                {/* Добавим кнопку Закрыть вниз для удобства */}
                <div style={styles.buttonGroup}>
                    {/* TODO: Добавить кнопку "Активировать" сюда? */}
                    <button onClick={onClose} style={styles.closeBottomButton}>Закрыть</button>
                 </div>
            </div>
        </div>
    );
};

// --- Стили ---
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }, // zIndex выше других модалок
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 },
    title: { textAlign: 'center', marginBottom: '25px', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}55`, paddingBottom: '10px' },
    detailsGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '20px', borderBottom: `1px solid ${theme.colors.surface}cc`, paddingBottom: '15px' },
    statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', fontSize: '0.95rem' },
    statLabel: { color: theme.colors.textSecondary, marginRight: '10px', whiteSpace: 'nowrap', flexShrink: 0 }, // Добавил flexShrink
    statValue: { fontWeight: '500', textAlign: 'right', marginLeft: 'auto', wordBreak: 'break-word' }, // Добавил wordBreak
    descriptionSection: { marginBottom: '15px'},
    subHeader: { margin: '0 0 8px 0', color: theme.colors.primary, fontSize: '1rem' },
    descriptionText: { margin: 0, lineHeight: 1.6, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }, // Добавил whiteSpace
    failEffect: { margin: 0, lineHeight: 1.6, fontSize: '0.9rem', color: theme.colors.error },
    successEffect: { margin: 0, lineHeight: 1.6, fontSize: '0.9rem', color: theme.colors.secondary }, // Используем secondary для успеха
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }, // Увеличил отступ
    closeBottomButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, ':hover': { opacity: 1 } },
};

export default AbilityDetailModal;