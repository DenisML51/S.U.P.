import React, { useState, useEffect } from 'react';
import * as apiService from '../apiService';
import { theme } from '../theme';

const AddStatusModal = ({ characterId, onClose, onSuccess }) => {
    const [allStatusEffects, setAllStatusEffects] = useState([]);
    const [selectedEffectId, setSelectedEffectId] = useState('');
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
        return () => { isMounted = false; }; // Функция очистки при размонтировании
    }, []); // Пустой массив зависимостей

    const handleAddStatus = async () => {
        if (!selectedEffectId) {
            setError("Выберите состояние для добавления.");
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await apiService.applyStatusEffect(characterId, selectedEffectId);
            onSuccess(); // Обновляем данные персонажа в родительском компоненте
            onClose(); // Закрываем модалку
        } catch (err) {
            console.error("Failed to apply status effect", err);
            let errorMessage = "Ошибка добавления состояния.";
            if (err.response?.data?.detail) { errorMessage = err.response.data.detail; }
            else if (err.message) { errorMessage = err.message; }
            setError(String(errorMessage)); // Гарантируем строку
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Добавить Состояние</h2>
                <button onClick={onClose} style={styles.closeButton} disabled={isSubmitting}>×</button>

                <div style={styles.listContainer}>
                    {isLoading && <p>Загрузка состояний...</p>}
                    {/* Отображаем ошибку загрузки */}
                    {!isLoading && error && !error.startsWith("Ошибка добавления") && <p style={styles.errorText}>{error}</p>}
                    {!isLoading && !error && allStatusEffects.length === 0 && <p>Нет доступных состояний.</p>}
                    {!isLoading && !error && allStatusEffects.map(effect => (
                        <div
                            key={effect.id}
                            onClick={() => !isSubmitting && setSelectedEffectId(effect.id)}
                            style={{
                                ...styles.listItem,
                                ...(selectedEffectId === effect.id ? styles.listItemActive : {}),
                                cursor: isSubmitting ? 'default' : 'pointer'
                            }}
                            title={effect.description} // Показываем описание при наведении
                        >
                            {effect.name}
                        </div>
                    ))}
                </div>

                {/* Отображаем ошибку добавления, если она есть */}
                {error && error.startsWith("Ошибка добавления") && <p style={styles.errorText}>{error}</p>}

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
    listContainer: { flexGrow: 1, overflowY: 'auto', border: `1px solid ${theme.colors.surface}cc`, borderRadius: '8px', padding: '10px', marginBottom: '20px' },
    listItem: { padding: '10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '5px', border: '1px solid transparent', transition: 'background 0.2s, border-color 0.2s', fontSize: '0.9rem', ':hover': { background: `${theme.colors.primary}22` } },
    listItemActive: { background: `${theme.colors.primary}44`, borderColor: theme.colors.primary, fontWeight: 'bold' },
    errorText: { color: theme.colors.error, textAlign: 'center', marginTop: '10px', fontWeight: 'bold', minHeight: '1.2em' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${theme.colors.surface}cc` },
    cancelButton: { padding: '10px 20px', background: theme.colors.textSecondary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, opacity: 0.8, ':disabled': { opacity: 0.5, cursor: 'not-allowed'} },
    submitButton: { padding: '10px 20px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', ':disabled': { opacity: 0.5, cursor: 'not-allowed' } },
};

export default AddStatusModal;