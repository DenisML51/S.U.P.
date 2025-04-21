// src/features/CharacterDetail/tabs/CharacterAbilitiesTab.js
import React, { useState, useMemo } from 'react';
import { theme } from '../../../styles/theme'; // Обновленный путь
import AbilityCardDetailed from '../components/AbilityCardDetailed'; // Импорт карточки

const CharacterAbilitiesTab = ({ character, allAbilities, onAbilityClick, apiActionError, handleApiAction }) => {
    const [subTab, setSubTab] = useState('learned'); // 'learned', 'weapon', 'all'

    const learnedAbilities = character?.available_abilities || [];

    const weaponAbilities = useMemo(() => {
        const abilities = new Map(); // Используем Map для уникальности по ID
        [character?.equipped_weapon1, character?.equipped_weapon2].forEach(wInvItem => {
            if (wInvItem?.item?.item_type === 'weapon' && wInvItem.item.granted_abilities) {
                wInvItem.item.granted_abilities.forEach(ab => {
                    if (ab && !abilities.has(ab.id)) { // Добавляем проверку на существование ab
                        abilities.set(ab.id, ab);
                    }
                });
            }
        });
        return Array.from(abilities.values());
    }, [character?.equipped_weapon1, character?.equipped_weapon2]);

    // --- ДОБАВЛЕНО: Создаем Set ID способностей от оружия ---
    const weaponAbilityIdsSet = useMemo(() => new Set(weaponAbilities.map(ab => ab?.id).filter(id => id != null)), [weaponAbilities]);
    // -----------------------------------------------------

    // Фильтруем способности для вкладки 'all'
    const allRelevantAbilities = useMemo(() => {
        const learnedIds = new Set(learnedAbilities.map(a => a?.id).filter(id => id != null));
        // Используем уже созданный Set ID способностей от оружия
        // const weaponIds = new Set(weaponAbilities.map(a => a.id));
        return allAbilities.filter(a =>
            a && // Добавим проверку, что сама способность существует
            (
                (a.branch !== 'weapon' && a.branch !== 'general') || // Включаем все способности веток
                weaponAbilityIdsSet.has(a.id) // Включаем способности, полученные от оружия
                // Можно добавить сюда способности "general"
            )
        ).sort((a, b) => { // Сортировка для вкладки 'all'
            // Добавим проверки на null/undefined при сортировке
            if (!a || !b) return 0;
            const aLearned = learnedIds.has(a.id);
            const bLearned = learnedIds.has(b.id);
            if (aLearned !== bLearned) return aLearned ? -1 : 1; // Изученные сначала
            if (a.branch !== b.branch) return (a.branch || '').localeCompare(b.branch || ''); // По ветке
            return (a.level_required || 0) - (b.level_required || 0); // По уровню
        });
    }, [allAbilities, learnedAbilities, weaponAbilityIdsSet]); // Зависимость от weaponAbilityIdsSet

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
                        // Добавим проверку на null/undefined перед рендерингом карточки
                        ability ? (
                            <AbilityCardDetailed
                                key={ability.id}
                                ability={ability}
                                character={character}
                                onClick={onAbilityClick} // Для открытия модалки
                                handleApiAction={handleApiAction} // Для активации
                                // --- ДОБАВЛЕНО: Передаем Set ID способностей от оружия ---
                                weaponAbilityIds={weaponAbilityIdsSet}
                                // -------------------------------------------------------
                            />
                        ) : null
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

// Стили (без изменений)
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out' },
    subTabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: `1px solid ${theme.colors.surface}66`, paddingBottom: '10px' },
    tabTitle: { margin: 0, color: theme.colors.primary, fontSize: '1.1rem', order: 2 }, // Сдвигаем заголовок вправо
    subTabButtons: { display: 'flex', gap: '8px', order: 1 }, // Кнопки слева
    subTabButton: { padding: '6px 12px', background: 'transparent', color: theme.colors.textSecondary, border: `1px solid ${theme.colors.surface}66`, borderRadius: '6px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.85rem', ':hover': { background: `${theme.colors.secondary}33`, color: theme.colors.secondary, borderColor: `${theme.colors.secondary}66` } },
    subTabButtonActive: { padding: '6px 12px', background: theme.colors.secondary, color: theme.colors.background, border: `1px solid ${theme.colors.secondary}`, borderRadius: '6px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.85rem', fontWeight: 'bold' },
    abilitiesGrid: {
        marginTop: '10px',
        // Задаем максимальную высоту. Подбери значение под свой интерфейс!
        // Можно использовать vh (проценты от высоты окна) или фиксированные px.
        maxHeight: '850px', // Пример: высота окна минус ~300px на шапку, табы и отступы
        overflowY: 'auto',   // Включаем вертикальную прокрутку при необходимости
        overflowX: 'hidden', // Выключаем горизонтальную прокрутку
        paddingRight: '10px', // Отступ справа, чтобы контент не лез под скроллбар
        paddingLeft: '5px',   // Небольшой отступ слева для выравнивания
        // Дополнительно можно добавить небольшой отступ снизу
        paddingBottom: '10px',
    },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '30px' },
    apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' },
    // Стили для AbilityCardDetailed находятся в его файле
};

export default CharacterAbilitiesTab;

