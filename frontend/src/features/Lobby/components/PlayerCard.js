// src/features/Lobby/components/PlayerCard.js
import React from 'react';
import { theme } from '../../../styles/theme';
import AbilitySlotDisplay from '../../CharacterDetail/components/AbilitySlotDisplay'; // Используем наш улучшенный слот

// Иконки действий и статусов
const MainActionIcon = ({ available }) => ( <svg style={{...styles.actionIcon, color: available ? theme.colors.primary : theme.colors.textSecondary + '99'}} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg> );
const BonusActionIcon = ({ available }) => ( <svg style={{...styles.actionIcon, color: available ? theme.colors.secondary : theme.colors.textSecondary + '99'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg> );
const ReactionIcon = ({ available }) => ( <svg style={{...styles.actionIcon, color: available ? theme.colors.warning : theme.colors.textSecondary + '99'}} viewBox="0 0 24 24" fill="currentColor"><path d="M13 6V3h-2v3H8l4 4 4-4h-3zm4.6 8.17l-4-4-4 4H3v2h18v-2h-2.4z"/></svg> );
const StatusEffectIcon = () => (<svg style={styles.statusIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>);
const ExpandIcon = ({ expanded }) => (
    <svg style={styles.expandIcon} viewBox="0 0 24 24" fill="currentColor">
        {expanded ? <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/> : <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>}
    </svg>
);

const PlayerCard = ({
    playerInfo,     // { username, character_id } или null
    characterData,  // CharacterDetailedOut или null (данные приходят из participantDetails)
    isMaster = false,
    isExpanded,
    onToggleExpand,
    isMyCard
}) => {
    const isPlaceholder = !playerInfo && !isMaster;
    const name = isMaster ? `${playerInfo?.username || '??'} (Мастер)` : (playerInfo?.username || "Свободный слот");
    const charId = playerInfo?.character_id;

    // Определяем стиль и доступность
    const indicatorColor = isMaster ? theme.colors.primary : (playerInfo ? theme.colors.secondary : theme.colors.textSecondary);
    const opacity = isPlaceholder ? 0.5 : 1;
    // Развернуть можно себя или если ты мастер И есть данные персонажа
    const canExpand = (isMyCard || isMaster) && !!characterData;

    // --- ИЗВЛЕКАЕМ АКТУАЛЬНЫЕ ДАННЫЕ из characterData ---
    const activeSlots = characterData ? [
        characterData.active_slot_1, characterData.active_slot_2, characterData.active_slot_3,
        characterData.active_slot_4, characterData.active_slot_5
    ] : Array(5).fill(null); // Массив из 5 элементов (данные слота или null)

    const mainActionAvailable = characterData ? !characterData.has_used_main_action : true;
    const bonusActionAvailable = characterData ? !characterData.has_used_bonus_action : true;
    const reactionAvailable = characterData ? !characterData.has_used_reaction : true;

    // Фильтруем ПУ-эмоции для отображения только иконки/счетчика
    const statusEffects = characterData?.active_status_effects?.filter(e => !e.name?.startsWith('ПУ:')) || [];
    // --- КОНЕЦ ИЗВЛЕЧЕНИЯ ---

    const handleExpandClick = (e) => {
        e.stopPropagation();
        if (canExpand && onToggleExpand && charId) { // Убедимся, что charId есть
            onToggleExpand(charId);
        }
    };

    return (
        <div style={{
            ...styles.playerCard,
            opacity: opacity,
            background: isExpanded ? theme.colors.surfaceVariant + '55' : 'rgba(255, 255, 255, 0.05)',
            // Добавляем рамку, если это моя карточка
            border: isMyCard ? `2px solid ${theme.colors.secondary}` : `1px solid ${theme.colors.surfaceVariant}55`,
            padding: isMyCard ? '11px 15px' : '12px 16px' // Компенсируем толщину рамки
        }}>
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
                         <div title={`Действие ${mainActionAvailable ? '✓' : '✗'}`}><MainActionIcon available={mainActionAvailable} /></div>
                         <div title={`Бонус ${bonusActionAvailable ? '✓' : '✗'}`}><BonusActionIcon available={bonusActionAvailable} /></div>
                         <div title={`Реакция ${reactionAvailable ? '✓' : '✗'}`}><ReactionIcon available={reactionAvailable} /></div>
                    </div>

                    {/* Активные слоты */}
                    <div style={styles.abilitySlotsRow}>
                        {activeSlots.map((slotData, index) => (
                            <AbilitySlotDisplay
                                key={`lobby-slot-${charId}-${index + 1}`}
                                slotData={slotData} // Передаем данные слота { ability, cooldown_remaining, cooldown_total }
                                slotNumber={index + 1}
                                isAssignableSlot={true}
                                characterId={charId}
                                // Функции управления слотами здесь не нужны
                                onAssignClick={null}
                                onClearClick={null}
                                handleApiAction={null} // Активация тоже не отсюда
                                // Передаем статус действий для отображения блокировки
                                mainActionAvailable={mainActionAvailable}
                                bonusActionAvailable={bonusActionAvailable}
                                reactionAvailable={reactionAvailable}
                            />
                        ))}
                    </div>

                    {/* Статус эффекты */}
                    {statusEffects.length > 0 && (
                        <div style={styles.statusEffectsRow} title={statusEffects.map(e => e.name).join(', ')}>
                            <StatusEffectIcon />
                            <span>x{statusEffects.length}</span>
                        </div>
                    )}
                </div>
            )}
            {/* Если это плейсхолдер, показываем сообщение */}
            {isPlaceholder && (
                <div style={styles.placeholderText}>Свободный слот</div>
            )}
        </div>
    );
};

// Стили
const styles = {
     playerCard: {
         display: 'flex', flexDirection: 'column', gap: '10px',
         padding: '12px 16px', borderRadius: '10px',
         background: 'rgba(255, 255, 255, 0.05)',
         boxShadow: 'inset 0 0 5px rgba(0,0,0,0.3)',
         transition: 'opacity 0.3s ease-in-out, background 0.3s ease',
         border: `1px solid ${theme.colors.surfaceVariant}55`,
         minHeight: '100px', // Минимальная высота для консистентности
     },
     cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', },
     playerIndicator: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, boxShadow: '0 0 5px rgba(255,255,255,0.4)', },
     playerName: { fontSize: '0.95rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: theme.colors.text, flexGrow: 1 },
     expandButton: { background: 'transparent', border: 'none', color: theme.colors.textSecondary, padding: '4px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.1)' } },
     expandIcon: { width: '18px', height: '18px', fill: 'currentColor' },
     detailsContainer: { display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.surfaceVariant}55`, },
     actionStatusRow: { display: 'flex', justifyContent: 'center', gap: '15px', },
     actionIcon: { width: '18px', height: '18px' },
     abilitySlotsRow: {
         display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap',
         // Уменьшаем размер слотов внутри карточки с помощью CSS переменных
         // Эти переменные должны быть использованы в стилях AbilitySlotDisplay
         '--slot-size': '55px',
         '--slot-font-size': '0.6rem',
         '--cooldown-font-size': '1.1rem',
         '--cooldown-icon-size': '14px',
         // Добавляем стили для дочерних слотов через селектор, если нет CSS-in-JS
         // (Это может потребовать добавления класса к AbilitySlotDisplay)
         '& > div > div[class*="ability-slot-container"]': { // Пример селектора
             width: 'var(--slot-size)',
             height: 'var(--slot-size)',
         },
         '& > div .ability-name': { // Пример селектора
             fontSize: 'var(--slot-font-size)',
         },
         '& > div .cooldownSvgText': { // Пример селектора
             fontSize: 'var(--cooldown-font-size)',
         },
          '& > div .cooldownIcon': { // Пример селектора
             width: 'var(--cooldown-icon-size)',
             height: 'var(--cooldown-icon-size)',
         }
     },
     statusEffectsRow: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: theme.colors.textSecondary, marginTop: '5px', },
     statusIcon: { width: '14px', height: '14px', fill: 'currentColor', opacity: 0.7 },
     placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', fontSize: '0.9rem', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }
};

export default PlayerCard;
