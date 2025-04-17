// src/features/CharacterDetail/sections/CharacterSkillsSection.js
import React from 'react';
import { theme } from '../../../styles/theme'; // Обновленный путь
import SkillDisplay from '../../../components/UI/SkillDisplay'; // Импорт компонента навыка

const CharacterSkillsSection = ({ character }) => {
    if (!character) return null;

    // Группировка навыков (можно вынести в utils)
    const skillGroups = {
        'Физиология': ['skill_strength', 'skill_dexterity', 'skill_endurance', 'skill_reaction', 'skill_technique', 'skill_adaptation'],
        'Интеллект': ['skill_logic', 'skill_attention', 'skill_erudition', 'skill_culture', 'skill_science', 'skill_medicine'],
        'Ментальность': ['skill_suggestion', 'skill_insight', 'skill_authority', 'skill_self_control', 'skill_religion', 'skill_flow'],
    };

    // Получаем модификаторы из данных персонажа
    const modifiers = character.skill_modifiers || {};

    return (
        <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Навыки</h2>
            <div style={styles.skillGroupsContainer}>
                {Object.entries(skillGroups).map(([groupName, skillKeys]) => (
                    <div key={groupName} style={styles.skillGroup}>
                        <h4 style={styles.skillGroupTitle}>{groupName}</h4>
                        {skillKeys.map(skillKey => {
                            const skillLevel = character[skillKey] ?? 1; // Базовый уровень 1, если данных нет
                            // Получаем модификатор из объекта skill_modifiers, который теперь есть в character
                            const modifierKey = `${skillKey.replace('skill_', '')}_mod`; // Преобразуем 'skill_strength' в 'strength_mod'
                            const modifier = modifiers[modifierKey] ?? 0; // Базовый модификатор 0

                            return (
                                <SkillDisplay
                                    key={skillKey}
                                    name={skillKey.replace('skill_', '')} // Показываем чистое имя
                                    level={skillLevel}
                                    modifier={modifier}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Стили для CharacterSkillsSection
const styles = {
    section: { background: theme.effects.glass, backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '20px', boxShadow: theme.effects.shadow }, // Убрал marginBottom, т.к. gap у родителя
    sectionTitle: { margin: '0 0 15px 0', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}`, paddingBottom: '8px', fontSize: '1.2rem' },
    skillGroupsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }, // Адаптивная сетка для групп
    skillGroup: { background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '8px' },
    skillGroupTitle: { margin: '0 0 10px 0', color: theme.colors.primary, fontSize: '1rem', borderBottom: `1px dashed ${theme.colors.surface}88`, paddingBottom: '5px' },
    // Стили для SkillDisplay находятся в его собственном файле
};

export default CharacterSkillsSection;