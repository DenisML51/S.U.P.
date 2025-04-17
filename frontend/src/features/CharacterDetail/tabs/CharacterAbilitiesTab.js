// src/features/CharacterDetail/tabs/CharacterAbilitiesTab.js
import React, { useState, useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Обновленный путь
import AbilityCardDetailed from '../components/AbilityCardDetailed'; // Импорт карточки

const CharacterAbilitiesTab = ({ character, allAbilities, onAbilityClick, apiActionError }) => {
    const [subTab, setSubTab] = useState('learned'); // 'learned', 'weapon', 'all'

    const learnedAbilities = character?.available_abilities || [];
    const weaponAbilities = useMemo(() => {
        const abilities = new Map(); // Используем Map для уникальности по ID
        [character?.equipped_weapon1, character?.equipped_weapon2].forEach(wInvItem => {
            if (wInvItem?.item?.item_type === 'weapon' && wInvItem.item.granted_abilities) {
                wInvItem.item.granted_abilities.forEach(ab => {
                    if (!abilities.has(ab.id)) { // Добавляем только если еще нет
                        abilities.set(ab.id, ab);
                    }
                });
            }
        });
        return Array.from(abilities.values());
    }, [character?.equipped_weapon1, character?.equipped_weapon2]);

    // Фильтруем способности для вкладки 'all'
    const allRelevantAbilities = useMemo(() => {
         // Показываем только способности из веток + полученные от оружия
         const learnedIds = new Set(learnedAbilities.map(a => a.id));
         const weaponIds = new Set(weaponAbilities.map(a => a.id));
         return allAbilities.filter(a =>
             (a.branch !== 'weapon' && a.branch !== 'general') || // Включаем все способности веток
             weaponIds.has(a.id) // Включаем способности, полученные от оружия
             // Можно добавить сюда способности "general"
         ).sort((a, b) => { // Сортировка для вкладки 'all'
             const aLearned = learnedIds.has(a.id);
             const bLearned = learnedIds.has(b.id);
             if (aLearned !== bLearned) return aLearned ? -1 : 1; // Изученные сначала
             if (a.branch !== b.branch) return a.branch.localeCompare(b.branch); // По ветке
             return a.level_required - b.level_required; // По уровню
         });
     }, [allAbilities, learnedAbilities, weaponAbilities]);

    const currentAbilities = subTab === 'learned' ? learnedAbilities
                            : subTab === 'weapon' ? weaponAbilities
                            : allRelevantAbilities; // Используем отфильтрованный список для 'all'

    // Фильтруем actionError
     const relevantError = typeof apiActionError === 'string' && apiActionError && apiActionError.includes('способност') ? apiActionError : null;

    return (
        <div style={styles.tabContent}>
            <div style={styles.subTabHeader}>
                 <div style={styles.subTabButtons}>
                    <button onClick={() => setSubTab('learned')} style={subTab === 'learned' ? styles.subTabButtonActive : styles.subTabButton}>Изученные ({learnedAbilities.length})</button>
                    <button onClick={() => setSubTab('weapon')} style={subTab === 'weapon' ? styles.subTabButtonActive : styles.subTabButton}>От Оружия ({weaponAbilities.length})</button>
                    <button onClick={() => setSubTab('all')} style={subTab === 'all' ? styles.subTabButtonActive : styles.subTabButton}>Все</button>
                 </div>
                 <h4 style={styles.tabTitle}>Способности</h4>
            </div>
             {relevantError && <p style={styles.apiActionErrorStyle}>{relevantError}</p>}


            {currentAbilities.length > 0 ? (
                <div style={styles.abilitiesGrid}>
                    {currentAbilities.map(ability => (
                         // Передаем character для проверки требований прямо в карточку
                        <AbilityCardDetailed
                            key={ability.id}
                            ability={ability}
                            character={character}
                            onClick={onAbilityClick} // Передаем обработчик для открытия модалки
                        />
                    ))}
                </div>
            ) : (
                <p style={styles.placeholderText}>
                    {subTab === 'learned' ? "Нет изученных способностей." :
                     subTab === 'weapon' ? "Нет способностей от экипированного оружия." :
                     "Способности не найдены."}
                </p>
            )}
        </div>
    );
};

// Стили
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out' },
    subTabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: `1px solid ${theme.colors.surface}66`, paddingBottom: '10px' },
    tabTitle: { margin: 0, color: theme.colors.primary, fontSize: '1.1rem', order: 2 }, // Сдвигаем заголовок вправо
    subTabButtons: { display: 'flex', gap: '8px', order: 1 }, // Кнопки слева
    subTabButton: { padding: '6px 12px', background: 'transparent', color: theme.colors.textSecondary, border: `1px solid ${theme.colors.surface}66`, borderRadius: '6px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.85rem', ':hover': { background: `${theme.colors.secondary}33`, color: theme.colors.secondary, borderColor: `${theme.colors.secondary}66` } },
    subTabButtonActive: { padding: '6px 12px', background: theme.colors.secondary, color: theme.colors.background, border: `1px solid ${theme.colors.secondary}`, borderRadius: '6px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.85rem', fontWeight: 'bold' },
    abilitiesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', marginTop: '10px' },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '30px' },
    apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' },
    // Стили для AbilityCardDetailed находятся в его файле
};

export default CharacterAbilitiesTab;