// frontend/src/features/CharacterDetail/modals/AbilitySelectionModal.js
import React, { useState, useMemo } from 'react';
import { theme } from '../../../styles/theme';
// Можно импортировать AbilityCardBrief, если хотим более детальное отображение,
// но для простоты выбора сделаем свой рендеринг
// import AbilityCardBrief from '../components/AbilityCardBrief';

// Иконки
const SearchIcon = () => (<svg style={styles.searchIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>);
const BranchIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 6.4a1.5 1.5 0 0 0-2.12 0L12 11.88 6.52 6.4a1.5 1.5 0 0 0-2.12 2.12L9.88 14l-5.48 5.48a1.5 1.5 0 0 0 2.12 2.12L12 16.12l5.48 5.48a1.5 1.5 0 0 0 2.12-2.12L14.12 14l5.48-5.48a1.5 1.5 0 0 0 0-2.12z"/></svg> );
const LevelIcon = () => ( <svg style={styles.detailTagIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> );


const AbilitySelectionModal = ({
    character,         // Персонаж для получения available_abilities и current slots
    targetSlotNumber,  // Номер слота, куда назначаем
    onClose,
    onSelectAbility    // Функция обратного вызова (abilityId) => void
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Получаем ID способностей, уже назначенных в ДРУГИЕ слоты
    const currentlySlottedIds = useMemo(() => {
        const ids = new Set();
        if (!character) return ids;
        for (let i = 1; i <= 5; i++) {
            // Исключаем слот, для которого открыта модалка
            if (i === targetSlotNumber) continue;
            const ability = character[`active_slot_${i}`]?.ability;
            if (ability) {
                ids.add(ability.id);
            }
        }
        return ids;
    }, [character, targetSlotNumber]);

    // Фильтруем доступные способности
    const assignableAbilities = useMemo(() => {
        if (!character?.available_abilities) return [];

        return character.available_abilities
            .filter(ability =>
                ability && // Способность существует
                ability.action_type?.toLowerCase() !== 'пассивно' && // Не пассивная
                !currentlySlottedIds.has(ability.id) && // Не занята в другом слоте
                ability.name.toLowerCase().includes(searchTerm.toLowerCase()) // Удовлетворяет поиску
            )
            .sort((a, b) => { // Сортировка по ветке и уровню
                 if (a.branch !== b.branch) return (a.branch || '').localeCompare(b.branch || '');
                 return (a.level_required || 0) - (b.level_required || 0);
            });
    }, [character?.available_abilities, currentlySlottedIds, searchTerm]);

    // Анимация
    const animationStyle = `
        @keyframes fadeInBlur { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(5px); } }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;

    return (
         <>
            <style>{animationStyle}</style>
            <div style={styles.overlay} onClick={onClose}>
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <h2 style={styles.title}>Назначить способность в Слот {targetSlotNumber}</h2>
                    <button onClick={onClose} style={styles.closeButton} title="Закрыть">×</button>

                    {/* Поиск */}
                    <div style={styles.searchContainer}>
                         <SearchIcon />
                         <input
                            type="text"
                            placeholder="Поиск по названию..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                         />
                    </div>

                     {/* Контейнер со списком */}
                     <div style={styles.listContainer}>
                        {assignableAbilities.length > 0 ? (
                            assignableAbilities.map(ability => (
                                <div
                                    key={ability.id}
                                    onClick={() => onSelectAbility(ability.id)} // Вызываем коллбэк при клике
                                    style={styles.listItem}
                                    title={`Выбрать: ${ability.name}`}
                                >
                                    <div style={styles.itemInfo}>
                                        <span style={styles.itemName}>{ability.name}</span>
                                        <div style={styles.itemTags}>
                                            <span style={styles.detailTag}><BranchIcon /> {ability.branch}</span>
                                            <span style={styles.detailTag}><LevelIcon /> {ability.level_required} ур.</span>
                                        </div>
                                    </div>
                                    {/* Можно добавить иконку "выбрать" */}
                                     <span style={styles.selectIndicator}>➔</span>
                                </div>
                            ))
                        ) : (
                            <p style={styles.infoText}>Нет доступных способностей для назначения.</p>
                        )}
                     </div>

                    {/* Кнопка Отмены */}
                    <div style={styles.buttonGroup}>
                        <button type="button" onClick={onClose} style={styles.cancelButton}>Отмена</button>
                    </div>
                </div>
            </div>
        </>
    );
};

// Стили (похожи на AddStatusModal, но адаптированы)
const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1060, // Выше других модалок
        animation: 'fadeInBlur 0.3s ease-out forwards', opacity: 0,
        backdropFilter: 'blur(5px)',
    },
    modal: {
        background: theme.colors.surface, padding: '30px', borderRadius: '12px',
        width: '90%', maxWidth: '550px', // Размер как у AddStatusModal
        maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative',
        boxShadow: '0 5px 25px rgba(0,0,0,0.4)', color: theme.colors.text,
        border: `1px solid ${theme.colors.surfaceVariant}`,
        animation: 'scaleUp 0.3s ease-out forwards', transform: 'scale(0.9)', opacity: 0,
    },
    title: {
        textAlign: 'center', marginBottom: '20px', color: theme.colors.primary,
        fontSize: '1.3rem', fontWeight: '600', borderBottom: `1px solid ${theme.colors.surfaceVariant}`,
        paddingBottom: '15px',
    },
    closeButton: {
        position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none',
        color: theme.colors.textSecondary, fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1,
        padding: '0 5px', transition: 'color 0.2s', ':hover': { color: theme.colors.primary }
    },
    searchContainer: {
        position: 'relative',
        marginBottom: '15px',
    },
    searchIcon: {
        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
        width: '18px', height: '18px', fill: theme.colors.textSecondary, opacity: 0.7,
    },
    searchInput: {
        width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px',
        border: `1px solid ${theme.colors.surfaceVariant}`, background: theme.colors.background,
        color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ':focus': {
            borderColor: theme.colors.primary,
            boxShadow: `0 0 0 2px ${theme.colors.primary}44`,
            outline: 'none',
        },
    },
     listContainer: {
        flexGrow: 1, overflowY: 'auto', border: `1px solid ${theme.colors.surfaceVariant}`,
        borderRadius: '8px', padding: '10px', marginBottom: '20px', minHeight: '250px', // Немного выше
        background: theme.colors.background,
        '::-webkit-scrollbar': { width: '8px' },
        '::-webkit-scrollbar-track': { background: theme.colors.surface, borderRadius: '4px' },
        '::-webkit-scrollbar-thumb': { background: theme.colors.surfaceVariant, borderRadius: '4px' },
        '::-webkit-scrollbar-thumb:hover': { background: theme.colors.textSecondary }
    },
    listItem: { // Стиль элемента списка
        display: 'flex',
        justifyContent: 'space-between', // Имя слева, индикатор справа
        alignItems: 'center',
        padding: '12px 15px',
        borderRadius: '6px',
        cursor: 'pointer',
        marginBottom: '8px',
        border: '1px solid transparent',
        borderLeft: `3px solid ${theme.colors.surfaceVariant}`,
        transition: 'all 0.2s ease-in-out',
        background: 'transparent',
        ':hover': {
             background: `${theme.colors.secondary}15`, // Используем secondary для выбора
             borderLeftColor: theme.colors.secondary
        }
    },
     itemInfo: { // Контейнер для имени и тегов
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        overflow: 'hidden', // Чтобы текст обрезался
     },
    itemName: { // Имя способности
        fontWeight: '500',
        color: theme.colors.text,
        fontSize: '0.95rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    itemTags: { // Контейнер для тегов (ветка, уровень)
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
    },
     detailTag: { // Стиль тега (как в AbilityDetailModal)
        display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem',
        background: 'rgba(255,255,255,0.08)', color: theme.colors.textSecondary,
        padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
        whiteSpace: 'nowrap'
    },
    detailTagIcon: {
        width: '14px', height: '14px', fill: 'currentColor',
        flexShrink: 0, opacity: 0.8
    },
    selectIndicator: { // Стрелка справа
        fontSize: '1.5rem',
        color: theme.colors.secondary,
        marginLeft: '15px',
        opacity: 0, // Скрыта по умолчанию
        transition: 'opacity 0.2s ease-in-out',
        '$listItem:hover &': { // Показывается при наведении на listItem (может требовать styled-components или CSS Modules)
            opacity: 1,
        },
         // Добавим стиль через CSS-in-JS workaround
         '@media (hover: hover)': {
            selectors: {
                '&:hover': { // Этот селектор вряд ли сработает как надо без доп. библиотек
                   // Но можно добавить стиль для hover самого listItem через JS, если нужно
                }
            }
         }
    },
    infoText: { textAlign: 'center', color: theme.colors.textSecondary, fontStyle: 'italic', padding: '20px 0' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${theme.colors.surfaceVariant}` },
    cancelButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, fontWeight: '500', fontSize: '0.9rem', ':hover': { opacity: 1 } },
    // Кнопка подтверждения здесь не нужна, выбор происходит кликом по элементу
};


export default AbilitySelectionModal;