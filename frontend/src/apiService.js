import axios from 'axios';

const API_URL = "http://localhost:8000"; // Ваш URL бэкенда

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// --- Auth ---
export const loginUser = (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    return axios.post(`${API_URL}/login`, formData); // Используем FormData для OAuth2PasswordRequestForm
};

export const registerUser = (username, password) => {
    return axios.post(`${API_URL}/register`, { username, password });
};

export const getCurrentUser = () => {
    return axios.get(`${API_URL}/users/me`, { headers: getAuthHeaders() });
};

// --- Characters ---
export const getMyCharacters = () => {
    return axios.get(`${API_URL}/characters`, { headers: getAuthHeaders() });
};

export const getCharacterDetails = (characterId) => {
    return axios.get(`${API_URL}/characters/${characterId}`, { headers: getAuthHeaders() });
};

export const createCharacter = (characterData) => {
    // characterData должен соответствовать схеме CharacterCreate
    return axios.post(`${API_URL}/characters`, characterData, { headers: getAuthHeaders() });
};

export const updateCharacterSkills = (characterId, skillUpdates) => {
    // skillUpdates должен соответствовать схеме CharacterUpdateSkills
    return axios.put(`${API_URL}/characters/${characterId}/skills`, skillUpdates, { headers: getAuthHeaders() });
};

export const levelUpCharacter = (characterId, levelUpData) => {
    // levelUpData должен соответствовать схеме LevelUpInfo
    return axios.post(`${API_URL}/characters/${characterId}/levelup`, levelUpData, { headers: getAuthHeaders() });
};

export const updateCharacterStats = (characterId, statsUpdate, checkResult = null) => {
    // statsUpdate должен быть объектом типа { current_pu: number } или другие статы
    // Добавляем check_result в тело запроса
    const payload = { ...statsUpdate };
    if (checkResult) {
        payload.check_result = checkResult;
    }
    console.log(`Sending updateCharacterStats for ${characterId}:`, payload); // Отладка
    return axios.put(`${API_URL}/characters/${characterId}/stats`, payload, { headers: getAuthHeaders() });
};

export const updateCharacterNotes = (characterId, notesUpdate) => {
    // notesUpdate должен соответствовать схеме CharacterNotes
    return axios.put(`${API_URL}/characters/${characterId}/notes`, notesUpdate, { headers: getAuthHeaders() });
};


// --- Inventory & Equipment ---
export const addItemToInventory = (characterId, itemId, quantity = 1) => {
    return axios.post(`${API_URL}/characters/${characterId}/inventory`, { item_id: itemId, quantity }, { headers: getAuthHeaders() });
};

export const removeItemFromInventory = (characterId, inventoryItemId, quantity = 1) => {
    return axios.delete(`${API_URL}/characters/${characterId}/inventory/${inventoryItemId}?quantity=${quantity}`, { headers: getAuthHeaders() });
};

export const equipItem = (characterId, inventoryItemId, slot) => {
    // slot: "armor", "shield", "weapon1", "weapon2"
    return axios.put(`${API_URL}/characters/${characterId}/equipment`, { inventory_item_id: inventoryItemId, slot }, { headers: getAuthHeaders() });
};

export const unequipItem = (characterId, slot) => {
    // slot: "armor", "shield", "weapon1", "weapon2"
    return axios.delete(`${API_URL}/characters/${characterId}/equipment/${slot}`, { headers: getAuthHeaders() });
};

// --- Status Effects ---
export const applyStatusEffect = (characterId, statusEffectId) => {
    return axios.post(`${API_URL}/characters/${characterId}/status_effects`, { status_effect_id: statusEffectId }, { headers: getAuthHeaders() });
};

export const removeStatusEffect = (characterId, statusEffectId) => {
    return axios.delete(`${API_URL}/characters/${characterId}/status_effects/${statusEffectId}`, { headers: getAuthHeaders() });
};

// --- Parties ---
export const createParty = (maxPlayers) => {
    return axios.post(`${API_URL}/parties`, { max_players: maxPlayers }, { headers: getAuthHeaders() });
};

export const joinParty = (lobbyKey) => {
    return axios.post(`${API_URL}/parties/join`, { lobby_key: lobbyKey }, { headers: getAuthHeaders() });
};


// --- Reference Data ---
export const getAllWeapons = () => {
    return axios.get(`${API_URL}/data/weapons`, { headers: getAuthHeaders() });
};

export const getAllArmor = () => {
    return axios.get(`${API_URL}/data/armor`, { headers: getAuthHeaders() });
};

export const getAllShields = () => {
    return axios.get(`${API_URL}/data/shields`, { headers: getAuthHeaders() });
};

export const getAllGeneralItems = () => {
    return axios.get(`${API_URL}/data/general_items`, { headers: getAuthHeaders() });
};

export const getAllAmmo = () => {
    return axios.get(`${API_URL}/data/ammo`, { headers: getAuthHeaders() });
};

export const getAllAbilities = () => {
    return axios.get(`${API_URL}/data/abilities`, { headers: getAuthHeaders() });
};

export const getAllStatusEffects = () => {
    return axios.get(`${API_URL}/data/status_effects`, { headers: getAuthHeaders() });
};