// frontend/src/apiService.js
import axios from 'axios';

// Используем переменную окружения или дефолтное значение для URL API
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Функция для получения заголовков аутентификации
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    // console.log("getAuthHeaders Token:", token ? 'Found' : 'Not Found'); // Debugging
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// --- Auth ---
export const loginUser = (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    console.log("API Call: loginUser");
    return axios.post(`${API_URL}/auth/login`, formData);
};

export const registerUser = (username, password) => {
    console.log("API Call: registerUser");
    return axios.post(`${API_URL}/auth/register`, { username, password });
};

export const getCurrentUser = () => {
    console.log("API Call: getCurrentUser");
    return axios.get(`${API_URL}/auth/users/me`, { headers: getAuthHeaders() });
};

// --- Characters ---
export const getMyCharacters = () => {
    console.log("API Call: getMyCharacters");
    return axios.get(`${API_URL}/characters`, { headers: getAuthHeaders() });
};

export const getCharacterDetails = (characterId) => {
    console.log(`API Call: getCharacterDetails for ID: ${characterId}`);
    return axios.get(`${API_URL}/characters/${characterId}`, { headers: getAuthHeaders() });
};

export const createCharacter = (characterData) => {
    console.log("API Call: createCharacter");
    return axios.post(`${API_URL}/characters`, characterData, { headers: getAuthHeaders() });
};

export const updateCharacterSkills = (characterId, skillUpdates) => {
    console.log(`API Call: updateCharacterSkills for ID: ${characterId}`);
    return axios.put(`${API_URL}/characters/${characterId}/skills`, skillUpdates, { headers: getAuthHeaders() });
};

export const levelUpCharacter = (characterId, levelUpData) => {
    console.log(`API Call: levelUpCharacter for ID: ${characterId}`);
    return axios.post(`${API_URL}/characters/${characterId}/levelup`, levelUpData, { headers: getAuthHeaders() });
};

export const updateCharacterStats = (characterId, statsUpdate, checkResult = null) => {
    const payload = { ...statsUpdate };
    if (checkResult) { payload.check_result = checkResult; }
    console.log(`API Call: updateCharacterStats for ID ${characterId}:`, payload);
    // Примечание: Этот эндпоинт тоже может потребовать lobbyKey, если изменения статов должны быть видны в лобби
    return axios.put(`${API_URL}/characters/${characterId}/stats`, payload, { headers: getAuthHeaders() });
};

export const updateCharacterNotes = (characterId, notesUpdate) => {
    console.log(`API Call: updateCharacterNotes for ID: ${characterId}`);
    return axios.put(`${API_URL}/characters/${characterId}/notes`, notesUpdate, { headers: getAuthHeaders() });
};

export const healCharacter = (characterId, healData) => {
    console.log(`API Call: healCharacter for ID: ${characterId}`, healData);
    // Примечание: Этот эндпоинт тоже может потребовать lobbyKey
    return axios.post(`${API_URL}/characters/${characterId}/heal`, healData, { headers: getAuthHeaders() });
};


// --- Inventory & Equipment ---
export const addItemToInventory = (characterId, itemId, quantity = 1, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: addItemToInventory char ${characterId}, item ${itemId}, qty ${quantity}, lobby: ${lobbyKey}`);
    const params = new URLSearchParams();
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    const url = `${API_URL}/characters/${characterId}/inventory${lobbyKey ? '?' + params.toString() : ''}`;
    return axios.post(url, { item_id: itemId, quantity }, { headers: getAuthHeaders() });
};

export const removeItemFromInventory = (characterId, inventoryItemId, quantity = 1, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: removeItemFromInventory inv ID: ${inventoryItemId}, quantity: ${quantity}, lobby: ${lobbyKey}`);
    const params = new URLSearchParams({ quantity: String(quantity) }); // Quantity должен быть строкой
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    return axios.delete(`${API_URL}/characters/${characterId}/inventory/${inventoryItemId}?${params.toString()}`, { headers: getAuthHeaders() });
};

export const equipItem = (characterId, inventoryItemId, slot, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: equipItem inv ID: ${inventoryItemId} to slot: ${slot}, lobby: ${lobbyKey}`);
    const params = new URLSearchParams();
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    const url = `${API_URL}/characters/${characterId}/equipment${lobbyKey ? '?' + params.toString() : ''}`;
    return axios.put(url, { inventory_item_id: inventoryItemId, slot }, { headers: getAuthHeaders() });
};

export const unequipItem = (characterId, slot, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: unequipItem from slot: ${slot}, lobby: ${lobbyKey}`);
    const params = new URLSearchParams();
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    const url = `${API_URL}/characters/${characterId}/equipment/${slot}${lobbyKey ? '?' + params.toString() : ''}`;
    return axios.delete(url, { headers: getAuthHeaders() });
};

