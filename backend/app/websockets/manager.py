# backend/app/websockets/manager.py
from typing import Dict, List, Tuple, Optional
from fastapi import WebSocket
import json
import logging # Используем logging

# Настройка логгера
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # { lobby_key: [(websocket, username), ...] }
        self.active_connections: Dict[str, List[Tuple[WebSocket, str]]] = {}
        logger.info("ConnectionManager initialized.")

    async def connect(self, websocket: WebSocket, lobby_key: str, username: str) -> bool:
        await websocket.accept()
        if lobby_key not in self.active_connections:
            self.active_connections[lobby_key] = []
            logger.info(f"Lobby '{lobby_key}' created on first connect.")

        # Проверка на существующего пользователя (можно раскомментировать для строгости)
        for ws, user in self.active_connections[lobby_key]:
            if user == username:
                logger.warning(f"User '{username}' attempting to reconnect to lobby '{lobby_key}'. Closing new connection.")
                await websocket.close(code=1008, reason="User already connected")
                return False

        self.active_connections[lobby_key].append((websocket, username))
        logger.info(f"User '{username}' connected to lobby '{lobby_key}'. Current users in lobby: {[u for _, u in self.active_connections[lobby_key]]}")
        return True

    def disconnect(self, websocket: WebSocket, lobby_key: str):
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
                self.active_connections[lobby_key].remove(connection_to_remove)
                logger.info(f"Removed connection for '{disconnected_user}' from lobby '{lobby_key}'.")
            else:
                 logger.warning(f"Attempted to disconnect websocket not found in lobby '{lobby_key}'.")


            if not self.active_connections[lobby_key]:
                del self.active_connections[lobby_key]
                logger.info(f"Lobby '{lobby_key}' is now empty and closed.")
            else:
                 logger.info(f"User '{disconnected_user}' disconnected from lobby '{lobby_key}'. Remaining users: {[u for _, u in self.active_connections[lobby_key]]} (was {initial_count})")
        else:
            logger.warning(f"Attempted to disconnect from non-existent lobby '{lobby_key}'.")


    async def broadcast(self, lobby_key: str, message: str):
        if lobby_key in self.active_connections:
            # logger.info(f"Broadcasting to lobby '{lobby_key}': {message[:100]}...") # Закомментировано, чтобы не спамить лог чатом
            connections_to_send = list(self.active_connections[lobby_key]) # Копируем для безопасной итерации
            for connection, username in connections_to_send:
                 try:
                      await connection.send_text(message)
                 except Exception as e:
                      logger.error(f"Failed to send message to '{username}' in lobby '{lobby_key}': {e}. Disconnecting them.")
                      # Пытаемся корректно отключить, если сокет отвалился
                      self.disconnect(connection, lobby_key)
                      # Может понадобиться отправить обновление списка игроков после этого отключения
                      # await self.send_players_update(lobby_key, ???) # Нужны master_username и max_players


    async def send_players_update(self, lobby_key: str, master_username: str, max_players: int):
        """Формирует и отправляет обновленный список игроков всем участникам лобби."""
        logger.info(f"Preparing players_update for lobby '{lobby_key}' (Master: '{master_username}', Max: {max_players})")
        players_in_lobby = []
        current_master = None # Мастер, найденный среди АКТИВНЫХ соединений

        if lobby_key in self.active_connections:
            current_connections = self.active_connections[lobby_key]
            logger.info(f"  Active connections in lobby '{lobby_key}': {[user for _, user in current_connections]}")
            for ws, username in current_connections:
                player_info = {"username": username} # Можно добавить статус "online"
                if username == master_username:
                     current_master = player_info
                     logger.info(f"  Found active master: {username}")
                else:
                    players_in_lobby.append(player_info)
        else:
             logger.warning(f"  Lobby '{lobby_key}' not found in active_connections during player update.")

        # Если мастер не найден среди активных (например, еще не подключился или уже отключился),
        # все равно указываем его имя из данных партии
        if current_master is None:
             current_master = {"username": master_username} # Можно добавить статус "offline"
             logger.info(f"  Master '{master_username}' not found in active connections, using party data.")


        # Формируем итоговый массив игроков нужной длины
        target_player_slots = max(0, max_players - 1)
        final_player_list = (players_in_lobby + [None] * target_player_slots)[:target_player_slots]
        logger.info(f"  Final player list (excluding master, size {target_player_slots}): {final_player_list}")

        message_data = json.dumps({
            "type": "players_update",
            "master": current_master,
            "players": final_player_list
        })

        logger.info(f"  Broadcasting players_update message: {message_data}")
        await self.broadcast(lobby_key, message_data)

# Создаем единственный экземпляр менеджера
manager = ConnectionManager()