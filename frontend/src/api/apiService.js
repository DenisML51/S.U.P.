// frontend/src/apiService.js
import axios from 'axios';

// Предполагаем, что API_URL уже определен правильно
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"; // Используем переменную окружения или дефолт

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    // Логирование оставлено для отладки, можно убрать в продакшене
    if (token) {
        // console.log("getAuthHeaders: Adding Authorization header.");
    } else {
        console.warn("getAuthHeaders: Token not found in localStorage.");
    }
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
    return axios.put(`${API_URL}/characters/${characterId}/stats`, payload, { headers: getAuthHeaders() });
};

export const updateCharacterNotes = (characterId, notesUpdate) => {
    console.log(`API Call: updateCharacterNotes for ID: ${characterId}`);
    return axios.put(`${API_URL}/characters/${characterId}/notes`, notesUpdate, { headers: getAuthHeaders() });
};

export const healCharacter = (characterId, healData) => {
    console.log(`API Call: healCharacter for ID: ${characterId}`, healData);
    return axios.post(`${API_URL}/characters/${characterId}/heal`, healData, { headers: getAuthHeaders() });
};

export const performShortRest = (characterId, diceCount) => {
    console.log(`API Call: performShortRest for ID: ${characterId}, Dice: ${diceCount}`);
    return axios.post(`${API_URL}/characters/${characterId}/short_rest`, { dice_to_spend: diceCount }, { headers: getAuthHeaders() });
};

export const performLongRest = (characterId) => {
    console.log(`API Call: performLongRest for ID: ${characterId}`);
    return axios.post(`${API_URL}/characters/${characterId}/long_rest`, {}, { headers: getAuthHeaders() });
};

// --- Inventory & Equipment ---
export const addItemToInventory = (characterId, itemId, quantity = 1) => {
    console.log(`API Call: addItemToInventory for char ID: ${characterId}, item ID: ${itemId}`);
    return axios.post(`${API_URL}/characters/${characterId}/inventory`, { item_id: itemId, quantity }, { headers: getAuthHeaders() });
};

export const removeItemFromInventory = (characterId, inventoryItemId, quantity = 1) => {
    console.log(`API Call: removeItemFromInventory for inv ID: ${inventoryItemId}, quantity: ${quantity}`);
    // Передаем quantity как query параметр
    return axios.delete(`${API_URL}/characters/${characterId}/inventory/${inventoryItemId}?quantity=${quantity}`, { headers: getAuthHeaders() });
};

export const equipItem = (characterId, inventoryItemId, slot) => {
    console.log(`API Call: equipItem inv ID: ${inventoryItemId} to slot: ${slot}`);
    return axios.put(`${API_URL}/characters/${characterId}/equipment`, { inventory_item_id: inventoryItemId, slot }, { headers: getAuthHeaders() });
};

export const unequipItem = (characterId, slot) => {
    console.log(`API Call: unequipItem from slot: ${slot}`);
    return axios.delete(`${API_URL}/characters/${characterId}/equipment/${slot}`, { headers: getAuthHeaders() });
};

// --- Custom Items --- << НОВЫЕ ФУНКЦИИ >>
export const addCustomItemToInventory = (characterId, name, description, quantity = 1) => {
    console.log(`API Call: addCustomItemToInventory for char ID: ${characterId}`);
    // Убедимся, что description передается как null, если оно пустое, или как строка, если нет
    const payload = {
        name: name.trim(),
        description: description?.trim() || null, // Передаем null, если пусто
        quantity: quantity >= 1 ? quantity : 1
    };
    return axios.post(`${API_URL}/characters/${characterId}/custom_items`, payload, { headers: getAuthHeaders() });
};

export const removeCustomItemFromInventory = (characterId, customItemId, quantity = 1) => {
    console.log(`API Call: removeCustomItemFromInventory for custom item ID: ${customItemId}, quantity: ${quantity}`);
    // Передаем quantity как query параметр
    return axios.delete(`${API_URL}/characters/${characterId}/custom_items/${customItemId}?quantity=${quantity}`, { headers: getAuthHeaders() });
};
// --- << КОНЕЦ НОВЫХ ФУНКЦИЙ >> ---

// --- Status Effects ---
export const applyStatusEffect = (characterId, statusEffectId) => {
    console.log(`API Call: applyStatusEffect ID: ${statusEffectId} to char ID: ${characterId}`);
    return axios.post(`${API_URL}/characters/${characterId}/status_effects`, { status_effect_id: statusEffectId }, { headers: getAuthHeaders() });
};

export const removeStatusEffect = (characterId, statusEffectId) => {
    console.log(`API Call: removeStatusEffect ID: ${statusEffectId} from char ID: ${characterId}`);
    return axios.delete(`${API_URL}/characters/${characterId}/status_effects/${statusEffectId}`, { headers: getAuthHeaders() });
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
export const activateAction = (characterId, activationData) => {
    console.log(`API Call: activateAction for char ID: ${characterId}`, activationData);
    // activationData должен иметь вид:
    // { activation_type: 'item' | 'ability', target_id: number, target_entities?: number[] }
    return axios.post(`${API_URL}/characters/${characterId}/activate`, activationData, { headers: getAuthHeaders() });
};

// --- НОВАЯ ФУНКЦИЯ: Проверка Навыка ---
export const performSkillCheck = (characterId, skillName) => {
    console.log(`API Call: performSkillCheck for char ID: ${characterId}, skill: ${skillName}`);
    const payload = { skill_name: skillName };
    return axios.post(`${API_URL}/characters/${characterId}/skill_check`, payload, { headers: getAuthHeaders() });
};

// --- Reference Data ---
export const getAllWeapons = () => axios.get(`${API_URL}/data/weapons`);
export const getAllArmor = () => axios.get(`${API_URL}/data/armor`);
export const getAllShields = () => axios.get(`${API_URL}/data/shields`);
export const getAllGeneralItems = () => axios.get(`${API_URL}/data/general_items`);
export const getAllAmmo = () => axios.get(`${API_URL}/data/ammo`);
export const getAllAbilities = () => axios.get(`${API_URL}/data/abilities`);
export const getAllStatusEffects = () => axios.get(`${API_URL}/data/status_effects`);