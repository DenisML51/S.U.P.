// src/features/CharacterDetail/sections/CharacterActiveEffectsSection.js
import React from 'react';
import { theme } from '../../../styles/theme'; // Путь к теме

// Хелпер для определения цвета статуса по имени (без изменений в БД)
const getStatusThemeColor = (effectName) => {
    if (!effectName) return theme.colors.textSecondary; // Default grey
    const nameLower = effectName.toLowerCase();
    // Приоритет для ПУ
    if (nameLower.startsWith('пу:')) return theme.colors.primary; // Purple for PU
    // Позитивные
    if (nameLower.includes('бонус') || nameLower.includes('преимущ') || nameLower.includes('ускорен') || nameLower.includes('лечени') || nameLower.includes('сопротивл') || nameLower.includes('защит') || nameLower.includes('невидим')) return theme.colors.success || '#66BB6A'; // Green for positive/resistance/defense
    // Негативные
    if (nameLower.includes('штраф') || nameLower.includes('помеха') || nameLower.includes('уязвим') || nameLower.includes('замедлен') || nameLower.includes('слеп') || nameLower.includes('глуш') || nameLower.includes('истощен') || nameLower.includes('ранен')) return theme.colors.error; // Red for negative
    // Нейтральные/другие
    return theme.colors.textSecondary; // Grey for others
};


const CharacterActiveEffectsSection = ({
    character,
    handleApiAction, // Нужен для кнопки удаления
    onAddStatusClick, // Функция для открытия модалки добавления
    onStatusEffectClick // Функция для открытия модалки деталей
}) => {
    if (!character) return null;

    const activeEffects = character.active_status_effects || [];

    // Обработчик удаления статуса
    const handleRemoveStatus = (effectId, effectName) => {
        if (window.confirm(`Снять состояние "${effectName || effectId}"?`)) {
            // Вызываем handleApiAction, переданный из CharacterDetailPage
            handleApiAction(
                apiService.removeStatusEffect(character.id, effectId),
                `Статус "${effectName || effectId}" снят`,
                `Ошибка снятия состояния`
            );
        }
    };

    return (
        <div style={styles.section}>
            {/* Заголовок секции с кнопкой добавления */}
            <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Активные Состояния</h2>
                <button onClick={onAddStatusClick} style={styles.addButton} title="Добавить состояние">+</button>
            </div>

            {/* Контейнер списка состояний */}
            <div style={styles.statusListContainer}>
                {activeEffects.length > 0 ? (
                    activeEffects.map(effect => {
                        const themeColor = getStatusThemeColor(effect.name);
                        const itemStyle = {
                            ...styles.statusItem,
                            borderLeftColor: themeColor // Цветная рамка слева
                        };
                        return (
                            <div key={effect.id} style={itemStyle} title={effect.description || "Нажмите для деталей"}>
                                <span
                                    onClick={() => onStatusEffectClick(effect)}
                                    style={styles.statusItemName}
                                >
                                    {effect.name}
                                </span>
                                <button
                                    onClick={() => handleRemoveStatus(effect.id, effect.name)}
                                    style={styles.removeButton}
                                    title="Снять состояние"
                                >
                                    × {/* Оставляем крестик, но стилизуем кнопку */}
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <p style={styles.placeholderText}>Нет активных состояний.</p>
                )}
            </div>
        </div>
    );
};

// Стили для CharacterActiveEffectsSection
const styles = {
    section: { // Стиль секции как у CharacterStatusSection
        background: theme.effects.glass,
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: theme.effects.shadow,
        marginBottom: '25px', // Отступ снизу
        display: 'flex', // Для управления высотой списка
        flexDirection: 'column',
    },
    sectionHeader: { // Заголовок с кнопкой
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingBottom: '8px',
        borderBottom: `1px solid ${theme.colors.secondary}`,
    },
    sectionTitle: { // Заголовок без нижнего подчеркивания здесь
        margin: 0,
        color: theme.colors.secondary,
        fontSize: '1.2rem',
    },
    addButton: { // Кнопка "+"
        padding: '4px 8px',
        background: theme.colors.primary,
        color: theme.colors.background,
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1.1rem', // Крупнее
        lineHeight: 1,
        transition: theme.transitions.default,
        ':hover': { opacity: 0.9 }
    },
    statusListContainer: { // Контейнер для списка
        display: 'flex',
        flexDirection: 'column', // Элементы в столбик
        gap: '8px', // Отступ между элементами
        flexGrow: 1, // Занимает доступное пространство
        // Можно добавить overflowY: 'auto', если список может быть очень длинным
    },
    statusItem: { // Стиль одного элемента состояния
        display: 'flex',
        justifyContent: 'space-between', // Имя слева, кнопка справа
        alignItems: 'center',
        background: theme.colors.surface + '99', // Полупрозрачный фон
        borderRadius: '6px',
        padding: '8px 12px', // Внутренние отступы
        borderLeft: '4px solid grey', // Рамка слева (цвет будет меняться)
        transition: 'background-color 0.2s ease',
        ':hover': {
            background: theme.colors.surface + 'cc', // Чуть темнее при наведении
        }
    },
    statusItemName: {
        flexGrow: 1, // Занимает место
        marginRight: '10px', // Отступ до кнопки
        cursor: 'pointer', // Показываем, что можно кликнуть для деталей
        fontSize: '0.95rem',
        color: theme.colors.text,
        ':hover': {
            color: theme.colors.primary, // Подсветка при наведении
        }
    },
    removeButton: { // Кнопка удаления
        background: 'transparent',
        color: theme.colors.error,
        border: 'none',
        padding: '0 5px', // Небольшие отступы для клика
        marginLeft: 'auto', // Прижимаем вправо
        fontSize: '1.4rem', // Крупный крестик
        lineHeight: '1',
        cursor: 'pointer',
        opacity: 0.6,
        transition: 'opacity 0.2s ease',
        flexShrink: 0, // Не сжимать кнопку
        ':hover': {
            opacity: 1,
        }
    },
    placeholderText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        padding: '20px 0', // Отступы для пустого состояния
    },
};

// Импортируем apiService внутри компонента или передаем handleApiAction
// Для простоты предполагаем, что handleApiAction передан
import * as apiService from '../../../api/apiService';

export default CharacterActiveEffectsSection;

