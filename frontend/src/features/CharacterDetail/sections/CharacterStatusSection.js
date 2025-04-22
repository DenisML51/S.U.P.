// src/features/CharacterDetail/sections/CharacterStatusSection.js
import React, { useState, useMemo } from 'react';
import StatDisplay from '../../../components/UI/StatDisplay';
import { theme } from '../../../styles/theme'; // Предполагается, что тема импортируется
import * as apiService from '../../../api/apiService';
import AddStatusModal from '../modals/AddStatusModal';
import StatusEffectDetailModal from '../modals/StatusEffectDetailModal';
import SelectMedkitModal from '../modals/SelectMedkitModal';
import ShortRestModal from '../modals/ShortRestModal';
// --- НОВЫЙ ИМПОРТ ---
// Убедись, что путь к компоненту фона правильный
import AnimatedFluidBackground from '../components/AnimatedFluidBackground'; // Предполагаем, что этот компонент существует по указанному пути

// --- Вспомогательные функции для ПУ ---
/**
 * Определяет цвет для шкалы ПУ в зависимости от текущего значения.
 * @param {number} currentPu - Текущее значение ПУ (0-10).
 * @returns {string} - Цвет в HEX или CSS формате.
 */
const getPuBarColor = (currentPu) => {
    if (currentPu <= 1) return theme.colors.error || '#CF6679'; // Красный при 0-1
    if (currentPu <= 3) return theme.colors.warning || '#FFA726'; // Оранжевый при 2-3
    if (currentPu >= 8) return theme.colors.secondary || '#03DAC6'; // Бирюзовый при 8-10
    return theme.colors.primary || '#BB86FC'; // Фиолетовый (основной) для середины 4-7
};

const BuffIcon = () => <svg style={styles.statusEffectIcon} viewBox="0 0 24 24"><path fill="currentColor" d="M12 4l1.41 1.41L11 7.83V20h2V7.83l-2.41-2.42L12 4z"/></svg>; // Стрелка вверх
const DebuffIcon = () => <svg style={styles.statusEffectIcon} viewBox="0 0 24 24"><path fill="currentColor" d="M12 20l-1.41-1.41L13 16.17V4h-2v12.17l2.41 2.42L12 20z"/></svg>; // Стрелка вниз
const MentalIcon = () => <svg style={styles.statusEffectIcon} viewBox="0 0 24 24"><path fill="currentColor" d="M12 3a9 9 0 00-9 9a9 9 0 009 9a9 9 0 009-9a9 9 0 00-9-9M9 17.25A3.25 3.25 0 015.75 14A3.25 3.25 0 019 10.75A3.25 3.25 0 0112.25 14A3.25 3.25 0 019 17.25m6 0A3.25 3.25 0 0111.75 14A3.25 3.25 0 0115 10.75A3.25 3.25 0 0118.25 14A3.25 3.25 0 0115 17.25z"/></svg>; // Мозг
const NeutralIcon = () => <svg style={styles.statusEffectIcon} viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg>; // Инфо

// --- Функция для определения стиля и иконки эффекта ---
const getStatusEffectStyleAndIcon = (effect) => {
    const nameLower = effect.name?.toLowerCase() || '';
    let color = theme.colors.textSecondary + '88'; // Default: серый
    let IconComponent = NeutralIcon;
    let type = 'neutral'; // Тип для стилизации карточки

    if (nameLower.startsWith('пу:')) {
        color = theme.colors.primary;
        IconComponent = MentalIcon;
        type = 'mental';
    } else if (nameLower.includes('замедление') || nameLower.includes('ослабление') || nameLower.includes('уязвимость') || nameLower.includes('горение') || nameLower.includes('отравление') || nameLower.includes('ослепление')) {
        color = theme.colors.error;
        IconComponent = DebuffIcon;
        type = 'debuff';
    } else if (nameLower.includes('ускорение') || nameLower.includes('усиление') || nameLower.includes('защита') || nameLower.includes('регенерация') || nameLower.includes('невидимость')) {
        color = theme.colors.success || '#66BB6A'; // Используем success или fallback
        IconComponent = BuffIcon;
        type = 'buff';
    }

    return { color, IconComponent, type }; // Возвращаем цвет, компонент иконки и тип
};

