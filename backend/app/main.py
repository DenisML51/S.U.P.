from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
from typing import Optional, List, Dict, Any # Added List, Dict, Any
import asyncio # Added asyncio for potential background tasks

# --- Imports ---
from .db.database import engine, Base, get_db, SessionLocal
from .core.auth import get_current_user
from .websockets.manager import manager
from .models.user import User
from .models.character import Character
# --- ADDED IMPORTS ---
from .crud import character as character_crud
from .schemas import CharacterDetailedOut
# --- END ADDED IMPORTS ---
from .routers import auth, characters, parties, reference_data, admin
import logging

logger = logging.getLogger(__name__)

# Base.metadata.create_all(bind=engine) # Use Alembic for migrations
app = FastAPI(title="Осознание API", version="0.4.3") # Increment version

# CORS Middleware
origins = [
    "http://localhost",
    "http://localhost:3000",
    # Add other origins if needed (e.g., your deployed frontend URL)
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(characters.router)
app.include_router(parties.router)
app.include_router(reference_data.router)
app.include_router(admin.router)

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    lobbyKey: str = Query(...),
    masterUsername: str = Query(...),
    maxPlayers: str = Query(...),
    characterId: Optional[int] = Query(None, description="ID персонажа игрока (null/отсутствует для мастера)")
):
    # Create a new session scope for this connection
    db: Session = SessionLocal()
    user: Optional[User] = None
    character: Optional[Character] = None # Character object if player connects
    lobby_key_upper = lobbyKey.upper()
    username: Optional[str] = None # Username of connected user

    # === Pre-Connection Validation ===
    try:
        # 1. Authenticate user (using the same db session)
        try:
            user = await get_current_user(token=token, db=db)
            if not user: # Should not happen if get_current_user raises exception, but check anyway
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found after token decode")
            username = user.username
            logger.info(f"WebSocket Auth successful for user: {username}")
        except HTTPException as auth_exc:
            # Log and close with specific reason
            logger.error(f"WebSocket auth failed for token starting {token[:10]}...: {auth_exc.detail} (Status: {auth_exc.status_code})")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Authentication failed: {auth_exc.detail}")
            db.close() # Close session on failure
            return
        except Exception as e:
             # Catch other unexpected errors during auth
            logger.error(f"Unexpected WebSocket auth error: {e}", exc_info=True)
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Internal authentication error")
            db.close() # Close session on failure
            return

        # 2. Validate character ownership (ONLY if characterId is provided)
        if characterId is not None:
            character = db.query(Character).filter(Character.id == characterId, Character.owner_id == user.id).first()
            if not character:
                logger.warning(f"User {username} tried to connect with invalid/unowned charId {characterId}")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid character ID or character not owned by user.")
                db.close()
                return
            logger.info(f"User {username} validated for character {characterId} (Owner ID: {user.id})")
        else:
            # Check if user is the master if no characterId is provided
            # TODO: A better check would involve fetching the party by lobbyKey and comparing user.id to party.creator_id
            if user.username != masterUsername:
                 logger.warning(f"User {username} attempted connection to lobby '{lobby_key_upper}' without characterId but is not master ({masterUsername})")
                 await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Only players select characters; master connects without one.")
                 db.close()
                 return
            logger.info(f"Master {username} connecting without specific character ID.")

        # 3. Validate maxPlayers
        try:
            max_players_int = int(maxPlayers)
            if not (2 <= max_players_int <= 10): raise ValueError("Max players must be between 2 and 10")
        except ValueError as e:
            logger.warning(f"Invalid maxPlayers value '{maxPlayers}' for lobby '{lobby_key_upper}': {e}")
            await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason=f"Invalid maxPlayers format: {e}")
            db.close()
            return

        # 4. Accept the connection ONLY after all validations pass
        await websocket.accept()
        logger.info(f"WebSocket connection accepted for user {username} in lobby {lobby_key_upper}")

        # === Post-Connection Logic ===

        # 5. Connect to manager (adds user to internal lists)
        connected = await manager.connect(websocket, lobby_key_upper, username, characterId)
        if not connected:
            # Manager.connect might refuse (e.g., duplicate character) and close the socket
            logger.warning(f"ConnectionManager refused connection for {username} (CharID: {characterId})")
            # Websocket should already be closed by manager.connect in this case
            db.close()
            return

        # 6. Fetch details for initial sync
        all_participant_details: List[Dict[str, Any]] = []
        try:
            # Get IDs of all chars currently connected (including the new one if applicable)
            current_char_ids_in_lobby = manager.get_character_ids_in_lobby(lobby_key_upper)
            logger.info(f"Fetching details for {len(current_char_ids_in_lobby)} characters for initial sync/broadcast.")

            # Fetch details for all characters currently in the lobby
            for cid in current_char_ids_in_lobby:
                 # Need owner_id for get_character_details_for_output
                 # This requires a query unless we store owner_id in ConnectionManager
                 char_owner_q = db.query(Character.owner_id).filter(Character.id == cid).first()
                 if char_owner_q:
                     owner_id = char_owner_q[0]
                     details = character_crud.get_character_details_for_output(db=db, character_id=cid, user_id=owner_id)
                     if details:
                         all_participant_details.append(details.model_dump(mode='json'))
                     else:
                          logger.warning(f"Could not fetch details for existing char {cid} for owner {owner_id}")
                 else:
                     logger.warning(f"Could not find owner for existing char {cid}")

        except Exception as e:
             logger.error(f"Error fetching initial character details for lobby {lobby_key_upper}: {e}", exc_info=True)
             # Continue connection, but client might have incomplete data initially

        # 7. Send FULL details of ALL participants to the NEW client
        if all_participant_details:
             initial_sync_message = json.dumps({
                 "type": "initial_character_sync",
                 "characters": all_participant_details
             })
             await manager.send_personal_message(websocket, initial_sync_message)
             logger.info(f"Sent initial sync with {len(all_participant_details)} character details to {username}")

        # 8. Broadcast the NEW client's character details (if they are a player) to EVERYONE ELSE
        if characterId is not None:
            # Find the newly added details in the fetched list
            new_client_details = next((d for d in all_participant_details if d.get("id") == characterId), None)
            if new_client_details:
                await manager.broadcast_character_update(lobby_key_upper, new_client_details)
                logger.info(f"Broadcasted new client's ({username}) char details (CharID: {characterId})")
            else:
                 # This might happen if fetching details failed earlier
                 logger.warning(f"Could not find details for new client (CharID: {characterId}) to broadcast.")


        # 9. Broadcast updated player list to EVERYONE (now includes the new player)
        # Use a try-except block for robustness
        try:
             await manager.send_players_update(lobby_key_upper, masterUsername, max_players_int)
             logger.info(f"Sent players_update after {username} connected.")
        except Exception as e:
             logger.error(f"Error sending initial players_update for lobby {lobby_key_upper}: {e}", exc_info=True)

        # 10. Main message loop (Chat)
        try:
            while True:
                data = await websocket.receive_text()
                # Basic chat relay with sender info
                logger.debug(f"WS message from {username} in {lobby_key_upper}: {data}")
                chat_message = json.dumps({
                    "type": "chat",
                    "sender": username,
                    "text": data
                })
                # Broadcast chat message excluding the sender
                await manager.broadcast(lobby_key_upper, chat_message, exclude_websocket=websocket)
        except WebSocketDisconnect as ws_disconnect:
            logger.info(f"WebSocket disconnected for user {username} (CharID: {characterId}) in lobby {lobby_key_upper}. Code: {ws_disconnect.code}, Reason: {ws_disconnect.reason}")
        except Exception as e:
            # Catch potential errors during receive_text or broadcast
            logger.error(f"WebSocket Error in main loop for {username} (Lobby {lobby_key_upper}): {e}", exc_info=True)
            # Attempt to close gracefully if possible
            try:
                 await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Internal server error during message handling")
            except Exception:
                 logger.error(f"Failed to close WebSocket gracefully for {username} after error.")

    finally:
        # 11. Disconnect and update player list for everyone else
        logger.info(f"Cleaning up connection for {username} in lobby {lobby_key_upper}")
        manager.disconnect(websocket, lobby_key_upper)
        # Send final player update only if the lobby still exists and has connections
        if lobby_key_upper in manager.active_connections and manager.active_connections[lobby_key_upper]:
             try:
                 # Ensure maxPlayers is still valid int
                 max_players_int_on_disconnect = int(maxPlayers)
                 await manager.send_players_update(lobby_key_upper, masterUsername, max_players_int_on_disconnect)
                 logger.info(f"Sent players_update after {username} disconnected from lobby {lobby_key_upper}")
             except Exception as update_e:
                 logger.error(f"Error sending player update after {username} disconnect: {update_e}", exc_info=True)
        else:
              logger.info(f"Lobby {lobby_key_upper} closed or empty, skipping final player update on disconnect for {username}.")

        # Close the database session associated with this connection
        if db:
             db.close()
             logger.debug(f"Database session closed for {username}'s connection.")