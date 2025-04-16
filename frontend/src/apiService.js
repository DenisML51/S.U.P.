import axios from 'axios';

const API_URL = "http://localhost:8000"; // Или ваш URL бэкенда

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = axios.create({
    baseURL: API_URL,
});

// --- Auth ---
export const registerUser = (username, password) => api.post('/register', { username, password });
export const loginUser = (username, password) => {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);
    return api.post('/login', params); // FastAPI ожидает form data для OAuth2PasswordRequestForm
};
export const getCurrentUser = () => api.get('/users/me', { headers: getAuthHeaders() });

// --- Characters ---
export const getMyCharacters = () => api.get('/characters', { headers: getAuthHeaders() });
export const createCharacter = (characterData) => api.post('/characters', characterData, { headers: getAuthHeaders() });
export const getCharacterDetails = (characterId) => api.get(`/characters/${characterId}`, { headers: getAuthHeaders() });
export const updateCharacterSkills = (characterId, skillsData) => api.put(`/characters/${characterId}/skills`, skillsData, { headers: getAuthHeaders() });
export const levelUpCharacter = (characterId, levelUpData) => api.post(`/characters/${characterId}/levelup`, levelUpData, { headers: getAuthHeaders() });
export const updateCharacterStats = (characterId, statsData) => api.put(`/characters/${characterId}/stats`, statsData, { headers: getAuthHeaders() });
export const updateCharacterNotes = (characterId, notesData) => api.put(`/characters/${characterId}/notes`, notesData, { headers: getAuthHeaders() });

// --- Inventory ---
export const addItemToInventory = (characterId, itemId, quantity) => api.post(`/characters/${characterId}/inventory`, { item_id: itemId, quantity }, { headers: getAuthHeaders() });
export const removeItemFromInventory = (characterId, inventoryItemId, quantity) => api.delete(`/characters/${characterId}/inventory/${inventoryItemId}?quantity=${quantity}`, { headers: getAuthHeaders() });
export const equipItem = (characterId, inventoryItemId, slot) => api.put(`/characters/${characterId}/equipment`, { inventory_item_id: inventoryItemId, slot }, { headers: getAuthHeaders() });
export const unequipItem = (characterId, slot) => api.delete(`/characters/${characterId}/equipment/${slot}`, { headers: getAuthHeaders() });

// --- Status Effects ---
export const applyStatusEffect = (characterId, statusEffectId) => api.post(`/characters/${characterId}/status_effects`, { status_effect_id: statusEffectId }, { headers: getAuthHeaders() });
export const removeStatusEffect = (characterId, statusEffectId) => api.delete(`/characters/${characterId}/status_effects/${statusEffectId}`, { headers: getAuthHeaders() });

// --- Parties ---
export const createParty = (maxPlayers) => api.post('/parties', { max_players: maxPlayers }, { headers: getAuthHeaders() });
export const joinParty = (lobbyKey) => api.post('/parties/join', { lobby_key: lobbyKey }, { headers: getAuthHeaders() });

// --- Reference Data ---
export const getAllWeapons = () => api.get('/data/weapons');
export const getAllArmor = () => api.get('/data/armor');
export const getAllShields = () => api.get('/data/shields');
export const getAllGeneralItems = () => api.get('/data/general_items');
export const getAllAmmo = () => api.get('/data/ammo');
export const getAllAbilities = () => api.get('/data/abilities');
export const getAllStatusEffects = () => api.get('/data/status_effects');


export default api; // Экспортируем инстанс axios для прямого использования если нужно