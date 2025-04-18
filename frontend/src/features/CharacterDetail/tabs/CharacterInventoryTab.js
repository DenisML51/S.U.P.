import React from 'react';
import { theme } from '../../../styles/theme'; // Импорт твоей темы
import ItemCard from '../components/ItemCard'; // Импорт твоего ItemCard

// Компонент принимает все необходимые обработчики от родителя
const CharacterInventoryTab = ({
    character,
    handleEquip,    // Функция для экипировки предмета (inventory_item_id, slot) => void
    handleUnequip,  // Функция для снятия предмета (slot) => void
    handleDropItem, // Функция для выбрасывания предмета (inventory_item_id) => void
    onAddItemClick, // Функция для открытия модального окна добавления
    apiActionError, // Строка с ошибкой от API действий (экипировка/снятие и т.д.)
    handleUseItem   // Функция для использования предмета (inventory_item_id, item_details) => void (если есть)
}) => {
    // Если данных персонажа нет, ничего не рендерим
    if (!character) return null;

    // Получаем инвентарь или пустой массив
    const inventory = character.inventory || [];

    // Определяем, релевантна ли ошибка API для этой вкладки
    const relevantError = typeof apiActionError === 'string' && apiActionError &&
         (apiActionError.toLowerCase().includes('предмет') ||
          apiActionError.toLowerCase().includes('инвентар') ||
          apiActionError.toLowerCase().includes('экипир'))
         ? apiActionError : null;

    return (
        // Основной контейнер вкладки
        <div style={styles.tabContent}>

            {/* Заголовок вкладки С КНОПКОЙ ДОБАВЛЕНИЯ */}
            <div style={styles.tabHeader}>
                <h4 style={styles.tabTitle}>Инвентарь</h4>
                {/* ВОЗВРАЩАЕМ КНОПКУ "+" СЮДА */}
                <button
                    onClick={onAddItemClick} // Вызываем переданную функцию
                    style={styles.addItemButton}
                    title="Добавить предмет"
                >
                    +
                </button>
            </div>

            {/* Отображение релевантной ошибки API */}
            {relevantError && <p style={styles.apiActionErrorStyle}>{relevantError}</p>}

            {/* Контейнер списка инвентаря (с прокруткой) */}
            {inventory.length > 0 ? (
                // Используем стили для flex-колонки с прокруткой
                <div style={styles.inventoryGrid}>
                    {inventory.map((invItem) => (
                        // Рендерим карточку для каждого предмета в инвентаре
                        <ItemCard
                            key={invItem.id || `inv-${invItem.item_id}`}
                            character={character}
                            invItem={invItem}
                            onEquip={handleEquip}
                            onUnequip={handleUnequip}
                            onDrop={handleDropItem}
                            onUse={handleUseItem}
                        />
                    ))}
                </div>
            ) : (
                // Заглушка, если инвентарь пуст
                <p style={styles.placeholderText}>Инвентарь пуст.</p>
            )}

            {/* Контейнер для кнопки внизу УБРАН */}
        </div>
    );
};

// Стили компонента (адаптированные, кнопка вернулась в header)
const styles = {
    // Основной контейнер вкладки
    tabContent: {
        animation: 'fadeIn 0.5s ease-out',
        display: 'flex',        // Flexbox все еще полезен для управления высотой списка
        flexDirection: 'column',
        height: '100%',         // Важно для flexGrow у списка
        padding: '10px 15px'
    },
    // Заголовок вкладки
    tabHeader: {
        display: 'flex',
        justifyContent: 'space-between', // Размещает title слева, button справа
        alignItems: 'center',
        marginBottom: '15px',
        borderBottom: `1px solid ${theme.colors.surface}66`,
        paddingBottom: '10px',
        flexShrink: 0 // Не сжимать заголовок
    },
    tabTitle: {
        margin: 0,
        color: theme.colors.primary,
        fontSize: '1.1rem'
    },
    // Кнопка добавления "+" в заголовке (стиль из твоего оригинального кода)
    addItemButton: {
        padding: '6px 12px',
        background: theme.colors.primary,
        color: theme.colors.background,
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1rem', // Размер шрифта для "+"
        lineHeight: '1', // Выравнивание "+" по центру кнопки
        transition: theme.transitions.default,
        ':hover': { opacity: 0.9 }
    },
    // Контейнер списка предметов
    inventoryGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '5px',
        flexGrow: 1,            // Занимает все доступное пространство по высоте
        overflowY: 'auto',      // Включает прокрутку
        paddingRight: '5px',
        paddingLeft: '2px'
    },
    // Текст-заглушка
    placeholderText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: '30px',
        flexGrow: 1 // Занимает место, если список пуст
    },
    // Стиль для отображения ошибок API
    apiActionErrorStyle: {
        background: `${theme.colors.error}22`,
        color: theme.colors.error,
        padding: '8px 12px',
        borderRadius: '6px',
        border: `1px solid ${theme.colors.error}55`,
        textAlign: 'center',
        marginBottom: '15px',
        fontSize: '0.9rem',
        flexShrink: 0
    },
    // Стиль addButtonContainer больше не нужен
    // addButtonContainer: { ... }
};

export default CharacterInventoryTab;