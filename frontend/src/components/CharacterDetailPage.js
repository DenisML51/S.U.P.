import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as apiService from '../apiService';
import { theme } from '../theme';

// --- Вспомогательные компоненты секций ---

const Section = ({ title, children }) => (
    <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <div style={styles.sectionContent}>
            {children}
        </div>
    </section>
);

const StatDisplay = ({ label, value }) => (
    <div style={styles.statItem}>
        <span style={styles.statLabel}>{label}:</span>
        <span style={styles.statValue}>{value}</span>
    </div>
);

const SkillDisplay = ({ name, level, modifier }) => (
     <div style={styles.skillItemDetail}>
        <span style={styles.skillName}>{name}:</span>
        <span style={styles.skillLevel}>{level}</span>
        <span style={styles.skillModifier}>({modifier >= 0 ? `+${modifier}` : modifier})</span>
     </div>
);

// --- Основной Компонент ---

const CharacterDetailPage = () => {
    const { characterId } = useParams();
    const navigate = useNavigate();
    const [character, setCharacter] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCharacterData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await apiService.getCharacterDetails(characterId);
            setCharacter(res.data);
        } catch (err) {
            console.error("Failed to fetch character details", err);
            if (err.response && err.response.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
            } else if (err.response && err.response.status === 404) {
                setError("Персонаж не найден или не принадлежит вам.");
            } else {
                setError("Ошибка загрузки данных персонажа.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [characterId, navigate]);

    useEffect(() => {
        fetchCharacterData();
    }, [fetchCharacterData]);

    // TODO: Добавить функции для взаимодействия (экипировка, использование и т.д.)
    // const handleEquip = async (inventoryItemId, slot) => { ... }
    // const handleUnequip = async (slot) => { ... }

    if (isLoading) {
        return <div style={styles.loading}>Загрузка данных персонажа...</div>;
    }

    if (error) {
        return <div style={styles.error}>{error}</div>;
    }

    if (!character) {
        return <div style={styles.error}>Данные персонажа отсутствуют.</div>;
    }

    // Группируем навыки для удобства отображения
    const skillGroups = {
        'Физиология': ['strength', 'dexterity', 'endurance', 'reaction', 'technique', 'adaptation'],
        'Интеллект': ['logic', 'attention', 'erudition', 'culture', 'science', 'medicine'],
        'Ментальность': ['suggestion', 'insight', 'authority', 'self_control', 'religion', 'flow']
    };

    return (
        <div style={styles.pageContainer}>
            <div style={styles.header}>
                <h1 style={styles.characterName}>{character.name}</h1>
                <div style={styles.headerStats}>
                    <span>Уровень: {character.level}</span>
                    <span>Опыт: {character.experience_points}</span>
                </div>
                <button onClick={() => navigate('/')} style={styles.backButton}>Назад к списку</button>
            </div>

            <div style={styles.mainContent}>
                {/* Основные Статы */}
                <Section title="Основные Характеристики">
                    <div style={styles.statsGrid}>
                        <StatDisplay label="ПЗ (HP)" value={`${character.current_hp} / ${character.max_hp}`} />
                        <StatDisplay label="ПУ (WP)" value={`${character.current_pu} / ${character.base_pu}`} />
                        <StatDisplay label="ОС (SP)" value={character.stamina_points} />
                        <StatDisplay label="Истощение" value={character.exhaustion_level} />
                        <StatDisplay label="СЛ Защиты (AC)" value={character.total_ac} />
                        <StatDisplay label="Инициатива" value={character.initiative_bonus >= 0 ? `+${character.initiative_bonus}` : character.initiative_bonus} />
                         <StatDisplay label="Скорость" value={`${character.speed} м.`} />
                         <StatDisplay label="Пасс. Внимание" value={character.passive_attention} />
                    </div>
                </Section>

                 {/* Навыки */}
                <Section title="Навыки">
                     <div style={styles.skillsContainer}>
                         {Object.entries(skillGroups).map(([groupName, skillKeys]) => (
                             <div key={groupName} style={styles.skillGroup}>
                                 <h3 style={styles.skillGroupTitle}>{groupName}</h3>
                                 {skillKeys.map(key => (
                                     <SkillDisplay
                                         key={key}
                                         name={key}
                                         level={character[`skill_${key}`]}
                                         modifier={character.skill_modifiers[key]}
                                     />
                                 ))}
                             </div>
                         ))}
                     </div>
                </Section>

                {/* Экипировка */}
                 <Section title="Экипировка">
                      <div style={styles.equipmentGrid}>
                          <div style={styles.equipSlot}><strong>Броня:</strong> {character.equipped_armor?.item?.name || 'Нет'}</div>
                          <div style={styles.equipSlot}><strong>Щит:</strong> {character.equipped_shield?.item?.name || 'Нет'}</div>
                          <div style={styles.equipSlot}><strong>Оружие 1:</strong> {character.equipped_weapon1?.item?.name || 'Нет'}</div>
                          <div style={styles.equipSlot}><strong>Оружие 2:</strong> {character.equipped_weapon2?.item?.name || 'Нет'}</div>
                      </div>
                 </Section>

                 {/* Инвентарь */}
                 <Section title="Инвентарь">
                      {character.inventory.length > 0 ? (
                          <ul style={styles.inventoryList}>
                              {character.inventory.map(invItem => (
                                  <li key={invItem.id} style={styles.inventoryItem}>
                                      <span>{invItem.item.name} (x{invItem.quantity}) - {invItem.item.category} [{invItem.item.rarity}]</span>
                                      {/* TODO: Добавить кнопки Экипировать/Использовать/Выбросить */}
                                  </li>
                              ))}
                          </ul>
                      ) : (
                          <p style={styles.placeholderText}>Инвентарь пуст.</p>
                      )}
                 </Section>

                 {/* Способности */}
                  <Section title="Способности">
                      {character.available_abilities.length > 0 ? (
                          <ul style={styles.abilityList}>
                              {character.available_abilities.map(ability => (
                                  <li key={ability.id} style={styles.abilityItem}>
                                      <strong>{ability.name}</strong> ({ability.action_type}, КД: {ability.cooldown || 'Нет'})
                                      <p style={styles.abilityDesc}>{ability.description}</p>
                                      {/* TODO: Добавить детали (дальность, цель, эффекты) */}
                                  </li>
                              ))}
                          </ul>
                      ) : (
                           <p style={styles.placeholderText}>Нет доступных способностей.</p>
                      )}
                  </Section>

                  {/* Статус-Эффекты */}
                  <Section title="Активные Состояния">
                        {character.active_status_effects.length > 0 ? (
                           <ul style={styles.statusList}>
                                {character.active_status_effects.map(effect => (
                                    <li key={effect.id} style={styles.statusItem}>
                                        <strong>{effect.name}:</strong> {effect.description}
                                         {/* TODO: Добавить кнопку снять эффект */}
                                    </li>
                                ))}
                           </ul>
                        ) : (
                             <p style={styles.placeholderText}>Нет активных состояний.</p>
                        )}
                   </Section>

                    {/* Ветки Классов */}
                    <Section title="Ветки Классов">
                       <div style={styles.branchGrid}>
                           <StatDisplay label="Медик" value={character.medic_branch_level} />
                           <StatDisplay label="Мутант" value={character.mutant_branch_level} />
                           <StatDisplay label="Стрелок" value={character.sharpshooter_branch_level} />
                           <StatDisplay label="Разведчик" value={character.scout_branch_level} />
                           <StatDisplay label="Техник" value={character.technician_branch_level} />
                           <StatDisplay label="Боец" value={character.fighter_branch_level} />
                            <StatDisplay label="Джаггернаут" value={character.juggernaut_branch_level} />
                        </div>
                    </Section>

                    {/* Заметки */}
                    <Section title="Заметки">
                        <div style={styles.notesContainer}>
                           <div><strong>Внешность:</strong><p>{character.appearance_notes || '-'}</p></div>
                           <div><strong>Характер:</strong><p>{character.character_notes || '-'}</p></div>
                           <div><strong>Мотивация:</strong><p>{character.motivation_notes || '-'}</p></div>
                           <div><strong>Предыстория:</strong><p>{character.background_notes || '-'}</p></div>
                           {/* TODO: Добавить кнопку редактирования заметок */}
                        </div>
                    </Section>

            </div>
        </div>
    );
};


// Стили
const styles = {
    pageContainer: {
        minHeight: '100vh', background: theme.colors.background, color: theme.colors.text,
        padding: '40px 20px', boxSizing: 'border-box',
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '40px', padding: '20px', background: theme.effects.glass,
        backdropFilter: theme.effects.blur, borderRadius: '16px', boxShadow: theme.effects.shadow,
        maxWidth: '1400px', margin: '0 auto',
    },
    characterName: { margin: 0, color: theme.colors.primary, fontSize: '2rem' },
    headerStats: { display: 'flex', gap: '20px', color: theme.colors.textSecondary },
     backButton: {
        padding: '8px 16px', background: theme.colors.secondary, color: theme.colors.background,
        border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold'
    },
    mainContent: {
        maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px',
    },
    section: {
        background: theme.effects.glass, backdropFilter: theme.effects.blur,
        borderRadius: '16px', padding: '25px', boxShadow: theme.effects.shadow,
    },
    sectionTitle: {
        margin: '0 0 20px 0', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}`, paddingBottom: '10px',
    },
    sectionContent: {},
    statsGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px',
    },
    statItem: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${theme.colors.surface}` },
    statLabel: { color: theme.colors.textSecondary },
    statValue: { fontWeight: 'bold' },
    skillsContainer: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px',
    },
    skillGroup: {},
    skillGroupTitle: { margin: '0 0 10px 0', color: theme.colors.primary, fontSize: '1.1rem' },
    skillItemDetail: { display: 'flex', alignItems: 'center', padding: '4px 0', fontSize: '0.95rem', borderBottom: `1px dashed ${theme.colors.surface}` },
    skillName: { flexGrow: 1, textTransform: 'capitalize' },
    skillLevel: { fontWeight: 'bold', margin: '0 10px 0 5px' },
    skillModifier: { color: theme.colors.textSecondary, width: '30px', textAlign: 'right'},
    equipmentGrid: {
         display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px'
    },
    equipSlot: { padding: '8px', background: theme.colors.surface, borderRadius: '6px' },
    inventoryList: { listStyle: 'none', padding: 0, margin: 0 },
    inventoryItem: { padding: '8px 0', borderBottom: `1px solid ${theme.colors.surface}` },
    abilityList: { listStyle: 'none', padding: 0, margin: 0 },
    abilityItem: { padding: '10px 0', borderBottom: `1px solid ${theme.colors.surface}` },
    abilityDesc: { fontSize: '0.9rem', color: theme.colors.textSecondary, margin: '5px 0 0 0' },
    statusList: { listStyle: 'none', padding: 0, margin: 0 },
    statusItem: { padding: '8px 0', borderBottom: `1px solid ${theme.colors.surface}`, color: theme.colors.error },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic' },
    branchGrid: {
         display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px',
    },
    notesContainer: {
         display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px',
         '& div p': { margin: '5px 0 0 0', color: theme.colors.textSecondary, fontSize: '0.95rem'}
    },
    loading: { textAlign: 'center', padding: '50px', fontSize: '1.5rem' },
    error: { textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: theme.colors.error },
};


export default CharacterDetailPage;