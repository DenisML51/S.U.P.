// src/features/CharacterDetail/modals/AddStatusModal.js
import React, { useState, useEffect } from 'react';
import * as apiService from '../../../api/apiService'; // Обновленный путь
import { theme } from '../../../styles/theme'; // Обновленный путь

const AddStatusModal = ({ characterId, onClose, onSuccess }) => {
    const [allStatusEffects, setAllStatusEffects] = useState([]);
    const [selectedEffectId, setSelectedEffectId] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // Добавим поиск
    const [isLoading, setIsLoading] = useState(true); // Загрузка списка
    const [isSubmitting, setIsSubmitting] = useState(false); // Отправка запроса
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
                    console.log("Fetched status effects:", res.data);
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
    }, []);

     // Фильтрация списка по поиску
     const filteredEffects = allStatusEffects.filter(effect =>
         effect.name.toLowerCase().includes(searchTerm.toLowerCase())
     );

    // Обработчик добавления статуса
    const handleAddStatus = async () => {
        if (!selectedEffectId) {
            setError("Выберите состояние для добавления.");
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
             // Используем правильный ID выбранного эффекта
            await apiService.applyStatusEffect(characterId, parseInt(selectedEffectId, 10)); // Убедимся, что передаем число
            onSuccess(); // Обновляем данные персонажа в родительском компоненте
            onClose(); // Закрываем модалку
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

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Добавить Состояние</h2>
                <button onClick={onClose} style={styles.closeButton} disabled={isSubmitting || isLoading}>×</button>

                {/* Поле поиска */}
                 <input
                     type="text"
                     placeholder="Поиск по названию..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     style={styles.searchInput}
                     disabled={isLoading || isSubmitting}
                 />

                {/* Контейнер со списком */}
                <div style={styles.listContainer}>
                    {isLoading && <p style={styles.infoText}>Загрузка состояний...</p>}
                    {/* Отображаем ошибку загрузки */}
                    {!isLoading && error && !error.includes("добавления") && <p style={styles.errorText}>{error}</p>}
                    {!isLoading && !error && filteredEffects.length === 0 && <p style={styles.infoText}>Состояния не найдены.</p>}
                    {!isLoading && !error && filteredEffects.map(effect => (
                        <div
                            key={effect.id}
                            onClick={() => !isSubmitting && setSelectedEffectId(String(effect.id))} // Сохраняем ID как строку для сравнения
                            style={{
                                ...styles.listItem,
                                ...(selectedEffectId === String(effect.id) ? styles.listItemActive : {}),
                                cursor: isSubmitting ? 'default' : 'pointer'
                            }}
                            title={effect.description} // Показываем описание при наведении
                        >
                            {effect.name}
                        </div>
                    ))}
                </div>

                {/* Отображаем ошибку добавления */}
                {error && error.includes("добавления") && <p style={styles.errorText}>{error}</p>}

                {/* Кнопки управления */}
                <div style={styles.buttonGroup}>
                    <button type="button" onClick={onClose} style={styles.cancelButton} disabled={isSubmitting}>Отмена</button>
                    <button
                        onClick={handleAddStatus}
                        style={styles.submitButton}
                        disabled={isLoading || isSubmitting || !selectedEffectId}
                    >
                        {isSubmitting ? 'Добавление...' : 'Добавить'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Стили для AddStatusModal
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: theme.colors.surface, padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '70vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: theme.effects.shadow, color: theme.colors.text },
    title: { textAlign: 'center', marginBottom: '20px', color: theme.colors.primary },
    closeButton: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: theme.colors.textSecondary, fontSize: '1.5rem', cursor: 'pointer', ':disabled': { opacity: 0.5 } },
    searchInput: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', marginBottom: '15px', ':disabled': { opacity: 0.5 } },
    listContainer: { flexGrow: 1, overflowY: 'auto', border: `1px solid ${theme.colors.surface}cc`, borderRadius: '8px', padding: '10px', marginBottom: '20px', minHeight: '200px' },
    listItem: { padding: '10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '5px', border: '1px solid transparent', transition: 'background 0.2s, border-color 0.2s', fontSize: '0.9rem', ':hover': { background: `${theme.colors.primary}22` } },
    listItemActive: { background: `${theme.colors.primary}44`, borderColor: theme.colors.primary, fontWeight: 'bold' },
    infoText: { textAlign: 'center', color: theme.colors.textSecondary, fontStyle: 'italic' },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '10px', fontWeight: 'bold', minHeight: '1.2em', fontSize: '0.9rem' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${theme.colors.surface}cc` },
    cancelButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    submitButton: { padding: '10px 20px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
};

export default AddStatusModal;