import json
import logging
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.ai import AiConversation, AiMessage
from app.models.user import RoleEnum, User
from app.services.ai_tools import OWNER_TOOLS, STAFF_TOOLS, TOOL_DISPATCH

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Ты — AI-ассистент системы управления домашним персоналом "Дом".
Ты помогаешь управлять сотрудниками, расписанием, задачами, зарплатами и финансами.
Отвечай на русском языке. Будь вежливым и полезным.
Используй доступные инструменты для выполнения действий.
Если пользователь просит что-то сделать — выполни действие через инструмент и сообщи результат.
Если спрашивают информацию — получи её через инструмент и расскажи понятно."""


class DeepSeekAgent:
    def __init__(self):
        self.api_key = settings.deepseek_api_key
        self.base_url = settings.deepseek_base_url

    async def chat(
        self,
        user: User,
        message: str,
        conversation_id: Optional[int],
        db: Session,
    ) -> Dict[str, Any]:
        # Get or create conversation
        if conversation_id:
            conversation = db.query(AiConversation).filter(AiConversation.id == conversation_id).first()
        else:
            conversation = AiConversation(user_id=user.id)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        # Save user message
        user_msg = AiMessage(
            conversation_id=conversation.id,
            role="user",
            content=message,
        )
        db.add(user_msg)
        db.commit()

        # Build message history
        history = db.query(AiMessage).filter(
            AiMessage.conversation_id == conversation.id
        ).order_by(AiMessage.created_at).all()

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})

        # Select tools based on role
        tools = OWNER_TOOLS if user.role in (RoleEnum.owner, RoleEnum.manager) else STAFF_TOOLS

        # Call DeepSeek API with function calling loop
        actions_taken = []
        max_iterations = 5

        for _ in range(max_iterations):
            response = await self._call_api(messages, tools)

            if not response:
                break

            choice = response.get("choices", [{}])[0]
            resp_message = choice.get("message", {})

            # Check for tool calls
            tool_calls = resp_message.get("tool_calls")

            if not tool_calls:
                # No more tool calls - final response
                content = resp_message.get("content", "")

                # Save assistant message
                assistant_msg = AiMessage(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=content,
                    actions_taken=actions_taken if actions_taken else None,
                )
                db.add(assistant_msg)
                db.commit()

                return {
                    "conversation_id": conversation.id,
                    "content": content,
                    "actions": actions_taken,
                }

            # Execute tool calls
            messages.append(resp_message)

            for tool_call in tool_calls:
                func_name = tool_call["function"]["name"]
                try:
                    func_args = json.loads(tool_call["function"]["arguments"])
                except json.JSONDecodeError:
                    func_args = {}

                # Enforce staff restrictions
                if user.role not in (RoleEnum.owner, RoleEnum.manager):
                    if func_name in ("get_tasks", "get_schedule", "get_payroll"):
                        func_args["user_id"] = user.id
                    elif func_name == "create_schedule_change_request":
                        func_args["user_id"] = user.id

                # Execute tool
                tool_func = TOOL_DISPATCH.get(func_name)
                if tool_func:
                    try:
                        result = tool_func(db=db, **func_args)
                    except Exception as e:
                        result = {"error": str(e)}
                else:
                    result = {"error": f"Unknown tool: {func_name}"}

                actions_taken.append({
                    "tool": func_name,
                    "args": func_args,
                    "result": result,
                })

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": json.dumps(result, ensure_ascii=False, default=str),
                })

        # Fallback if max iterations reached
        return {
            "conversation_id": conversation.id,
            "content": "Выполнено несколько действий. Могу ли я ещё чем-то помочь?",
            "actions": actions_taken,
        }

    async def _call_api(self, messages: List[Dict], tools: List[Dict]) -> Optional[Dict]:
        if not self.api_key:
            logger.warning("DeepSeek API key not configured")
            return {
                "choices": [{
                    "message": {
                        "content": "AI-ассистент временно недоступен. API ключ не настроен.",
                    }
                }]
            }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": messages,
                        "tools": tools,
                        "temperature": 0.7,
                    },
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"DeepSeek API error: {e}")
                return {
                    "choices": [{
                        "message": {
                            "content": f"Произошла ошибка при обращении к AI: {str(e)}",
                        }
                    }]
                }