// --- Основной Компонент ---
const CharacterStatusSection = ({
    character, // Данные персонажа
    handleApiAction, // Функция для обработки вызовов API с уведомлениями
    onLevelUpClick, // Функция для открытия модалки повышения уровня
    refreshCharacterData, // Функция для обновления данных персонажа после действия
}) => {
    // --- Состояния Компонента ---
    const [xpToAdd, setXpToAdd] = useState(''); // Для инпута добавления XP
    const [xpToRemove, setXpToRemove] = useState(''); // Для инпута вычитания XP
    const [showAddStatusModal, setShowAddStatusModal] = useState(false); // Показать/скрыть модалку добавления статуса
    const [showStatusEffectModal, setShowStatusEffectModal] = useState(false); // Показать/скрыть модалку деталей статуса
    const [selectedStatusEffectForModal, setSelectedStatusEffectForModal] = useState(null); // Выбранный статус для модалки
    const [showSelectMedkitModal, setShowSelectMedkitModal] = useState(false); // Показать/скрыть модалку выбора аптечки
    const [damageInput, setDamageInput] = useState(''); // Для инпута урона
    const [healInput, setHealInput] = useState(''); // --- НОВОЕ: Для инпута лечения ---
    const [showShortRestModal, setShowShortRestModal] = useState(false); // Показать/скрыть модалку короткого отдыха

    // --- Мемоизированные вычисления для оптимизации ---
    // Доступные аптечки в инвентаре
    const availableMedkits = useMemo(() => {
        if (!character?.inventory || !Array.isArray(character.inventory)) { return []; }
        return character.inventory.filter(invItem => invItem.item?.category === 'Медицина');
    }, [character?.inventory]);

    // Максимальное количество Очков Стойкости (ОС)
    const maxStaminaPoints = useMemo(() => {
         if (!character) return 1;
         // Макс ОС = Уровень персонажа (минимум 1)
         return Math.max(1, (character.level ?? 1));
    }, [character?.level]);

    // Процент текущего здоровья
    const hpPercentage = useMemo(() => {
        if (!character || !character.max_hp || character.max_hp <= 0) return 0;
        return Math.max(0, Math.min(100, (character.current_hp / character.max_hp) * 100));
    }, [character?.current_hp, character?.max_hp]);

    // Прогресс опыта до следующего уровня
    const xpProgress = useMemo(() => {
        if (!character || !character.xp_needed_for_next_level || character.xp_needed_for_next_level <= 0) {
             // Если порог не задан (макс уровень?), показываем 100%
             return (character?.level ?? 0) > 0 ? 100 : 0;
        }
        return Math.min(100, Math.floor((character.experience_points / character.xp_needed_for_next_level) * 100));
    }, [character?.experience_points, character?.xp_needed_for_next_level, character?.level]);

    // Расчеты для Психологической Устойчивости (ПУ)
    const currentPu = character?.current_pu ?? 0;
    const basePu = character?.base_pu ?? 1;
    const puPercentage = Math.max(0, Math.min(100, (currentPu / 10) * 100)); // Шкала 0-10
    const puBarColor = useMemo(() => getPuBarColor(currentPu), [currentPu]); // Цвет шкалы ПУ
    const basePuPercentage = Math.max(0, Math.min(100, (basePu / 10) * 100)); // Позиция метки базового ПУ

    // Определение активного ПУ-эффекта (для двухфазного отображения)
    const activePuEffect = useMemo(() => {
        if (!character?.active_status_effects) return null;
        // Ищем первый эффект, имя которого начинается с "ПУ:"
        return character.active_status_effects.find(effect => effect.name?.startsWith('ПУ:'));
    }, [character?.active_status_effects]);

    // Ранний выход, если нет данных персонажа
    if (!character) return null;

    // Определяем состояния для UI (доступность кнопок и т.д.)
    const canLevelUp = character.experience_points >= (character.xp_needed_for_next_level || Infinity);
    const hasMedkit = availableMedkits.length > 0;
    const isHpFull = character.current_hp >= character.max_hp;
    const isHpZero = character.current_hp <= 0;
    const hasStamina = character.stamina_points > 0;
    const canFailPu = currentPu > 0; // Можно провалить проверку, если ПУ > 0
    const canSucceedPu = currentPu < 10; // Можно успешно пройти проверку, если ПУ < 10

    // --- Обработчики Действий ---

    // Добавление опыта
    const handleAddExperience = () => {
        const amount = parseInt(xpToAdd, 10);
        if (!isNaN(amount) && amount > 0) {
            const newTotalXp = (character.experience_points || 0) + amount;
            handleApiAction(apiService.updateCharacterStats(character.id, { experience_points: newTotalXp }), `${amount} XP добавлено`, `Ошибка добавления XP`);
            setXpToAdd('');
        } else { alert("Введите положительное число XP."); }
    };

    // Вычитание опыта
    const handleRemoveExperience = () => {
        const amount = parseInt(xpToRemove, 10);
        // Проверяем, что amount > 0 и у персонажа есть опыт
        if (!isNaN(amount) && amount > 0 && character.experience_points > 0) {
            const newTotalXp = Math.max(0, (character.experience_points || 0) - amount);
            handleApiAction(apiService.updateCharacterStats(character.id, { experience_points: newTotalXp }), `${amount} XP вычтено`, `Ошибка вычитания XP`);
            setXpToRemove('');
        } else if (character.experience_points === 0) {
             alert("У персонажа нет опыта для вычитания."); // Сообщение, если опыта 0
        } else { alert("Введите положительное число XP для вычитания."); }
    };

    // Изменение ПУ (вручную или через проверку)
    const handlePuChange = (delta, result = null) => {
        const currentPuValue = character.current_pu ?? 0;
        const targetPu = currentPuValue + delta; // Не ограничиваем здесь, бэкэнд обработает 0 и 10
        handleApiAction(
            apiService.updateCharacterStats(character.id, { current_pu: targetPu }, result), // Передаем результат (success/failure)
            `ПУ изменено`,
            `Ошибка изменения ПУ`
        );
    };

    // Снятие статус-эффекта
    const handleRemoveStatus = (effectId) => {
        const effectToRemove = character.active_status_effects.find(e => e.id === effectId);
        // Используем window.confirm для подтверждения
        if (window.confirm(`Снять состояние "${effectToRemove?.name || 'это'}"?`)) {
            handleApiAction(
                apiService.removeStatusEffect(character.id, effectId),
                `Статус "${effectToRemove?.name || ''}" снят`,
                `Ошибка снятия состояния`
            );
        }
    };

    // Открытие модалки с деталями статус-эффекта
    const handleStatusEffectClick = (effect) => {
        setSelectedStatusEffectForModal(effect);
        setShowStatusEffectModal(true);
    };

    // Использование аптечки
    const handleHealMedkitClick = () => {
        if (!hasMedkit || isHpFull) return;
        // Если аптечка одна, используем сразу
        if (availableMedkits.length === 1) {
            handleApiAction(
                apiService.activateAction(character.id, { activation_type: 'item', target_id: availableMedkits[0].id }),
                "Аптечка использована", "Ошибка лечения аптечкой"
            );
        } else {
            // Если аптечек несколько, открываем модалку выбора
            setShowSelectMedkitModal(true);
        }
    };

    // Обработка выбора аптечки из модалки
    const handleMedkitSelected = (selectedInventoryItemId) => {
        setShowSelectMedkitModal(false);
        handleApiAction(
            apiService.activateAction(character.id, { activation_type: 'item', target_id: selectedInventoryItemId }),
            "Выбранная аптечка использована", "Ошибка лечения выбранной аптечкой"
        );
    };

    // Применение урона
    const handleApplyDamage = () => {
        const damageAmount = parseInt(damageInput, 10);
        if (!isNaN(damageAmount) && damageAmount > 0 && !isHpZero) {
            const newHp = Math.max(0, character.current_hp - damageAmount);
            handleApiAction(
                apiService.updateCharacterStats(character.id, { current_hp: newHp }),
                `${damageAmount} урона применено`, "Ошибка применения урона"
            );
            setDamageInput('');
        } else if (isHpZero) { alert("Персонаж уже при смерти.");
        } else { alert("Введите положительное число урона."); }
    };

    // --- НОВОЕ: Применение лечения ---
    const handleApplyHeal = () => {
        const healAmount = parseInt(healInput, 10);
        if (!isNaN(healAmount) && healAmount > 0 && !isHpFull) {
            const newHp = Math.min(character.max_hp, character.current_hp + healAmount);
            handleApiAction(
                apiService.updateCharacterStats(character.id, { current_hp: newHp }),
                `${healAmount} ПЗ восстановлено`, "Ошибка лечения"
            );
            setHealInput('');
        } else if (isHpFull) { alert("Здоровье персонажа уже полное.");
        } else { alert("Введите положительное число лечения."); }
    };

    // Открытие модалки короткого отдыха
    const handleOpenShortRestModal = () => {
        if (hasStamina) setShowShortRestModal(true);
        else alert("Нет Очков Стойкости.");
    };

    // Выполнение короткого отдыха
    const handlePerformShortRest = (diceCount) => {
        setShowShortRestModal(false);
        handleApiAction(apiService.performShortRest(character.id, diceCount), `Короткий отдых (${diceCount} ОС) завершен`, "Ошибка короткого отдыха");
    };

    // Выполнение длительного отдыха
    const handlePerformLongRest = () => {
        if (window.confirm("Начать длительный отдых? Это восстановит ПЗ, ОС, ПУ и снизит Истощение.")) {
            handleApiAction(apiService.performLongRest(character.id), "Длительный отдых завершен", "Ошибка длительного отдыха");
        }
    };

    // --- Состояния кнопок для UI ---
    const isHealMedkitDisabled = isHpFull || !hasMedkit;
    const isShortRestDisabled = !hasStamina;
    const isApplyDamageDisabled = !damageInput || parseInt(damageInput, 10) <= 0 || isHpZero;
    const isApplyHealDisabled = !healInput || parseInt(healInput, 10) <= 0 || isHpFull;
    // --- ИЗМЕНЕНИЕ: Логика отключения кнопки вычитания XP ---
    const isRemoveXpButtonDisabled = !xpToRemove || parseInt(xpToRemove, 10) <= 0 || character.experience_points === 0;
    // --- ИЗМЕНЕНИЕ: Логика отключения поля ввода вычитания XP ---
    const isRemoveXpInputDisabled = character.experience_points === 0;
    const hpBarColor = hpPercentage <= 25 ? theme.colors.error : hpPercentage <= 50 ? (theme.colors.warning || '#FFA726') : (theme.colors.success || '#66BB6A');

    // --- Рендеринг ---
    return (
        <>
            {/* --- Модальные окна --- */}
            {showAddStatusModal && (
                <AddStatusModal characterId={character.id} onClose={() => setShowAddStatusModal(false)}
                                onSuccess={() => {
                                    setShowAddStatusModal(false);
                                    if (refreshCharacterData) refreshCharacterData();
                                }}/>)}
            {showStatusEffectModal && selectedStatusEffectForModal && (
                <StatusEffectDetailModal effect={selectedStatusEffectForModal} onClose={() => {
                    setShowStatusEffectModal(false);
                    setSelectedStatusEffectForModal(null);
                }}/>)}
            {showSelectMedkitModal && (
                <SelectMedkitModal availableMedkits={availableMedkits} onClose={() => setShowSelectMedkitModal(false)}
                                   onSelect={handleMedkitSelected}/>)}
            {showShortRestModal && (
                <ShortRestModal currentStamina={character.stamina_points} maxStamina={maxStaminaPoints}
                                onClose={() => setShowShortRestModal(false)} onSubmit={handlePerformShortRest}/>)}

            {/* --- Секция Статус --- */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Статус</h2>
                <StatDisplay label="Уровень" value={character.level}/>
                <StatDisplay label="Опыт"
                             value={`${character.experience_points} / ${character.xp_needed_for_next_level ?? 'МАКС'}`}/>
                <div style={styles.xpBarContainer} title={`${xpProgress}% до следующего уровня`}>
                    <div style={{...styles.xpBarProgress, width: `${xpProgress}%`}}></div>
                </div>
                <div style={styles.xpControlContainer}>
                    <div style={styles.xpActionGroup}><input type="number" min="1" value={xpToAdd}
                                                             onChange={(e) => setXpToAdd(e.target.value)}
                                                             placeholder="Добавить XP"
                                                             style={{...styles.xpInput, ...styles.xpInputAdd}}
                                                             onKeyPress={(e) => e.key === 'Enter' && handleAddExperience()}/>
                        <button onClick={handleAddExperience} style={{...styles.xpButton, ...styles.xpButtonAdd}}
                                title="Добавить опыт">+
                        </button>
                    </div>
                    <div style={styles.xpActionGroup}>
                        {/* --- ИЗМЕНЕНИЕ: Применяем isRemoveXpInputDisabled к input --- */}
                        <input type="number" min="1" value={xpToRemove}
                               onChange={(e) => setXpToRemove(e.target.value)}
                               placeholder="Отнять XP"
                               style={{...styles.xpInput, ...styles.xpInputRemove}}
                               onKeyPress={(e) => e.key === 'Enter' && !isRemoveXpButtonDisabled && handleRemoveExperience()}
                               disabled={isRemoveXpInputDisabled}/> {/* Используем новое условие */}
                        {/* --- ИЗМЕНЕНИЕ: Применяем isRemoveXpButtonDisabled к button --- */}
                        <button onClick={handleRemoveExperience} style={{...styles.xpButton, ...styles.xpButtonRemove}}
                                title={isRemoveXpInputDisabled ? "Опыт уже на нуле" : "Отнять опыт"}
                                disabled={isRemoveXpButtonDisabled}>- {/* Используем старое условие для кнопки */}
                        </button>
                    </div>
                </div>
                {canLevelUp && (
                    <button onClick={onLevelUpClick} style={styles.levelUpButton}>Повысить Уровень!</button>)}
                <div style={styles.coreStatsGrid}>
                    <div style={styles.hpBarOuterContainer}>
                        <span style={styles.statLabelHp}>ПЗ:</span>
                        <div style={styles.hpBarContainer}
                             title={`${character.current_hp} / ${character.max_hp} (${hpPercentage.toFixed(0)}%)`}>
                            <div style={{
                                ...styles.hpBarFill,
                                width: `${hpPercentage}%`,
                                backgroundColor: hpBarColor
                            }}></div>
                            <span style={styles.hpBarText}>{character.current_hp} / {character.max_hp}</span>
                        </div>
                    </div>
                    <StatDisplay label="ОС" value={`${character.stamina_points} / ${maxStaminaPoints}`}/>
                    <StatDisplay label="Истощение" value={character.exhaustion_level}/>
                    <StatDisplay label="КЗ" value={character.total_ac}/>
                    <StatDisplay label="Иниц."
                                 value={character.initiative_bonus >= 0 ? `+${character.initiative_bonus}` : character.initiative_bonus}/>
                    <StatDisplay label="Скор." value={`${character.speed} м.`}/>
                    <StatDisplay label="Пасс.Вним." value={character.passive_attention}/>
                </div>

                {/* --- Разделенный контейнер для урона и лечения --- */}
                <div style={styles.damageHealContainer}>
                    {/* Группа Урона (слева) */}
                    <div style={styles.damageHealGroup}>
                        <input
                            type="number"
                            min="1"
                            value={damageInput}
                            onChange={(e) => setDamageInput(e.target.value)}
                            placeholder="Урон"
                            style={{...styles.damageHealInput, ...styles.damageInput}}
                            onKeyPress={(e) => e.key === 'Enter' && !isApplyDamageDisabled && handleApplyDamage()}
                            disabled={isHpZero}
                        />
                        <button
                            onClick={handleApplyDamage}
                            style={{...styles.damageHealButton, ...styles.applyDamageButton}}
                            disabled={isApplyDamageDisabled}
                            title={isHpZero ? "Персонаж уже при смерти" : "Применить урон"}
                        >
                           –
                        </button>
                    </div>
                    {/* Группа Лечения (справа) */}
                    <div style={styles.damageHealGroup}>
                        <input
                            type="number"
                            min="1"
                            value={healInput}
                            onChange={(e) => setHealInput(e.target.value)}
                            placeholder="Лечение"
                            style={{...styles.damageHealInput, ...styles.healInput}}
                            onKeyPress={(e) => e.key === 'Enter' && !isApplyHealDisabled && handleApplyHeal()}
                            disabled={isHpFull}
                        />
                        <button
                            onClick={handleApplyHeal}
                            style={{...styles.damageHealButton, ...styles.applyHealButton}}
                            disabled={isApplyHealDisabled}
                            title={isHpFull ? "Здоровье полное" : "Применить лечение"}
                        >
                            +
                        </button>
                    </div>
                </div>
                {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}

                <div style={styles.actionButtonsContainer}>
                    <button onClick={handleHealMedkitClick}
                            style={{...styles.actionButton, ...(isHealMedkitDisabled ? styles.actionButtonDisabled : styles.healButtonMedkitActive)}}
                            disabled={isHealMedkitDisabled}
                            title={isHpFull ? "Здоровье полное" : hasMedkit ? "Исп. аптечку" : "Нет аптечек"}> Аптечка {hasMedkit ? `(${availableMedkits.length})` : ''} </button>
                    <button onClick={handleOpenShortRestModal}
                            style={{...styles.actionButton, ...(isShortRestDisabled ? styles.actionButtonDisabled : styles.restButtonShortActive)}}
                            disabled={isShortRestDisabled}
                            title={hasStamina ? `Начать короткий отдых (есть ${character.stamina_points} ОС)` : "Нет ОС для отдыха"}> Кор.
                        Отдых
                    </button>
                    <button onClick={handlePerformLongRest}
                            style={{...styles.actionButton, ...styles.restButtonLongActive}}
                            title="Начать длительный отдых (8 часов)"> Длит. Отдых
                    </button>
                </div>
            </div>

            {/* === Секция Псих. Устойчивость (v5 - с Компонентом Фона) === */}
            <div style={{
                ...styles.section,
                ...(activePuEffect ? {
                    position: 'relative',
                    overflow: 'hidden'
                } : {})
            }}>
                {activePuEffect && <AnimatedFluidBackground/>}
                <h3 style={styles.sectionTitlePu}>
                    Псих. Устойчивость
                </h3>
                {activePuEffect ? (
                    <div style={{...styles.puPhase2Container, position: 'relative', zIndex: 1}}>
                        <div style={styles.activePuEffectWrapper}>
                            <div
                                style={styles.activePuEffectName}
                                onClick={() => handleStatusEffectClick(activePuEffect)}
                                title={activePuEffect.description || "Нажмите для деталей"}
                            >
                                {activePuEffect.name}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveStatus(activePuEffect.id);
                                }}
                                style={styles.removePuEffectButton}
                                title="Снять состояние"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={styles.puValueDisplay}>
                            <span style={styles.puCurrentValueLabel}>Текущее:</span>
                            <div style={styles.puManualAdjust}>
                                <button onClick={() => handlePuChange(-1)} style={styles.puManualButton}
                                        disabled={currentPu <= 0} title="Корректировка -1 ПУ">-
                                </button>
                                <span style={styles.puCurrentValueNumber}>{currentPu}</span>
                                <button onClick={() => handlePuChange(1)} style={styles.puManualButton}
                                        disabled={currentPu >= 10} title="Корректировка +1 ПУ">+
                                </button>
                            </div>
                            <span style={styles.puBaseValueLabel}>Базовое: {basePu}</span>
                        </div>
                        <div style={styles.puBarContainer} title={`Текущее ПУ: ${currentPu}, Базовое: ${basePu}`}>
                            <div style={{...styles.puBaseMark, left: `${basePuPercentage}%`}}></div>
                            <div style={{
                                ...styles.puBarFill,
                                width: `${puPercentage}%`,
                                backgroundColor: puBarColor
                            }}></div>
                        </div>
                        <div style={styles.puControlContainer}>
                            <label style={styles.puLabel}>Результат Проверки:</label>
                            <div style={styles.puButtons}>
                                <button onClick={() => handlePuChange(-1, 'failure')}
                                        style={{...styles.puButton, ...styles.puButtonFailure}} disabled={!canFailPu}
                                        title={canFailPu ? "Провал проверки (-1 ПУ, возможна НЭ)" : "ПУ уже на нуле"}> Провал
                                </button>
                                <button onClick={() => handlePuChange(1, 'success')}
                                        style={{...styles.puButton, ...styles.puButtonSuccess}} disabled={!canSucceedPu}
                                        title={canSucceedPu ? "Успех проверки (+1 ПУ, возможна ПЭ)" : "ПУ уже на максимуме"}> Успех
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* --- Секция Активные Состояния --- */}
            <div style={styles.section}>
                <div style={styles.tabHeader}>
                    <h2 style={{
                        ...styles.sectionTitle,
                        borderBottom: 'none',
                        marginBottom: 0,
                        paddingBottom: 0
                    }}>Активные Состояния</h2>
                    <button onClick={() => setShowAddStatusModal(true)} style={styles.addStateButton}
                            title="Добавить состояние">+
                    </button>
                </div>
                 {/* --- Контейнер для карточек состояний --- */}
                <div style={styles.statusEffectGridContainer}>
                    {(character.active_status_effects && character.active_status_effects.length > 0) ? (
                        character.active_status_effects
                            .filter(effect => !effect.name?.startsWith('ПУ:')) // Фильтруем ПУ эффекты
                            .map(effect => {
                                const {color, IconComponent, type} = getStatusEffectStyleAndIcon(effect);
                                const cardSpecificStyle = { borderLeftColor: color }; // Динамически задаем цвет левой рамки

                                return (
                                    <div key={effect.id} style={{...styles.statusEffectCard, ...cardSpecificStyle}}
                                         className="status-card-hover">
                                        <div style={{...styles.statusEffectIconContainer, backgroundColor: `${color}22`, color: color }}>
                                            <IconComponent/>
                                        </div>
                                        <span
                                            onClick={() => handleStatusEffectClick(effect)}
                                            style={styles.statusEffectName}
                                            title={effect.description || "Нажмите для описания"}
                                        >
                                         {effect.name}
                                     </span>
                                        <button
                                            onClick={() => handleRemoveStatus(effect.id)}
                                            style={styles.removeStatusEffectButton}
                                            title="Снять состояние"
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            })
                    ) : (
                        <p style={styles.placeholderText}>Нет активных состояний.</p>
                    )}
                    {/* Сообщение, если есть только ПУ эффект */}
                    {character.active_status_effects &&
                        character.active_status_effects.length > 0 &&
                        character.active_status_effects.every(effect => effect.name?.startsWith('ПУ:')) &&
                        !activePuEffect && // Убедимся, что ПУ-эффект не активен в фазе 2
                        <p style={styles.placeholderText}>Нет других активных состояний.</p>
                    }
                </div>
                {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                {/* Добавляем стили для hover-эффектов карточек статусов */}
                <style>{`
                .status-card-hover {
                    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
                }
                .status-card-hover:hover {
                    transform: translateY(-3px) scale(1.02);
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                }
             `}</style>
            </div>
            </>
            );
            };

            // --- Стили ---
            // Базовые стили кнопок действий
            const actionButton = {
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${theme.colors.textSecondary}88`,
                background: `${theme.colors.surface}cc`,
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                transition: theme.transitions.default,
                fontSize: '0.85rem',
                fontWeight: '500',
                flex: '1',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                '&:hover:not(:disabled)': { background: `${theme.colors.surface}e6` },
                '&:disabled': { opacity: 0.6, cursor: 'not-allowed', filter: 'grayscale(50%)' } // Объединяем disabled стиль
            };
            // const actionButtonDisabled = {opacity: 0.6, cursor: 'not-allowed', filter: 'grayscale(50%)'}; // Удалено
            const healButtonMedkitActive = {
                borderColor: theme.colors.success || '#66BB6A',
                color: theme.colors.success || '#66BB6A',
                background: `${theme.colors.success || '#66BB6A'}22`,
                '&:hover:not(:disabled)': {background: `${theme.colors.success || '#66BB6A'}33`}
            };
            const restButtonShortActive = {
                borderColor: theme.colors.secondary,
                color: theme.colors.secondary,
                background: `${theme.colors.secondary}22`,
                '&:hover:not(:disabled)': {background: `${theme.colors.secondary}33`}
            };
            const restButtonLongActive = {
                borderColor: theme.colors.primary,
                color: theme.colors.primary,
                background: `${theme.colors.primary}22`,
                '&:hover:not(:disabled)': {background: `${theme.colors.primary}33`}
            };

            // --- НОВЫЕ/ИЗМЕНЕННЫЕ СТИЛИ для урона/лечения ---
            const damageHealContainer = { // Контейнер для двух групп
                display: 'flex',
                gap: '15px', // Расстояние между группами урона и лечения
                marginTop: '20px',
                paddingTop: '15px',
                borderTop: `1px solid ${theme.colors.surface}55`,
                flexWrap: 'wrap' // Перенос на новую строку на маленьких экранах
            };
            const damageHealGroup = { // Группа (инпут + кнопка)
                display: 'flex',
                gap: '8px', // Расстояние между инпутом и кнопкой
                flex: '1 1 180px', // Адаптивная ширина, как у XP
                alignItems: 'stretch' // Растягиваем элементы по высоте
            };
            const damageHealInput = { // Общий стиль для инпутов урона/лечения
                flexGrow: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid', // Цвет рамки будет разный
                background: 'rgba(255, 255, 255, 0.1)', // Полупрозрачный фон
                color: theme.colors.text,
                fontSize: '1rem',
                boxSizing: 'border-box',
                textAlign: 'center',
                appearance: 'textfield', // Убираем стрелки в number input
                '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 },
                '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 },
                '&:disabled': {
                    background: `${theme.colors.surface}55`,
                    borderColor: `${theme.colors.textSecondary}44`,
                    cursor: 'not-allowed',
                    opacity: 0.6
                }
            };
            const damageInput = { // Специфичный стиль для инпута урона
                borderColor: `${theme.colors.error}88`,
                background: `${theme.colors.error}11`,
            };
            const healInput = { // Специфичный стиль для инпута лечения
                borderColor: `${theme.colors.success || '#66BB6A'}88`,
                background: `${theme.colors.success || '#66BB6A'}11`,
            };
            const damageHealButton = { // Общий стиль для кнопок урона/лечения
                padding: '10px 15px', // Немного меньше горизонтальный паддинг
                borderRadius: '8px',
                border: '1px solid', // Цвет будет разный
                background: 'transparent', // Прозрачный фон
                color: theme.colors.text, // Цвет будет разный
                cursor: 'pointer',
                transition: theme.transitions.default,
                fontSize: '0.9rem',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                '&:disabled': { // Стили для отключенной кнопки
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    filter: 'grayscale(60%)',
                    background: 'transparent' // Убедимся, что фон не меняется
                }
            };
            const applyDamageButton = { // Специфичный стиль для кнопки урона
                borderColor: theme.colors.error,
                color: theme.colors.error,
                '&:hover:not(:disabled)': {
                    background: `${theme.colors.error}33`, // Полупрозрачный фон при наведении
                    color: theme.colors.text // Белый текст при наведении (опционально)
                }
            };
            const applyHealButton = { // Специфичный стиль для кнопки лечения
                borderColor: theme.colors.success || '#66BB6A',
                color: theme.colors.success || '#66BB6A',
                '&:hover:not(:disabled)': {
                    background: `${theme.colors.success || '#66BB6A'}33`, // Полупрозрачный фон при наведении
                    color: theme.colors.text // Белый текст при наведении (опционально)
                }
            };
            // --- КОНЕЦ НОВЫХ/ИЗМЕНЕННЫХ СТИЛЕЙ ---

            // Основной объект стилей
            const styles = {
            // Возвращаем стили section к варианту, который был до попыток убрать фон
            section: {
            background: theme.effects.glass, // Используем тему
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: theme.effects.shadow,
            marginBottom: '25px',
            transition: 'background-color 0.5s ease-in-out, border-color 0.5s ease-in-out',
            borderTop: `4px solid transparent`, // По умолчанию прозрачная рамка
        },
            sectionTitle: {
            margin: '0 0 15px 0',
            color: theme.colors.secondary,
            borderBottom: `1px solid ${theme.colors.secondary}`,
            paddingBottom: '8px',
            fontSize: '1.2rem'
        },
            coreStatsGrid: {
            marginTop: '15px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '5px 15px',
            alignItems: 'center'
        },
            xpBarContainer: {
            height: '8px',
            background: theme.colors.surface,
            borderRadius: '4px',
            overflow: 'hidden',
            margin: '8px 0'
        },
            xpBarProgress: {
            height: '100%',
            background: theme.colors.primary,
            borderRadius: '4px',
            transition: 'width 0.5s ease-in-out'
        },
            xpControlContainer: {display: 'flex', gap: '15px', marginTop: '10px', marginBottom: '5px', flexWrap: 'wrap'},
            xpActionGroup: {display: 'flex', gap: '8px', flex: '1 1 180px'},
            xpInput: {flexGrow: 1, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '0.9rem', boxSizing: 'border-box', textAlign: 'center', appearance: 'textfield', '::-webkit-outer-spin-button': {appearance: 'none', margin: 0}, '::-webkit-inner-spin-button': {appearance: 'none', margin: 0}, '&:disabled': { background: `${theme.colors.surface}55`, borderColor: `${theme.colors.textSecondary}44`, cursor: 'not-allowed', opacity: 0.6 }}, // Добавлен стиль для disabled input
            xpInputAdd: {borderColor: theme.colors.secondary},
            xpInputRemove: {borderColor: theme.colors.error},
            xpButton: {padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', lineHeight: 1, transition: theme.transitions.default, minWidth: '40px', ':disabled': {opacity: 0.5, cursor: 'not-allowed'}},
            xpButtonAdd: {background: theme.colors.secondary, color: theme.colors.background, ':hover:not(:disabled)': {opacity: 0.9}},
            xpButtonRemove: {background: theme.colors.error, color: theme.colors.text, ':hover:not(:disabled)': {opacity: 0.9}},
            levelUpButton: {display: 'block', width: '100%', padding: '10px', marginTop: '15px', background: `linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.secondary})`, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: theme.transitions.default, ':hover': {boxShadow: `0 0 15px ${theme.colors.primary}99`, transform: 'translateY(-1px)'}},
            hpBarOuterContainer: {display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: `1px solid ${theme.colors.surface}33`, gridColumn: '1 / -1'},
            statLabelHp: {color: theme.colors.textSecondary, whiteSpace: 'nowrap', fontSize: '0.95rem', flexShrink: 0},
            hpBarContainer: {flexGrow: 1, height: '20px', background: theme.colors.surface, borderRadius: '10px', overflow: 'hidden', position: 'relative', border: `1px solid ${theme.colors.surface}88`},
            hpBarFill: {height: '100%', borderRadius: '10px', transition: 'width 0.5s ease-out, background-color 0.5s ease-out', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'},
            hpBarText: {position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: theme.colors.text, textShadow: '1px 1px 1px rgba(0,0,0,0.7)'},

            // --- Используем новые стили ---
            damageHealContainer: damageHealContainer,
            damageHealGroup: damageHealGroup,
            damageHealInput: damageHealInput,
            damageInput: damageInput, // Специфичный для урона
            healInput: healInput,     // Специфичный для лечения
            damageHealButton: damageHealButton,
            applyDamageButton: applyDamageButton, // Специфичный для урона
            applyHealButton: applyHealButton,     // Специфичный для лечения
            // --- Конец использования новых стилей ---

            actionButtonsContainer: {display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surface}55`},
            actionButton: actionButton,
            // actionButtonDisabled: actionButtonDisabled, // Удалено
            healButtonMedkitActive: healButtonMedkitActive,
            restButtonShortActive: restButtonShortActive,
            restButtonLongActive: restButtonLongActive,

            // Стили для ПУ
            sectionTitlePu: {
            margin: '0 0 15px 0',
            color: theme.colors.secondary,
            fontSize: '1.2rem',
            textAlign: 'center',
            borderBottom: `1px solid ${theme.colors.secondary}44`,
            paddingBottom: '8px',
            position: 'relative',
            zIndex: 1, // Над фоном
        },
            // Фаза 1
            puValueDisplay: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 5px'},
            puCurrentValueLabel: {fontSize: '0.9rem', color: theme.colors.textSecondary, marginRight: '10px'},
            puManualAdjust: {display: 'flex', alignItems: 'center', gap: '8px'},
            puManualButton: {
            padding: '0',
            width: '28px', // Немного больше
            height: '28px',
            fontSize: '1.4rem', // Шрифт чуть крупнее
            fontWeight: 'bold',
            lineHeight: '28px', // Центрируем символ по вертикали
            textAlign: 'center', // Центрируем символ по горизонтали
            background: `${theme.colors.primary}1a`, // Полупрозрачный фон основного цвета
            color: theme.colors.primary, // Основной цвет для символа
            border: `1px solid ${theme.colors.primary}88`, // Полупрозрачная рамка основного цвета
            borderRadius: '50%', // Круглая форма
            cursor: 'pointer',
            transition: theme.transitions.default + ', transform 0.1s ease', // Добавляем transform в transition
            ':hover:not(:disabled)': {
            background: `${theme.colors.primary}33`, // Более насыщенный фон при наведении
            borderColor: theme.colors.primary, // Сплошная рамка при наведении
            color: theme.colors.text, // Белый символ при наведении
            transform: 'scale(1.05)', // Легкое увеличение
        },
            ':active:not(:disabled)': {
            transform: 'scale(0.95)', // Легкое уменьшение при нажатии
        },
            ':disabled': {
            opacity: 0.4,
            cursor: 'not-allowed',
            filter: 'grayscale(80%)',
            transform: 'scale(1)', // Убираем transform для disabled
        }
        },    puCurrentValueNumber: {fontSize: '1.8rem', fontWeight: 'bold', color: theme.colors.primary, lineHeight: 1, minWidth: '30px', textAlign: 'center'},
            puBaseValueLabel: {fontSize: '0.9rem', color: theme.colors.textSecondary, marginLeft: '10px'},
            puBarContainer: {height: '12px', background: theme.colors.surface, borderRadius: '8px', overflow: 'hidden', position: 'relative', border: `1px solid ${theme.colors.surface}cc`, marginBottom: '15px'},
            puBarFill: {height: '100%', borderRadius: '8px', transition: 'width 0.5s ease-in-out, background-color 0.5s ease-in-out', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'},
            puBaseMark: {position: 'absolute', top: '-2px', bottom: '-2px', width: '3px', background: theme.colors.textSecondary, transform: 'translateX(-50%)', borderRadius: '1px', opacity: 0.7, zIndex: 1},
            puControlContainer: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop:'15px', borderTop: `1px dashed ${theme.colors.surface}55`, marginTop:'15px'},
            puLabel: {color: theme.colors.textSecondary, fontSize: '0.9rem', marginRight: 'auto', fontWeight:'bold'},
            puButtons: {display: 'flex', gap: '15px'},
            puButton: {padding: '8px 18px', fontSize: '0.95rem', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, border: '1px solid', ':disabled': { opacity: 0.6, cursor: 'not-allowed', filter: 'grayscale(50%)' } }, // Используем общий стиль disabled из actionButton
            puButtonFailure: {borderColor: theme.colors.error, color: theme.colors.error, background: `${theme.colors.error}11`, ':hover:not(:disabled)': {background: `${theme.colors.error}33`}},
            puButtonSuccess: {borderColor: theme.colors.secondary, color: theme.colors.secondary, background: `${theme.colors.secondary}11`, ':hover:not(:disabled)': {background: `${theme.colors.secondary}33`}},

            // Фаза 2
            puPhase2Container: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            minHeight: '10px',
            position: 'relative', // Для z-index
            zIndex: 1, // Над фоном
        },
            activePuEffectWrapper: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            position: 'relative',
        },

            activePuEffectName: {
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: theme.colors.secondary,
            cursor: 'pointer',
            textShadow: `0 0 15px ${theme.colors.secondary}, 0 0 25px ${theme.colors.secondary}aa`,
            padding: '10px 20px',
            border: `1px solid ${theme.colors.secondary}`,
            borderRadius: '12px',
            backdropFilter: 'blur(3px)',
            transition: 'all 0.7s ease',
            ':hover': {
            color: theme.colors.secondary,
            borderColor: `${theme.colors.secondary}`,
            background: theme.colors.background ? `${theme.colors.background}aa` : 'rgba(30, 30, 40, 0.7)',
            textShadow: `0 0 20px ${theme.colors.secondary}, 0 0 30px ${theme.colors.secondary}cc`,
            transform: 'scale(1.05)',
        }
        },
            removePuEffectButton: {
            background: 'transparent',
            color: theme.colors.error,
            border: 'none',
            padding: '0',
            marginLeft: '8px',
            fontSize: '2rem',
            lineHeight: '1',
            cursor: 'pointer',
            opacity: 0.7,
            transition: 'all 0.2s ease',
            textShadow: `0 0 8px ${theme.colors.error}88`,
            ':hover': {
            opacity: 1,
            color: theme.colors.error,
            transform: 'scale(1.1)',
        }
        },

    tabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.colors.surface}66`, paddingBottom: '8px', marginBottom: '15px'},
    addStateButton: { // Стиль кнопки "+"
        padding: '4px 9px', // Чуть больше
        fontSize: '1.3rem',
        lineHeight: 1,
        background: theme.colors.primary + '22',
        color: theme.colors.primary,
        border: `1px solid ${theme.colors.primary}88`,
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: theme.transitions.default,
        ':hover': { background: theme.colors.primary + '44', borderColor: theme.colors.primary }
    },
    // --- Стили для карточек состояний ---
    statusEffectGridContainer: { // Контейнер теперь Grid
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', // Увеличил минимальную ширину
        gap: '12px', // Отступ между карточками
    },
    statusEffectCard: { // Базовый стиль карточки
        display: 'flex',
        alignItems: 'center',
        gap: '10px', // Немного увеличил отступ
        background: theme.colors.surface, // Более плотный фон
        border: `1px solid ${theme.colors.surface}cc`, // Рамка
        borderLeftWidth: '5px', // Толстая левая рамка для цвета
        borderRadius: '8px',
        padding: '10px 12px', // Внутренние отступы
        fontSize: '0.9rem',
        boxShadow: theme.effects.shadowSmall, // Небольшая тень
        position: 'relative', // Для позиционирования кнопки удаления
        overflow: 'hidden', // Обрезаем контент, если не влезает
        // transition добавляется через CSS класс .status-card-hover
    },
    statusEffectIconContainer: { // Контейнер для иконки
        width: '32px', // Чуть больше
        height: '32px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        // Фон и цвет текста/иконки будут зависеть от типа эффекта
        // background: 'rgba(255, 255, 255, 0.1)', // Устанавливается динамически
        // color: theme.colors.textSecondary, // Устанавливается динамически
    },
    statusEffectIcon: { // Сама иконка
        width: '20px', // Больше
        height: '20px',
        fill: 'currentColor',
    },
    statusEffectName: { // Имя эффекта
        flexGrow: 1,
        cursor: 'pointer',
        color: theme.colors.text,
        fontWeight: '500', // Полужирный
        transition: 'color 0.2s ease',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        paddingRight: '5px', // Отступ от кнопки удаления
        ':hover': {
            color: theme.colors.primary,
        }
    },
    removeStatusEffectButton: { // Кнопка удаления
        background: 'transparent',
        color: theme.colors.textSecondary,
        border: 'none',
        padding: '0 4px',
        fontSize: '1.4rem', // Крупнее крестик
        lineHeight: '1',
        cursor: 'pointer',
        borderRadius: '4px',
        opacity: 0.6, // Менее заметна по умолчанию
        transition: 'all 0.2s ease',
        ':hover': {
            opacity: 1,
            color: theme.colors.error,
            background: `${theme.colors.error}22`,
        }
    },
            placeholderText: {color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '20px'},
        };

            export default CharacterStatusSection;
