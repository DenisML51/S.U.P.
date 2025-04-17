import React, { useState, useEffect, useMemo } from 'react'; // useMemo добавлен обратно на случай будущих оптимизаций
import * as apiService from '../apiService';
import { theme } from '../theme';

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
        const fetchItems = async () => {
            setIsLoading(true);
            setError('');
            try {
                // Параллельная загрузка всех типов предметов
                const [weaponsRes, armorsRes, shieldsRes, generalsRes, ammosRes] = await Promise.all([
                    apiService.getAllWeapons().catch(err => { console.error("Error fetching weapons:", err); return { data: [] }; }), // Перехват ошибок для каждого запроса
                    apiService.getAllArmor().catch(err => { console.error("Error fetching armor:", err); return { data: [] }; }),
                    apiService.getAllShields().catch(err => { console.error("Error fetching shields:", err); return { data: [] }; }),
                    apiService.getAllGeneralItems().catch(err => { console.error("Error fetching general items:", err); return { data: [] }; }),
                    apiService.getAllAmmo().catch(err => { console.error("Error fetching ammo:", err); return { data: [] }; }),
                ]);
                setReferenceItems({
                    weapon: weaponsRes.data,
                    armor: armorsRes.data,
                    shield: shieldsRes.data,
                    general: generalsRes.data,
                    ammo: ammosRes.data,
                });
                 // Устанавливаем начальный тип и фильтруем после загрузки
                 setItemType('weapon'); // Начинаем с оружия
                 setFilteredItems((weaponsRes.data || []).filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())));

            } catch (err) { // Общая ошибка, если Promise.all упадет (маловероятно с catch выше)
                console.error("Failed to fetch reference items", err);
                setError("Ошибка загрузки справочников предметов.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Пустая зависимость

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
        const selectedItem = filteredItems.find(item => item.id === selectedItemId);
        // Разрешаем менять кол-во только для 'ammo' и 'general' (пример)
        return selectedItem?.item_type === 'ammo' || selectedItem?.item_type === 'general';
     }, [selectedItemId, filteredItems]);


    // Сброс количества при выборе нового предмета, если он не стакается
    useEffect(() => {
        if (!canChangeQuantity) {
            setQuantity(1);
        }
    }, [selectedItemId, canChangeQuantity]);


    const handleAddItem = async () => {
        if (!selectedItemId) { setError("Выберите предмет для добавления."); return; }
        if (quantity < 1) { setError("Количество должно быть не менее 1."); return; }

        setIsSubmitting(true); // Используем isSubmitting
        setError('');
        try {
            await apiService.addItemToInventory(characterId, selectedItemId, quantity);
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to add item", err);
            setError(err.response?.data?.detail || "Ошибка добавления предмета.");
        } finally {
            setIsSubmitting(false); // Сбрасываем isSubmitting
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Добавить предмет в инвентарь</h2>
                <button onClick={onClose} style={styles.closeButton} disabled={isSubmitting}>×</button>

                <div style={styles.itemTypeSelector}>
                    <button onClick={() => setItemType('weapon')} style={itemType === 'weapon' ? styles.typeButtonActive : styles.typeButton} disabled={isLoading}>Оружие</button>
                    <button onClick={() => setItemType('armor')} style={itemType === 'armor' ? styles.typeButtonActive : styles.typeButton} disabled={isLoading}>Броня</button>
                    <button onClick={() => setItemType('shield')} style={itemType === 'shield' ? styles.typeButtonActive : styles.typeButton} disabled={isLoading}>Щиты</button>
                    <button onClick={() => setItemType('general')} style={itemType === 'general' ? styles.typeButtonActive : styles.typeButton} disabled={isLoading}>Общее</button>
                    <button onClick={() => setItemType('ammo')} style={itemType === 'ammo' ? styles.typeButtonActive : styles.typeButton} disabled={isLoading}>Патроны</button>
                </div>

                <input
                    type="text"
                    placeholder="Поиск по названию..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                    disabled={isLoading}
                />

                <div style={styles.itemListContainer}>
                    {isLoading && <p style={styles.loadingText}>Загрузка справочников...</p>}
                    {!isLoading && filteredItems.length === 0 && <p style={styles.placeholderText}>Предметы не найдены.</p>}
                    {!isLoading && filteredItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => !isLoading && !isSubmitting && setSelectedItemId(item.id)}
                            style={{
                                ...styles.listItem,
                                ...(selectedItemId === item.id ? styles.listItemActive : {}),
                                cursor: isLoading || isSubmitting ? 'default' : 'pointer'
                            }}
                        >
                            <strong>{item.name}</strong> ({item.category} / {item.rarity})
                            {item.damage && ` - ${item.damage} ${item.damage_type}`}
                            {item.ac_bonus !== undefined && item.item_type !== 'shield' && ` - AC ${item.ac_bonus}`}
                            {item.ac_bonus !== undefined && item.item_type === 'shield' && ` - AC +${item.ac_bonus}`}
                        </div>
                    ))}
                </div>

                <div style={styles.quantityContainer}>
                    <label htmlFor="itemQuantity" style={styles.quantityLabel}>Количество:</label>
                    <input
                        id="itemQuantity" type="number" min="1" value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        style={styles.quantityInput}
                        disabled={isLoading || isSubmitting || !selectedItemId || !canChangeQuantity}
                    />
                     {!canChangeQuantity && selectedItemId && <span style={styles.quantityHint}>(Только 1 шт.)</span>}
                </div>

                {error && <p style={styles.errorText}>{error}</p>}

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
    typeButton: { padding: '8px 15px', background: theme.colors.surface, color: theme.colors.textSecondary, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, ':hover:not(:disabled)': { background: `${theme.colors.primary}44` }, ':disabled': { opacity: 0.5, cursor: 'default'} },
    typeButtonActive: { padding: '8px 15px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'default' } },
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