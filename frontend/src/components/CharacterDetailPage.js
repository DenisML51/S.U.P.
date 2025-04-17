import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as apiService from '../apiService';
import { theme } from '../theme';
import LevelUpModal from './LevelUpModal';
import AddItemModal from './AddItemModal';
import EditNotesModal from './EditNotesModal';
import AddStatusModal from './AddStatusModal';
import AbilityDetailModal from './AbilityDetailModal';
import StatusEffectDetailModal from './StatusEffectDetailModal';

// --- Вспомогательные компоненты ---

const StatDisplay = ({ label, value, className = '', style }) => (
    <div style={{...styles.statItem, ...style}} className={className}>
        <span style={styles.statLabel}>{label}:</span>
        <span style={styles.statValue}>{value ?? '-'}</span>
    </div>
);

const SkillDisplay = ({ name, level, modifier }) => (
    <div style={styles.skillItemDetail}>
        <span style={styles.skillName}>{name}:</span>
        <span style={styles.skillLevel}>{level}</span>
        <span style={styles.skillModifier}>({modifier >= 0 ? `+${modifier}` : modifier})</span>
    </div>
);

// Компонент для карточки предмета
const ItemCard = ({ character, invItem, onEquip, onDrop }) => {
    const { item, quantity, id: inventoryItemId } = invItem;
    const isEquippable = ['weapon', 'armor', 'shield'].includes(item.item_type);
    const isUsable = item.item_type === 'general';

    const isEquipped = useMemo(() =>
        character.equipped_armor?.id === inventoryItemId ||
        character.equipped_shield?.id === inventoryItemId ||
        character.equipped_weapon1?.id === inventoryItemId ||
        character.equipped_weapon2?.id === inventoryItemId
    , [character, inventoryItemId]);

    const handleEquipClick = () => {
        if (isEquipped) return;
        if (item.item_type === 'weapon') {
             const slotToTry = !character.equipped_weapon1 ? 'weapon1' : (!character.equipped_weapon2 ? 'weapon2' : 'weapon1');
             onEquip(inventoryItemId, slotToTry);
        } else if (item.item_type === 'armor') {
            onEquip(inventoryItemId, 'armor');
        } else if (item.item_type === 'shield') {
            onEquip(inventoryItemId, 'shield');
        }
    };

    const handleUseClick = () => alert(`TODO: Реализовать использование предмета ${item.name}`);

    const strengthRequirement = item?.strength_requirement ?? 0;
    const stealthDisadvantage = item?.stealth_disadvantage ?? false;

    return (
        <div style={{...styles.itemCard, ...(isEquipped ? styles.equippedItemCard : {})}}>
            <div style={styles.itemCardHeader}>
                 <span style={styles.itemName}>{item.name} {isEquipped ? '(Экипировано)' : `(x${quantity})`}</span>
                 <span style={styles.itemCategory}>[{item.category} / {item.rarity}]</span>
            </div>
            {item.description && <p style={styles.itemDescription}>{item.description}</p>}
            {item.item_type === 'weapon' && <p style={styles.itemDetails}>Урон: {item.damage} ({item.damage_type}) {item.is_two_handed ? '[Двуруч.]' : ''}</p>}
            {item.item_type === 'armor' && <p style={styles.itemDetails}>AC: {item.ac_bonus} ({item.armor_type}) {item.max_dex_bonus !== null ? `[Ловк. макс +${item.max_dex_bonus}]` : ''}</p>}
            {item.item_type === 'shield' && <p style={styles.itemDetails}>Бонус AC: +{item.ac_bonus}</p>}
            {strengthRequirement > 0 && <p style={styles.itemRequirement}>Треб. Силы: {strengthRequirement}</p>}
            {stealthDisadvantage === true && <p style={styles.itemRequirement}>Помеха Скрытности</p>}

            <div style={styles.itemCardActions}>
                 {isUsable && <button onClick={handleUseClick} style={{...styles.actionButton, ...styles.useButton}}>Исп.</button>}
                 {isEquippable && !isEquipped && <button onClick={handleEquipClick} style={styles.actionButton}>Экип.</button>}
                 <button onClick={() => onDrop(inventoryItemId)} style={{...styles.actionButton, ...styles.dropButton}}>Выбр.</button>
            </div>
        </div>
    );
};

// Детальная карточка Способности (для вкладки "Способности")
const AbilityCardDetailed = ({ ability, character }) => {
    const checkRequirements = useCallback(() => {
        if (!ability.skill_requirements || !character) return { met: true, details: [] };
        try {
            const requirements = JSON.parse(ability.skill_requirements);
            let allMet = true;
            const details = Object.entries(requirements).map(([skillKey, requiredValue]) => {
                if (!(skillKey in character)) { console.warn(`Skill key "${skillKey}" not found...`); allMet = false; return { key: skillKey, required: requiredValue, current: '?', met: false }; }
                const currentValue = character[skillKey];
                const met = currentValue >= requiredValue;
                if (!met) allMet = false;
                const skillDisplayName = skillKey.replace('skill_', '').charAt(0).toUpperCase() + skillKey.replace('skill_', '').slice(1);
                return { key: skillDisplayName, required: requiredValue, current: currentValue, met: met };
            });
            return { met: allMet, details: details };
        } catch (e) { console.error("Failed to parse skill_requirements JSON:", ability.skill_requirements, e); return { met: false, details: [{key: 'Ошибка парсинга требований', required: '', current: '', met: false}] }; }
    }, [ability, character]);

    const requirementsCheck = useMemo(() => checkRequirements(), [checkRequirements]);

    return (
        <div style={styles.abilityCard}>
            <strong style={styles.abilityName}>{ability.name}</strong>
            <span style={styles.abilityMeta}> ({ability.action_type}, КД: {ability.cooldown || 'Нет'}, Ур. {ability.level_required} [{ability.branch}]) </span>
            {requirementsCheck.details.length > 0 && !requirementsCheck.details[0].key.includes('Ошибка') && (
                 <span style={{...styles.abilityReq, color: requirementsCheck.met ? theme.colors.secondary : theme.colors.error }}>
                    Требования: {requirementsCheck.details.map((req, index) => (
                        <span key={req.key} title={`Нужно: ${req.required}, У вас: ${req.current}`}>{index > 0 ? ', ' : ''}<span style={{ textDecoration: req.met ? 'none' : 'line-through' }}> {req.key} {req.required}</span></span>
                    ))}
                 </span>
            )}
             {requirementsCheck.details.length > 0 && requirementsCheck.details[0].key.includes('Ошибка') && (
                <span style={{...styles.abilityReq, color: theme.colors.error }}>{requirementsCheck.details[0].key}</span>
            )}
            <p style={styles.abilityDescCard}>{ability.description}</p>
            <div style={styles.abilityDetails}>
                {ability.range && <span>Дальность: {ability.range}</span>}
                {ability.target && <span>Цель: {ability.target}</span>}
                {ability.duration && <span>Длительность: {ability.duration} {ability.concentration ? '(Конц.)':''}</span>}
                 {ability.saving_throw_attribute && <span>Спасбросок: {ability.saving_throw_attribute} ({ability.saving_throw_dc_formula || '?'})</span>}
                 {ability.effect_on_save_fail && <span style={styles.failEffect}>Провал: {ability.effect_on_save_fail}</span>}
                 {ability.effect_on_save_success && <span style={styles.successEffect}>Успех: {ability.effect_on_save_success}</span>}
            </div>
        </div>
    );
};

