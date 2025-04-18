// src/features/CharacterDetail/tabs/CharacterBranchesTab.js
import React, { useState, useMemo } from 'react';
import { theme } from '../../../styles/theme';
// Импортируем НОВЫЙ компонент краткой карточки
import AbilityCardBrief from '../components/AbilityCardBrief';
// AbilityCardDetailed больше не используется здесь напрямую

const ALL_BRANCHES = [
    { key: 'medic', name: 'Медик' }, { key: 'mutant', name: 'Мутант' },
    { key: 'sharpshooter', name: 'Стрелок' }, { key: 'scout', name: 'Разведчик' },
    { key: 'technician', name: 'Техник' }, { key: 'fighter', name: 'Боец' },
    { key: 'juggernaut', name: 'Джаггернаут' }
];

const CharacterBranchesTab = ({ character, allAbilities, onAbilityClick, apiActionError }) => {
    const [selectedBranch, setSelectedBranch] = useState(null); // Ключ выбранной ветки

    // Получаем способности для выбранной ветки
    const branchAbilities = useMemo(() => {
        if (!selectedBranch) return [];
        return allAbilities
            .filter(ab => ab.branch === selectedBranch)
            .sort((a, b) => a.level_required - b.level_required); // Сортируем по уровню
    }, [selectedBranch, allAbilities]);

    // Фильтруем ошибку
    const relevantError = typeof apiActionError === 'string' && apiActionError && apiActionError.includes('веток') ? apiActionError : null;

    return (
        <div style={styles.tabContent}>
            {/* --- НОВЫЙ МАКЕТ: Две колонки --- */}
            <div style={styles.layout}>

                {/* == Левая Колонка: Список веток == */}
                <div style={styles.branchListContainer}>
                    <h4 style={styles.listTitle}>Ветки Классов</h4>
                    <div style={styles.branchListInner}> {/* Добавлен внутренний контейнер для прокрутки */}
                        {ALL_BRANCHES.map(branch => {
                            const levelKey = `${branch.key}_branch_level`;
                            const currentLevel = character?.[levelKey] ?? 0;
                            const isActive = selectedBranch === branch.key;
                            return (
                                <button
                                    key={branch.key}
                                    onClick={() => setSelectedBranch(branch.key)}
                                    style={{
                                        ...styles.branchListItem,
                                        ...(isActive ? styles.branchListItemActive : {})
                                    }}
                                >
                                    <span style={styles.branchItemName}>{branch.name}</span>
                                    <span style={styles.branchItemLevel}>{currentLevel} ур.</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* == Правая Колонка: Способности выбранной ветки == */}
                <div style={styles.branchDetailsContainer}>
                    <h4 style={styles.detailsTitle}>
                        {selectedBranch ? `Способности ветки "${ALL_BRANCHES.find(b => b.key === selectedBranch)?.name}"` : "Выберите ветку"}
                    </h4>
                    {relevantError && <p style={styles.apiActionErrorStyle}>{relevantError}</p>}

                    {/* Контейнер для способностей с прокруткой */}
                    <div style={styles.abilitiesListContainer}>
                        {selectedBranch && branchAbilities.length > 0 ? (
                            // Используем AbilityCardBrief вместо AbilityCardDetailed
                            branchAbilities.map(ability => (
                                <AbilityCardBrief
                                    key={ability.id}
                                    ability={ability}
                                    character={character}
                                    onClick={onAbilityClick} // Передаем колбэк для открытия модалки
                                />
                            ))
                        ) : selectedBranch ? (
                            <p style={styles.placeholderText}>Нет способностей для этой ветки.</p>
                        ) : (
                            <p style={styles.placeholderText}>Выберите ветку слева для просмотра способностей.</p>
                        )}
                    </div>
                </div>
            </div>
            {/* --- КОНЕЦ НОВОГО МАКЕТА --- */}
        </div>
    );
};

// Обновленные стили
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out', height: '100%', display: 'flex', flexDirection: 'column' }, // Занимаем всю высоту
    layout: {
        display: 'flex',
        gap: '20px',
        flexDirection: 'row', // Колонки по умолчанию
        flexGrow: 1, // Занимаем доступное пространство
        overflow: 'hidden', // Предотвращаем выход контента за пределы
        '@media (max-width: 768px)': { // Адаптивность: стек на маленьких экранах
             flexDirection: 'column',
             overflow: 'visible', // Убираем скрытие overflow на мобильных
        }
    },
    branchListContainer: {
        flex: '0 0 220px', // Фиксированная ширина левой колонки
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Скрываем overflow для контейнера
        borderRight: `1px solid ${theme.colors.surface}66`,
        paddingRight: '10px', // Небольшой отступ справа
        '@media (max-width: 767px)': {
             flex: 'none', // Убираем flex-basis
             borderRight: 'none',
             paddingRight: 0,
             borderBottom: `1px solid ${theme.colors.surface}66`,
             paddingBottom: '15px',
             marginBottom: '15px',
             maxHeight: '250px', // Ограничиваем высоту списка на мобильных
             overflowY: 'auto', // Добавляем прокрутку для списка
        }
    },
    listTitle: { margin: '0 0 10px 0', color: theme.colors.primary, fontSize: '1.1rem', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surface}66`, flexShrink: 0 },
    branchListInner: { // Внутренний контейнер для прокрутки списка веток
        overflowY: 'auto',
        flexGrow: 1,
        paddingRight: '10px', // Отступ для скроллбара
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.colors.primary} ${theme.colors.surface}`
    },
    branchListItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: '6px', textAlign: 'left', cursor: 'pointer', transition: theme.transitions.default, color: theme.colors.textSecondary, borderLeft: '3px solid transparent', marginBottom: '5px', ':hover': { background: `${theme.colors.secondary}22`, color: theme.colors.secondary }, },
    branchListItemActive: { background: `${theme.colors.secondary}33`, color: theme.colors.secondary, fontWeight: 'bold', borderLeftColor: theme.colors.secondary },
    branchItemName: { fontSize: '0.9rem' },
    branchItemLevel: { fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' },
    branchDetailsContainer: {
        flexGrow: 1, // Занимает оставшееся место
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Скрываем overflow для контейнера
    },
    detailsTitle: { margin: '0 0 15px 0', color: theme.colors.primary, fontSize: '1.1rem', flexShrink: 0 },
    abilitiesListContainer: { // Контейнер для списка способностей
        flexGrow: 1,
        overflowY: 'auto', // Добавляем прокрутку для списка способностей
        paddingRight: '10px', // Отступ для скроллбара
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.colors.primary} ${theme.colors.surface}`
    },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '30px' },
    apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' },
    // Стили для AbilityCardBrief находятся в его файле
};

export default CharacterBranchesTab;