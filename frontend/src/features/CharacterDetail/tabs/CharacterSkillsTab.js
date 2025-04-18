// src/features/CharacterDetail/tabs/CharacterSkillsTab.js
import React from 'react';
import { theme } from '../../../styles/theme'; // Путь к теме
import SkillDisplay from '../../../components/UI/SkillDisplay'; // Импорт компонента навыка

const CharacterSkillsTab = ({ character }) => {
    if (!character) return null;

    // Группировка навыков (та же, что была в CharacterSkillsSection)
    const skillGroups = {
        'Физиология': ['skill_strength', 'skill_dexterity', 'skill_endurance', 'skill_reaction', 'skill_technique', 'skill_adaptation'],
        'Интеллект': ['skill_logic', 'skill_attention', 'skill_erudition', 'skill_culture', 'skill_science', 'skill_medicine'],
        'Ментальность': ['skill_suggestion', 'skill_insight', 'skill_authority', 'skill_self_control', 'skill_religion', 'skill_flow'],
    };

    // Получаем модификаторы из данных персонажа
    const modifiers = character.skill_modifiers || {};

    // Названия навыков на русском (можно вынести в константы/локализацию)
    const skillTranslations = {
        skill_strength: 'Сила', skill_dexterity: 'Ловкость', skill_endurance: 'Выносливость',
        skill_reaction: 'Реакция', skill_technique: 'Техника', skill_adaptation: 'Адаптация',
        skill_logic: 'Логика', skill_attention: 'Внимание', skill_erudition: 'Эрудиция',
        skill_culture: 'Культура', skill_science: 'Наука', skill_medicine: 'Медицина',
        skill_suggestion: 'Внушение', skill_insight: 'Проницательность', skill_authority: 'Авторитет',
        skill_self_control: 'Самообладание', skill_religion: 'Религия', skill_flow: 'Поток'
    };


    return (
        <div style={styles.tabContent}>
            {/* Используем grid для трех колонок */}
            <div style={styles.skillGroupsContainer}>
                {Object.entries(skillGroups).map(([groupName, skillKeys]) => (
                    <div key={groupName} style={styles.skillGroup}>
                        <h4 style={styles.skillGroupTitle}>{groupName}</h4>
                        <div style={styles.skillsList}>
                            {skillKeys.map(skillKey => {
                                const skillLevel = character[skillKey] ?? 1;
                                // Получаем модификатор из объекта skill_modifiers
                                const modifierKey = `${skillKey.replace('skill_', '')}_mod`;
                                const modifier = modifiers[modifierKey] ?? 0;
                                const skillNameRussian = skillTranslations[skillKey] || skillKey.replace('skill_', '');

                                return (
                                    <SkillDisplay
                                        key={skillKey}
                                        name={skillNameRussian} // Отображаем русское название
                                        level={skillLevel}
                                        modifier={modifier}
                                        // Добавляем title для возможного описания в будущем
                                        title={`${skillNameRussian}: Уровень ${skillLevel}, Модификатор ${modifier >= 0 ? '+' : ''}${modifier}`}
                                        style={styles.skillItem} // Передаем доп. стиль
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Стили для CharacterSkillsTab
const styles = {
    tabContent: {
        animation: 'fadeIn 0.5s ease-out',
        padding: '5px', // Небольшой паддинг для контента вкладки
        height: '100%', // Занимаем высоту родителя
        overflowY: 'auto', // Добавляем прокрутку если нужно
    },
    skillGroupsContainer: {
        display: 'grid',
        // 3 колонки на больших экранах, 2 на средних, 1 на маленьких
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px', // Отступ между колонками
    },
    skillGroup: {
        background: 'rgba(0,0,0,0.1)', // Легкий фон для группы
        padding: '15px',
        borderRadius: '8px',
        border: `1px solid ${theme.colors.surface}55`, // Тонкая рамка
        display: 'flex',
        flexDirection: 'column',
    },
    skillGroupTitle: {
        margin: '0 0 12px 0',
        color: theme.colors.primary, // Цвет заголовка группы
        fontSize: '1.1rem', // Крупнее
        borderBottom: `1px solid ${theme.colors.primary}88`,
        paddingBottom: '8px',
        textAlign: 'center',
    },
    skillsList: { // Контейнер для списка навыков внутри группы
        display: 'flex',
        flexDirection: 'column',
        gap: '8px', // Отступ между навыками
    },
    skillItem: { // Дополнительный стиль для SkillDisplay
        // Можно добавить hover эффект здесь или внутри SkillDisplay
        // ':hover': { background: `${theme.colors.surface}55` }
    },
};

export default CharacterSkillsTab;