// Компонент для отображения предмета в слоте экипировки
const EquippedItemDisplay = ({ itemData }) => {
    if (!itemData || !itemData.item) return <p style={styles.emptySlotText}>Слот пуст</p>;
    const { item } = itemData;
    return (
        <div style={styles.equippedItemCardDisplay}>
            <div style={styles.equippedItemInfo}>
                <span style={styles.equippedItemName}>{item.name}</span>
                {item.item_type === 'armor' && <span style={styles.equippedItemStat}> (КЗ: {item.ac_bonus})</span>}
                {item.item_type === 'shield' && <span style={styles.equippedItemStat}> (КЗ: +{item.ac_bonus})</span>}
                {item.item_type === 'weapon' && <span style={styles.equippedItemStat}> ({item.damage})</span>}
            </div>
        </div>
    );
};

// --- Константа веток ---
const ALL_BRANCHES = [
    { key: 'medic', name: 'Медик' }, { key: 'mutant', name: 'Мутант' },
    { key: 'sharpshooter', name: 'Стрелок' }, { key: 'scout', name: 'Разведчик' },
    { key: 'technician', name: 'Техник' }, { key: 'fighter', name: 'Боец' },
    { key: 'juggernaut', name: 'Джаггернаут' }
];

// --- Основной Компонент ---
const CharacterDetailPage = () => {
    // --- State Variables ---
    const { characterId } = useParams();
    const navigate = useNavigate();
    const [character, setCharacter] = useState(null);
    const [allAbilities, setAllAbilities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [apiActionError, setApiActionError] = useState(null);
    const [activeTab, setActiveTab] = useState('equipment');
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [activeAbilitySubTab, setActiveAbilitySubTab] = useState('branch');
    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [showEditNotesModal, setShowEditNotesModal] = useState(false);
    const [showAddStatusModal, setShowAddStatusModal] = useState(false);
    const [showAbilityModal, setShowAbilityModal] = useState(false);
    const [selectedAbilityForModal, setSelectedAbilityForModal] = useState(null);
    const [showStatusEffectModal, setShowStatusEffectModal] = useState(false);
    const [selectedStatusEffectForModal, setSelectedStatusEffectForModal] = useState(null);
    const [xpToAdd, setXpToAdd] = useState('');
    const [triggeredEmotion, setTriggeredEmotion] = useState(null);

    // --- Data Fetching and Processing ---
    const refreshCharacterData = useCallback(async (showLoading = false) => {
        if(showLoading) setIsLoading(true);
        try {
            console.log("Refreshing character data...");
            const res = await apiService.getCharacterDetails(characterId);
            setCharacter(res.data);
            setError(null);
            console.log("Character data refreshed:", res.data);
        } catch (err) {
            console.error("Failed to refresh character details", err);
            let errorMessage = "Ошибка обновления данных персонажа.";
            if (err.response?.data?.detail) { errorMessage = err.response.data.detail; }
            else if (err.message) { errorMessage = err.message; }
            setError(String(errorMessage));
             if (err.response && err.response.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
            }
        } finally {
             if(showLoading) setIsLoading(false);
        }
    }, [characterId, navigate]);


    const fetchAllAbilities = useCallback(async () => {
        try {
            const res = await apiService.getAllAbilities();
            setAllAbilities(res.data);
        } catch (err) {
            console.error("Failed to fetch all abilities", err);
            setError(prev => prev ? `${prev}\nОшибка загрузки справочника способностей.` : "Ошибка загрузки справочника способностей.");
        }
    }, []);


    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([ refreshCharacterData(), fetchAllAbilities() ]);
            setIsLoading(false);
        };
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [characterId]);


    useEffect(() => {
        setApiActionError(null);
    }, [activeTab]);


    // --- Event Handlers ---
    const handleLevelUpClick = () => setShowLevelUpModal(true);
    const handleAddItemClick = () => setShowAddItemModal(true);
    const handleEditNotesClick = () => setShowEditNotesModal(true);
    const handleAddStatusClick = () => setShowAddStatusModal(true);

    const handleApiAction = async (actionPromise, successMessage, errorMessagePrefix) => {
        setApiActionError(null);
        setTriggeredEmotion(null);
        try {
            const response = await actionPromise;
            await refreshCharacterData();
            console.log(successMessage);

            let emotion = null;
            if (response?.data) {
                if (typeof response.data === 'object' && response.data.triggered_emotion !== undefined) {
                     emotion = response.data.triggered_emotion;
                } else if (Array.isArray(response.data) && response.data.length > 1 && typeof response.data[1] === 'string'){
                     emotion = response.data[1];
                }
            }
            if (emotion) {
                console.log("Emotion triggered:", emotion);
                setTriggeredEmotion(emotion);
                setTimeout(() => setTriggeredEmotion(null), 5000);
            }

        } catch (err) {
            console.error(`${errorMessagePrefix} error:`, err);
            let errorMessage = `${errorMessagePrefix}: Неизвестная ошибка.`;
            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (Array.isArray(detail) && detail.length > 0) { const firstError = detail[0]; const field = firstError.loc?.slice(1).join('.') || 'поле'; errorMessage = `Ошибка валидации: ${firstError.msg} (в поле: ${field})`; }
                else if (typeof detail === 'string') { errorMessage = detail; }
            } else if (err.message) { errorMessage = err.message; }
            setApiActionError(String(errorMessage));
        }
    };

     const handleAddExperience = () => {
        const amount = parseInt(xpToAdd, 10);
        if (!character || isNaN(amount) || amount <= 0) { setApiActionError("Введите положительное число."); return; }
        const newTotalXp = (character.experience_points || 0) + amount;
        handleApiAction( apiService.updateCharacterStats(characterId, { experience_points: newTotalXp }), `${amount} XP добавлено`, `Ошибка добавления опыта` );
        setXpToAdd('');
    };

    const handlePuChange = (delta, result = null) => {
        if (!character) return;
        const currentPu = character.current_pu ?? 0;
        const targetPu = currentPu + delta;
        console.log(`[PU Change] Button Click: Delta=${delta}, Result=${result}, Target PU=${targetPu}`);
        handleApiAction( apiService.updateCharacterStats(characterId, { current_pu: targetPu }, result), `ПУ изменено на ${delta} ${result ? `(${result})` : ''}`, `Ошибка изменения ПУ` );
    };

    const handleEquip = (inventoryItemId, slot) => { handleApiAction( apiService.equipItem(characterId, inventoryItemId, slot), `Предмет ${inventoryItemId} экипирован в ${slot}`, `Ошибка экипировки`); };
    const handleUnequip = (slot) => { handleApiAction( apiService.unequipItem(characterId, slot), `Предмет снят со слота ${slot}`, `Ошибка снятия` ); };
    const handleDropItem = (inventoryItemId) => { if (window.confirm(`Вы уверены, что хотите выбросить этот предмет? Действие необратимо.`)) { handleApiAction( apiService.removeItemFromInventory(characterId, inventoryItemId, 1), `Предмет ${inventoryItemId} удален`, `Ошибка удаления`); } };
    const handleRemoveStatus = (effectId) => { if (window.confirm(`Снять состояние?`)) { handleApiAction( apiService.removeStatusEffect(characterId, effectId), `Статус ${effectId} снят`, `Ошибка снятия состояния`); } };
    const handleAbilityCardClick = (ability) => { setSelectedAbilityForModal(ability); setShowAbilityModal(true); };
    const handleStatusEffectClick = (effect) => { setSelectedStatusEffectForModal(effect); setShowStatusEffectModal(true); }

    // --- Категоризация способностей ---
    const categorizedAbilities = useMemo(() => {
        if (!character) return { branch: [], weapon: [], special: [] };
        const branch = character.available_abilities || [];
        const weaponSet = new Set(); const weapon = [];
        const w1Item = character.equipped_weapon1?.item; const w2Item = character.equipped_weapon2?.item;
        const w1Abilities = (w1Item?.item_type === 'weapon' && Array.isArray(w1Item.granted_abilities)) ? w1Item.granted_abilities : [];
        const w2Abilities = (w2Item?.item_type === 'weapon' && Array.isArray(w2Item.granted_abilities)) ? w2Item.granted_abilities : [];
        w1Abilities.forEach(ab => { if (ab && !weaponSet.has(ab.id)) { weapon.push(ab); weaponSet.add(ab.id); } });
        w2Abilities.forEach(ab => { if (ab && !weaponSet.has(ab.id)) { weapon.push(ab); weaponSet.add(ab.id); } });
        const special = []; return { branch, weapon, special };
    }, [character]);


    // --- Рендеринг Контента Вкладок (Правая Колонка) ---
    const renderTabContent = () => {
        if (!character) return <p style={styles.placeholderText}>Нет данных для отображения.</p>;
        const actionErrorDisplay = typeof apiActionError === 'string' && apiActionError ? ( <p style={styles.apiActionErrorStyle}>{apiActionError}</p> ) : null;

        switch (activeTab) {
            case 'equipment':
                const equipmentSlots = [ { key: 'armor', label: 'Броня', itemData: character.equipped_armor }, { key: 'shield', label: 'Щит', itemData: character.equipped_shield }, { key: 'weapon1', label: 'Оружие 1', itemData: character.equipped_weapon1 }, { key: 'weapon2', label: 'Оружие 2', itemData: character.equipped_weapon2 } ];
                return (
                    <div style={styles.tabContent}>
                        <h4 style={styles.tabHeaderNoBorder}>Экипировка</h4> {actionErrorDisplay}
                        <div style={styles.equipmentSlotsContainer}> {equipmentSlots.map(slot => ( <div key={slot.key} style={styles.equipmentSlotCard}> <div style={styles.slotLabel}>{slot.label}</div> <div style={styles.slotItemContainer}> <EquippedItemDisplay itemData={slot.itemData} /> </div> {slot.itemData && ( <button onClick={() => handleUnequip(slot.key)} style={styles.unequipButtonSlot} title={`Снять ${slot.itemData?.item?.name}`}>×</button> )} </div> ))} </div>
                    </div>
                );
            case 'inventory':
                return (
                    <div style={styles.tabContent}>
                        <div style={styles.tabHeader}> <h4>Инвентарь</h4> <button onClick={handleAddItemClick} style={styles.addItemButton}>+ Добавить</button> </div>
                        {actionErrorDisplay}
                        {character.inventory.length > 0 ? ( <div style={styles.itemGrid}> {character.inventory.map(invItem => ( <ItemCard key={invItem.id} character={character} invItem={invItem} onEquip={handleEquip} onDrop={handleDropItem} /> ))} </div> ) : (<p style={styles.placeholderText}>Инвентарь пуст.</p>)}
                    </div>
                );
            case 'abilities': // Вкладка Способности с под-вкладками
                const abilitiesToRender = categorizedAbilities[activeAbilitySubTab] || [];
                return (
                    <div style={styles.tabContent}>
                         <div style={styles.tabHeader}>
                            <h4>Способности</h4>
                            <div style={styles.subTabButtons}> <button onClick={() => setActiveAbilitySubTab('branch')} style={activeAbilitySubTab === 'branch' ? styles.subTabButtonActive : styles.subTabButton}> Ветки ({categorizedAbilities.branch.length}) </button> <button onClick={() => setActiveAbilitySubTab('weapon')} style={activeAbilitySubTab === 'weapon' ? styles.subTabButtonActive : styles.subTabButton}> Оружие ({categorizedAbilities.weapon.length}) </button> </div>
                         </div>
                         {actionErrorDisplay}
                         {abilitiesToRender.length > 0 ? ( <div style={styles.abilityGrid}> {abilitiesToRender.map(ability => (<AbilityCardDetailed key={`${activeAbilitySubTab}-${ability.id}`} ability={ability} character={character} />))} </div> ) : (<p style={styles.placeholderText}>Нет способностей в этой категории.</p>)}
                    </div>
                );
             // ---- Вкладка 'status' УДАЛЕНА ----
             case 'branches': // Вкладка Ветки с минимальными карточками
                 const branches = ALL_BRANCHES.map(b => ({ ...b, level: character[`${b.key}_branch_level`] ?? 0 }));
                 const learnedAbilityIds = new Set(character.available_abilities.map(ab => ab.id));
                 const abilitiesToShow = selectedBranch ? allAbilities.filter(ab => ab.branch === selectedBranch.key).sort((a, b) => a.level_required - b.level_required) : [];
                 return (
                     <div style={{ ...styles.branchesTabContainer }}>
                         <div style={styles.branchListColumn}>
                              <h4 style={styles.subHeader}>Ветки</h4> {actionErrorDisplay}
                              <ul style={styles.branchList}> {branches.map(branch => ( <li key={branch.key} onClick={() => setSelectedBranch(branch)} style={{...styles.branchListItem, ...(selectedBranch?.key === branch.key ? styles.branchListItemActive : {})}} title={`Посмотреть ${branch.name}`}> {branch.name}: <span style={styles.branchLevel}>{branch.level}</span> </li> ))} </ul>
                         </div>
                         <div style={styles.branchAbilitiesColumn}>
                             {!selectedBranch && <p style={styles.placeholderText}>Выберите ветку слева</p>}
                             {selectedBranch && (<>
                                 <h4 style={styles.subHeader}>Способности: {selectedBranch.name}</h4>
                                 {abilitiesToShow.length > 0 ? (
                                     <div style={styles.abilityListVertical}> {/* Вертикальный список */}
                                         {abilitiesToShow.map(ability => {
                                             const isLearned = learnedAbilityIds.has(ability.id);
                                             let requirementsMet = true; if (ability.skill_requirements) { try { const reqs = JSON.parse(ability.skill_requirements); requirementsMet = Object.entries(reqs).every(([key, val]) => character[key] >= val); } catch { requirementsMet = false; } }
                                             return (
                                                 <div key={ability.id} style={{ ...styles.minimalAbilityCard, ...(isLearned ? styles.learnedAbilityMinimal : styles.unlearnedAbilityMinimal), ...(!isLearned && !requirementsMet ? styles.unmetReqMinimal : {}) }} onClick={() => handleAbilityCardClick(ability)} title={`Нажмите для деталей: ${ability.name}${!isLearned && !requirementsMet ? ' (Треб. не вып.)' : ''}`}>
                                                     <strong style={styles.minimalAbilityName}>{ability.name}</strong>
                                                     <span style={styles.minimalAbilityMeta}>{ability.action_type}, {ability.cooldown || 'Нет КД'}</span>
                                                 </div> );
                                         })}
                                     </div>
                                 ) : (<p style={styles.placeholderText}>Нет способностей.</p>)}
                             </>)}
                         </div>
                     </div>
                 );
             case 'notes':
                 return (
                     <div style={styles.tabContent}>
                         <div style={styles.tabHeader}> <h4>Заметки</h4> <button onClick={handleEditNotesClick} style={styles.editNotesButton}>Редактировать</button> </div>
                          {actionErrorDisplay}
                         <div style={styles.notesContainer}> <div style={styles.noteSection}><strong>Внешность:</strong><p>{character.appearance_notes || '-'}</p></div> <div style={styles.noteSection}><strong>Характер:</strong><p>{character.character_notes || '-'}</p></div> <div style={styles.noteSection}><strong>Мотивация:</strong><p>{character.motivation_notes || '-'}</p></div> <div style={styles.noteSection}><strong>Предыстория:</strong><p>{character.background_notes || '-'}</p></div> </div>
                     </div>
                 );
            default: return null;
        }
    };

    // --- Основной рендеринг ---
    if (isLoading) return <div style={styles.loading}>Загрузка данных персонажа...</div>;
    if (error && !character) return <div style={styles.error}>{typeof error === 'string' ? error : 'Ошибка загрузки!'} <button onClick={() => window.location.reload()}>Перезагрузить</button></div>;
    if (!character) return <div style={styles.error}>Не удалось загрузить персонажа.</div>;

    const canLevelUp = character.experience_points >= (character.xp_needed_for_next_level || Infinity);
    const xpProgress = character.xp_needed_for_next_level && character.xp_needed_for_next_level > 0 ? Math.min(100, Math.floor((character.experience_points / character.xp_needed_for_next_level) * 100)) : (character.level > 0 ? 100 : 0);

    // Группы навыков определяются здесь
    const skillGroups = {
        'Физиология': ['strength', 'dexterity', 'endurance', 'reaction', 'technique', 'adaptation'],
        'Интеллект': ['logic', 'attention', 'erudition', 'culture', 'science', 'medicine'],
        'Ментальность': ['suggestion', 'insight', 'authority', 'self_control', 'religion', 'flow']
    };

    return (
        <Fragment>
             {/* --- Модальные окна --- */}
             {showLevelUpModal && character && ( <LevelUpModal characterId={characterId} currentCharacterData={character} onClose={() => setShowLevelUpModal(false)} onLevelUpSuccess={() => refreshCharacterData(true)} /> )}
             {showAddItemModal && character && ( <AddItemModal characterId={characterId} onClose={() => setShowAddItemModal(false)} onSuccess={() => refreshCharacterData(true)} /> )}
             {showEditNotesModal && character && ( <EditNotesModal characterId={characterId} currentNotes={{ appearance_notes: character.appearance_notes, character_notes: character.character_notes, motivation_notes: character.motivation_notes, background_notes: character.background_notes }} onClose={() => setShowEditNotesModal(false)} onSuccess={() => refreshCharacterData(true)} /> )}
             {showAddStatusModal && character && ( <AddStatusModal characterId={characterId} onClose={() => setShowAddStatusModal(false)} onSuccess={() => refreshCharacterData(true)} /> )}
             {showAbilityModal && selectedAbilityForModal && ( <AbilityDetailModal ability={selectedAbilityForModal} onClose={() => { setShowAbilityModal(false); setSelectedAbilityForModal(null); }} /> )}
             {showStatusEffectModal && selectedStatusEffectForModal && ( <StatusEffectDetailModal effect={selectedStatusEffectForModal} onClose={() => { setShowStatusEffectModal(false); setSelectedStatusEffectForModal(null); }} /> )}

            {/* --- Основная разметка страницы --- */}
            <div style={styles.pageContainer}>
                 <div style={styles.header}>
                     <button onClick={() => navigate('/')} style={styles.backButton}>{"<"} Назад</button>
                     <h1 style={styles.characterNameHeader}>{character.name}</h1>
                     <div style={{minWidth: '80px'}}></div>
                 </div>

                 {/* Глобальная ошибка загрузки */}
                 {typeof error === 'string' && error && <div style={styles.apiError}>{error}</div>}

                <div style={styles.mainLayout}>
                    {/* == Левая Колонка == */}
                    <div style={styles.leftColumn}>
                        {/* Секция Статус */}
                        <div style={styles.section}>
                             <h2 style={styles.sectionTitle}>Статус</h2>
                             <StatDisplay label="Уровень" value={character.level} />
                             <StatDisplay label="Опыт" value={`${character.experience_points} / ${character.xp_needed_for_next_level ?? 'МАКС'}`} />
                             <div style={styles.xpBarContainer} title={`${xpProgress}% до следующего уровня`}> <div style={{ ...styles.xpBarProgress, width: `${xpProgress}%` }}></div> </div>
                             <div style={styles.addXpContainer}> <input type="number" min="1" value={xpToAdd} onChange={(e) => setXpToAdd(e.target.value)} placeholder="Добавить XP" style={styles.addXpInput} onKeyPress={(e) => e.key === 'Enter' && handleAddExperience()} /> <button onClick={handleAddExperience} style={styles.addXpButton} title="Добавить опыт">+</button> </div>
                             {/* Ошибка действия (XP/LevelUp) */}
                             {typeof apiActionError === 'string' && apiActionError && (apiActionError.includes('опыта') || apiActionError.includes('уровня') || apiActionError.includes('валидации')) && <p style={{...styles.apiActionErrorStyle, marginBottom: '10px'}}>{apiActionError}</p>}
                             {canLevelUp && (<button onClick={handleLevelUpClick} style={styles.levelUpButton}>Повысить Уровень!</button>)}
                             {/* Отображение сработавшей эмоции */}
                             {triggeredEmotion && ( <p style={styles.emotionTriggeredText}> Эмоция: <strong>{triggeredEmotion}</strong>! (ПУ сброшено до {character.base_pu}) </p> )}
                             {/* Статы */}
                             <div style={styles.coreStatsGrid}> <StatDisplay label="ПЗ" value={`${character.current_hp} / ${character.max_hp}`} /> <StatDisplay label="ОС" value={character.stamina_points} /> <StatDisplay label="Истощение" value={character.exhaustion_level} /> <StatDisplay label="КЗ" value={character.total_ac} /> <StatDisplay label="Иниц." value={character.initiative_bonus >= 0 ? `+${character.initiative_bonus}` : character.initiative_bonus} /> <StatDisplay label="Скор." value={`${character.speed} м.`} /> <StatDisplay label="Пасс.Вним." value={character.passive_attention} /> </div>
                        </div>

                         {/* Секция Псих. Устойчивость */}
                        <div style={{...styles.section, ...styles.puSection}}>
                            <h2 style={{...styles.sectionTitle, borderBottomColor: theme.colors.puColor || theme.colors.secondary }}>Псих. Устойчивость</h2>
                             {/* Ошибка действия (ПУ) */}
                             {typeof apiActionError === 'string' && apiActionError && (apiActionError.includes('ПУ') || apiActionError.includes('Psychological')) && <p style={{...styles.apiActionErrorStyle}}>{apiActionError}</p>}
                            <div style={styles.puDisplayContainer}>
                                <span style={styles.puValue}>{character.current_pu ?? 0}</span>
                                <span style={styles.puSeparator}>/</span>
                                <span style={styles.puBaseValue}>{character.base_pu ?? 1}</span>
                            </div>
                             <div style={styles.puControlContainer}>
                                <label style={styles.puLabel}>Изменить:</label>
                                <div style={styles.puButtons}>
                                     <button onClick={() => handlePuChange(-1, 'failure')} style={{...styles.puButton, ...styles.puButtonFailure}} title="-1 ПУ (Провал)">-1 Провал</button>
                                     <button onClick={() => handlePuChange(-1)} style={styles.puButton} title="-1 ПУ (Прочее)">-1</button>
                                     <button onClick={() => handlePuChange(1)} style={styles.puButton} title="+1 ПУ (Прочее)">+1</button>
                                     <button onClick={() => handlePuChange(1, 'success')} style={{...styles.puButton, ...styles.puButtonSuccess}} title="+1 ПУ (Успех)">+1 Успех</button>
                                </div>
                             </div>
                        </div>

                        {/* Секция Активные Состояния */}
                        <div style={styles.section}>
                            <div style={{...styles.tabHeader, marginBottom:'10px', paddingBottom:'5px'}}>
                                <h2 style={{...styles.sectionTitle, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>Активные Состояния</h2>
                                <button onClick={handleAddStatusClick} style={{...styles.addItemButton, padding: '4px 8px'}} title="Добавить состояние">+</button>
                             </div>
                             {typeof apiActionError === 'string' && apiActionError && (apiActionError.includes('состояния') || apiActionError.includes('Status')) && <p style={styles.apiActionErrorStyle}>{apiActionError}</p>}
                             {character.active_status_effects.length > 0 ? (
                               <div style={styles.statusTagContainer}> {character.active_status_effects.map(effect => ( <div key={effect.id} style={{...styles.statusTag, ...(effect.name.startsWith('ПУ:') ? styles.statusTagPu : {})}} title={effect.description || "Нажмите для описания"}> <span onClick={() => handleStatusEffectClick(effect)} style={styles.statusTagName}> {effect.name} </span> <button onClick={() => handleRemoveStatus(effect.id)} style={styles.removeStatusButtonTag} title="Снять состояние">×</button> </div> ))} </div>
                            ) : (<p style={styles.placeholderText}>Нет активных состояний.</p>)}
                        </div>

                         {/* Секция Навыки */}
                        <div style={styles.section}>
                             <h2 style={styles.sectionTitle}>Навыки</h2>
                             {typeof apiActionError === 'string' && apiActionError && apiActionError.includes('Навык') && <p style={styles.apiActionErrorStyle}>{apiActionError}</p>}
                             <div style={styles.skillsContainer}>
                                 {Object.entries(skillGroups).map(([groupName, skillKeys]) => (
                                     <details key={groupName} style={styles.skillGroupDetails} open={groupName === 'Физиология'}>
                                         <summary style={styles.skillGroupTitle}>{groupName}</summary>
                                         <div style={styles.skillGroupContent}>
                                             {skillKeys.map(key => {
                                                 const skillBaseName = `skill_${key}`;
                                                 const modifierKey = `${key}_mod`;
                                                 const modifierValue = character.skill_modifiers?.[modifierKey];
                                                 const modifier = typeof modifierValue === 'number' ? modifierValue : '?';
                                                 return (<SkillDisplay key={key} name={key.charAt(0).toUpperCase() + key.slice(1)} level={character[skillBaseName]} modifier={modifier}/>)
                                             })}
                                         </div>
                                     </details>
                                 ))}
                             </div>
                         </div>
                    </div>

                    {/* == Правая Колонка == */}
                    <div style={styles.rightColumn}>
                         {/* Кнопки вкладок */}
                         <div style={styles.tabButtons}>
                            <button onClick={() => setActiveTab('equipment')} style={activeTab === 'equipment' ? styles.tabButtonActive : styles.tabButton}>Экипировка</button>
                            <button onClick={() => setActiveTab('inventory')} style={activeTab === 'inventory' ? styles.tabButtonActive : styles.tabButton}>Инвентарь</button>
                            <button onClick={() => setActiveTab('abilities')} style={activeTab === 'abilities' ? styles.tabButtonActive : styles.tabButton}>Способности</button>
                            <button onClick={() => setActiveTab('branches')} style={activeTab === 'branches' ? styles.tabButtonActive : styles.tabButton}>Ветки</button>
                            <button onClick={() => setActiveTab('notes')} style={activeTab === 'notes' ? styles.tabButtonActive : styles.tabButton}>Заметки</button>
                         </div>
                         {/* Контент вкладки */}
                         <div style={styles.tabContentContainer}>
                             {renderTabContent()}
                         </div>
                     </div>
                </div>
            </div>
        </Fragment>
    );
};


// Стили
const styles = {
    // ... все предыдущие стили ...
    pageContainer: { minHeight: '100vh', background: theme.colors.background, color: theme.colors.text, padding: '20px', boxSizing: 'border-box' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '15px', borderBottom: `1px solid ${theme.colors.surface}`, maxWidth: '1400px', margin: '0 auto 30px auto' },
    characterNameHeader: { margin: 0, color: theme.colors.primary, fontSize: '2.2rem', textAlign: 'center', flexGrow: 1 },
    backButton: { padding: '8px 16px', background: 'transparent', color: theme.colors.textSecondary, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontWeight: 'bold', fontSize: '1rem', minWidth: '80px', textAlign: 'left', ':hover': { color: theme.colors.primary } },
    mainLayout: { display: 'flex', flexDirection: 'row', gap: '30px', maxWidth: '1400px', margin: '0 auto', flexWrap: 'wrap' },
    leftColumn: { flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: '25px', minWidth: '350px' },
    rightColumn: { flex: '1 1 calc(60% - 30px)', display: 'flex', flexDirection: 'column', minWidth: '400px' },
    section: { background: theme.effects.glass, backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '20px', boxShadow: theme.effects.shadow },
    sectionTitle: { margin: '0 0 15px 0', color: theme.colors.secondary, borderBottom: `1px solid ${theme.colors.secondary}`, paddingBottom: '8px', fontSize: '1.2rem' },
    apiError: { background: `${theme.colors.error}44`, color: theme.colors.error, padding: '10px 15px', borderRadius: '8px', border: `1px solid ${theme.colors.error}`, textAlign: 'center', marginBottom: '20px', maxWidth: '1400px', margin: '0 auto 20px auto' },
    apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' },
    statItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: `1px solid ${theme.colors.surface}33`, fontSize: '0.95rem' },
    statLabel: { color: theme.colors.textSecondary, marginRight: '10px', whiteSpace: 'nowrap' },
    statValue: { fontWeight: 'bold', textAlign: 'right', wordBreak: 'break-word' },
    coreStatsGrid: { marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px 15px' },
    xpBarContainer: { height: '8px', background: theme.colors.surface, borderRadius: '4px', overflow: 'hidden', margin: '8px 0' },
    xpBarProgress: { height: '100%', background: theme.colors.primary, borderRadius: '4px', transition: 'width 0.5s ease-in-out' },
    addXpContainer: { display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '5px' },
    addXpInput: { flexGrow: 1, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.colors.textSecondary}`, background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.text, fontSize: '0.9rem', boxSizing: 'border-box', '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 }, '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 }, appearance: 'textfield' },
    addXpButton: { padding: '8px 12px', background: theme.colors.secondary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: theme.transitions.default, ':hover': { opacity: 0.9 } },
    levelUpButton: { display: 'block', width: '100%', padding: '10px', marginTop: '15px', background: `linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.secondary})`, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: theme.transitions.default, ':hover': { boxShadow: `0 0 15px ${theme.colors.primary}99`, transform: 'translateY(-1px)' } },
    puSection: { borderTop: `3px solid ${theme.colors.puColor || theme.colors.secondary}55`, background: `${theme.colors.puColor || theme.colors.secondary}0A` }, // Стили для секции ПУ
    puDisplayContainer: { textAlign: 'center', margin: '5px 0 15px 0', padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' },
    puValue: { fontSize: '2rem', fontWeight: 'bold', color: theme.colors.primary },
    puSeparator: { fontSize: '1.5rem', margin: '0 5px', color: theme.colors.textSecondary },
    puBaseValue: { fontSize: '1.2rem', color: theme.colors.textSecondary },
    puControlContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '0px', paddingTop:'0px', borderTop: `1px dashed ${theme.colors.surface}55`, marginTop:'15px', paddingTop: '15px' },
    puLabel: { color: theme.colors.textSecondary, fontSize: '0.9rem', marginRight: 'auto', fontWeight:'bold' },
    puButtons: { display: 'flex', gap: '8px' },
    puButton: { padding: '6px 10px', fontSize: '0.85rem', minWidth: '40px', background: theme.colors.surface, color: theme.colors.textSecondary, border: `1px solid ${theme.colors.textSecondary}88`, borderRadius: '6px', cursor: 'pointer', transition: theme.transitions.default, ':hover': { borderColor: theme.colors.primary, color: theme.colors.primary, background: `${theme.colors.primary}11` } },
    puButtonFailure: { borderColor: theme.colors.error, color: theme.colors.error, ':hover': { background: `${theme.colors.error}22` } },
    puButtonSuccess: { borderColor: theme.colors.secondary, color: theme.colors.secondary, ':hover': { background: `${theme.colors.secondary}22` } },
    emotionTriggeredText: { color: theme.colors.primary, fontWeight: 'bold', textAlign: 'center', marginTop: '10px', padding: '5px', background: `${theme.colors.primary}22`, borderRadius: '4px', fontSize: '0.9rem', animation: 'fadeIn 0.5s' },
    skillsContainer: { display: 'flex', flexDirection: 'column', gap: '0px' },
    skillGroupDetails: { borderBottom: `1px solid ${theme.colors.surface}55`, marginBottom: '5px', '&[open]': { marginBottom: '10px' }, '&[open] > summary': { marginBottom: '10px', color: theme.colors.primary } },
    skillGroupTitle: { margin: '0', color: theme.colors.primary, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', padding: '8px 0', outline: 'none', listStyle: 'none', '::marker': { display: 'none' }, '::-webkit-details-marker': { display: 'none' }, position: 'relative', paddingLeft: '18px', ':before': { content: '"\\25B8"', position: 'absolute', left: 0, top: '8px', fontSize: '0.8em', transition: 'transform 0.2s ease-in-out', color: theme.colors.textSecondary } },
    'skillGroupDetails[open] > summary:before': { transform: 'rotate(90deg)', color: theme.colors.primary },
    skillGroupContent: { paddingLeft: '18px', paddingBottom: '10px', display: 'flex', flexDirection: 'column', gap: '5px' },
    skillItemDetail: { display: 'flex', alignItems: 'center', padding: '5px 0', fontSize: '0.9rem', borderBottom: `1px dashed ${theme.colors.surface}66` },
    skillName: { flexGrow: 1, color: theme.colors.textSecondary, textTransform: 'capitalize' },
    skillLevel: { fontWeight: 'bold', margin: '0 10px 0 5px', color: theme.colors.text, minWidth: '15px', textAlign: 'right' },
    skillModifier: { color: theme.colors.secondary, width: '35px', textAlign: 'right'},
    tabButtons: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', paddingBottom: '10px', borderBottom: `1px solid ${theme.colors.surface}` },
    tabButton: { padding: '8px 15px', background: theme.colors.surface, color: theme.colors.textSecondary, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.9rem', ':hover': { background: `${theme.colors.primary}44`, color: theme.colors.primary } },
    tabButtonActive: { padding: '8px 15px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: theme.transitions.default, fontSize: '0.9rem', fontWeight: 'bold', boxShadow: `0 0 10px ${theme.colors.primary}77` },
    tabContentContainer: { flexGrow: 1, background: theme.effects.glass, backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '25px', boxShadow: theme.effects.shadow, minHeight: '400px', position: 'relative' },
    tabContent: { animation: 'fadeIn 0.5s ease-out' },
    tabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: `1px solid ${theme.colors.surface}66`, paddingBottom: '10px' },
    tabHeaderNoBorder: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    subHeader: { margin: '0 0 15px 0', color: theme.colors.primary, fontSize: '1.1rem' },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '20px' },
    subTabButtons: { display: 'flex', gap: '10px', marginLeft: 'auto' },
    subTabButton: { padding: '5px 10px', fontSize: '0.85rem', background: 'transparent', border: `1px solid ${theme.colors.surface}`, color: theme.colors.textSecondary, borderRadius: '6px', cursor: 'pointer', transition: theme.transitions.default, ':hover': { borderColor: theme.colors.primary, color: theme.colors.primary } },
    subTabButtonActive: { padding: '5px 10px', fontSize: '0.85rem', background: theme.colors.primary, border: `1px solid ${theme.colors.primary}`, color: theme.colors.background, borderRadius: '6px', cursor: 'pointer', transition: theme.transitions.default },
    equipmentSlotsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' },
    equipmentSlotCard: { background: theme.colors.surface, borderRadius: '8px', padding: '15px', boxShadow: theme.effects.shadow, borderTop: `3px solid ${theme.colors.secondary}`, position: 'relative', minHeight: '80px', display: 'flex', flexDirection: 'column' },
    slotLabel: { fontWeight: 'bold', color: theme.colors.primary, marginBottom: '10px', fontSize: '0.9rem', textAlign: 'center', borderBottom: `1px dashed ${theme.colors.surface}88`, paddingBottom: '8px' },
    slotItemContainer: { flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    equippedItemCardDisplay: { width: '100%', textAlign: 'center' },
    equippedItemInfo: {},
    equippedItemName: { fontWeight: '500', color: theme.colors.text, fontSize: '0.95rem', display: 'block', marginBottom: '3px' },
    equippedItemStat: { fontSize: '0.8rem', color: theme.colors.textSecondary, fontStyle: 'italic' },
    emptySlotText: { fontStyle: 'italic', color: theme.colors.textSecondary, fontSize: '0.9rem', textAlign: 'center', alignSelf: 'center' },
    unequipButtonSlot: { position: 'absolute', top: '8px', right: '8px', background: 'rgba(255, 255, 255, 0.1)', color: theme.colors.error, border: 'none', borderRadius: '50%', width: '24px', height: '24px', padding: '0', fontSize: '1.1rem', lineHeight: '24px', textAlign: 'center', cursor: 'pointer', opacity: 0.7, transition: theme.transitions.default, ':hover': { background: theme.colors.error, color: theme.colors.surface, opacity: 1 } },
    addItemButton: { padding: '6px 12px', background: theme.colors.primary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: theme.transitions.default, ':hover': {opacity: 0.9} },
    itemGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' },
    itemCard: { background: theme.colors.surface, borderRadius: '8px', padding: '15px', boxShadow: theme.effects.shadow, display: 'flex', flexDirection: 'column', gap: '8px', transition: theme.transitions.default },
    equippedItemCard: { borderLeft: `4px solid ${theme.colors.secondary}` },
    itemCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
    itemName: { fontWeight: 'bold', color: theme.colors.primary, wordBreak: 'break-word' },
    itemCategory: { fontSize: '0.8rem', color: theme.colors.textSecondary, marginLeft: '5px', whiteSpace: 'nowrap' },
    itemDescription: { fontSize: '0.85rem', color: theme.colors.textSecondary, margin: '0 0 4px 0' },
    itemDetails: { fontSize: '0.8rem', color: theme.colors.textSecondary, margin: '4px 0 0 0', fontStyle: 'italic' },
    itemRequirement: { fontSize: '0.8rem', color: theme.colors.warning || theme.colors.error, margin: '4px 0 0 0', fontStyle: 'italic' },
    itemCardActions: { display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' },
    actionButton: { padding: '5px 12px', fontSize: '0.85rem', borderRadius: '5px', border: 'none', cursor: 'pointer', transition: theme.transitions.default, whiteSpace: 'nowrap' },
    useButton: { background: theme.colors.secondary, color: theme.colors.background, ':hover': {opacity: 0.9} },
    dropButton: { background: theme.colors.error, color: theme.colors.text, ':hover': {opacity: 0.8} },
    abilityGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' },
    abilityCard: { background: theme.colors.surface, borderRadius: '8px', padding: '15px', boxShadow: theme.effects.shadow, transition: theme.transitions.default, display: 'flex', flexDirection: 'column', height: '100%' },
    abilityName: { fontWeight: 'bold', color: theme.colors.secondary, display: 'block', marginBottom: '5px' },
    abilityReq: { fontSize: '0.75rem', display: 'block', marginBottom: '8px', fontStyle: 'italic' },
    abilityMeta: { fontSize: '0.8rem', color: theme.colors.textSecondary, display: 'block', marginBottom: '8px'},
    abilityMetaSmall: { fontSize: '0.75rem', color: theme.colors.textSecondary, display: 'block', marginBottom: '8px'},
    abilityDescCard: { fontSize: '0.9rem', color: theme.colors.text, margin: '5px 0', flexGrow: 1 },
    abilityDetails: { borderTop: `1px dashed ${theme.colors.surface}66`, paddingTop: '8px', marginTop: '10px', fontSize: '0.8rem', color: theme.colors.textSecondary, display: 'flex', flexDirection: 'column', gap: '4px' },
    failEffect: { color: theme.colors.error, fontStyle: 'italic' },
    successEffect: { color: theme.colors.secondary, fontStyle: 'italic' },
    itemListMinimal: { listStyle: 'none', padding: '0', margin: '0' }, // Для тегов статусов
    statusTagContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', justifyContent: 'flex-start' }, // Changed to flex-start
    statusTag: { display: 'inline-flex', alignItems: 'center', background: theme.colors.surface, border: `1px solid ${theme.colors.textSecondary}55`, borderRadius: '15px', padding: '5px 10px 5px 12px', fontSize: '0.9rem', cursor: 'default', transition: 'all 0.2s ease', ':hover': { borderColor: `${theme.colors.primary}88`, background: `${theme.colors.primary}11` } },
    statusTagPu: { borderColor: theme.colors.primary, background: `${theme.colors.primary}15` },
    statusTagName: { cursor: 'pointer', marginRight: '5px', color: theme.colors.text, ':hover': { color: theme.colors.primary, textDecoration: 'underline' } },
    removeStatusButtonTag: { background: 'transparent', color: theme.colors.error, border: 'none', padding: '0', marginLeft: '4px', fontSize: '1.1rem', lineHeight: '1', cursor: 'pointer', opacity: 0.6, ':hover': { opacity: 1 } },
    branchesTabContainer: { display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'nowrap' },
    branchListColumn: { width: '30%', minWidth: '200px', flexShrink: 0, borderRight: `1px solid ${theme.colors.surface}88`, paddingRight: '20px' },
    branchAbilitiesColumn: { flexGrow: 1, width: 'auto' },
    branchList: { listStyle: 'none', padding: 0, margin: 0 },
    branchListItem: { padding: '8px 10px', borderRadius: '6px', marginBottom: '5px', cursor: 'pointer', transition: theme.transitions.default, border: '1px solid transparent', ':hover': { background: `${theme.colors.primary}22`, borderColor: `${theme.colors.primary}55` } },
    branchListItemActive: { background: `${theme.colors.primary}44`, borderColor: theme.colors.primary, color: theme.colors.primary, fontWeight: 'bold' },
    branchLevel: { float: 'right', fontWeight: 'bold', color: theme.colors.secondary },
    abilityListVertical: { display: 'flex', flexDirection: 'column', gap: '10px' },
    minimalAbilityCard: { background: theme.colors.surface, borderRadius: '6px', padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', cursor: 'pointer', transition: theme.transitions.default, borderLeft: `3px solid transparent`, width: '100%', ':hover': { transform: 'translateY(-2px)', boxShadow: `0 3px 8px ${theme.colors.primary}44` } },
    minimalAbilityName: { fontWeight: 'bold', color: theme.colors.text, display: 'block', marginBottom: '4px', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    minimalAbilityMeta: { fontSize: '0.75rem', color: theme.colors.textSecondary, display: 'block' },
    abilityCardContainer: { transition: theme.transitions.default, height: 'auto' },
    learnedAbilityMinimal: { borderLeftColor: theme.colors.secondary, opacity: 1, filter: 'none', background: `${theme.colors.surface}cc` },
    unlearnedAbilityMinimal: { opacity: 0.6, filter: 'grayscale(60%)', borderLeftColor: 'transparent', background: theme.colors.surface },
    unmetReqMinimal: { borderLeftColor: theme.colors.error, background: `${theme.colors.error}11`, cursor: 'help' },
    editNotesButton: { padding: '6px 12px', background: theme.colors.secondary, color: theme.colors.background, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: theme.transitions.default, ':hover': {opacity: 0.9} },
    notesContainer: { display: 'grid', gridTemplateColumns: '1fr', gap: '20px' },
    noteSection: { paddingBottom: '10px', borderBottom: `1px dashed ${theme.colors.surface}66`, '& strong': { color: theme.colors.primary }, '& p': { margin: '5px 0 0 5px', color: theme.colors.textSecondary, fontSize: '0.95rem', whiteSpace: 'pre-wrap' } },
    loading: { textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: theme.colors.text },
    error: { textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: theme.colors.error },
};

// Keyframes
const styleSheetCheck = document.styleSheets[0];
if (styleSheetCheck) { try { const fadeInRule = `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`; let ruleExists = false; for(let i=0; i< styleSheetCheck.cssRules.length; i++) { if(styleSheetCheck.cssRules[i]?.name === 'fadeIn') { ruleExists = true; break; } } if(!ruleExists) { styleSheetCheck.insertRule(fadeInRule, styleSheetCheck.cssRules.length); } } catch (e) { console.warn("Could not insert fadeIn keyframes:", e); } }

export default CharacterDetailPage;