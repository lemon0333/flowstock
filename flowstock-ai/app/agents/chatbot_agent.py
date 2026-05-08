"""
챗봇 에이전트 — RAG 검색 → 시스템 프롬프트 주입 → claude-code-sdk async stream.

이벤트 yield: {"type": "chunk|source", "data": {...}}
호출자(라우터)가 SSE 형식으로 변환.
"""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator

from claude_code_sdk import ClaudeCodeOptions, query

from app.agents.prompts.junior_investor import (
    SYSTEM_PROMPT,
    format_rag_context,
)
from app.services.learn_index import search_topics

logger = logging.getLogger(__name__)

MAX_HISTORY_TURNS = 6
MAX_USER_INPUT_LEN = 500


def _build_prompt(history: list[dict[str, str]], rag_context: str) -> str:
    """현재 사용자 질문 + 직전 N턴 컨텍스트로 단일 prompt 구성.

    claude-code-sdk의 query()는 단일 prompt + system_prompt 패턴이라
    이전 대화는 prompt 안에 텍스트로 포함시켜야 함.
    """
    history = history[-MAX_HISTORY_TURNS:]
    if not history:
        return ""

    current_user = history[-1]
    if current_user.get("role") != "user":
        return ""

    user_text = (current_user.get("content") or "")[:MAX_USER_INPUT_LEN]

    lines: list[str] = []
    if rag_context:
        lines.append(rag_context)
        lines.append("")

    if len(history) > 1:
        lines.append("[이전 대화]")
        for m in history[:-1]:
            role = "사용자" if m.get("role") == "user" else "스톡이"
            content = (m.get("content") or "").strip()
            if content:
                lines.append(f"{role}: {content}")
        lines.append("")

    lines.append(f"[사용자 입력]: {user_text}")
    return "\n".join(lines)


async def stream_chat(
    history: list[dict[str, str]],
    current_path: str | None,
) -> AsyncIterator[dict[str, Any]]:
    """챗봇 스트림 — RAG → claude-code-sdk async iterator → 이벤트 yield."""
    if not history:
        yield {"type": "error", "data": {"code": "INVALID", "message": "messages가 비어있어요"}}
        return

    last = history[-1]
    if last.get("role") != "user":
        yield {"type": "error", "data": {"code": "INVALID", "message": "마지막 메시지가 user가 아니에요"}}
        return

    user_query = (last.get("content") or "").strip()
    if not user_query:
        yield {"type": "error", "data": {"code": "INVALID", "message": "질문이 비어있어요"}}
        return

    # 1. RAG
    try:
        rag_hits = search_topics(user_query, top_k=3)
    except Exception as e:
        logger.warning("RAG 검색 실패: %s", e)
        rag_hits = []

    # 2. 출처 이벤트 먼저
    for hit in rag_hits:
        yield {
            "type": "source",
            "data": {
                "topic": hit.title,
                "slug": hit.slug,
                "audience": hit.audience,
                "score": round(hit.score, 3),
            },
        }

    # 3. 시스템 프롬프트 + 컨텍스트
    rag_context = format_rag_context(rag_hits)
    system = SYSTEM_PROMPT.format(current_path=current_path or "(없음)")

    prompt = _build_prompt(history, rag_context)
    if not prompt:
        yield {"type": "error", "data": {"code": "INVALID", "message": "프롬프트 구성 실패"}}
        return

    options = ClaudeCodeOptions(
        system_prompt=system,
        max_turns=1,
    )

    # 4. claude-code-sdk async stream
    # claude-code 1.0.0의 SDK는 ResultMessage 받은 후 cleanup에서 exit code 1로
    # raise하는 케이스가 있음 — 응답을 이미 받았으면 그 exception은 swallow.
    got_response = False
    try:
        async for msg in query(prompt=prompt, options=options):
            msg_type = getattr(msg, "type", "")
            if msg_type == "assistant":
                content = getattr(msg, "content", None)
                if isinstance(content, list):
                    for block in content:
                        text = getattr(block, "text", None)
                        if text:
                            got_response = True
                            yield {"type": "chunk", "data": {"delta": text}}
                elif isinstance(content, str) and content:
                    got_response = True
                    yield {"type": "chunk", "data": {"delta": content}}
            elif msg_type == "result":
                # 정상 종료. iterator 더 안 돌리고 빠져나옴.
                break
    except Exception as e:
        if got_response:
            # 응답은 이미 받았고 cleanup만 깨진 케이스 — 사용자에겐 정상.
            logger.warning("SDK cleanup 실패(응답은 정상 emit됨): %s", type(e).__name__)
        else:
            logger.exception("claude-code-sdk 호출 실패")
            yield {
                "type": "error",
                "data": {"code": "UPSTREAM", "message": f"AI 응답 실패: {type(e).__name__}"},
            }
