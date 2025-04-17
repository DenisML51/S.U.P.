// src/features/CharacterDetail/modals/AddItemModal.js
import React, { useState, useEffect, useMemo } from 'react';
import * as apiService from '../../../api/apiService'; // Обновленный путь
import { theme } from '../../../styles/theme'; // Обновленный путь

const AddItemModal = ({ characterId, onClose, onSuccess }) => {
    const [itemType, setItemType] = useState('weapon'); // 'weapon', 'armor', 'shield', 'general', 'ammo'
    const [referenceItems, setReferenceItems] = useState({ weapon: [], armor: [], shield: [], general: [], ammo: [] });
    const [filteredItems, setFilteredItems] = useState([]);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true); // Загрузка справочников
    const [isSubmitting, setIsSubmitting] = useState(false); // Отправка запроса на добавление
    const [error, setError] = useState('');

    // Загрузка справочников при монтировании
    useEffect(() => {
        let isMounted = true; // Флаг для предотвращения обновления state после размонтирования
        const fetchItems = async () => {
            setIsLoading(true);
            setError('');
            try {
                // Параллельная загрузка всех типов предметов
                const [weaponsRes, armorsRes, shieldsRes, generalsRes, ammosRes] = await Promise.all([
                    apiService.getAllWeapons().catch(err => { console.error("Error fetching weapons:", err); return { data: [] }; }),
                    apiService.getAllArmor().catch(err => { console.error("Error fetching armor:", err); return { data: [] }; }),
                    apiService.getAllShields().catch(err => { console.error("Error fetching shields:", err); return { data: [] }; }),
                    apiService.getAllGeneralItems().catch(err => { console.error("Error fetching general items:", err); return { data: [] }; }),
                    apiService.getAllAmmo().catch(err => { console.error("Error fetching ammo:", err); return { data: [] }; }),
                ]);

                if (isMounted) {
                    const loadedItems = {
                        weapon: weaponsRes.data || [],
                        armor: armorsRes.data || [],
                        shield: shieldsRes.data || [],
                        general: generalsRes.data || [],
                        ammo: ammosRes.data || [],
                    };
                    setReferenceItems(loadedItems);
                    // Устанавливаем начальный тип и фильтруем после загрузки
                    setItemType('weapon'); // Начинаем с оружия
                    setFilteredItems(loadedItems['weapon'].filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())));
                }
            } catch (err) {
                console.error("Failed to fetch reference items", err);
                 if(isMounted) setError("Ошибка загрузки справочников предметов.");
            } finally {
                 if(isMounted) setIsLoading(false);
            }
        };
        fetchItems();
        return () => { isMounted = false; }; // Очистка при размонтировании
    }, []); // Пустая зависимость, загрузка один раз

    // Фильтрация списка при изменении типа или поиска
    useEffect(() => {
        const items = referenceItems[itemType] || [];
        const filtered = items.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredItems(filtered);
        setSelectedItemId(''); // Сбрасываем выбор при смене фильтра/типа
    }, [itemType, searchTerm, referenceItems]);

    // Определяем, можно ли изменять количество для выбранного типа
     const canChangeQuantity = useMemo(() => {
         // Находим выбранный предмет в исходном справочнике (не отфильтрованном)
         const allItemsOfType = referenceItems[itemType] || [];
         const selectedItem = allItemsOfType.find(item => String(item.id) === String(selectedItemId)); // Сравнение как строк на всякий случай
         // Разрешаем менять кол-во только для 'ammo' и 'general'
         return selectedItem?.item_type === 'ammo' || selectedItem?.item_type === 'general';
     }, [selectedItemId, itemType, referenceItems]);


    // Сброс количества при выборе нового предмета, если он не стакается
    useEffect(() => {
        if (!canChangeQuantity) {
            setQuantity(1);
        }
    }, [selectedItemId, canChangeQuantity]);

    // Обработчик добавления предмета
    const handleAddItem = async () => {
        if (!selectedItemId) { setError("Выберите предмет для добавления."); return; }
        if (quantity < 1) { setError("Количество должно быть не менее 1."); return; }

        setIsSubmitting(true);
        setError('');
        try {
            await apiService.addItemToInventory(characterId, selectedItemId, quantity);
            onSuccess(); // Вызываем коллбэк для обновления данных персонажа
            onClose(); // Закрываем модальное окно
        } catch (err) {
            console.error("Failed to add item", err);
             let errorMessage = "Ошибка добавления предмета.";
              if (err.response?.data?.detail) { errorMessage = String(err.response.data.detail); }
              else if (err.message) { errorMessage = err.message; }
              setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Рендеринг
    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Добавить предмет в инвентарь</h2>
                <button onClick={onClose} style={styles.closeButton} disabled={isSubmitting || isLoading}>×</button>

                {/* Селектор типа предмета */}
                <div style={styles.itemTypeSelector}>
                    {['weapon', 'armor', 'shield', 'general', 'ammo'].map(type => (
                         <button
                             key={type}
                             onClick={() => setItemType(type)}
                             style={itemType === type ? styles.typeButtonActive : styles.typeButton}
                             disabled={isLoading || isSubmitting}
                         >
                            {/* Названия кнопок */}
                            {type === 'weapon' ? 'Оружие' :
                             type === 'armor' ? 'Броня' :
                             type === 'shield' ? 'Щиты' :
                             type === 'general' ? 'Общее' : 'Патроны'}
                          </button>
                     ))}
                </div>

                {/* Поиск */}
                <input
                    type="text"
                    placeholder="Поиск по названию..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                    disabled={isLoading || isSubmitting}
                />

                {/* Список предметов */}
                <div style={styles.itemListContainer}>
                    {isLoading && <p style={styles.loadingText}>Загрузка справочников...</p>}
                    {!isLoading && filteredItems.length === 0 && <p style={styles.placeholderText}>Предметы не найдены.</p>}
                    {!isLoading && filteredItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => !isLoading && !isSubmitting && setSelectedItemId(String(item.id))} // Сохраняем как строку
                            style={{
                                ...styles.listItem,
                                ...(String(selectedItemId) === String(item.id) ? styles.listItemActive : {}),
                                cursor: isLoading || isSubmitting ? 'default' : 'pointer'
                            }}
                            title={item.description || item.name} // Title для подсказки
                        >
                            <strong>{item.name}</strong> ({item.category} / {item.rarity})
                            {/* Доп. инфо в зависимости от типа */}
                            {item.damage && ` - ${item.damage} ${item.damage_type}`}
                            {item.ac_bonus !== undefined && item.item_type === 'armor' && ` - AC ${item.ac_bonus}`}
                            {item.ac_bonus !== undefined && item.item_type === 'shield' && ` - AC +${item.ac_bonus}`}
                        </div>
                    ))}
                </div>

                {/* Выбор количества */}
                 <div style={styles.quantityContainer}>
                     <label htmlFor="itemQuantity" style={styles.quantityLabel}>Количество:</label>
                     <input
                         id="itemQuantity" type="number" min="1" value={quantity}
                         onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                         style={styles.quantityInput}
                         disabled={isLoading || isSubmitting || !selectedItemId || !canChangeQuantity}
                     />
                     {/* Подсказка, если количество менять нельзя */}
                      {!canChangeQuantity && selectedItemId && <span style={styles.quantityHint}>(Только 1 шт.)</span>}
                 </div>


                {error && <p style={styles.errorText}>{error}</p>}

                {/* Кнопки управления */}
                <div style={styles.buttonGroup}>
                    <button type="button" onClick={onClose} style={styles.cancelButton} disabled={isSubmitting}>Отмена</button>
                    <button
                        onClick={handleAddItem}
                        style={styles.submitButton}
                        disabled={isLoading || isSubmitting || !selectedItemId}
                    >
                        {isSubmitting ? 'Добавление...' : 'Добавить'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// Стили для AddItemModal
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text },
    title: { textAlign: 'center', marginBottom: '20px', color: theme.colors.primary },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer', ':disabled': { opacity: 0.5 } },
    itemTypeSelector: { display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: `1px solid ${theme.colors.surface}cc`, paddingBottom: '15px', flexWrap: 'wrap' },
    typeButton: { padding: '8px 15px', background: theme.colors.surface, color: theme.colors.textSecondary, border: `1px solid ${theme.colors.textSecondary}`, borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, ':hover:not(:disabled)': { background: `${theme.colors.primary}44`, borderColor: theme.colors.primary }, ':disabled': { opacity: 0.5, cursor: 'default'} }, // Добавил рамку
    typeButtonActive: { padding: '8px 15px', background: theme.colors.primary, color: theme.colors.background, border: `1px solid ${theme.colors.primary}`, borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'default' } },
    searchInput: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', marginBottom: '15px', ':disabled': { opacity: 0.5 } },
    itemListContainer: { flexGrow: 1, overflowY: 'auto', border: `1px solid ${theme.colors.surface}cc`, borderRadius: '8px', padding: '10px', marginBottom: '15px', minHeight: '200px' },
    listItem: { padding: '10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '5px', border: '1px solid transparent', transition: 'background 0.2s, border-color 0.2s', fontSize: '0.9rem', ':hover': { background: `${theme.colors.primary}22` } },
    listItemActive: { background: `${theme.colors.primary}44`, borderColor: theme.colors.primary, fontWeight: 'bold' },
    loadingText: { textAlign: 'center', color: theme.colors.textSecondary, fontStyle: 'italic' },
    placeholderText: { textAlign: 'center', color: theme.colors.textSecondary, fontStyle: 'italic' },
    quantityContainer: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' },
    quantityLabel: { color: theme.colors.textSecondary, fontSize: '0.9rem' },
    quantityInput: { width: '80px', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', textAlign: 'center', '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 }, '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 }, appearance: 'textfield', ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    quantityHint: {fontSize: '0.8rem', color: theme.colors.textSecondary, fontStyle: 'italic'},
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '10px', fontWeight: 'bold', minHeight: '1.2em' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${theme.colors.surface}cc` },
    cancelButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    submitButton: { padding: '10px 20px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
};

export default AddItemModal;