// src/features/CharacterDetail/tabs/CharacterBranchesTab.js
import React, { useState, useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Обновленный путь
import AbilityCardDetailed from '../components/AbilityCardDetailed'; // Импорт карточки

const ALL_BRANCHES = [ // Повторяем определение или импортируем
    { key: 'medic', name: 'Медик' }, { key: 'mutant', name: 'Мутант' },
    { key: 'sharpshooter', name: 'Стрелок' }, { key: 'scout', name: 'Разведчик' },
    { key: 'technician', name: 'Техник' }, { key: 'fighter', name: 'Боец' },
    { key: 'juggernaut', name: 'Джаггернаут' }
];


const CharacterBranchesTab = ({ character, allAbilities, onAbilityClick, apiActionError }) => {
    const [selectedBranch, setSelectedBranch] = useState(null); // Храним ключ выбранной ветки

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
            <div style={styles.layout}>
                {/* Левая колонка: Список веток */}
                <div style={styles.branchListContainer}>
                    <h4 style={styles.listTitle}>Ветки Классов</h4>
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

                {/* Правая колонка: Способности выбранной ветки */}
                <div style={styles.branchDetailsContainer}>
                    <h4 style={styles.detailsTitle}>
                        {selectedBranch ? `Способности ветки "${ALL_BRANCHES.find(b => b.key === selectedBranch)?.name}"` : "Выберите ветку"}
                    </h4>
                    {relevantError && <p style={styles.apiActionErrorStyle}>{relevantError}</p>}

                    {selectedBranch && branchAbilities.length > 0 ? (
                        <div style={styles.abilitiesGrid}>
                            {branchAbilities.map(ability => (
                                <AbilityCardDetailed
                                    key={ability.id}
                                    ability={ability}
                                    character={character}
                                    onClick={onAbilityClick}
                                />
                            ))}
                        </div>
                    ) : selectedBranch ? (
                        <p style={styles.placeholderText}>Нет способностей для этой ветки.</p>
                    ) : (
                         <p style={styles.placeholderText}>Выберите ветку слева для просмотра способностей.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Стили
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out' },
    layout: { display: 'flex', gap: '20px', flexDirection: 'column', '@media (min-width: 768px)': { flexDirection: 'row' } }, // Адаптивность
    branchListContainer: { flex: '0 0 200px', borderRight: `1px solid ${theme.colors.surface}66`, paddingRight: '20px', '@media (max-width: 767px)': { borderRight: 'none', paddingRight: 0, borderBottom: `1px solid ${theme.colors.surface}66`, paddingBottom: '15px', marginBottom: '15px' } },
    listTitle: { margin: '0 0 15px 0', color: theme.colors.primary, fontSize: '1.1rem' },
    branchListItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: '6px', textAlign: 'left', cursor: 'pointer', transition: theme.transitions.default, color: theme.colors.textSecondary, borderLeft: '3px solid transparent', marginBottom: '5px', ':hover': { background: `${theme.colors.secondary}22`, color: theme.colors.secondary }, },
    branchListItemActive: { background: `${theme.colors.secondary}33`, color: theme.colors.secondary, fontWeight: 'bold', borderLeftColor: theme.colors.secondary },
    branchItemName: { fontSize: '0.9rem' },
    branchItemLevel: { fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' },
    branchDetailsContainer: { flexGrow: 1 },
    detailsTitle: { margin: '0 0 15px 0', color: theme.colors.primary, fontSize: '1.1rem' },
    abilitiesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '30px' },
    apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' },
    // Стили для AbilityCardDetailed в его файле
};

export default CharacterBranchesTab;