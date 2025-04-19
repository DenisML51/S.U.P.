// src/features/Admin/AdminPage.js
import React from 'react';
// --- Убедитесь, что пути правильные ---
import { theme } from '../../styles/theme';
import { useAuth } from '../../hooks/useAuth'; // Теперь используем useAuth для получения имени
// ---

const AdminPage = () => {
    // --- ИЗМЕНЕНИЕ: Убираем локальное состояние и useEffect для проверки ---
    // const [isAdminVerified, setIsAdminVerified] = useState(false);
    // const [isLoading, setIsLoading] = useState(true);
    // const [error, setError] = useState(null);
    // const [username, setUsername] = useState('Admin');
    // const navigate = useNavigate();

    // Получаем пользователя из useAuth (роутер уже проверил права)
    const { user } = useAuth();
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---


    // --- Рендеринг ---
    // Проверка isLoading и isAdminVerified больше не нужна здесь,
    // так как App.js не отрендерит этот компонент, если проверка не пройдена

    return (
        <div style={styles.pageContainer}>
            <div style={styles.contentContainer}>
                <h1 style={styles.title}>Панель Администратора</h1>
                <p style={styles.welcome}>
                    Добро пожаловать, <strong style={{ color: theme.colors.primary }}>{user?.username || 'Admin'}</strong>!
                </p>
                <p style={styles.content}>
                    Эта страница доступна только администраторам.
                    <br />
                    Здесь будут размещены инструменты управления.
                </p>
                {/* Сюда можно будет добавлять компоненты админки */}
            </div>
        </div>
    );
};

// Стили (оставляем как были)
const styles = {
    pageContainer: {
        minHeight: 'calc(100vh - 60px)',
        padding: '30px',
        background: theme.colors.background,
    },
    contentContainer: {
        maxWidth: '1200px', margin: '0 auto', padding: '30px',
        background: theme.colors.surface, borderRadius: '12px',
        boxShadow: theme.effects.shadow, color: theme.colors.text,
    },
    title: {
        color: theme.colors.primary, textAlign: 'center', marginBottom: '30px',
        fontSize: '1.8rem', borderBottom: `1px solid ${theme.colors.surfaceVariant}`,
        paddingBottom: '15px',
    },
    welcome: { fontSize: '1.2rem', textAlign: 'center', marginBottom: '20px', color: theme.colors.text },
    content: { color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 1.6 },
    // loading и error стили больше не нужны здесь
};

export default AdminPage;
