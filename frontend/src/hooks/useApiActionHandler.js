// src/hooks/useApiActionHandler.js
import { useState, useCallback } from 'react';

export function useApiActionHandler(refreshDataCallback) {
    const [actionError, setActionError] = useState(null);
    const [triggeredEmotion, setTriggeredEmotion] = useState(null);

    const handleApiAction = useCallback(async (actionPromise, successMessage = "", errorMessagePrefix = "Ошибка") => {
        setActionError(null);
        setTriggeredEmotion(null);
        try {
            const response = await actionPromise;
            console.log(successMessage || `${errorMessagePrefix}: Успех`);

            let emotion = null;
            // Ищем эмоцию в ответе от updateCharacterStats
            // Предполагаем, что бэкенд возвращает [character_data, emotion_name]
            if (Array.isArray(response?.data) && response.data.length > 1 && typeof response.data[1] === 'string'){
                emotion = response.data[1];
            }
            // Если updateCharacterStats возвращает объект с полем triggered_emotion (как могло быть раньше)
            // else if (typeof response?.data === 'object' && response.data.triggered_emotion) {
            //    emotion = response.data.triggered_emotion;
            // }


             if (emotion) {
                 console.log("Hook: Emotion triggered:", emotion);
                 setTriggeredEmotion(emotion);
                 // Можно добавить таймер для сброса setTriggeredEmotion(null) через 5 сек
             }

            if (refreshDataCallback) {
                await refreshDataCallback();
            }

        } catch (err) {
            console.error(`${errorMessagePrefix} error:`, err);
            let errorMessage = `${errorMessagePrefix}.`;
            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
                    const firstError = detail[0];
                    const field = firstError.loc?.slice(1).join('.') || 'поле';
                    errorMessage = `Ошибка валидации: ${firstError.msg} (поле: ${field})`;
                } else if (typeof detail === 'string') {
                    errorMessage = detail;
                } else {
                     errorMessage = JSON.stringify(detail);
                }
            } else if (err.message) {
                errorMessage = err.message;
            }
            setActionError(String(errorMessage));
        }
    }, [refreshDataCallback]);

    const clearActionError = useCallback(() => setActionError(null), []);
    const clearTriggeredEmotion = useCallback(() => setTriggeredEmotion(null), []);


    return { handleApiAction, actionError, triggeredEmotion, clearActionError, clearTriggeredEmotion };
}