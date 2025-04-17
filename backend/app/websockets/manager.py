# backend/app/websockets/manager.py
from typing import Dict, List, Tuple
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # { lobby_key: [(websocket, username), ...] }
        self.active_connections: Dict[str, List[Tuple[WebSocket, str]]] = {}

    async def connect(self, websocket: WebSocket, lobby_key: str, username: str) -> bool:
        await websocket.accept()
        if lobby_key not in self.active_connections:
            self.active_connections[lobby_key] = []
        self.active_connections[lobby_key].append((websocket, username))
        print(f"User {username} connected to lobby {lobby_key}. Total users: {len(self.active_connections[lobby_key])}")
        return True

    def disconnect(self, websocket: WebSocket, lobby_key: str):
        disconnected_user = "unknown"
        if lobby_key in self.active_connections:
            initial_count = len(self.active_connections[lobby_key])
            for ws, user in self.active_connections[lobby_key]:
                 if ws == websocket:
                      disconnected_user = user
                      break
            self.active_connections[lobby_key] = [(ws, user) for ws, user in self.active_connections[lobby_key] if ws != websocket]
            if not self.active_connections[lobby_key]:
                del self.active_connections[lobby_key]
                print(f"Lobby {lobby_key} closed (empty).")
            else:
                 print(f"User {disconnected_user} disconnected from lobby {lobby_key}. Remaining users: {len(self.active_connections[lobby_key])} (was {initial_count})")

    async def broadcast(self, lobby_key: str, message: str):
        if lobby_key in self.active_connections:
            print(f"Broadcasting to {lobby_key}: {message[:100]}...")
            connections_to_send = list(self.active_connections[lobby_key])
            for connection, username in connections_to_send:
                 try:
                      await connection.send_text(message)
                 except Exception as e:
                      print(f"Error sending message to {username} in lobby {lobby_key}: {e}. Disconnecting.")
                      self.disconnect(connection, lobby_key)

    async def send_players_update(self, lobby_key: str, master_username: str, max_players: int):
        """Формирует и отправляет обновленный список игроков всем участникам лобби."""
        players = []
        current_master = None
        if lobby_key in self.active_connections:
            for ws, username in self.active_connections[lobby_key]:
                if username == master_username:
                     current_master = {"username": username}
                else:
                    players.append({"username": username})

        if current_master is None:
             current_master = {"username": master_username} # Статус можно добавить 'offline'

        target_player_slots = max(0, max_players - 1)
        while len(players) < target_player_slots:
            players.append(None)

        message_data = json.dumps({
            "type": "players_update",
            "master": current_master,
            "players": players[:target_player_slots]
        })
        await self.broadcast(lobby_key, message_data)

manager = ConnectionManager()