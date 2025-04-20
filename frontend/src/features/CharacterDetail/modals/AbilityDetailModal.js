// src/features/CharacterDetail/modals/AbilityDetailModal.js
import React, { useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Убедитесь, что путь правильный

// --- Иконки (без изменений) ---
const BranchIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 6.4a1.5 1.5 0 0 0-2.12 0L12 11.88 6.52 6.4a1.5 1.5 0 0 0-2.12 2.12L9.88 14l-5.48 5.48a1.5 1.5 0 0 0 2.12 2.12L12 16.12l5.48 5.48a1.5 1.5 0 0 0 2.12-2.12L14.12 14l5.48-5.48a1.5 1.5 0 0 0 0-2.12z"/></svg> );
const LevelIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> );
const ActionTypeIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M13 6V3h-2v3H8l4 4 4-4h-3zm4.6 8.17l-4-4-4 4H3v2h18v-2h-2.4z"/></svg> );
const RangeIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg> );
const TargetIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l.71-.71c.19-.19.44-.3.7-.3h7.18c.26 0 .51.11.7.3l.71.71c.19.19.3.44.3.7v.59c0 .26-.11.51-.3.7l-.71.71c-.19.19-.44.3-.7.3H6.91c-.26 0-.51-.11-.7-.3l-.71-.71c-.19-.19-.3-.44-.3-.7v-.59c0-.26.11.51.3-.7zm5.5-6.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z"/></svg> );
const DurationIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-14h2v5h-2zm0 7h2v2h-2z"/></svg> );
const CooldownIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> );
const DamageIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M19.78 2.22a.75.75 0 0 0-1.06 0l-2.22 2.22-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41L4 15.06V19a1 1 0 0 0 1 1h3.94l10.84-10.84L19.78 3.28a.75.75 0 0 0 0-1.06zM8.5 18H6v-2.5l7.37-7.37 2.5 2.5L8.5 18z"/></svg> );
const SaveIcon = () => ( <svg style={styles.mainDetailIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg> );
const SkillReqIcon = () => ( <svg style={styles.reqIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.08-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg> );
const StatusIcon = () => (<svg style={styles.titleIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>);
// Иконки для тегов Преимущества/Помехи
const AdvantageIcon = () => ( <svg style={styles.modTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> );
const DisadvantageIcon = () => ( <svg style={styles.modTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg> );
// --- ИКОНКА УДАЛЕНА ---
// const CharacterSkillsIcon = () => (...);

// Карта русских названий навыков
const skillRussianNames = {
    strength: 'Сила', dexterity: 'Ловкость', endurance: 'Выносливость',
    reaction: 'Реакция', technique: 'Техника', adaptation: 'Адаптация',
    logic: 'Логика', attention: 'Внимание', erudition: 'Эрудиция',
    culture: 'Культура', science: 'Наука', medicine: 'Медицина',
    suggestion: 'Внушение', insight: 'Проницательность', authority: 'Авторитет',
    self_control: 'Самообладание', religion: 'Религия', flow: 'Поток'
};

// --- СПИСОК УДАЛЕН ---
// const keyCharacterSkills = [ ... ];

// Карта Модификаторов
const modMap = { /* ... (как было) ... */
    'Сил': 'strength_mod', 'Лов': 'dexterity_mod', 'Вни': 'attention_mod',
    'Мед': 'medicine_mod', 'Вын': 'endurance_mod', 'Реа': 'reaction_mod',
    'Тех': 'technique_mod', 'Ада': 'adaptation_mod', 'Лог': 'logic_mod',
    'Эру': 'erudition_mod', 'Кул': 'culture_mod', 'Нау': 'science_mod',
    'Вну': 'suggestion_mod', 'Про': 'insight_mod', 'Авт': 'authority_mod',
    'Сам': 'self_control_mod', 'Рел': 'religion_mod', 'Пот': 'flow_mod'
};
// Функция Расчета Урона
const getCalculatedDamageString = (formula, modifiers) => { /* ... (как было) ... */
    if (!formula || !modifiers) return formula || 'Нет данных';
    let calculatedFormula = formula;
    const modMatch = formula.match(/([\+\-])Мод\.(\w+)/);
    if (modMatch) {
        const sign = modMatch[1]; const modKeyShort = modMatch[2]; const modAttr = modMap[modKeyShort];
        if (modAttr && typeof modifiers[modAttr] === 'number') {
            const modValue = modifiers[modAttr];
            const modString = modValue === 0 ? '' : (modValue > 0 ? `+${modValue}` : `${modValue}`);
            calculatedFormula = formula.replace(modMatch[0], modString);
        } else {
            calculatedFormula = formula.replace(modMatch[0], `(Мод.${modKeyShort}?)`);
        }
    }
    return calculatedFormula;
};

// --- Основной Компонент Модального Окна ---
const AbilityDetailModal = ({ ability, onClose, character }) => {

    // --- Хуки в начале ---
    const requirementsMet = useMemo(() => { /* ... (логика проверки требований без изменений) ... */
        if (!ability?.skill_requirements || !character) return { met: true, details: {} };
        try {
            let requirements = {};
            if (typeof ability.skill_requirements === 'string' && ability.skill_requirements.trim()) {
                requirements = JSON.parse(ability.skill_requirements);
            } else { return { met: true, details: {} }; }
            if (typeof requirements !== 'object' || requirements === null) {
                 console.error("Parsed skill_requirements is not an object:", requirements);
                 return { met: false, details: { error: `Некорректный формат требований` } };
            }
            let allMet = true;
            const details = {};
            for (const skillKey in requirements) {
                if (Object.hasOwnProperty.call(requirements, skillKey)) {
                    const requiredValue = requirements[skillKey];
                    const characterValue = character[skillKey] ?? 0;
                    const met = characterValue >= requiredValue;
                    details[skillKey] = { required: requiredValue, current: characterValue, met: met };
                    if (!met) allMet = false;
                }
            }
            if (Object.keys(details).length === 0) { return { met: true, details: {} }; }
            return { met: allMet, details: details };
        } catch (e) {
            console.error("Failed to parse/check skill_requirements in modal:", ability?.skill_requirements, e);
            return { met: false, details: { error: `Ошибка проверки требований` } };
        }
     }, [ability?.skill_requirements, character]);

    const inherentModifier = useMemo(() => { /* ... (как было) ... */
        if (!ability?.name) return null;
        const nameLower = ability.name.toLowerCase();
        if (nameLower.includes('точный выстрел')) return 'advantage';
        if (nameLower.includes('очередь') || nameLower.includes('снайперский выстрел в глаз')) return 'disadvantage';
        return null;
    }, [ability?.name]);
    // --- Конец хуков ---

    if (!ability) return null;

    const animationStyle = `
        @keyframes fadeInBlur { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(5px); } }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;

    return (
        <>
            <style>{animationStyle}</style>
            <div style={styles.overlay} onClick={onClose}>
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <button onClick={onClose} style={styles.closeButton} title="Закрыть">×</button>

                    {/* Заголовок */}
                    <div style={styles.titleContainer}>
                        <h2 style={styles.title}>{ability.name}</h2>
                    </div>

                    {/* Основные Параметры (Теги) */}
                    <div style={styles.tagsContainer}>
                        {/* ... (остальные теги без изменений) ... */}
                        <span style={styles.detailTag} title="Ветка и Уровень"> <BranchIcon /> {ability.branch} / {ability.level_required} ур. </span>
                        <span style={styles.detailTag} title="Тип действия"> <ActionTypeIcon /> {ability.action_type} </span>
                        {inherentModifier === 'advantage' && (
                            <span style={{...styles.modifierTag, ...styles.advantageTag}} title="Способность дает Преимущество">
                                <AdvantageIcon /> Преим.
                            </span>
                        )}
                        {inherentModifier === 'disadvantage' && (
                            <span style={{...styles.modifierTag, ...styles.disadvantageTag}} title="Способность накладывает Помеху">
                                <DisadvantageIcon /> Помеха
                            </span>
                        )}
                        {ability.range && <span style={styles.detailTag} title="Дальность"> <RangeIcon /> {ability.range} </span>}
                        {ability.target && <span style={styles.detailTag} title="Цель"> <TargetIcon /> {ability.target} </span>}
                        {ability.duration && <span style={styles.detailTag} title="Длительность"> <DurationIcon /> {ability.duration}{ability.concentration ? ' (Конц.)' : ''} </span>}
                        {ability.cooldown && <span style={styles.detailTag} title="Перезарядка"> <CooldownIcon /> {ability.cooldown} </span>}
                    </div>

                    {/* Урон и Спасбросок */}
                    {(ability.damage_formula || ability.saving_throw_attribute) && (
                        <div style={styles.statsSection}>
                            {/* ... (отображение урона и спасброска без изменений) ... */}
                             {ability.damage_formula && (
                                <div style={styles.statItem}>
                                    <DamageIcon />
                                    <span style={styles.statLabel}>Урон:</span>
                                    <span style={styles.statValueHighlight}>
                                        {getCalculatedDamageString(ability.damage_formula, character?.skill_modifiers)}
                                    </span>
                                    {ability.damage_type && ability.damage_type.toLowerCase() !== 'см. оружие' && (
                                        <span style={styles.damageType}>({ability.damage_type})</span>
                                    )}
                                </div>
                            )}
                            {ability.saving_throw_attribute && (
                                <div style={styles.statItem}>
                                    <SaveIcon />
                                    <span style={styles.statLabel}>Спасбросок:</span>
                                    <span style={styles.statValue}>
                                        {ability.saving_throw_attribute} (СЛ: {ability.saving_throw_dc_formula || '?'})
                                    </span>
                                </div>
                             )}
                        </div>
                    )}

                    {/* Требования к Навыкам (отображение "Треб. X / Есть Y") */}
                    {requirementsMet.details && Object.keys(requirementsMet.details).length > 0 && !requirementsMet.details.error && (
                        <div style={styles.requirementsSection}>
                             <h4 style={styles.subHeader}><SkillReqIcon /> Требования:</h4>
                             <div style={styles.tagsContainerReq}>
                                 {Object.entries(requirementsMet.details).map(([key, val]) => {
                                     const skillName = skillRussianNames[key.replace('skill_', '')] || key.replace('skill_', '');
                                     const met = val.met;
                                     return (
                                         <span
                                             key={key}
                                             style={{...styles.detailTag, ...(met ? styles.reqMet : styles.reqNotMet)}}
                                             title={`Требуется: ${val.required}, У вас: ${val.current}`}
                                         >
                                             {skillName}: {val.required} / {val.current} {met ? '✓' : '✕'}
                                         </span>
                                     );
                                 })}
                             </div>
                        </div>
                    )}
                     {requirementsMet.details?.error && (
                         <div style={styles.requirementsSection}>
                             <h4 style={styles.subHeader}><SkillReqIcon /> Требования:</h4>
                              <span style={{...styles.detailTag, ...styles.reqNotMet}}>{requirementsMet.details.error}</span>
                         </div>
                     )}

                    {/* --- БЛОК УДАЛЕН: Ключевые Навыки Персонажа --- */}
                    {/* {character && ( ... )} */}

                    {/* Описание */}
                    <div style={styles.descriptionSection}>
                        <h4 style={styles.subHeader}>Описание:</h4>
                        <p style={styles.descriptionText}>{ability.description || '-'}</p>
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

                    {/* Кнопка Закрыть */}
                    <div style={styles.buttonGroup}>
                        <button onClick={onClose} style={styles.closeBottomButton}>Закрыть</button>
                     </div>

                </div>
            </div>
        </>
    );
};

// --- Стили ---
const styles = {
    // ... (все стили без изменений) ...
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, backdropFilter: 'blur(5px)', animation: 'fadeInBlur 0.3s ease-out forwards', opacity: 0 },
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto', position: 'relative', boxShadow: '0 5px 25px rgba(0,0,0,0.4)', color: theme.colors.text, border: `1px solid ${theme.colors.surfaceVariant}`, display: 'flex', flexDirection: 'column', animation: 'scaleUp 0.3s ease-out forwards', transform: 'scale(0.9)', opacity: 0, '::-webkit-scrollbar': { width: '8px' }, '::-webkit-scrollbar-track': { background: theme.colors.surface, borderRadius: '4px' }, '::-webkit-scrollbar-thumb': { background: theme.colors.surfaceVariant, borderRadius: '4px' }, '::-webkit-scrollbar-thumb:hover': { background: theme.colors.textSecondary } },
    '@keyframes scaleUp': { 'from': { transform: 'scale(0.9)', opacity: 0 }, 'to': { transform: 'scale(1)', opacity: 1 } },
    '@keyframes fadeInBlur': { 'from': { opacity: 0, backdropFilter: 'blur(0px)' }, 'to': { opacity: 1, backdropFilter: 'blur(5px)' } },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1, padding: '0 5px', transition: 'color 0.2s', ':hover': { color: theme.colors.primary } },
    titleContainer: { justifyContent: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '15px', borderBottom: `1px solid ${theme.colors.secondary}55`, },
    title: { margin: 0, color: theme.colors.secondary, fontSize: '1.5rem', fontWeight: '600', textAlign: 'center', },
    tagsContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: `1px solid ${theme.colors.surfaceVariant}` },
    detailTag: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.08)', color: theme.colors.textSecondary, padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' },
    detailTagIcon: { width: '14px', height: '14px', fill: 'currentColor', flexShrink: 0, opacity: 0.8 },
    statsSection: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', paddingBottom: '15px', borderBottom: `1px solid ${theme.colors.surfaceVariant}` },
    statItem: { display: 'flex', alignItems: 'center', gap: '8px' },
    mainDetailIcon: { width: '18px', height: '18px', fill: theme.colors.textSecondary, flexShrink: 0 },
    statLabel: { color: theme.colors.textSecondary, fontSize: '0.9rem' },
    statValue: { fontWeight: '500', color: theme.colors.text, fontSize: '0.95rem' },
    statValueHighlight: { fontWeight: 'bold', color: theme.colors.primary, fontSize: '1rem' },
    damageType: { color: theme.colors.textSecondary, fontSize: '0.85rem', marginLeft: '5px' },
    requirementsSection: { marginBottom: '20px', paddingBottom: '15px', borderBottom: `1px solid ${theme.colors.surfaceVariant}` },
    tagsContainerReq: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '8px' },
    reqIcon: { width: '14px', height: '14px', fill: 'currentColor', opacity: 0.8, marginRight: '2px' },
    reqMet: { color: theme.colors.success, borderColor: `${theme.colors.success}55`, background: `${theme.colors.success}11` },
    reqNotMet: { color: theme.colors.error, borderColor: `${theme.colors.error}55`, background: `${theme.colors.error}11` },
    descriptionSection: { marginBottom: '15px'},
    subHeader: { margin: '0 0 8px 0', color: theme.colors.primary, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' },
    descriptionText: { margin: 0, lineHeight: 1.6, fontSize: '0.95rem', whiteSpace: 'pre-wrap', color: theme.colors.text },
    failEffect: { margin: 0, lineHeight: 1.6, fontSize: '0.9rem', color: theme.colors.error },
    successEffect: { margin: 0, lineHeight: 1.6, fontSize: '0.9rem', color: theme.colors.success },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '20px' },
    closeBottomButton: { padding: '10px 25px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, fontWeight: '500', ':hover': { opacity: 1 } },
    modifierTag: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid', },
    advantageTag: { background: `${theme.colors.success || '#66BB6A'}22`, color: theme.colors.success || '#66BB6A', borderColor: `${theme.colors.success || '#66BB6A'}88`, },
    disadvantageTag: { background: `${theme.colors.error}22`, color: theme.colors.error, borderColor: `${theme.colors.error}88`, },
    modTagIcon: { width: '12px', height: '12px', fill: 'currentColor', },
    titleIcon: { width: '24px', height: '24px', fill: theme.colors.primary, flexShrink: 0, },
    // --- СТИЛЬ УДАЛЕН ---
    // characterSkillsSection: { ... },
};

export default AbilityDetailModal;
