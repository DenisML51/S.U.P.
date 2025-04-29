// src/hooks/useApiActionHandler.js
import { useState, useCallback } from 'react';

/**
 * Хук для обработки вызовов API с отображением ошибок и опциональным обновлением данных.
 * @param {Function | null} refreshDataCallback - Функция для обновления данных после успешного вызова API.
 */
export function useApiActionHandler(refreshDataCallback) {
    const [actionError, setActionError] = useState(null);
    const [triggeredEmotion, setTriggeredEmotion] = useState(null);

    /**
     * Обрабатывает промис API-вызова.
     * @param {Promise} actionPromise - Промис, возвращаемый функцией apiService.
     * @param {string} successMessage - Сообщение при успехе (для лога).
     * @param {string} errorMessagePrefix - Префикс сообщения об ошибке.
     * @param {object} options - Дополнительные опции.
     * @param {boolean} options.skipRefresh - Если true, не вызывать refreshDataCallback при успехе.
     * @returns {Promise<any|null>} Промис, который разрешается данными успешного ответа API или null при ошибке.
     */
    const handleApiAction = useCallback(async (
        actionPromise,
        successMessage = "",
        errorMessagePrefix = "Ошибка",
        options = {}
    ) => {
        const { skipRefresh = false } = options;

        setActionError(null);
        setTriggeredEmotion(null);
        try {
            const response = await actionPromise; // Ждем выполнения промиса API
            console.log(successMessage || `${errorMessagePrefix}: Успех`);

            let emotion = null;
            // Проверка ответа от updateCharacterStats
            if (Array.isArray(response?.data) && response.data.length > 1 && typeof response.data[1] === 'string') {
                emotion = response.data[1];
            }
            // --- ИЗМЕНЕНИЕ: Проверка ответа от других эндпоинтов, возвращающих CharacterDetailedOut или ActionResultOut ---
            let responseData = response?.data;
            // Если ответ - это ActionResultOut, и он содержит обновленные данные персонажа
            if (responseData?.details?.updated_character) {
                 console.log("Hook: Found updated_character in ActionResultOut details.");
                 responseData = responseData.details.updated_character;
            }
            // Если ответ - это массив [CharacterDetailedOut, emotion]
            else if (Array.isArray(responseData) && responseData.length > 0 && typeof responseData[0] === 'object' && responseData[0]?.id) {
                 console.log("Hook: Found CharacterDetailedOut in array response.");
                 responseData = responseData[0]; // Берем первый элемент (данные персонажа)
            }
            // Если ответ - это просто CharacterDetailedOut
            else if (typeof responseData === 'object' && responseData?.id && responseData?.name) {
                 console.log("Hook: Response data seems to be CharacterDetailedOut.");
                 // responseData уже содержит нужные данные
            } else {
                 console.log("Hook: Response data format not recognized for immediate update or emotion check.");
                 responseData = null; // Не можем извлечь данные для обновления/эмоции
            }

            if (emotion) {
                 console.log("Hook: Emotion triggered:", emotion);
                 setTriggeredEmotion(emotion);
            }

            if (refreshDataCallback && !skipRefresh) {
                console.log("Hook: Refreshing data after successful action...");
                await refreshDataCallback();
            } else if (skipRefresh) {
                 console.log("Hook: Skipping data refresh as requested.");
            }

            // --- ИЗМЕНЕНИЕ: Возвращаем данные успешного ответа ---
            // Возвращаем извлеченные данные персонажа или исходные данные ответа
            return responseData || response?.data || null;
            // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        } catch (err) {
            console.error(`${errorMessagePrefix} error:`, err);
            let errorMessage = `${errorMessagePrefix}.`;
            if (err.response?.data?.detail) { /* ... (логика извлечения ошибки) ... */ }
            else if (err.message) { errorMessage = err.message; }
            setActionError(String(errorMessage));
            return null; // Возвращаем null при ошибке
        }
    }, [refreshDataCallback]);

    const clearActionError = useCallback(() => setActionError(null), []);
    const clearTriggeredEmotion = useCallback(() => setTriggeredEmotion(null), []);

    return { handleApiAction, actionError, triggeredEmotion, clearActionError, clearTriggeredEmotion };
}
