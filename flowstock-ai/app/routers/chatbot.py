"""
챗봇 SSE 라우터.
POST /api/ai/chatbot/stream — text/event-stream
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any, AsyncIterator

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.agents.chatbot_agent import stream_chat

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai/chatbot", tags=["chatbot"])

# Anthropic 구독 한도 보호 — 동시 query 5개로 제한
_chat_sem = asyncio.Semaphore(5)


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=500)


class ChatStreamRequest(BaseModel):
    sessionId: str = Field(min_length=1, max_length=128)
    messages: list[ChatMessage] = Field(min_length=1, max_length=12)
    currentPath: str | None = Field(default=None, max_length=200)


def _serialize(data: dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False)


async def _generator(req: ChatStreamRequest) -> AsyncIterator[dict[str, str]]:
    async with _chat_sem:
        try:
            history = [{"role": m.role, "content": m.content} for m in req.messages]
            async for event in stream_chat(history, req.currentPath):
                yield {
                    "event": event["type"],
                    "data": _serialize(event.get("data", {})),
                }
            # 성공 종료
            yield {
                "event": "done",
                "data": _serialize({"messageId": str(uuid.uuid4())}),
            }
        except asyncio.CancelledError:
            logger.info("client disconnected (sessionId=%s)", req.sessionId)
            raise
        except Exception as e:
            logger.exception("chatbot generator failed")
            yield {
                "event": "error",
                "data": _serialize({"code": "INTERNAL", "message": str(e)}),
            }


@router.post("/stream")
async def chatbot_stream(req: ChatStreamRequest) -> EventSourceResponse:
    """SSE 스트리밍 — 클라이언트는 EventSource로 구독."""
    return EventSourceResponse(
        _generator(req),
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache, no-transform",
        },
    )
