// src/features/CharacterDetail/components/AbilityCardDetailed.js
import React, { useCallback, useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Путь к теме
import * as apiService from '../../../api/apiService'; // Импортируем apiService

// --- Иконки (без изменений) ---
const ActionTypeIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M13 6V3h-2v3H8l4 4 4-4h-3zm4.6 8.17l-4-4-4 4H3v2h18v-2h-2.4z"/></svg> );
const RangeIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg> );
const TargetIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l.71-.71c.19-.19.44-.3.7-.3h7.18c.26 0 .51.11.7.3l.71.71c.19.19.3.44.3.7v.59c0 .26-.11.51-.3.7l-.71.71c-.19.19-.44.3-.7.3H6.91c-.26 0-.51-.11-.7-.3l-.71-.71c-.19-.19-.3-.44-.3-.7v-.59c0-.26.11.51.3-.7zm5.5-6.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z"/></svg> );
const DurationIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-14h2v5h-2zm0 7h2v2h-2z"/></svg> );
const CooldownIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> );
const DamageIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M19.78 2.22a.75.75 0 0 0-1.06 0l-2.22 2.22-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41L4 15.06V19a1 1 0 0 0 1 1h3.94l10.84-10.84L19.78 3.28a.75.75 0 0 0 0-1.06zM8.5 18H6v-2.5l7.37-7.37 2.5 2.5L8.5 18z"/></svg> );
const SaveIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg> );
// Иконки для тегов Преимущества/Помехи
const AdvantageIcon = () => ( <svg style={styles.modTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> );
const DisadvantageIcon = () => ( <svg style={styles.modTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg> );

// Карта Модификаторов и Функция Расчета Урона (без изменений)
const modMap = { /* ... */
    'Сил': 'strength_mod', 'Лов': 'dexterity_mod', 'Вни': 'attention_mod',
    'Мед': 'medicine_mod', 'Вын': 'endurance_mod', 'Реа': 'reaction_mod',
    'Тех': 'technique_mod', 'Ада': 'adaptation_mod', 'Лог': 'logic_mod',
    'Эру': 'erudition_mod', 'Кул': 'culture_mod', 'Нау': 'science_mod',
    'Вну': 'suggestion_mod', 'Про': 'insight_mod', 'Авт': 'authority_mod',
    'Сам': 'self_control_mod', 'Рел': 'religion_mod', 'Пот': 'flow_mod'
};
const getCalculatedDamageString = (formula, modifiers) => { /* ... */
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


const AbilityCardDetailed = ({ ability, character, onClick, handleApiAction, weaponAbilityIds = new Set() }) => {

    // --- Хуки в начале ---
    const checkRequirements = useCallback(() => { /* ... (как было) ... */
         if (!ability || !ability.skill_requirements || !character) {
             return { met: true, details: null };
         }
         try {
             let requirements = {};
             if (typeof ability.skill_requirements === 'string' && ability.skill_requirements.trim()) {
                 requirements = JSON.parse(ability.skill_requirements);
             } else {
                 return { met: true, details: null };
             }
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
              if (Object.keys(details).length === 0) {
                 return { met: true, details: {} };
              }
             return { met: allMet, details: details };
         } catch (e) {
             console.error("AbilityCardDetailed: Failed to parse skill_requirements:", ability?.skill_requirements, e);
             return { met: false, details: { error: `Ошибка парсинга требований` } };
         }
     }, [ability, character]);
    const requirementsCheck = useMemo(() => checkRequirements(), [checkRequirements]);
    const inherentModifier = useMemo(() => { /* ... (как было) ... */
        if (!ability?.name) return null;
        const nameLower = ability.name.toLowerCase();
        if (nameLower.includes('точный выстрел')) return 'advantage';
        if (nameLower.includes('очередь') || nameLower.includes('снайперский выстрел в глаз')) return 'disadvantage';
        return null;
    }, [ability?.name]);
    // --- Конец хуков ---

    if (!ability) return null;

    // Определяем остальные переменные
    const isLearned = character?.available_abilities?.some(ab => ab?.id === ability.id);
    const isGrantedByWeapon = weaponAbilityIds.has(ability.id);

    // Логирование перед проверкой (оставляем для отладки, если нужно)
    if (ability && character) {
        console.log(`[Debug Activation Check] Ability: "${ability.name}" (ID: ${ability.id})`);
        console.log(`  - isLearned: ${isLearned}`);
        console.log(`  - isGrantedByWeapon: ${isGrantedByWeapon}`);
        console.log(`  - requirementsCheck.met: ${requirementsCheck.met}`);
        if (!requirementsCheck.met && requirementsCheck.details) {
            console.log(`  - Unmet Skill Details:`, requirementsCheck.details);
        }
    }

    // Исправленная логика canActivate
    const canActivate = !!handleApiAction && requirementsCheck.met && (isLearned || isGrantedByWeapon);

    // Определяем стиль карточки
    const cardStyle = {
        ...styles.abilityCard,
        ...(isLearned ? styles.learned : {}),
        // --- ИЗМЕНЕНИЕ: Стиль неактивности теперь применяется всегда, когда canActivate = false ---
        ...(!canActivate ? styles.unmetReq : {})
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    };

    // Обработчик клика по кнопке "Активировать"
    const handleActivateClick = (e) => { /* ... (как было) ... */
        e.stopPropagation();
        if (!canActivate) {
            console.warn(`[Activation Prevented] Ability: "${ability.name}", canActivate: ${canActivate}`);
            return;
        }
        const activationData = {
            activation_type: 'ability',
            target_id: ability.id
        };
        handleApiAction(
            apiService.activateAction(character.id, activationData),
            `Способность '${ability.name}' активирована`,
            `Ошибка активации способности '${ability.name}'`
        );
    };

    // --- Рендеринг Карточки ---
    return (
        <div style={styles.cardWrapper} onClick={() => onClick(ability)}>
            {/* Левая часть: Информация о способности */}
            <div style={cardStyle} title={`Нажмите для деталей: ${ability.name}`}>

                {/* Название */}
                <div style={styles.nameContainer}>
                    <h4 style={styles.name}>{ability.name}</h4>
                    {/* Индикатор недоступности */}
                </div>

                {/* Основные Параметры (Теги) */}
                <div style={styles.tagsContainer}>
                    <span style={styles.detailTag} title="Тип действия"> <ActionTypeIcon /> {ability.action_type} </span>
                    {inherentModifier === 'advantage' && ( <span style={{...styles.modifierTag, ...styles.advantageTag}} title="Способность дает Преимущество"> <AdvantageIcon /> Преим. </span> )}
                    {inherentModifier === 'disadvantage' && ( <span style={{...styles.modifierTag, ...styles.disadvantageTag}} title="Способность накладывает Помеху"> <DisadvantageIcon /> Помеха </span> )}
                    {ability.range && <span style={styles.detailTag} title="Дальность"> <RangeIcon /> {ability.range} </span>}
                    {ability.target && <span style={styles.detailTag} title="Цель"> <TargetIcon /> {ability.target} </span>}
                    {ability.duration && <span style={styles.detailTag} title="Длительность"> <DurationIcon /> {ability.duration}{ability.concentration ? ' (Конц.)' : ''} </span>}
                    {ability.cooldown && <span style={styles.detailTag} title="Перезарядка"> <CooldownIcon /> {ability.cooldown} </span>}
                    {ability.damage_formula && ( <span style={styles.detailTag} title={`Урон: ${ability.damage_formula} (${ability.damage_type || '?'})`}> <DamageIcon /> {getCalculatedDamageString(ability.damage_formula, character?.skill_modifiers)} {ability.damage_type && ability.damage_type.toLowerCase() !== 'см. оружие' && ` (${ability.damage_type.substring(0,4)}.)`} </span> )}
                    {ability.saving_throw_attribute && ( <span style={styles.detailTag} title={`Спасбросок: ${ability.saving_throw_attribute} (СЛ: ${ability.saving_throw_dc_formula || '?'})`}> <SaveIcon /> {ability.saving_throw_attribute.substring(0,3)}. (СЛ {ability.saving_throw_dc_formula || '?'}) </span> )}
                </div>

                 {/* Требования НЕ отображаются здесь */}

            </div>

            {/* Правая часть: Кнопка активации */}
            <button
                onClick={handleActivateClick}
                // --- ИЗМЕНЕНИЕ: Применяем стиль disabled напрямую ---
                style={{
                    ...styles.activateButtonBlock,
                    ...(!canActivate ? styles.activateButtonDisabled : {}) // Добавляем стиль для disabled
                }}
                // --- КОНЕЦ ИЗМЕНЕНИЯ ---
                title={canActivate ? `Активировать: ${ability.name}` : "Нельзя активировать (требования не выполнены или не изучено)"}
                disabled={!canActivate}
            >
               Акт.
            </button>
        </div>
    );
};

// --- Стили ---
const styles = {
    cardWrapper: { display: 'flex', alignItems: 'stretch', gap: '8px', marginBottom: '10px', cursor: 'pointer', },
    abilityCard: { background: theme.colors.surface, borderRadius: '8px', padding: '10px 12px', boxShadow: theme.effects.shadow, transition: theme.transitions.default, display: 'flex', flexDirection: 'column', flexGrow: 1, position: 'relative', minHeight: '70px', },
    activateButtonBlock: { // Базовый стиль кнопки
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '45px', padding: '5px', fontSize: '0.8rem', background: theme.colors.secondary + 'CC', color: theme.colors.background, border: `1px solid ${theme.colors.secondary}`, borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', textAlign: 'center',
        ':hover': { background: theme.colors.secondary, boxShadow: `0 0 8px ${theme.colors.secondary}88` },
        // ':disabled' псевдокласс может не всегда хорошо работать со стилями React, поэтому используем отдельный стиль
    },
    // --- НОВЫЙ СТИЛЬ для неактивной кнопки ---
    activateButtonDisabled: {
        opacity: 0.4, // Делаем сильно прозрачнее
        cursor: 'not-allowed',
        background: theme.colors.textSecondary, // Серый фон
        borderColor: theme.colors.textSecondary,
        boxShadow: 'none', // Убираем тень
        color: theme.colors.surface, // Цвет текста может быть темнее
        ':hover': { // Убираем эффект при наведении
             background: theme.colors.textSecondary,
             boxShadow: 'none',
        },
    },
    // --- КОНЕЦ НОВОГО СТИЛЯ ---
    reqNotMetIndicator: { position: 'absolute', top: '5px', right: '5px', background: theme.colors.error, color: theme.colors.text, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.7rem', boxShadow: `0 0 4px ${theme.colors.error}88`, cursor: 'help' },
    nameContainer: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', },
    name: { fontWeight: 'bold', color: theme.colors.primary, fontSize: '1rem', margin: 0, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', },
    tagsContainer: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '8px', },
    detailTag: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', color: theme.colors.textSecondary, padding: '3px 7px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', },
    detailTagIcon: { width: '11px', height: '11px', fill: 'currentColor', flexShrink: 0, opacity: 0.8, },
    modifierTag: { display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid', flexShrink: 0, },
    modTagIcon: { width: '10px', height: '10px', fill: 'currentColor', },
    advantageTag: { background: `${theme.colors.success || '#66BB6A'}22`, color: theme.colors.success || '#66BB6A', borderColor: `${theme.colors.success || '#66BB6A'}88`, },
    disadvantageTag: { background: `${theme.colors.error}22`, color: theme.colors.error, borderColor: `${theme.colors.error}88`, },
    learned: {},
    unmetReq: { // Стиль для неактивной карточки (применяется ко всей левой части)
        opacity: 0.65,
        filter: 'grayscale(60%)',
    },
    reqIcon: { width: '14px', height: '14px', fill: 'currentColor', opacity: 0.8, marginRight: '2px' },
};


export default AbilityCardDetailed;
