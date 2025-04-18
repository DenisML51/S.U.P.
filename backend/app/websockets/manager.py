# backend/app/websockets/manager.py
from typing import Dict, List, Tuple, Optional
from fastapi import WebSocket
# --- ДОБАВЛЕН ИМПОРТ ---
from starlette.websockets import WebSocketState
# --- КОНЕЦ ДОБАВЛЕННОГО ИМПОРТА ---
import json
import logging

# Настройка логгера
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[Tuple[WebSocket, str]]] = {}
        logger.info("ConnectionManager initialized.")

    async def connect(self, websocket: WebSocket, lobby_key: str, username: str) -> bool:
        """Handles a new WebSocket connection."""
        await websocket.accept()
        if lobby_key not in self.active_connections:
            self.active_connections[lobby_key] = []
            logger.info(f"Lobby '{lobby_key}' created on first connect by '{username}'.")

        self.active_connections[lobby_key].append((websocket, username))
        logger.info(f"User '{username}' connected to lobby '{lobby_key}'. Current users in lobby: {[u for _, u in self.active_connections[lobby_key]]}")
        return True

    def disconnect(self, websocket: WebSocket, lobby_key: str):
        """Handles a WebSocket disconnection."""
        disconnected_user = "unknown"
        if lobby_key in self.active_connections:
            initial_count = len(self.active_connections[lobby_key])
            connection_to_remove: Optional[Tuple[WebSocket, str]] = None
            for conn_tuple in self.active_connections[lobby_key]:
                 if conn_tuple[0] == websocket:
                      connection_to_remove = conn_tuple
                      disconnected_user = conn_tuple[1]
                      break

            if connection_to_remove:
                try:
                    self.active_connections[lobby_key].remove(connection_to_remove)
                    logger.info(f"Removed connection for '{disconnected_user}' from lobby '{lobby_key}'.")
                except ValueError:
                     logger.warning(f"Connection for '{disconnected_user}' already removed from lobby '{lobby_key}'.")
            else:
                 logger.warning(f"Attempted to disconnect websocket not found in lobby '{lobby_key}'. Active users: {[u for _, u in self.active_connections.get(lobby_key, [])]}")

            if not self.active_connections.get(lobby_key): # Проверяем через get на случай, если ключ удален в другом потоке
                # Ключ мог быть удален, если это было последнее соединение
                if lobby_key in self.active_connections: # Доп. проверка перед удалением
                     del self.active_connections[lobby_key]
                     logger.info(f"Lobby '{lobby_key}' is now empty and closed.")
            else:
                 logger.info(f"User '{disconnected_user}' disconnected from lobby '{lobby_key}'. Remaining users: {[u for _, u in self.active_connections[lobby_key]]} (was {initial_count})")
        else:
            logger.warning(f"Attempted to disconnect from non-existent or already empty lobby '{lobby_key}'.")


    async def broadcast(self, lobby_key: str, message: str):
        """Sends a message to all connected clients in a specific lobby."""
        if lobby_key in self.active_connections:
            connections_to_send = list(self.active_connections[lobby_key])
            if not connections_to_send:
                 logger.warning(f"Attempted to broadcast to empty lobby '{lobby_key}'.")
                 return

            for connection, username in connections_to_send:
                 try:
                      # --- ИСПРАВЛЕНА ПРОВЕРКА СОСТОЯНИЯ ---
                      # Используем импортированный WebSocketState
                      if connection.client_state == WebSocketState.CONNECTED:
                      # --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                           await connection.send_text(message)
                      else:
                           logger.warning(f"Socket for user '{username}' in lobby '{lobby_key}' is not connected. State: {connection.client_state}. Attempting disconnect.")
                           self.disconnect(connection, lobby_key)
                 except Exception as e:
                      logger.error(f"Failed to send message to '{username}' in lobby '{lobby_key}': {e}. Disconnecting them.")
                      self.disconnect(connection, lobby_key)


    async def send_players_update(self, lobby_key: str, master_username: str, max_players: int):
        """Formats and broadcasts the current player list for the lobby."""
        logger.info(f"Preparing players_update for lobby '{lobby_key}' (Master: '{master_username}', Max: {max_players})")
        players_in_lobby = []
        current_master = None

        if lobby_key in self.active_connections:
            current_connections = self.active_connections[lobby_key]
            logger.info(f"  Active connections in lobby '{lobby_key}': {[user for _, user in current_connections]}")
            for ws, username in current_connections:
                player_info = {"username": username}
                if username == master_username:
                     current_master = player_info
                     logger.info(f"  Found active master: {username}")
                else:
                    players_in_lobby.append(player_info)
        else:
             logger.warning(f"  Lobby '{lobby_key}' not found in active_connections during player update send.")
             return

        if current_master is None:
             current_master = {"username": master_username}
             logger.info(f"  Master '{master_username}' not found in active connections, using party data (likely offline).")

        target_player_slots = max(0, max_players - 1)
        final_player_list = ([p for p in players_in_lobby if p] + [None] * target_player_slots)[:target_player_slots]
        logger.info(f"  Final player list (excluding master, size {target_player_slots}): {final_player_list}")

        message_data = json.dumps({
            "type": "players_update",
            "master": current_master,
            "players": final_player_list
        })

        logger.info(f"  Broadcasting players_update message: {message_data}")
        await self.broadcast(lobby_key, message_data)

# Singleton instance
manager = ConnectionManager()
