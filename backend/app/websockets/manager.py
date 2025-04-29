from typing import Dict, List, Tuple, Optional, Set
from fastapi import WebSocket, status # Added status
from starlette.websockets import WebSocketState
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Format: { lobby_key: [ (websocket, username, character_id), ... ] }
        self.active_connections: Dict[str, List[Tuple[WebSocket, str, Optional[int]]]] = {}
        # Format: { lobby_key: {websocket: character_id} }
        self.lobby_characters: Dict[str, Dict[WebSocket, Optional[int]]] = {}
        logger.info("ConnectionManager initialized.")

    async def connect(self, websocket: WebSocket, lobby_key: str, username: str, character_id: Optional[int]) -> bool:
        """Handles a new WebSocket connection, associating character_id."""
        # --- NOTE: Moved websocket.accept() to the /ws endpoint AFTER validation ---
        # await websocket.accept() # Moved to main.py after validation
        lobby_key_upper = lobby_key.upper() # Работаем с ключом в верхнем регистре

        if lobby_key_upper not in self.active_connections:
            self.active_connections[lobby_key_upper] = []
            self.lobby_characters[lobby_key_upper] = {} # Инициализируем словарь персонажей
            logger.info(f"Lobby '{lobby_key_upper}' created on first connect by '{username}'.")

        # Check if character is already actively connected in this lobby by another socket
        # (Avoids duplicate character entries if user reconnects quickly etc.)
        current_lobby_char_ids = set(self.lobby_characters.get(lobby_key_upper, {}).values())
        if character_id is not None and character_id in current_lobby_char_ids:
             logger.warning(f"User '{username}' attempted to connect with CharID {character_id} which is already in lobby '{lobby_key_upper}'. Refusing connection.")
             # Close the connection attempt before adding it
             # Send a specific close reason if possible (check WebSocket close codes)
             await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Character {character_id} already active in lobby.")
             return False # Indicate connection failed

        # Добавляем соединение и информацию о персонаже
        connection_tuple = (websocket, username, character_id)
        self.active_connections[lobby_key_upper].append(connection_tuple)
        self.lobby_characters[lobby_key_upper][websocket] = character_id

        logger.info(f"User '{username}' (CharID: {character_id}) connected to lobby '{lobby_key_upper}'.")
        logger.info(f" Current connections in lobby: {[(u, c) for _, u, c in self.active_connections.get(lobby_key_upper, [])]}") # Use .get for safety
        return True

    def disconnect(self, websocket: WebSocket, lobby_key: str):
        """Handles a WebSocket disconnection, removing character info."""
        lobby_key_upper = lobby_key.upper()
        disconnected_user = "unknown"
        disconnected_char_id = None

        if lobby_key_upper in self.active_connections:
            connection_to_remove: Optional[Tuple[WebSocket, str, Optional[int]]] = None
            # Iterate safely over a copy or use index if necessary
            # For simplicity, find the connection first, then remove
            found = False
            for i, conn_tuple in enumerate(self.active_connections[lobby_key_upper]):
                 if conn_tuple[0] == websocket:
                      connection_to_remove = conn_tuple
                      disconnected_user = conn_tuple[1]
                      disconnected_char_id = conn_tuple[2] # Get character ID
                      del self.active_connections[lobby_key_upper][i] # Remove by index
                      found = True
                      logger.info(f"Removed connection for '{disconnected_user}' (CharID: {disconnected_char_id}) from lobby '{lobby_key_upper}'.")
                      break

            # Remove character mapping from lobby_characters
            if lobby_key_upper in self.lobby_characters and websocket in self.lobby_characters[lobby_key_upper]:
                del self.lobby_characters[lobby_key_upper][websocket]
                logger.info(f"Removed character mapping for disconnected user '{disconnected_user}'.")
            elif found: # If connection was found but mapping wasn't (shouldn't happen often)
                logger.warning(f"Character mapping for '{disconnected_user}' (ws: {websocket}) not found in lobby_characters['{lobby_key_upper}'], though connection was present.")

            # Remove lobby if empty
            if not self.active_connections.get(lobby_key_upper):
                if lobby_key_upper in self.active_connections: del self.active_connections[lobby_key_upper]
                if lobby_key_upper in self.lobby_characters: del self.lobby_characters[lobby_key_upper] # Clean up character dict too
                logger.info(f"Lobby '{lobby_key_upper}' is now empty and closed.")
            elif found: # Log remaining only if someone was actually disconnected
                 logger.info(f"User '{disconnected_user}' (CharID: {disconnected_char_id}) disconnected. Remaining users: {[u for _, u, _ in self.active_connections.get(lobby_key_upper, [])]}")
        else:
            logger.warning(f"Attempted to disconnect from non-existent or already empty lobby '{lobby_key_upper}'.")

    # --- NEW METHOD: Send message to a single client ---
    async def send_personal_message(self, websocket: WebSocket, message: str):
        """Sends a message to a specific WebSocket connection."""
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_text(message)
            else:
                # Log only, don't try to disconnect here as the state is already non-connected
                logger.warning(f"Attempted to send personal message, but socket state is {websocket.client_state}.")
        except Exception as e:
            # Log error, but avoid trying to disconnect potentially already closed socket
            logger.error(f"Failed to send personal message to {websocket.client.host}:{websocket.client.port}: {e}")

    async def broadcast(self, lobby_key: str, message: str, exclude_websocket: Optional[WebSocket] = None):
        """Sends a message to all connected clients in a specific lobby, optionally excluding one."""
        lobby_key_upper = lobby_key.upper()
        if lobby_key_upper in self.active_connections:
            # Create a copy of the list for safe iteration
            connections_to_send = list(self.active_connections[lobby_key_upper])
            if not connections_to_send:
                 # logger.warning(f"Attempted to broadcast to empty lobby '{lobby_key_upper}'.")
                 return # Don't log if lobby just closed

            # Use list comprehension for disconnected sockets to remove later
            disconnected_sockets = []
            for connection, username, char_id in connections_to_send:
                 if connection == exclude_websocket:
                     continue # Skip excluded socket

                 try:
                      if connection.client_state == WebSocketState.CONNECTED:
                          await connection.send_text(message)
                      else:
                           logger.warning(f"Socket for user '{username}' (CharID: {char_id}) in lobby '{lobby_key_upper}' is not connected during broadcast. State: {connection.client_state}. Marking for disconnect.")
                           disconnected_sockets.append(connection) # Mark for removal
                 except Exception as e:
                      logger.error(f"Failed to send broadcast message to '{username}' (CharID: {char_id}) in lobby '{lobby_key_upper}': {e}. Marking for disconnect.")
                      disconnected_sockets.append(connection) # Mark for removal

            # Disconnect marked sockets after broadcasting
            if disconnected_sockets:
                 logger.info(f"Cleaning up {len(disconnected_sockets)} disconnected sockets from lobby '{lobby_key_upper}' after broadcast.")
                 for sock in disconnected_sockets:
                     self.disconnect(sock, lobby_key_upper) # Disconnect them properly

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
                # Get character ID directly from the stored tuple
                player_info = {"username": username, "character_id": char_id}
                if username == master_username:
                    # Even if master is connecting with a charId (which shouldn't happen per frontend logic), capture it
                    current_master = player_info
                    logger.info(f"  Found active master: {username} (CharID: {char_id})")
                else:
                    players_in_lobby.append(player_info)
        else:
            # If lobby doesn't exist anymore, don't send update
            logger.warning(f"  Lobby '{lobby_key_upper}' not found during send_players_update. Skipping.")
            return

        # If master wasn't found among active connections (e.g., only players connected?)
        if current_master is None and master_username:
             current_master = {"username": master_username, "character_id": None}
             logger.info(f"  Master '{master_username}' not found in active connections, using provided username (CharID unknown).")
        # Edge case: If masterUsername wasn't provided somehow
        elif current_master is None and not master_username:
             logger.error(f"  Cannot send players_update for lobby '{lobby_key_upper}': Master username unknown and not found in connections.")
             return

        target_player_slots = max(0, max_players - 1)
        # Ensure the list has exactly target_player_slots elements
        final_player_list = [None] * target_player_slots
        for i, player in enumerate(players_in_lobby):
            if i < target_player_slots:
                 final_player_list[i] = player # Fill with player data
            else:
                 logger.warning(f"  More players ({len(players_in_lobby)}) than available slots ({target_player_slots}) in lobby '{lobby_key_upper}'. Truncating.")
                 break # Stop if we exceed target slots

        logger.info(f"  Final player list (size {target_player_slots}): {final_player_list}")
        message_data = json.dumps({
            "type": "players_update",
            "master": current_master,
            "players": final_player_list
        })
        logger.info(f"  Broadcasting players_update message: {message_data}")
        await self.broadcast(lobby_key_upper, message_data)

    async def broadcast_character_update(self, lobby_key: str, character_data: dict):
        """Sends detailed character data to all users in the lobby."""
        lobby_key_upper = lobby_key.upper()
        if not character_data or 'id' not in character_data:
             logger.error("broadcast_character_update: Invalid character_data provided.")
             return

        message = json.dumps({
            "type": "character_update",
            "character": character_data # character_data should be a dict
        })
        # logger.info(f"Broadcasting character_update for CharID: {character_data['id']} in lobby '{lobby_key_upper}'") # Reduce log noise
        await self.broadcast(lobby_key_upper, message)

    # --- NEW: Method to get all CHARACTER IDs in a lobby ---
    def get_character_ids_in_lobby(self, lobby_key: str) -> Set[int]:
        """Returns a set of character IDs currently present in the lobby (excluding None)."""
        lobby_key_upper = lobby_key.upper()
        character_ids = set()
        # Use the stored lobby_characters mapping directly
        if lobby_key_upper in self.lobby_characters:
            for char_id in self.lobby_characters[lobby_key_upper].values():
                if char_id is not None:
                     character_ids.add(char_id)
        return character_ids

    # --- NEW: Method to get all active websockets in a lobby ---
    def get_lobby_websockets(self, lobby_key: str) -> List[WebSocket]:
         lobby_key_upper = lobby_key.upper()
         if lobby_key_upper in self.active_connections:
             # Return only the websocket objects
             return [ws for ws, _, _ in self.active_connections[lobby_key_upper]]
         return []

# Singleton instance
manager = ConnectionManager()