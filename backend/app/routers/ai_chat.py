import json
import logging

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.user import User
from app.services.ai_agent import DeepSeekAgent
from app.utils.security import decode_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ai_chat"])
agent = DeepSeekAgent()


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    # Authenticate via token query param
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token payload")
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            await websocket.close(code=4001, reason="User not found")
            return

        await websocket.accept()

        conversation_id = None

        while True:
            try:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                user_message = message_data.get("message") or message_data.get("content", "")
                conversation_id = message_data.get("conversation_id", conversation_id)

                # Send typing indicator
                await websocket.send_json({"type": "typing", "typing": True})

                # Call AI agent
                result = await agent.chat(
                    user=user,
                    message=user_message,
                    conversation_id=conversation_id,
                    db=db,
                )

                conversation_id = result.get("conversation_id")

                # Send action cards if any
                for action in result.get("actions", []):
                    await websocket.send_json({
                        "type": "action",
                        "tool": action["tool"],
                        "args": action["args"],
                        "result": action["result"],
                    })

                # Send assistant message
                await websocket.send_json({
                    "type": "message",
                    "content": result.get("content", ""),
                    "conversation_id": conversation_id,
                })

                # Stop typing indicator
                await websocket.send_json({"type": "typing", "typing": False})

            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                await websocket.send_json({"type": "error", "message": "Произошла внутренняя ошибка"})
    finally:
        db.close()
