// src/features/CharacterDetail/sections/CharacterStatusSection.js
import React, { useState, useMemo } from 'react';
// Импортируем StatDisplay и theme
import StatDisplay from '../../../components/UI/StatDisplay';
import { theme } from '../../../styles/theme';
// Импортируем apiService для вызова лечения
import * as apiService from '../../../api/apiService';
// Импортируем модалки
import AddStatusModal from '../modals/AddStatusModal';
import StatusEffectDetailModal from '../modals/StatusEffectDetailModal';
import SelectMedkitModal from '../modals/SelectMedkitModal';

// Компонент теперь принимает handleApiAction ИЗ useApiActionHandler
const CharacterStatusSection = ({
    character,
    handleApiAction, // <--- Функция из useApiActionHandler
    onLevelUpClick,
    refreshCharacterData, // <--- Функция для обновления данных (если нужна для AddStatusModal)
}) => {
    const [xpToAdd, setXpToAdd] = useState('');
    // Состояния для модалок статусов (оставляем здесь для примера)
    const [showAddStatusModal, setShowAddStatusModal] = useState(false);
    const [showStatusEffectModal, setShowStatusEffectModal] = useState(false);
    const [selectedStatusEffectForModal, setSelectedStatusEffectForModal] = useState(null);
    // --- СОСТОЯНИЕ ДЛЯ МОДАЛКИ ВЫБОРА АПТЕЧКИ ---
    const [showSelectMedkitModal, setShowSelectMedkitModal] = useState(false);
    // --- НОВОЕ СОСТОЯНИЕ ДЛЯ ВВОДА УРОНА ---
    const [damageInput, setDamageInput] = useState('');
    // -----------------------------------------


    // --- useMemo ПЕРЕМЕЩЕН ВВЕРХ ---
    // Логика определения наличия аптечек
    const availableMedkits = useMemo(() => {
        // Проверяем character?.inventory внутри useMemo
        if (!character?.inventory || !Array.isArray(character.inventory)) {
            return [];
        }
        return character.inventory.filter(invItem =>
            invItem.item?.category === 'Медицина' // Фильтруем по категории
        );
        // Зависимость character.inventory - хук перезапустится при его изменении
    }, [character?.inventory]);
    // --- КОНЕЦ ПЕРЕМЕЩЕННОГО БЛОКА ---

    // Ранний выход, если нет данных персонажа
    if (!character) return null;

    // Определяем состояния ПОСЛЕ проверки на character
    const hasMedkit = availableMedkits.length > 0;
    // --- ВОТ ПРОВЕРКА НА ПОЛНОЕ ЗДОРОВЬЕ ---
    const isHpFull = character.current_hp >= character.max_hp;
    // --- КОНЕЦ ПРОВЕРКИ ---
    const isHpZero = character.current_hp <= 0; // Проверка на нулевое здоровье
    const hasStamina = character.stamina_points > 0;
    const canLevelUp = character.experience_points >= (character.xp_needed_for_next_level || Infinity);
    const xpProgress = character.xp_needed_for_next_level && character.xp_needed_for_next_level > 0
        ? Math.min(100, Math.floor((character.experience_points / character.xp_needed_for_next_level) * 100))
        : (character.level > 0 ? 100 : 0);

    // --- Обработчики действий ---
    const handleAddExperience = () => {
        const amount = parseInt(xpToAdd, 10);
        if (isNaN(amount) || amount <= 0) {
             alert("Введите положительное число XP.");
             return;
        }
        const newTotalXp = (character.experience_points || 0) + amount;
        // Используем handleApiAction для обновления статов
        handleApiAction(
            apiService.updateCharacterStats(character.id, { experience_points: newTotalXp }),
            `${amount} XP добавлено`, `Ошибка добавления XP`
        );
        setXpToAdd('');
    };

    const handlePuChange = (delta, result = null) => {
        const currentPu = character.current_pu ?? 0;
        const targetPu = currentPu + delta;
        // Используем handleApiAction для обновления статов
        handleApiAction(
            apiService.updateCharacterStats(character.id, { current_pu: targetPu }, result),
            `ПУ изменено`, `Ошибка изменения ПУ`
        );
    };

    const handleRemoveStatus = (effectId) => {
         if (window.confirm(`Снять состояние?`)) {
             // Используем handleApiAction для удаления статуса
             handleApiAction(
                 apiService.removeStatusEffect(character.id, effectId),
                 `Статус ${effectId} снят`, `Ошибка снятия состояния`
             );
         }
     };

     const handleStatusEffectClick = (effect) => {
         setSelectedStatusEffectForModal(effect);
         setShowStatusEffectModal(true);
     };

    // Обработчик клика по кнопке "Лечить (Аптечка)"
    const handleHealMedkitClick = () => {
        if (!hasMedkit || isHpFull) return; // Не делаем ничего, если кнопка должна быть неактивна

        if (availableMedkits.length === 1) {
            // Если аптечка одна, используем ее сразу
            const medkitInvItemId = availableMedkits[0].id;
            console.log(`Using single medkit, inventory item ID: ${medkitInvItemId}`);
            handleApiAction(
                apiService.healCharacter(character.id, { source: 'medkit', inventory_item_id: medkitInvItemId }),
                "Аптечка использована",
                "Ошибка лечения аптечкой"
            );
        } else {
            // Если аптечек несколько, открываем модалку выбора
            console.log("Multiple medkits found, opening selection modal.");
            setShowSelectMedkitModal(true);
        }
    };

    // Обработчик выбора аптечки из модалки
    const handleMedkitSelected = (selectedInventoryItemId) => {
        console.log(`Medkit selected from modal, inventory item ID: ${selectedInventoryItemId}`);
        setShowSelectMedkitModal(false); // Закрываем модалку выбора
        // Вызываем API с выбранным ID
        handleApiAction(
            apiService.healCharacter(character.id, { source: 'medkit', inventory_item_id: selectedInventoryItemId }),
            "Выбранная аптечка использована",
            "Ошибка лечения выбранной аптечкой"
        );
    };

    // Обработчик лечения отдыхом
    const handleHealShortRest = () => {
        if (isHpFull || !hasStamina) return; // Не делаем ничего, если кнопка должна быть неактивна
        // Используем handleApiAction для лечения отдыхом
        handleApiAction(
            apiService.healCharacter(character.id, { source: 'short_rest_die', dice_count: 1 }),
            "Очко Стойкости потрачено на лечение",
            "Ошибка лечения отдыхом"
        );
    };

    // --- НОВЫЙ ОБРАБОТЧИК ДЛЯ ПРИМЕНЕНИЯ УРОНА ---
    const handleApplyDamage = () => {
        const damageAmount = parseInt(damageInput, 10);
        if (isNaN(damageAmount) || damageAmount <= 0) {
            alert("Введите положительное число урона.");
            return;
        }
        if (character.current_hp <= 0) {
            alert("Персонаж уже при смерти."); // Не наносим урон, если HP <= 0
            return;
        }

        const newHp = Math.max(0, character.current_hp - damageAmount); // Не уходим ниже нуля
        console.log(`Applying damage: ${damageAmount}. New HP calculated: ${newHp}`);

        // Используем тот же handleApiAction, что и для других изменений статов
        handleApiAction(
            apiService.updateCharacterStats(character.id, { current_hp: newHp }),
            `${damageAmount} урона применено`,
            "Ошибка применения урона"
        );
        setDamageInput(''); // Очищаем поле ввода
    };
    // --- КОНЕЦ НОВОГО ОБРАБОТЧИКА ---


    // --- Рендеринг компонента ---
    // Вычисляем состояние неактивности для каждой кнопки
    const isHealMedkitDisabled = isHpFull || !hasMedkit;
    const isHealRestDisabled = isHpFull || !hasStamina;
    // Состояние кнопки урона
    const isApplyDamageDisabled = !damageInput || parseInt(damageInput, 10) <= 0 || isHpZero;

    return (
        <>
            {/* --- Модальные окна --- */}
            {/* Модалка добавления статуса */}
            {showAddStatusModal && (
                <AddStatusModal
                    characterId={character.id}
                    onClose={() => setShowAddStatusModal(false)}
                    onSuccess={() => {
                        setShowAddStatusModal(false);
                        if (refreshCharacterData) refreshCharacterData(); // Обновляем данные, если функция передана
                    }}
                />
            )}
            {/* Модалка деталей статуса */}
            {showStatusEffectModal && selectedStatusEffectForModal && (
                <StatusEffectDetailModal
                    effect={selectedStatusEffectForModal}
                    onClose={() => {
                        setShowStatusEffectModal(false);
                        setSelectedStatusEffectForModal(null);
                    }}
                />
            )}
            {/* Модалка выбора аптечки */}
            {showSelectMedkitModal && (
                <SelectMedkitModal
                    availableMedkits={availableMedkits} // Передаем найденные аптечки
                    onClose={() => setShowSelectMedkitModal(false)}
                    onSelect={handleMedkitSelected} // Передаем обработчик выбора
                />
            )}

            {/* --- Секция Статус --- */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Статус</h2>
                {/* Уровень и Опыт */}
                <StatDisplay label="Уровень" value={character.level} />
                <StatDisplay label="Опыт" value={`${character.experience_points} / ${character.xp_needed_for_next_level ?? 'МАКС'}`} />
                <div style={styles.xpBarContainer} title={`${xpProgress}% до следующего уровня`}>
                    <div style={{ ...styles.xpBarProgress, width: `${xpProgress}%` }}></div>
                </div>
                <div style={styles.addXpContainer}>
                    <input
                        type="number"
                        min="1"
                        value={xpToAdd}
                        onChange={(e) => setXpToAdd(e.target.value)}
                        placeholder="Добавить XP"
                        style={styles.addXpInput}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddExperience()}
                    />
                    <button onClick={handleAddExperience} style={styles.addXpButton} title="Добавить опыт">+</button>
                </div>
                {canLevelUp && (
                    <button onClick={onLevelUpClick} style={styles.levelUpButton}>Повысить Уровень!</button>
                )}

                {/* Основные Статы */}
                <div style={styles.coreStatsGrid}>
                    {/* Отображение ПЗ с цветом */}
                    <div style={{ ...styles.statItem }}>
                        <span style={styles.statLabel}>ПЗ:</span>
                        <span style={{ ...styles.statValue, color: character.current_hp <= character.max_hp / 4 ? theme.colors.error : (character.current_hp <= character.max_hp / 2 ? theme.colors.warning : theme.colors.text) }}>
                            {character.current_hp} / {character.max_hp}
                        </span>
                    </div>
                    <StatDisplay label="ОС" value={character.stamina_points} />
                    <StatDisplay label="Истощение" value={character.exhaustion_level} />
                    <StatDisplay label="КЗ" value={character.total_ac} />
                    <StatDisplay label="Иниц." value={character.initiative_bonus >= 0 ? `+${character.initiative_bonus}` : character.initiative_bonus} />
                    <StatDisplay label="Скор." value={`${character.speed} м.`} />
                    <StatDisplay label="Пасс.Вним." value={character.passive_attention} />
                </div>

                {/* --- НОВЫЙ БЛОК ДЛЯ ВВОДА УРОНА --- */}
                <div style={styles.damageInputContainer}>
                    <input
                        type="number"
                        min="1"
                        value={damageInput}
                        onChange={(e) => setDamageInput(e.target.value)}
                        placeholder="Полученный урон"
                        style={styles.damageInput}
                        onKeyPress={(e) => e.key === 'Enter' && handleApplyDamage()}
                        disabled={isHpZero} // Блокируем ввод, если HP 0
                    />
                    <button
                        onClick={handleApplyDamage}
                        // Применяем базовый стиль + стиль для неактивного состояния, если нужно
                        style={isApplyDamageDisabled ? { ...styles.applyDamageButton, ...styles.applyDamageButtonDisabled } : styles.applyDamageButton}
                        disabled={isApplyDamageDisabled}
                        title={isHpZero ? "Персонаж уже при смерти" : "Применить урон"}
                    >
                        Применить урон
                    </button>
                </div>
                {/* --- КОНЕЦ БЛОКА УРОНА --- */}


                 {/* Кнопки Лечения */}
                 <div style={styles.healButtonsContainer}>
                     <button
                         onClick={handleHealMedkitClick}
                         // Применяем базовый стиль + стиль для неактивного состояния, если нужно
                         style={isHealMedkitDisabled ? { ...styles.healButton, ...styles.healButtonDisabled } : styles.healButton}
                         disabled={isHealMedkitDisabled}
                         title={isHpFull ? "Здоровье уже полное" : hasMedkit ? "Использовать аптечку (1d8 + Мод.Мед)" : "Нет аптечек в инвентаре"}
                     >
                         {/* Показываем количество аптечек */}
                         Лечить (Аптечка) {hasMedkit ? `(${availableMedkits.length})` : ''}
                     </button>
                     <button
                         onClick={handleHealShortRest}
                         // Применяем базовый стиль + стиль для неактивного состояния, если нужно
                         style={isHealRestDisabled ? { ...styles.healButton, ...styles.healButtonDisabled } : styles.healButton}
                         disabled={isHealRestDisabled}
                         title={isHpFull ? "Здоровье уже полное" : hasStamina ? `Потратить 1 ОС (ост. ${character.stamina_points}) для лечения (1d10 + Мод.Вын)` : "Нет Очков Стойкости"}
                     >
                         Лечить (Отдых - 1 ОС)
                     </button>
                 </div>
            </div>

            {/* --- Секция Псих. Устойчивость --- */}
            <div style={{ ...styles.section, ...styles.puSection }}>
                 <h2 style={{ ...styles.sectionTitle, borderBottomColor: theme.colors.puColor || theme.colors.secondary }}> Псих. Устойчивость </h2>
                <div style={styles.puDisplayContainer}>
                    <span style={styles.puValue}>{character.current_pu ?? 0}</span>
                    <span style={styles.puSeparator}>/</span>
                    <span style={styles.puBaseValue}>{character.base_pu ?? 1}</span>
                </div>
                <div style={styles.puControlContainer}>
                    <label style={styles.puLabel}>Изменить:</label>
                    <div style={styles.puButtons}>
                        <button onClick={() => handlePuChange(-1, 'failure')} style={{ ...styles.puButton, ...styles.puButtonFailure }} title="-1 ПУ (Провал)">-1 Провал</button>
                        <button onClick={() => handlePuChange(-1)} style={styles.puButton} title="-1 ПУ (Прочее)">-1</button>
                        <button onClick={() => handlePuChange(1)} style={styles.puButton} title="+1 ПУ (Прочее)">+1</button>
                        <button onClick={() => handlePuChange(1, 'success')} style={{ ...styles.puButton, ...styles.puButtonSuccess }} title="+1 ПУ (Успех)">+1 Успех</button>
                    </div>
                </div>
            </div>

             {/* --- Секция Активные Состояния --- */}
             <div style={styles.section}>
                 <div style={{ ...styles.tabHeader, marginBottom: '10px', paddingBottom: '5px' }}>
                     <h2 style={{ ...styles.sectionTitle, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>Активные Состояния</h2>
                     <button onClick={() => setShowAddStatusModal(true)} style={{ ...styles.addItemButton, padding: '4px 8px' }} title="Добавить состояние">+</button>
                 </div>
                 {/* Проверяем наличие active_status_effects перед map */}
                 {character.active_status_effects && character.active_status_effects.length > 0 ? (
                     <div style={styles.statusTagContainer}>
                         {character.active_status_effects.map(effect => (
                             <div key={effect.id} style={{ ...styles.statusTag, ...(effect.name.startsWith('ПУ:') ? styles.statusTagPu : {}) }} title={effect.description || "Нажмите для описания"}>
                                 <span onClick={() => handleStatusEffectClick(effect)} style={styles.statusTagName}>
                                     {effect.name}
                                 </span>
                                 <button onClick={() => handleRemoveStatus(effect.id)} style={styles.removeStatusButtonTag} title="Снять состояние">×</button>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <p style={styles.placeholderText}>Нет активных состояний.</p>
                 )}
             </div>
        </>
    );
};

// Стили (включая обновленные стили для :disabled кнопки лечения)
const styles = {
    section: { background: theme.effects.glass, backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '20px', boxShadow: theme.effects.shadow, marginBottom: '25px' },
    sectionTitle: { margin: '0 0 15px 0', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}`, paddingBottom: '8px', fontSize: '1.2rem' },
    coreStatsGrid: { marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px 15px' },
    statItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: `1px solid ${theme.colors.surface}33`, fontSize: '0.95rem' },
    statLabel: { color: theme.colors.textSecondary, marginRight: '10px', whiteSpace: 'nowrap' },
    statValue: { fontWeight: 'bold', textAlign: 'right', wordBreak: 'break-word' },
    xpBarContainer: { height: '8px', background: theme.colors.surface, borderRadius: '4px', overflow: 'hidden', margin: '8px 0' },
    xpBarProgress: { height: '100%', background: theme.colors.primary, borderRadius: '4px', transition: 'width 0.5s ease-in-out' },
    addXpContainer: { display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '5px' },
    addXpInput: { flexGrow: 1, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '0.9rem', boxSizing: 'border-box', appearance: 'textfield', '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 }, '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 } },
    addXpButton: { padding: '8px 12px', background: theme.colors.secondary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: theme.transitions.default, ':hover': { opacity: 0.9 } },
    levelUpButton: { display: 'block', width: '100%', padding: '10px', marginTop: '15px', background: `linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.secondary})`, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: theme.transitions.default, ':hover': { boxShadow: `0 0 15px ${theme.colors.primary}99`, transform: 'translateY(-1px)' } },
    damageInputContainer: { display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surface}55` },
    damageInput: { flexGrow: 1, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.error}88`, background: `${theme.colors.error}11`, color: theme.colors.text, fontSize: '1rem', boxSizing: 'border-box', textAlign: 'center', appearance: 'textfield', '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 }, '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 }, ':disabled': { background: `${theme.colors.surface}55`, borderColor: `${theme.colors.textSecondary}44`, cursor: 'not-allowed', opacity: 0.6 } },
    applyDamageButton: { padding: '10px 20px', borderRadius: '8px', border: `1px solid ${theme.colors.error}`, background: `${theme.colors.error}cc`, color: theme.colors.text, cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap', ':hover:not(:disabled)': { background: theme.colors.error, boxShadow: `0 0 8px ${theme.colors.error}88` }, },
    applyDamageButtonDisabled: { opacity: 0.5, cursor: 'not-allowed', background: `${theme.colors.surface}55`, borderColor: `${theme.colors.textSecondary}44`, color: `${theme.colors.textSecondary}99`, boxShadow: 'none', },
    healButtonsContainer: { display: 'flex', justifyContent: 'space-around', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surface}55` },
    healButton: { padding: '8px 15px', borderRadius: '8px', border: `1px solid ${theme.colors.success || '#66BB6A'}`, background: `${theme.colors.success || '#66BB6A'}22`, color: theme.colors.success || '#66BB6A', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.9rem', fontWeight: '500', flex: '1', textAlign: 'center', },
    healButtonDisabled: { opacity: 0.6, cursor: 'not-allowed', borderColor: `${theme.colors.textSecondary}44`, background: `${theme.colors.surface}55`, color: `${theme.colors.textSecondary}99`, boxShadow: 'none', transform: 'none' },
    puSection: { borderTop: `3px solid ${theme.colors.puColor || theme.colors.secondary}55`, background: `${theme.colors.puColor || theme.colors.secondary}0A` },
    puDisplayContainer: { textAlign: 'center', margin: '5px 0 15px 0', padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' },
    puValue: { fontSize: '2rem', fontWeight: 'bold', color: theme.colors.primary },
    puSeparator: { fontSize: '1.5rem', margin: '0 5px', color: theme.colors.textSecondary },
    puBaseValue: { fontSize: '1.2rem', color: theme.colors.textSecondary },
    puControlContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop:'15px', borderTop: `1px dashed ${theme.colors.surface}55`, marginTop:'15px' },
    puLabel: { color: theme.colors.textSecondary, fontSize: '0.9rem', marginRight: 'auto', fontWeight:'bold' },
    puButtons: { display: 'flex', gap: '8px' },
    puButton: { padding: '6px 10px', fontSize: '0.85rem', minWidth: '40px', background: theme.colors.surface, color: theme.colors.textSecondary, border: `1px solid ${theme.colors.textSecondary}88`, borderRadius: '6px', cursor: 'pointer', transition: theme.transitions.default, ':hover': { borderColor: theme.colors.primary, color: theme.colors.primary, background: `${theme.colors.primary}11` } },
    puButtonFailure: { borderColor: theme.colors.error, color: theme.colors.error, ':hover': { background: `${theme.colors.error}22` } },
    puButtonSuccess: { borderColor: theme.colors.secondary, color: theme.colors.secondary, ':hover': { background: `${theme.colors.secondary}22` } },
    tabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.colors.surface}66`, paddingBottom: '5px'},
    addItemButton: { padding: '6px 12px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: theme.transitions.default, ':hover': {opacity: 0.9} },
    statusTagContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', justifyContent: 'flex-start' },
    statusTag: { display: 'inline-flex', alignItems: 'center', background: theme.colors.surface, border: `1px solid ${theme.colors.textSecondary}55`, borderRadius: '15px', padding: '5px 10px 5px 12px', fontSize: '0.9rem', cursor: 'default', transition: 'all 0.2s ease', ':hover': { borderColor: `${theme.colors.primary}88`, background: `${theme.colors.primary}11` } },
    statusTagPu: { borderColor: theme.colors.primary, background: `${theme.colors.primary}15` },
    statusTagName: { cursor: 'pointer', marginRight: '5px', color: theme.colors.text, ':hover': { color: theme.colors.primary, textDecoration: 'underline' } },
    removeStatusButtonTag: { background: 'transparent', color: theme.colors.error, border: 'none', padding: '0', marginLeft: '4px', fontSize: '1.1rem', lineHeight: '1', cursor: 'pointer', opacity: 0.6, ':hover': { opacity: 1 } },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '20px' },
};

export default CharacterStatusSection;
