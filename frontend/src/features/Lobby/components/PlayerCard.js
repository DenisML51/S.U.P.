// src/features/Lobby/components/PlayerCard.js
import React from 'react';
import { theme } from '../../../styles/theme';
// --- НОВОЕ: Импорт компонента слота ---
import AbilitySlotDisplay from '../../CharacterDetail/components/AbilitySlotDisplay';

// --- НОВОЕ: Иконки статуса действий (можно вынести) ---
const MainActionIcon = ({ available }) => ( <svg style={{...styles.actionIcon, color: available ? theme.colors.primary : theme.colors.textSecondary + '99'}} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg> );
const BonusActionIcon = ({ available }) => ( <svg style={{...styles.actionIcon, color: available ? theme.colors.secondary : theme.colors.textSecondary + '99'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg> );
const ReactionIcon = ({ available }) => ( <svg style={{...styles.actionIcon, color: available ? theme.colors.warning : theme.colors.textSecondary + '99'}} viewBox="0 0 24 24" fill="currentColor"><path d="M13 6V3h-2v3H8l4 4 4-4h-3zm4.6 8.17l-4-4-4 4H3v2h18v-2h-2.4z"/></svg> );
// --- НОВОЕ: Иконка статуса ---
const StatusEffectIcon = () => (<svg style={styles.statusIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>);
// --- НОВОЕ: Иконка разворота/сворота ---
const ExpandIcon = ({ expanded }) => (
    <svg style={styles.expandIcon} viewBox="0 0 24 24" fill="currentColor">
        {expanded
         ? <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/> // Стрелка вверх
         : <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/> // Стрелка вниз
        }
    </svg>
);
// ---------------------------------

const PlayerCard = ({
    playerInfo,     // { username, character_id } или null
    characterData,  // CharacterDetailedOut или null
    isMaster = false,
    isExpanded,     // boolean - развернут ли лист этого игрока
    onToggleExpand, // (characterId) => void - функция для разворота/сворота
    isMyCard        // boolean - это карточка текущего пользователя?
}) => {
    const isPlaceholder = !playerInfo && !isMaster;
    const name = isMaster ? `${playerInfo?.username || '??'} (Мастер)` : (playerInfo?.username || "Свободный слот");
    const charId = playerInfo?.character_id;

    // Определяем стиль и доступность на основе данных
    const indicatorColor = isMaster ? theme.colors.primary : (playerInfo ? theme.colors.secondary : theme.colors.textSecondary);
    const opacity = isPlaceholder ? 0.5 : 1;
    const canExpand = (isMyCard || isMaster) && !!charId; // Развернуть можно себя или если ты мастер

    // --- Получаем данные для отображения ---
    const activeSlots = characterData ? [
        characterData.active_slot_1, characterData.active_slot_2, characterData.active_slot_3,
        characterData.active_slot_4, characterData.active_slot_5
    ] : Array(5).fill(null); // Пустые слоты, если нет данных

    const mainActionAvailable = characterData ? !characterData.has_used_main_action : true;
    const bonusActionAvailable = characterData ? !characterData.has_used_bonus_action : true;
    const reactionAvailable = characterData ? !characterData.has_used_reaction : true;

    const statusEffects = characterData?.active_status_effects?.filter(e => !e.name?.startsWith('ПУ:')) || []; // Фильтруем ПУ

    const handleExpandClick = (e) => {
        e.stopPropagation(); // Не триггерить другие клики
        if (canExpand && onToggleExpand) {
            onToggleExpand(charId);
        }
    };

    return (
        <div style={{...styles.playerCard, opacity: opacity, background: isExpanded ? theme.colors.surfaceVariant + '55' : 'rgba(255, 255, 255, 0.05)' }}>
            <div style={styles.cardHeader}>
                <div style={{ ...styles.playerIndicator, backgroundColor: indicatorColor }} />
                <span style={styles.playerName} title={name}>{name}</span>
                {/* Кнопка разворота/сворота */}
                {canExpand && (
                    <button onClick={handleExpandClick} style={styles.expandButton} title={isExpanded ? "Свернуть лист" : "Показать лист"}>
                        <ExpandIcon expanded={isExpanded} />
                    </button>
                )}
            </div>

            {/* Отображаем доп. инфо, только если есть данные персонажа */}
            {characterData && (
                <div style={styles.detailsContainer}>
                    {/* Статус действий */}
                    <div style={styles.actionStatusRow}>
                         <div title="Действие"><MainActionIcon available={mainActionAvailable} /></div>
                         <div title="Бонус"><BonusActionIcon available={bonusActionAvailable} /></div>
                         <div title="Реакция"><ReactionIcon available={reactionAvailable} /></div>
                    </div>

                    {/* Активные слоты */}
                    <div style={styles.abilitySlotsRow}>
                        {activeSlots.map((slot, index) => (
                            <AbilitySlotDisplay
                                key={`lobby-slot-${charId}-${index + 1}`}
                                slotData={slot} // Передаем { ability, cooldown_remaining, cooldown_total }
                                slotNumber={index + 1}
                                isAssignableSlot={true} // Это всегда назначаемые слоты здесь
                                characterId={charId}
                                // Функции управления слотами здесь не нужны, они на странице персонажа
                                onAssignClick={null}
                                onClearClick={null}
                                handleApiAction={null} // Активация тоже не отсюда
                                // Передаем только статус действий для отображения блокировки
                                mainActionAvailable={mainActionAvailable}
                                bonusActionAvailable={bonusActionAvailable}
                                reactionAvailable={reactionAvailable}
                            />
                        ))}
                    </div>

                    {/* Статус эффекты (опционально, можно иконки или счетчик) */}
                    {statusEffects.length > 0 && (
                        <div style={styles.statusEffectsRow} title={statusEffects.map(e => e.name).join(', ')}>
                            <StatusEffectIcon />
                            <span>x{statusEffects.length}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Стили
const styles = {
     playerCard: {
         display: 'flex', flexDirection: 'column', // Теперь в столбик
         gap: '10px', // Отступ между хедером и деталями
         padding: '12px 16px', borderRadius: '10px', // Скругление побольше
         background: 'rgba(255, 255, 255, 0.05)',
         boxShadow: 'inset 0 0 5px rgba(0,0,0,0.3)',
         transition: 'opacity 0.3s ease-in-out, background 0.3s ease', // Плавные переходы
         border: `1px solid ${theme.colors.surfaceVariant}55`, // Легкая рамка
     },
     cardHeader: { // Контейнер для иконки, имени и кнопки разворота
         display: 'flex', alignItems: 'center', gap: '10px',
     },
     playerIndicator: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, boxShadow: '0 0 5px rgba(255,255,255,0.4)', },
     playerName: { fontSize: '0.95rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: theme.colors.text, flexGrow: 1 }, // Занимает доступное место
     expandButton: { // Кнопка разворота
         background: 'transparent', border: 'none', color: theme.colors.textSecondary,
         padding: '4px', borderRadius: '50%', cursor: 'pointer', display: 'flex',
         alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
         ':hover': { background: 'rgba(255,255,255,0.1)' }
     },
     expandIcon: { width: '18px', height: '18px', fill: 'currentColor' },
     detailsContainer: { // Контейнер для доп. информации
         display: 'flex', flexDirection: 'column', gap: '10px',
         paddingTop: '10px', borderTop: `1px solid ${theme.colors.surfaceVariant}55`, // Разделитель
     },
     actionStatusRow: { // Ряд для иконок действий
         display: 'flex', justifyContent: 'center', gap: '15px',
     },
     actionIcon: { width: '18px', height: '18px' }, // Размер иконок действий
     abilitySlotsRow: { // Ряд для слотов способностей
         display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', // Уменьшили gap
         // Уменьшаем размер слотов внутри карточки
         '--slot-size': '55px', // CSS переменная для размера
         '--slot-font-size': '0.6rem', // Уменьшаем шрифт имени
         '--cooldown-font-size': '1.1rem', // Уменьшаем шрифт КД
         '--cooldown-icon-size': '14px', // Уменьшаем иконку КД
     },
     statusEffectsRow: { // Ряд для статус эффектов
         display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px',
         fontSize: '0.8rem', color: theme.colors.textSecondary,
         marginTop: '5px',
     },
     statusIcon: { width: '14px', height: '14px', fill: 'currentColor', opacity: 0.7 },
};

export default PlayerCard;

// Добавим стили для уменьшенных слотов в PlayerCard
// Это нужно добавить в глобальные стили или использовать CSS-in-JS библиотеку,
// которая поддерживает стилизацию дочерних компонентов по CSS переменным.
// Пример CSS (если AbilitySlotDisplay поддерживает классы):
/*
.player-card-slot-wrapper .ability-slot-container {
    width: var(--slot-size, 75px);
    height: var(--slot-size, 75px);
}
.player-card-slot-wrapper .ability-name {
    font-size: var(--slot-font-size, 0.75rem);
}
.player-card-slot-wrapper .cooldownSvgText {
     font-size: var(--cooldown-font-size, 1.6rem);
}
.player-card-slot-wrapper .cooldownIcon {
     width: var(--cooldown-icon-size, 20px);
     height: var(--cooldown-icon-size, 20px);
}
*/
// В JSX для AbilitySlotDisplay нужно будет добавить className="player-card-slot-wrapper"
// или передавать стили через пропсы, если используете CSS-in-JS без классов.

