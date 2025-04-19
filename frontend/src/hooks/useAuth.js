// src/hooks/useAuth.js
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom'; // useNavigate можно использовать в компонентах, где нужен редирект после logout
import * as apiService from '../api/apiService'; // Убедитесь, что путь правильный

// Создаем контекст
const AuthContext = createContext(null);

// Провайдер контекста
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Хранит объект пользователя {id, username, is_admin, ...} или null
    const [isLoading, setIsLoading] = useState(true); // Флаг начальной загрузки/проверки токена

    // Функция для проверки токена и загрузки данных пользователя
    const fetchUser = useCallback(async () => {
        const token = localStorage.getItem("token");
        console.log("AuthProvider fetchUser: Checking token...");
        if (token) {
            try {
                console.log("AuthProvider fetchUser: Token found, fetching user data...");
                // Устанавливаем токен для будущих запросов axios (если apiService это не делает)
                // axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; // Пример
                const response = await apiService.getCurrentUser(); // Запрашиваем данные текущего пользователя
                if (response.data) {
                    setUser(response.data); // Сохраняем данные пользователя
                    console.log("AuthProvider fetchUser: User data loaded:", response.data);
                } else {
                     throw new Error("No user data received");
                }
            } catch (error) {
                console.error("AuthProvider fetchUser: Failed to fetch user with token", error);
                localStorage.removeItem("token"); // Удаляем невалидный токен
                // delete axios.defaults.headers.common['Authorization']; // Удаляем заголовок
                setUser(null);
            }
        } else {
            console.log("AuthProvider fetchUser: No token found.");
            // delete axios.defaults.headers.common['Authorization']; // Убедимся, что заголовка нет
            setUser(null); // Токена нет - пользователя нет
        }
        setIsLoading(false); // Завершаем начальную загрузку
    }, []); // useCallback без зависимостей

    // Вызываем fetchUser при монтировании компонента
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // Функция входа
    const login = async (username, password) => {
        // setIsLoading(true); // Можно установить isLoading, но форма входа обычно имеет свой индикатор
        try {
            const response = await apiService.loginUser(username, password);
            localStorage.setItem("token", response.data.access_token);
            console.log("AuthProvider login: Login successful, fetching user data...");
            // Устанавливаем токен для axios перед запросом пользователя
            // axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
            await fetchUser(); // Сразу загружаем данные пользователя после успешного логина
            // setIsLoading(false); // isLoading сбросится внутри fetchUser
            return true; // Успех
        } catch (error) {
            console.error("AuthProvider login: Login failed", error);
            localStorage.removeItem("token");
            // delete axios.defaults.headers.common['Authorization'];
            setUser(null);
            // setIsLoading(false);
            throw error; // Передаем ошибку дальше для обработки в форме
        }
    };

    // Функция выхода
    const logout = () => {
        console.log("AuthProvider logout: Logging out...");
        localStorage.removeItem("token");
        // delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        // Редирект лучше делать в компоненте, который вызывает logout, используя useNavigate
    };

    // Значение, передаваемое через контекст
    // Используем useMemo для предотвращения лишних ререндеров у потребителей контекста
    const value = useMemo(() => ({
        user, // Сам объект пользователя (или null)
        isAdmin: user?.is_admin || false, // Флаг админа
        isAuthenticated: !!user, // Флаг аутентификации
        isLoading, // Флаг загрузки
        login,
        logout,
        refreshUser: fetchUser // Функция для ручного обновления данных пользователя
    }), [user, isLoading, fetchUser]); // Зависимости useMemo

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Хук для использования контекста
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        // Эта ошибка возникает, если useAuth используется вне AuthProvider
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