// --- Custom Items ---
export const addCustomItemToInventory = (characterId, name, description, quantity = 1, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: addCustomItem char ${characterId}, name ${name}, lobby: ${lobbyKey}`);
    const payload = { name: name.trim(), description: description?.trim() || null, quantity: quantity >= 1 ? quantity : 1 };
    const params = new URLSearchParams();
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    const url = `${API_URL}/characters/${characterId}/custom_items${lobbyKey ? '?' + params.toString() : ''}`;
    return axios.post(url, payload, { headers: getAuthHeaders() });
};

export const removeCustomItemFromInventory = (characterId, customItemId, quantity = 1, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: removeCustomItem ID: ${customItemId}, quantity: ${quantity}, lobby: ${lobbyKey}`);
    const params = new URLSearchParams({ quantity: String(quantity) });
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    return axios.delete(`${API_URL}/characters/${characterId}/custom_items/${customItemId}?${params.toString()}`, { headers: getAuthHeaders() });
};

// --- Status Effects ---
export const applyStatusEffect = (characterId, statusEffectId, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: applyStatusEffect ID: ${statusEffectId} to char ID: ${characterId}, lobby: ${lobbyKey}`);
    const params = new URLSearchParams();
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    const url = `${API_URL}/characters/${characterId}/status_effects${lobbyKey ? '?' + params.toString() : ''}`;
    return axios.post(url, { status_effect_id: statusEffectId }, { headers: getAuthHeaders() });
};

export const removeStatusEffect = (characterId, statusEffectId, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: removeStatusEffect ID: ${statusEffectId} from char ID: ${characterId}, lobby: ${lobbyKey}`);
    const params = new URLSearchParams();
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    const url = `${API_URL}/characters/${characterId}/status_effects/${statusEffectId}${lobbyKey ? '?' + params.toString() : ''}`;
    return axios.delete(url, { headers: getAuthHeaders() });
};

// --- Parties ---
export const createParty = (maxPlayers) => {
    console.log("API Call: createParty");
    return axios.post(`${API_URL}/parties`, { max_players: maxPlayers }, { headers: getAuthHeaders() });
};

export const joinParty = (lobbyKey) => {
    console.log("API Call: joinParty");
    return axios.post(`${API_URL}/parties/join`, { lobby_key: lobbyKey }, { headers: getAuthHeaders() });
};

// --- Actions ---
export const activateAction = (characterId, activationData, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: activateAction for char ID: ${characterId}, lobby: ${lobbyKey}`, activationData);
    const params = new URLSearchParams();
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    const url = `${API_URL}/characters/${characterId}/activate${lobbyKey ? '?' + params.toString() : ''}`;
    return axios.post(url, activationData, { headers: getAuthHeaders() });
};

export const performSkillCheck = (characterId, skillName) => {
    console.log(`API Call: performSkillCheck for char ID: ${characterId}, skill: ${skillName}`);
    const payload = { skill_name: skillName };
    // Проверки навыков обычно не требуют lobbyKey, т.к. не меняют состояние других
    return axios.post(`${API_URL}/characters/${characterId}/skill_check`, payload, { headers: getAuthHeaders() });
};

// --- Rest ---
export const performShortRest = (characterId, diceCount, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: performShortRest for ID: ${characterId}, Dice: ${diceCount}, lobby: ${lobbyKey}`);
    const params = new URLSearchParams();
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    const url = `${API_URL}/characters/${characterId}/short_rest${lobbyKey ? '?' + params.toString() : ''}`;
    return axios.post(url, { dice_to_spend: diceCount }, { headers: getAuthHeaders() });
};

export const performLongRest = (characterId, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: performLongRest for ID: ${characterId}, lobby: ${lobbyKey}`);
    const params = new URLSearchParams();
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    const url = `${API_URL}/characters/${characterId}/long_rest${lobbyKey ? '?' + params.toString() : ''}`;
    return axios.post(url, {}, { headers: getAuthHeaders() });
};

// --- Ability Slots ---
export const setCharacterAbilitySlot = (characterId, slotNumber, abilityId, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: setCharacterAbilitySlot char ${characterId}, Slot: ${slotNumber}, Ability: ${abilityId}, lobby: ${lobbyKey}`);
    const payload = { ability_id: abilityId };
    const params = new URLSearchParams();
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    const url = `${API_URL}/characters/${characterId}/active_abilities/${slotNumber}${lobbyKey ? '?' + params.toString() : ''}`;
    return axios.put(url, payload, { headers: getAuthHeaders() });
};

// --- Turn Management ---
export const endCharacterTurn = (characterId, lobbyKey = null) => { // <-- Add lobbyKey
    console.log(`API Call: endCharacterTurn for CharID: ${characterId}, lobby: ${lobbyKey}`);
    const params = new URLSearchParams();
    if (lobbyKey) params.append('lobby_key', lobbyKey);
    const url = `${API_URL}/characters/${characterId}/end_turn${lobbyKey ? '?' + params.toString() : ''}`;
    return axios.post(url, {}, { headers: getAuthHeaders() });
};


// --- Reference Data ---
export const getAllWeapons = () => axios.get(`${API_URL}/data/weapons`);
export const getAllArmor = () => axios.get(`${API_URL}/data/armor`);
export const getAllShields = () => axios.get(`${API_URL}/data/shields`);
export const getAllGeneralItems = () => axios.get(`${API_URL}/data/general_items`);
export const getAllAmmo = () => axios.get(`${API_URL}/data/ammo`);
export const getAllAbilities = () => axios.get(`${API_URL}/data/abilities`);
export const getAllStatusEffects = () => axios.get(`${API_URL}/data/status_effects`);

