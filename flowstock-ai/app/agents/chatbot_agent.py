"""
챗봇 에이전트 — RAG 검색 → 시스템 프롬프트 주입 → claude binary subprocess.

claude-code-sdk(0.0.25)는 호스트 binary(2.1.119) 출력 스키마를 따라가지
못해 MessageParseError 발생. SDK 의존을 제거하고 binary를 subprocess로
직접 호출 + stream-json 라인 파싱 — Anthropic이 binary 출력 스키마를
바꿔도 우리 코드만 부분 적응하면 됨.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncIterator

from app.agents.prompts.junior_investor import (
    SYSTEM_PROMPT,
    format_rag_context,
)
from app.services.learn_index import search_topics

logger = logging.getLogger(__name__)

CLAUDE_BIN = "/usr/bin/claude"
MAX_HISTORY_TURNS = 6
MAX_USER_INPUT_LEN = 500
TIMEOUT_SECONDS = 60.0


def _build_prompt(history: list[dict[str, str]], rag_context: str) -> str:
    """현재 사용자 질문 + 직전 N턴 컨텍스트로 단일 prompt 구성."""
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


def _extract_text_from_assistant_message(obj: dict) -> list[str]:
    """assistant 라인에서 text content들 추출."""
    msg = obj.get("message", {})
    content = msg.get("content", [])
    out: list[str] = []
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                t = block.get("text")
                if isinstance(t, str) and t:
                    out.append(t)
    return out


async def stream_chat(
    history: list[dict[str, str]],
    current_path: str | None,
) -> AsyncIterator[dict[str, Any]]:
    """챗봇 스트림 — RAG → claude binary subprocess → 라인 파싱 → 이벤트 yield."""
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

    # 2. 출처 이벤트
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

    # 4. claude binary subprocess — stream-json 라인 단위 yield
    args = [
        CLAUDE_BIN,
        "--print",
        "--max-turns", "1",
        "--output-format", "stream-json",
        "--verbose",
        "--system-prompt", system,
        "--",
        prompt,
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except FileNotFoundError:
        yield {"type": "error", "data": {"code": "UPSTREAM", "message": "AI 응답 실패: claude binary 없음"}}
        return
    except Exception as e:
        logger.exception("claude subprocess 실행 실패")
        yield {"type": "error", "data": {"code": "UPSTREAM", "message": f"AI 응답 실패: {type(e).__name__}"}}
        return

    got_response = False
    api_error: str | None = None
    assert proc.stdout is not None
    deadline = asyncio.get_event_loop().time() + TIMEOUT_SECONDS

    try:
        while True:
            remaining = deadline - asyncio.get_event_loop().time()
            if remaining <= 0:
                yield {"type": "error", "data": {"code": "TIMEOUT", "message": "AI 응답이 너무 오래 걸려요"}}
                return
            try:
                raw = await asyncio.wait_for(proc.stdout.readline(), timeout=remaining)
            except asyncio.TimeoutError:
                yield {"type": "error", "data": {"code": "TIMEOUT", "message": "AI 응답이 너무 오래 걸려요"}}
                return
            if not raw:
                break  # EOF
            line = raw.decode("utf-8", errors="replace").strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue  # 알 수 없는 라인은 skip

            t = obj.get("type")
            if t == "assistant":
                for text in _extract_text_from_assistant_message(obj):
                    got_response = True
                    yield {"type": "chunk", "data": {"delta": text}}
            elif t == "result":
                if obj.get("is_error"):
                    api_error = str(obj.get("result", "알 수 없는 오류"))
                break  # 정상/에러 종료

        if api_error and not got_response:
            short = api_error[:200]
            yield {"type": "error", "data": {"code": "UPSTREAM", "message": f"AI 응답 실패: {short}"}}
    finally:
        if proc.returncode is None:
            try:
                proc.kill()
            except ProcessLookupError:
                pass
        try:
            await proc.wait()
        except Exception:
            pass
