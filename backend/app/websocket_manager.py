from typing import Dict, List, Tuple
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # Для каждого лобби хранится список кортежей (WebSocket, username)
        self.active_connections: Dict[str, List[Tuple[WebSocket, str]]] = {}

    async def connect(self, websocket: WebSocket, lobby_key: str, username: str):
        await websocket.accept()
        if lobby_key not in self.active_connections:
            self.active_connections[lobby_key] = []
        self.active_connections[lobby_key].append((websocket, username))

    def disconnect(self, websocket: WebSocket, lobby_key: str):
        if lobby_key in self.active_connections:
            self.active_connections[lobby_key] = [
                (ws, user) for (ws, user) in self.active_connections[lobby_key]
                if ws != websocket
            ]
            if not self.active_connections[lobby_key]:
                del self.active_connections[lobby_key]

    async def broadcast(self, lobby_key: str, message: str):
        if lobby_key in self.active_connections:
            for connection, _ in self.active_connections[lobby_key]:
                await connection.send_text(message)

    async def send_players_update(self, lobby_key: str, master_username: str, max_players: int):
        """
        Формирует сообщение с информацией об игроках:
          - master: объект мастера (создателя лобби)
          - players: массив остальных игроков длиной равной max_players
                     (если слот пустой – null)
        Отправляет сообщение всем участникам лобби.
        """
        players = []
        if lobby_key in self.active_connections:
            for ws, username in self.active_connections[lobby_key]:
                if username != master_username:  # исключаем мастера
                    players.append({"username": username})
        while len(players) < max_players:
            players.append(None)
        message_data = json.dumps({
            "type": "players_update",
            "master": {"username": master_username},
            "players": players
        })
        await self.broadcast(lobby_key, message_data)

manager = ConnectionManager()
