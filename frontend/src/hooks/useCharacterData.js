// src/hooks/useCharacterData.js
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as apiService from '../api/apiService';

export function useCharacterData(characterId) {
    const [character, setCharacter] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const refreshCharacterData = useCallback(async (showLoadingSpinner = false) => {
        if (showLoadingSpinner) setIsLoading(true);
        setError(null);
        if (!characterId) {
             setError("Не указан ID персонажа.");
             setIsLoading(false);
             return;
        }
        try {
            console.log("Refreshing character data via hook...");
            const res = await apiService.getCharacterDetails(characterId);
            setCharacter(res.data);
            console.log("Character data refreshed via hook:", res.data);
        } catch (err) {
            console.error("Hook: Failed to refresh character details", err);
            let errorMessage = "Ошибка обновления данных персонажа.";
            if (err.response?.data?.detail) {
                errorMessage = String(err.response.data.detail);
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            if (err.response && err.response.status === 401) {
                console.log("Hook: Unauthorized access detected, navigating to login.");
                localStorage.removeItem("token");
                navigate("/login");
            }
        } finally {
             if (showLoadingSpinner || character === null) {
                 setIsLoading(false);
             }
        }
    }, [characterId, navigate, character]);

    useEffect(() => {
        console.log(`Hook: useEffect triggered for initial load/ID change: ${characterId}`);
        if(characterId){ // Запускаем только если characterId есть
             refreshCharacterData(true);
        } else {
             setIsLoading(false); // Если ID нет, загрузку завершаем
             setError("Не указан ID персонажа для загрузки.");
        }
    }, [characterId]); // Зависимость только от characterId

    return { character, isLoading, error, refreshCharacterData, setError };
}