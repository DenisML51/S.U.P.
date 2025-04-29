// src/hooks/useApiActionHandler.js
import { useState, useCallback } from 'react';

/**
 * Хук для обработки вызовов API с отображением ошибок и опциональным обновлением данных.
 * @param {Function | null} refreshDataCallback - Функция для обновления данных после успешного вызова API.
 */
export function useApiActionHandler(refreshDataCallback) {
    const [actionError, setActionError] = useState(null);
    const [triggeredEmotion, setTriggeredEmotion] = useState(null); // Для ПУ

    /**
     * Обрабатывает промис API-вызова.
     * @param {Promise} actionPromise - Промис, возвращаемый функцией apiService.
     * @param {string} successMessage - Сообщение при успехе (для лога).
     * @param {string} errorMessagePrefix - Префикс сообщения об ошибке.
     * @param {object} options - Дополнительные опции.
     * @param {boolean} options.skipRefresh - Если true, не вызывать refreshDataCallback при успехе.
     */
    const handleApiAction = useCallback(async (
        actionPromise,
        successMessage = "",
        errorMessagePrefix = "Ошибка",
        options = {} // Добавляем объект опций
    ) => {
        const { skipRefresh = false } = options; // Извлекаем опцию skipRefresh

        setActionError(null);
        setTriggeredEmotion(null);
        try {
            const response = await actionPromise;
            console.log(successMessage || `${errorMessagePrefix}: Успех`);

            let emotion = null;
            // Проверка ответа от updateCharacterStats (может быть массивом)
            if (Array.isArray(response?.data) && response.data.length > 1 && typeof response.data[1] === 'string') {
                emotion = response.data[1];
            }

            if (emotion) {
                 console.log("Hook: Emotion triggered:", emotion);
                 setTriggeredEmotion(emotion);
            }

            // --- ИЗМЕНЕНИЕ: Вызываем refreshDataCallback только если skipRefresh=false ---
            if (refreshDataCallback && !skipRefresh) {
                console.log("Hook: Refreshing data after successful action...");
                await refreshDataCallback();
            } else if (skipRefresh) {
                 console.log("Hook: Skipping data refresh as requested.");
            }
            // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        } catch (err) {
            console.error(`${errorMessagePrefix} error:`, err);
            let errorMessage = `${errorMessagePrefix}.`;
            // ... (логика извлечения сообщения об ошибке без изменений) ...
            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) { const firstError = detail[0]; const field = firstError.loc?.slice(1).join('.') || 'поле'; errorMessage = `Ошибка валидации: ${firstError.msg} (поле: ${field})`; }
                else if (typeof detail === 'string') { errorMessage = detail; }
                else { errorMessage = JSON.stringify(detail); }
            } else if (err.message) { errorMessage = err.message; }
            setActionError(String(errorMessage));
        }
    }, [refreshDataCallback]); // Зависимость только от refreshDataCallback

    const clearActionError = useCallback(() => setActionError(null), []);
    const clearTriggeredEmotion = useCallback(() => setTriggeredEmotion(null), []);

    return { handleApiAction, actionError, triggeredEmotion, clearActionError, clearTriggeredEmotion };
}
