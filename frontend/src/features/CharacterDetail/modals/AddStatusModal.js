// src/features/CharacterDetail/modals/AddStatusModal.js
import React, { useState, useEffect, useMemo } from 'react'; // Добавил useMemo
import * as apiService from '../../../api/apiService'; // Убедитесь, что путь правильный
import { theme } from '../../../styles/theme'; // Убедитесь, что путь правильный

// --- Иконки ---
const SearchIcon = () => (<svg style={styles.searchIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>);
const StatusIcon = () => (<svg style={styles.listItemIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>); // Простая иконка "i"

const AddStatusModal = ({ characterId, onClose, onSuccess }) => {
    const [allStatusEffects, setAllStatusEffects] = useState([]);
    const [selectedEffectId, setSelectedEffectId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Загрузка списка состояний
    useEffect(() => {
        let isMounted = true;
        const fetchEffects = async () => {
            setIsLoading(true);
            setError('');
            try {
                const res = await apiService.getAllStatusEffects();
                if (isMounted) {
                    setAllStatusEffects(res.data || []);
                    // console.log("Fetched status effects:", res.data);
                }
            } catch (err) {
                console.error("Failed to fetch status effects", err);
                 if (isMounted) setError("Ошибка загрузки списка состояний.");
            } finally {
                 if (isMounted) setIsLoading(false);
            }
        };
        fetchEffects();
        return () => { isMounted = false; };
    }, []); // Пустой массив зависимостей, чтобы загрузка была один раз

     // Фильтрация списка по поиску (мемоизированная)
     const filteredEffects = useMemo(() => {
        if (!searchTerm) return allStatusEffects; // Если поиск пуст, показываем все
        return allStatusEffects.filter(effect =>
            effect.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
     }, [allStatusEffects, searchTerm]); // Зависит от полного списка и строки поиска

    // Обработчик добавления статуса
    const handleAddStatus = async () => {
        if (!selectedEffectId) {
            setError("Выберите состояние для добавления.");
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await apiService.applyStatusEffect(characterId, parseInt(selectedEffectId, 10));
            if (onSuccess) onSuccess(); // Вызываем onSuccess, если передан
            onClose();
        } catch (err) {
            console.error("Failed to apply status effect", err);
            let errorMessage = "Ошибка добавления состояния.";
             if (err.response?.data?.detail) { errorMessage = String(err.response.data.detail); }
             else if (err.message) { errorMessage = err.message; }
             setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Анимация для overlay
    const animationStyle = `
        @keyframes fadeInBlur { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(5px); } }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;

    return (
        <>
            <style>{animationStyle}</style>
            <div style={styles.overlay} onClick={onClose}>
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <h2 style={styles.title}>Добавить Состояние</h2>
                    <button onClick={onClose} style={styles.closeButton} disabled={isSubmitting || isLoading} title="Закрыть">×</button>

                    {/* Поле поиска */}
                    <div style={styles.searchContainer}>
                         <SearchIcon />
                         <input
                             type="text"
                             placeholder="Поиск по названию..."
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             style={styles.searchInput}
                             disabled={isLoading || isSubmitting}
                         />
                    </div>


                    {/* Контейнер со списком */}
                    <div style={styles.listContainer}>
                        {isLoading && <p style={styles.infoText}>Загрузка состояний...</p>}
                        {/* Отображаем ошибку загрузки */}
                        {!isLoading && error && !error.includes("добавления") && <p style={styles.errorText}>{error}</p>}
                        {!isLoading && !error && filteredEffects.length === 0 && (
                            <p style={styles.infoText}>
                                {searchTerm ? "Состояния не найдены." : "Список состояний пуст."}
                            </p>
                        )}
                        {!isLoading && !error && filteredEffects.map(effect => {
                             const isSelected = selectedEffectId === String(effect.id);
                             return (
                                <div
                                    key={effect.id}
                                    onClick={() => !isSubmitting && setSelectedEffectId(String(effect.id))}
                                    style={{
                                        ...styles.listItem,
                                        ...(isSelected ? styles.listItemActive : {}),
                                        cursor: isSubmitting ? 'default' : 'pointer'
                                    }}
                                    // title={effect.description} // Убрали title, т.к. описание теперь видно
                                >
                                    <div style={styles.itemContent}>
                                        <StatusIcon />
                                        <div style={styles.itemText}>
                                            <span style={styles.itemName}>{effect.name}</span>
                                            {effect.description && <span style={styles.itemDescription}>{effect.description}</span>}
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>

                    {/* Отображаем ошибку добавления */}
                    {error && error.includes("добавления") && <p style={styles.errorText}>{error}</p>}

                    {/* Кнопки управления */}
                    <div style={styles.buttonGroup}>
                        <button type="button" onClick={onClose} style={styles.cancelButton} disabled={isSubmitting}>Отмена</button>
                        <button
                            onClick={handleAddStatus}
                            style={(!selectedEffectId || isLoading || isSubmitting) ? {...styles.submitButton, ...styles.submitButtonDisabled} : styles.submitButton}
                            disabled={isLoading || isSubmitting || !selectedEffectId}
                        >
                            {isSubmitting ? 'Добавление...' : 'Добавить'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

// Стили для AddStatusModal
const styles = {
    // Стили overlay и modal как в других модалках
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1050, animation: 'fadeInBlur 0.3s ease-out forwards', opacity: 0,
        backdropFilter: 'blur(5px)',
    },
    modal: {
        background: theme.colors.surface, padding: '30px', borderRadius: '12px',
        width: '90%', maxWidth: '550px', // Чуть шире для описаний
        maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative',
        boxShadow: '0 5px 25px rgba(0,0,0,0.4)', color: theme.colors.text,
        border: `1px solid ${theme.colors.surfaceVariant}`,
        animation: 'scaleUp 0.3s ease-out forwards', transform: 'scale(0.9)', opacity: 0,
    },
    '@keyframes scaleUp': { 'from': { transform: 'scale(0.9)', opacity: 0 }, 'to': { transform: 'scale(1)', opacity: 1 } },
    '@keyframes fadeInBlur': { 'from': { opacity: 0, backdropFilter: 'blur(0px)' }, 'to': { opacity: 1, backdropFilter: 'blur(5px)' } },
    title: {
        textAlign: 'center', marginBottom: '20px', color: theme.colors.primary,
        fontSize: '1.3rem', fontWeight: '600', borderBottom: `1px solid ${theme.colors.surfaceVariant}`,
        paddingBottom: '15px',
    },
    closeButton: {
        position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none',
        color: theme.colors.textSecondary, fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1,
        padding: '0 5px', transition: 'color 0.2s', ':hover': { color: theme.colors.primary },
        ':disabled': { opacity: 0.5 }
    },
    searchContainer: { // Контейнер для поиска с иконкой
        position: 'relative',
        marginBottom: '15px',
    },
    searchIcon: { // Иконка поиска
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '18px',
        height: '18px',
        fill: theme.colors.textSecondary,
        opacity: 0.7,
    },
    searchInput: { // Стилизованное поле поиска
        width: '100%',
        padding: '10px 12px 10px 40px', // Отступ слева для иконки
        borderRadius: '8px',
        border: `1px solid ${theme.colors.surfaceVariant}`,
        background: theme.colors.background,
        color: theme.colors.text,
        fontSize: '1rem',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ':focus': {
            borderColor: theme.colors.primary,
            boxShadow: `0 0 0 2px ${theme.colors.primary}44`,
            outline: 'none',
        },
        ':disabled': { opacity: 0.5 }
    },
    listContainer: {
        flexGrow: 1, overflowY: 'auto', border: `1px solid ${theme.colors.surfaceVariant}`,
        borderRadius: '8px', padding: '10px', marginBottom: '20px', minHeight: '200px',
        background: theme.colors.background, // Фон чуть темнее модалки
        '::-webkit-scrollbar': { width: '8px' },
        '::-webkit-scrollbar-track': { background: theme.colors.surface, borderRadius: '4px' },
        '::-webkit-scrollbar-thumb': { background: theme.colors.surfaceVariant, borderRadius: '4px' },
        '::-webkit-scrollbar-thumb:hover': { background: theme.colors.textSecondary }
    },
    listItem: { // Стиль элемента списка
        padding: '12px 15px', // Увеличил паддинг
        borderRadius: '6px',
        cursor: 'pointer',
        marginBottom: '8px',
        border: '1px solid transparent', // Убрал видимую рамку по умолчанию
        borderLeft: `3px solid ${theme.colors.surfaceVariant}`, // Левая рамка
        transition: 'all 0.2s ease-in-out',
        background: 'transparent', // Прозрачный фон по умолчанию
        ':hover': { background: `${theme.colors.primary}11`, borderLeftColor: theme.colors.primary } // Подсветка при наведении
    },
    listItemActive: { // Стиль выбранного элемента
        background: `${theme.colors.primary}22`, // Ярче фон
        borderLeftColor: theme.colors.primary, // Яркая левая рамка
        // border: `1px solid ${theme.colors.primary}55`, // Можно добавить рамку
        // boxShadow: `0 0 8px ${theme.colors.primary}22`, // Легкая тень
    },
    itemContent: { // Контейнер для иконки и текста
        display: 'flex',
        alignItems: 'flex-start', // Выравнивание по верху
        gap: '10px',
    },
    listItemIcon: { // Иконка статуса
        width: '16px',
        height: '16px',
        fill: theme.colors.textSecondary,
        marginTop: '3px', // Небольшой отступ сверху для выравнивания с текстом
        flexShrink: 0,
    },
    itemText: { // Контейнер для имени и описания
        display: 'flex',
        flexDirection: 'column',
        gap: '3px', // Маленький отступ между именем и описанием
    },
    itemName: { // Имя статуса
        fontWeight: '500', // Не слишком жирный
        color: theme.colors.text,
        fontSize: '0.95rem',
    },
    itemDescription: { // Описание статуса
        fontSize: '0.8rem',
        color: theme.colors.textSecondary,
        lineHeight: 1.4,
        whiteSpace: 'pre-wrap', // Сохраняем переносы строк из описания
    },
    infoText: { textAlign: 'center', color: theme.colors.textSecondary, fontStyle: 'italic', padding: '20px 0' },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '10px', fontWeight: 'bold', minHeight: '1.2em', fontSize: '0.9rem' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${theme.colors.surfaceVariant}` },
    cancelButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, fontWeight: '500', fontSize: '0.9rem', ':hover': { opacity: 1 }, ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    submitButton: { padding: '10px 20px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', fontSize: '0.9rem', ':hover': { filter: 'brightness(1.1)' } },
    submitButtonDisabled: { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(50%)', boxShadow: 'none' },
};

export default AddStatusModal;
