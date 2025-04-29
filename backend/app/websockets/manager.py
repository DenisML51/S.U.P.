# backend/app/websockets/manager.py
from typing import Dict, List, Tuple, Optional, Set # Добавили Set
from fastapi import WebSocket
from starlette.websockets import WebSocketState
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Формат: { lobby_key: [ (websocket, username, character_id), ... ] }
        self.active_connections: Dict[str, List[Tuple[WebSocket, str, Optional[int]]]] = {}
        # --- НОВОЕ: Отслеживание персонажей в лобби ---
        # Формат: { lobby_key: {websocket: character_id} }
        self.lobby_characters: Dict[str, Dict[WebSocket, Optional[int]]] = {}
        logger.info("ConnectionManager initialized.")

    async def connect(self, websocket: WebSocket, lobby_key: str, username: str, character_id: Optional[int]) -> bool:
        """Handles a new WebSocket connection, associating character_id."""
        await websocket.accept()
        lobby_key_upper = lobby_key.upper() # Работаем с ключом в верхнем регистре

        if lobby_key_upper not in self.active_connections:
            self.active_connections[lobby_key_upper] = []
            self.lobby_characters[lobby_key_upper] = {} # Инициализируем словарь персонажей
            logger.info(f"Lobby '{lobby_key_upper}' created on first connect by '{username}'.")

        # --- Проверка, не занят ли уже этот персонаж в лобби ---
        # (Опционально, но полезно)
        # current_chars_in_lobby = set(self.lobby_characters[lobby_key_upper].values())
        # if character_id is not None and character_id in current_chars_in_lobby:
        #     await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Character ID {character_id} is already in this lobby.")
        #     logger.warning(f"Connection rejected: Character {character_id} already in lobby '{lobby_key_upper}'.")
        #     return False
        # --- Конец проверки ---

        # Добавляем соединение и информацию о персонаже
        connection_tuple = (websocket, username, character_id)
        self.active_connections[lobby_key_upper].append(connection_tuple)
        self.lobby_characters[lobby_key_upper][websocket] = character_id

        logger.info(f"User '{username}' (CharID: {character_id}) connected to lobby '{lobby_key_upper}'.")
        logger.info(f" Current connections in lobby: {[(u, c) for _, u, c in self.active_connections[lobby_key_upper]]}")
        return True

    def disconnect(self, websocket: WebSocket, lobby_key: str):
        """Handles a WebSocket disconnection, removing character info."""
        lobby_key_upper = lobby_key.upper()
        disconnected_user = "unknown"
        disconnected_char_id = None

        if lobby_key_upper in self.active_connections:
            connection_to_remove: Optional[Tuple[WebSocket, str, Optional[int]]] = None
            for conn_tuple in self.active_connections[lobby_key_upper]:
                 if conn_tuple[0] == websocket:
                      connection_to_remove = conn_tuple
                      disconnected_user = conn_tuple[1]
                      disconnected_char_id = conn_tuple[2] # Получаем ID персонажа
                      break

            if connection_to_remove:
                try:
                    self.active_connections[lobby_key_upper].remove(connection_to_remove)
                    logger.info(f"Removed connection for '{disconnected_user}' (CharID: {disconnected_char_id}) from lobby '{lobby_key_upper}'.")
                except ValueError:
                     logger.warning(f"Connection for '{disconnected_user}' already removed from lobby '{lobby_key_upper}'.")

            # Удаляем информацию о персонаже из lobby_characters
            if lobby_key_upper in self.lobby_characters and websocket in self.lobby_characters[lobby_key_upper]:
                del self.lobby_characters[lobby_key_upper][websocket]
                logger.info(f"Removed character mapping for disconnected user '{disconnected_user}'.")

            # Удаляем лобби, если оно пустое
            if not self.active_connections.get(lobby_key_upper):
                if lobby_key_upper in self.active_connections: del self.active_connections[lobby_key_upper]
                if lobby_key_upper in self.lobby_characters: del self.lobby_characters[lobby_key_upper] # Чистим и словарь персонажей
                logger.info(f"Lobby '{lobby_key_upper}' is now empty and closed.")
            else:
                 logger.info(f"User '{disconnected_user}' (CharID: {disconnected_char_id}) disconnected. Remaining: {[u for _, u, _ in self.active_connections[lobby_key_upper]]}")
        else:
            logger.warning(f"Attempted to disconnect from non-existent or already empty lobby '{lobby_key_upper}'.")

    async def broadcast(self, lobby_key: str, message: str, exclude_websocket: Optional[WebSocket] = None):
        """Sends a message to all connected clients in a specific lobby, optionally excluding one."""
        lobby_key_upper = lobby_key.upper()
        if lobby_key_upper in self.active_connections:
            # Создаем копию списка для безопасной итерации, если disconnect вызывается во время broadcast
            connections_to_send = list(self.active_connections[lobby_key_upper])
            if not connections_to_send:
                 logger.warning(f"Attempted to broadcast to empty lobby '{lobby_key_upper}'.")
                 return

            for connection, username, char_id in connections_to_send:
                 if connection == exclude_websocket:
                     continue # Пропускаем исключенный сокет
                 try:
                      if connection.client_state == WebSocketState.CONNECTED:
                           await connection.send_text(message)
                      else:
                           logger.warning(f"Socket for user '{username}' (CharID: {char_id}) in lobby '{lobby_key_upper}' is not connected. State: {connection.client_state}. Attempting disconnect.")
                           # Вызываем disconnect асинхронно, чтобы не блокировать broadcast
                           # asyncio.create_task(self.disconnect(connection, lobby_key_upper)) # Может потребовать import asyncio
                           self.disconnect(connection, lobby_key_upper) # Пока синхронно
                 except Exception as e:
                      logger.error(f"Failed to send message to '{username}' (CharID: {char_id}) in lobby '{lobby_key_upper}': {e}. Disconnecting them.")
                      self.disconnect(connection, lobby_key_upper)

    # --- ИЗМЕНЕНИЕ: Добавляем character_id в данные игрока ---
    async def send_players_update(self, lobby_key: str, master_username: str, max_players: int):
        """Formats and broadcasts the current player list including character IDs."""
        lobby_key_upper = lobby_key.upper()
        logger.info(f"Preparing players_update for lobby '{lobby_key_upper}' (Master: '{master_username}', Max: {max_players})")

        players_in_lobby = []
        current_master = None

        if lobby_key_upper in self.active_connections:
            current_connections = self.active_connections[lobby_key_upper]
            logger.info(f"  Active connections in lobby '{lobby_key_upper}': {[(user, char_id) for _, user, char_id in current_connections]}")

            for ws, username, char_id in current_connections:
                # Формируем инфо об игроке с ID персонажа
                player_info = {"username": username, "character_id": char_id}
                if username == master_username:
                     current_master = player_info
                     logger.info(f"  Found active master: {username} (CharID: {char_id})")
                else:
                    players_in_lobby.append(player_info)
        else:
             logger.warning(f"  Lobby '{lobby_key_upper}' not found in active_connections during player update send.")
             # Если лобби нет, но мастер известен, отправляем только его? Или пустой список?
             # Пока отправляем только мастера, если он известен
             if master_username:
                  current_master = {"username": master_username, "character_id": None} # Не знаем ID персонажа мастера, если он не подключен
             else:
                  return # Нечего отправлять

        # Если мастер не найден среди активных (например, еще не подключился)
        if current_master is None and master_username:
             current_master = {"username": master_username, "character_id": None}
             logger.info(f"  Master '{master_username}' not found in active connections, using party data (CharID unknown).")

        # Формируем список игроков до нужного размера
        target_player_slots = max(0, max_players - 1) # Слоты для игроков, кроме мастера
        final_player_list = ([p for p in players_in_lobby if p] + [None] * target_player_slots)[:target_player_slots]

        logger.info(f"  Final player list (excluding master, size {target_player_slots}): {final_player_list}")

        message_data = json.dumps({
            "type": "players_update",
            "master": current_master,
            "players": final_player_list
        })
        logger.info(f"  Broadcasting players_update message: {message_data}")
        await self.broadcast(lobby_key_upper, message_data)

    # --- НОВОЕ: Метод для отправки данных персонажа ---
    async def broadcast_character_update(self, lobby_key: str, character_data: dict):
        """Sends detailed character data to all users in the lobby."""
        lobby_key_upper = lobby_key.upper()
        if not character_data or 'id' not in character_data:
             logger.error("broadcast_character_update: Invalid character_data provided.")
             return

        message = json.dumps({
            "type": "character_update",
            "character": character_data # character_data должен быть словарем (из Pydantic .model_dump())
        })
        logger.info(f"Broadcasting character_update for CharID: {character_data['id']} in lobby '{lobby_key_upper}'")
        await self.broadcast(lobby_key_upper, message)

    # --- НОВОЕ: Метод для получения ID персонажей в лобби ---
    def get_character_ids_in_lobby(self, lobby_key: str) -> Set[int]:
        """Returns a set of character IDs currently present in the lobby."""
        lobby_key_upper = lobby_key.upper()
        character_ids = set()
        if lobby_key_upper in self.lobby_characters:
            for char_id in self.lobby_characters[lobby_key_upper].values():
                if char_id is not None:
                    character_ids.add(char_id)
        return character_ids


# Singleton instance
manager = ConnectionManager()