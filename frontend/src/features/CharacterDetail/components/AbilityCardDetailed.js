// src/features/CharacterDetail/components/AbilityCardDetailed.js
import React, { useCallback, useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Путь к теме
import * as apiService from '../../../api/apiService'; // Импортируем apiService
// --- ПРЕДПОЛАГАЕТСЯ НАЛИЧИЕ КОМПОНЕНТА Tooltip ---
// import Tooltip from '../../../components/UI/Tooltip'; // Пример пути

// --- Иконки ---
// (Иконки ActionTypeIcon, RangeIcon и т.д. остаются без изменений)
const ActionTypeIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M13 6V3h-2v3H8l4 4 4-4h-3zm4.6 8.17l-4-4-4 4H3v2h18v-2h-2.4z"/></svg> );
const RangeIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg> );
const TargetIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l.71-.71c.19-.19.44-.3.7-.3h7.18c.26 0 .51.11.7.3l.71.71c.19.19.3.44.3.7v.59c0 .26-.11.51-.3.7l-.71.71c-.19.19-.44.3-.7.3H6.91c-.26 0-.51-.11-.7-.3l-.71-.71c-.19-.19-.3-.44-.3-.7v-.59c0-.26.11.51.3-.7zm5.5-6.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z"/></svg> );
const DurationIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-14h2v5h-2zm0 7h2v2h-2z"/></svg> );
const CooldownIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> );
const DamageIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M19.78 2.22a.75.75 0 0 0-1.06 0l-2.22 2.22-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41-1.94 1.94-1.41-1.41a.75.75 0 0 0-1.06 1.06l1.41 1.41L4 15.06V19a1 1 0 0 0 1 1h3.94l10.84-10.84L19.78 3.28a.75.75 0 0 0 0-1.06zM8.5 18H6v-2.5l7.37-7.37 2.5 2.5L8.5 18z"/></svg> );
const SaveIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg> );
const AdvantageIcon = () => ( <svg style={styles.modTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> );
const DisadvantageIcon = () => ( <svg style={styles.modTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg> );
const LearnedIcon = () => ( <svg style={styles.statusIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg> );
const WeaponIcon = () => ( <svg style={styles.statusIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M9.41 15.41L8 14l-4 4 1.41 1.41L9.41 15.41zM14 8l-4-4-1.41 1.41L12.59 9.41 14 8zm4.17-4.17l-1.41-1.41-4.24 4.24 1.41 1.41 4.24-4.24zM18 14l-4 4-1.41-1.41L16.59 12.59 18 14zm-4-4l-4 4-1.41-1.41L12.59 8.59 14 10z"/></svg> );
const LockedIcon = () => ( <svg style={{...styles.statusIcon, color: theme.colors.error}} viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg> );
const PlayIcon = () => ( <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> ); // Уменьшили иконку Play

// Карта Модификаторов и Функция Расчета Урона
const modMap = { /* ... */ };
const getCalculatedDamageString = (formula, modifiers) => { /* ... */ };


const AbilityCardDetailed = ({ ability, character, onClick, handleApiAction, weaponAbilityIds = new Set() }) => {

    // --- Хуки ---
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
    // TODO: Заменить на данные с бэкенда
        const inherentModifier = useMemo(() => { /* ... (как было) ... */
        if (!ability?.name) return null;
        const nameLower = ability.name.toLowerCase();
        if (nameLower.includes('точный выстрел')) return 'advantage';
        if (nameLower.includes('очередь') || nameLower.includes('снайперский выстрел в глаз')) return 'disadvantage';
        return null;
    }, [ability?.name]);
    // --- Конец хуков ---

    if (!ability) return null;

    // Определяем статус способности
    const isLearned = character?.available_abilities?.some(ab => ab?.id === ability.id);
    const isGrantedByWeapon = weaponAbilityIds.has(ability.id);
    const canActivate = !!handleApiAction && requirementsCheck?.met && (isLearned || isGrantedByWeapon);

    // --- Определяем стиль и иконку статуса ---
    let statusBorderColor = theme.colors.textSecondary + '55';
    let StatusIndicatorComponent = null;
    let cardOpacity = 1.0;

    if (!requirementsCheck?.met) {
        statusBorderColor = theme.colors.error;
        StatusIndicatorComponent = LockedIcon;
        cardOpacity = 0.6;
    } else if (isLearned) {
        statusBorderColor = theme.colors.primary;
        StatusIndicatorComponent = LearnedIcon;
    } else if (isGrantedByWeapon) {
        statusBorderColor = theme.colors.secondary;
        StatusIndicatorComponent = WeaponIcon;
    }
    // --- КОНЕЦ ---

    // Формируем текст для Tooltip
    const tooltipContent = !canActivate ? (requirementsCheck?.message || "Недоступно") : `Активировать: ${ability.name}`;

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
        <div style={styles.cardWrapper} title={tooltipContent}>
            {/* Левая часть: Информация о способности */}
            <div
                style={{
                    ...styles.abilityCard,
                    borderLeftColor: statusBorderColor, // Применяем цвет рамки статуса
                    opacity: cardOpacity // Применяем прозрачность, если недоступно
                }}
                onClick={() => onClick(ability)}
            >
                {/* Иконка статуса в углу */}
                {StatusIndicatorComponent && (
                    <div style={styles.statusIconContainer} title={!requirementsCheck?.met ? requirementsCheck?.message : isLearned ? "Изучено" : isGrantedByWeapon ? "От оружия" : ""}>
                        <StatusIndicatorComponent />
                    </div>
                )}

                {/* Название и теги Преим./Помехи */}
                <div style={styles.nameContainer}>
                    <h4 style={styles.name}>{ability.name}</h4>
                    {inherentModifier === 'advantage' && ( <span style={{...styles.modifierTag, ...styles.advantageTag}} title="Способность дает Преимущество"> <AdvantageIcon /> Преим. </span> )}
                    {inherentModifier === 'disadvantage' && ( <span style={{...styles.modifierTag, ...styles.disadvantageTag}} title="Способность накладывает Помеху"> <DisadvantageIcon /> Помеха </span> )}
                </div>

                {/* Основные Параметры (Теги) - теперь в одной строке с переносом */}
                <div style={styles.tagsContainer}>
                    <span style={styles.detailTag} title="Тип действия"> <ActionTypeIcon /> {ability.action_type} </span>
                    {ability.range && <span style={styles.detailTag} title="Дальность"> <RangeIcon /> {ability.range} </span>}
                    {ability.target && <span style={styles.detailTag} title="Цель"> <TargetIcon /> {ability.target} </span>}
                    {ability.damage_formula && ( <span style={{...styles.detailTag, ...styles.damageTag}} title={`Урон: ${ability.damage_formula} (${ability.damage_type || '?'})`}> <DamageIcon /> {getCalculatedDamageString(ability.damage_formula, character?.skill_modifiers)} {ability.damage_type && ability.damage_type.toLowerCase() !== 'см. оружие' && ` (${ability.damage_type.substring(0,4)}.)`} </span> )}
                    {ability.saving_throw_attribute && ( <span style={{...styles.detailTag, ...styles.saveTag}} title={`Спасбросок: ${ability.saving_throw_attribute} (СЛ: ${ability.saving_throw_dc_formula || '?'})`}> <SaveIcon /> {ability.saving_throw_attribute.substring(0,3)}. (СЛ {ability.saving_throw_dc_formula || '?'}) </span> )}
                    {ability.duration && <span style={styles.detailTag} title="Длительность"> <DurationIcon /> {ability.duration}{ability.concentration ? ' (Конц.)' : ''} </span>}
                    {ability.cooldown && <span style={styles.detailTag} title="Перезарядка"> <CooldownIcon /> {ability.cooldown} </span>}
                </div>

                 {/* Сообщение о невыполненных требованиях */}
                 {!requirementsCheck?.met && requirementsCheck?.message && (
                    <div style={styles.requirementsText}>
                        {requirementsCheck.message}
                    </div>
                 )}
            </div>

            {/* Правая часть: Кнопка активации (только иконка) */}
            {/* <Tooltip content={tooltipContent} disabled={canActivate}> */}
                <button
                    onClick={handleActivateClick}
                    style={{
                        ...styles.activateButtonBlock,
                        ...(!canActivate ? styles.activateButtonDisabled : {})
                    }}
                    title={tooltipContent} // Нативная подсказка
                    disabled={!canActivate}
                >
                   <PlayIcon /> {/* Только иконка */}
                </button>
            {/* </Tooltip> */}
        </div>
    );
};

// --- Стили ---
const styles = {
    cardWrapper: {
        display: 'flex',
        alignItems: 'stretch',
        gap: '6px', // Уменьшили gap
        marginBottom: '8px', // Уменьшили отступ
        cursor: 'pointer',
        position: 'relative',
    },
    abilityCard: {
        background: theme.colors.surface + 'dd', // Чуть прозрачнее фон
        borderRadius: '6px', // Менее скругленные углы
        // Уменьшаем паддинги, особенно левый
        padding: '8px 10px 8px 20px',
        boxShadow: theme.effects.shadowSmall, // Меньше тень
        transition: theme.transitions.default + ', border-color 0.3s ease, opacity 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        position: 'relative',
        borderLeft: `3px solid transparent`, // Уменьшили толщину рамки статуса
        minHeight: 'auto', // Убираем мин. высоту
    },
    activateButtonBlock: { // Кнопка-иконка
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: '38px', // Уменьшили размер
        height: '38px', // Уменьшили размер
        padding: '0',
        background: theme.colors.secondary + 'BB', // Чуть прозрачнее
        color: theme.colors.background,
        border: `1px solid ${theme.colors.secondary}88`, // Прозрачнее рамка
        borderRadius: '6px', // Менее скругленные
        cursor: 'pointer',
        transition: theme.transitions.default,
        ':hover': {
             background: theme.colors.secondary,
             borderColor: theme.colors.secondary,
             boxShadow: `0 0 8px ${theme.colors.secondary}88`,
             transform: 'scale(1.03)',
        },
    },
    activateButtonDisabled: { // Стиль неактивной кнопки
        opacity: 0.45, // Чуть менее прозрачная
        cursor: 'not-allowed',
        background: theme.colors.textSecondary + '33', // Прозрачнее серый
        borderColor: theme.colors.textSecondary + '55',
        boxShadow: 'none',
        color: theme.colors.textSecondary + 'cc', // Цвет иконки
        transform: 'scale(1)',
        ':hover': {
             background: theme.colors.textSecondary + '33',
             borderColor: theme.colors.textSecondary + '55',
             boxShadow: 'none',
             transform: 'scale(1)',
        },
    },
    statusIconContainer: { // Иконка статуса
        position: 'absolute',
        top: '6px', // Ближе к верху
        left: '6px', // Ближе к краю
        width: '16px', // Чуть меньше
        height: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.8,
        color: theme.colors.textSecondary,
    },
    statusIcon: {
        width: '14px', // Меньше
        height: '14px',
        fill: 'currentColor',
    },
    nameContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px', // Меньше gap
        marginBottom: '6px', // Меньше отступ
        marginLeft: '8px', // Уменьшили отступ слева
    },
    name: {
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontSize: '1rem', // Стандартный размер
        margin: 0,
        flexGrow: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    tagsContainer: { // Контейнер для ВСЕХ тегов
        display: 'flex',
        flexWrap: 'wrap', // Позволяем переноситься
        gap: '4px 6px', // Уменьшили gap
        alignItems: 'center',
        marginBottom: '0px', // Убрали отступ между строками тегов (если они перенесутся)
        marginLeft: '8px', // Уменьшили отступ слева
        paddingBottom: '4px', // Небольшой отступ снизу контейнера тегов
    },
    detailTag: { // Стиль отдельного тега
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px', // Уменьшили gap
        fontSize: '0.7rem', // Уменьшили шрифт
        background: 'rgba(255,255,255,0.07)', // Чуть менее заметный фон
        color: theme.colors.textSecondary,
        padding: '2px 6px', // Уменьшили паддинг
        borderRadius: '8px', // Менее скругленные
        border: '1px solid rgba(255,255,255,0.08)',
        whiteSpace: 'nowrap',
        transition: 'background 0.2s ease',
    },
    detailTagIcon: {
        width: '11px', // Уменьшили иконки
        height: '11px',
        fill: 'currentColor',
        flexShrink: 0,
        opacity: 0.7, // Менее заметные
    },
    damageTag: { // Тег урона
        background: `${theme.colors.error}15`,
    },
    saveTag: { // Тег спасброска
        background: `${theme.colors.secondary}15`,
    },
    modifierTag: { // Тег Преим./Помехи
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '2px 6px', // Уменьшили
        borderRadius: '4px',
        fontSize: '0.65rem', // Еще меньше
        fontWeight: 'bold',
        border: '1px solid',
        flexShrink: 0,
        marginLeft: 'auto', // Оставляем справа
    },
    modTagIcon: {
        width: '10px', // Уменьшили
        height: '10px',
        fill: 'currentColor',
    },
    advantageTag: {
        background: `${theme.colors.success || '#66BB6A'}22`,
        color: theme.colors.success || '#66BB6A',
        borderColor: `${theme.colors.success || '#66BB6A'}88`,
    },
    disadvantageTag: {
        background: `${theme.colors.error}22`,
        color: theme.colors.error,
        borderColor: `${theme.colors.error}88`,
    },
    requirementsText: { // Текст требований
        fontSize: '0.7rem', // Меньше
        color: theme.colors.error,
        marginTop: '5px', // Меньше
        paddingTop: '3px',
        borderTop: `1px dashed ${theme.colors.error}44`, // Менее заметная линия
        marginLeft: '8px',
    },
};


export default AbilityCardDetailed;
