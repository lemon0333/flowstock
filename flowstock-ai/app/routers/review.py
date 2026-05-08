"""
복기노트 AI 분석 라우터.
POST /api/ai/review/analyze — 매수/매도 거래에 대해 AI 분석.

claude binary subprocess + JSON output (non-streaming) — claude-code-sdk
의존 없음 (chatbot_agent와 동일한 패턴).
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai/review", tags=["review"])

CLAUDE_BIN = "/usr/bin/claude"
TIMEOUT_SECONDS = 60.0
_review_sem = asyncio.Semaphore(3)


SYSTEM_PROMPT = """너는 주식 입문자(주린이)의 모의투자 거래를 따뜻하게 복기해주는 분석가야.

원칙:
- 사용자는 1,000만원 가상 잔고로 연습 중인 주린이. 비판보다 학습 관점.
- "잘한 점 / 아쉬운 점 / 다음 교훈" 3가지를 각각 1~2 문장으로 짧게.
- 사용자가 메모로 매수/매도 이유를 적었다면 그 의도를 인용해서 코멘트.
- 단정적인 종목 추천이나 미래 예측 X. 결정 과정/사고 패턴 위주.
- 친근한 반말 ("~했네", "~하면 좋아").
- 출력은 반드시 다음 JSON 한 객체만 (다른 텍스트 X):
  {"good": "...", "concern": "...", "lesson": "..."}
"""


class ReviewRequest(BaseModel):
    stockName: str = Field(min_length=1, max_length=80)
    action: str = Field(pattern="^(buy|sell)$")
    price: float = Field(gt=0)
    quantity: int = Field(gt=0)
    total: float = Field(gt=0)
    at: str = Field(min_length=1, max_length=64)
    memo: Optional[str] = Field(default=None, max_length=500)
    avgBuyPrice: Optional[float] = Field(default=None, gt=0)
    returnPct: Optional[float] = Field(default=None)


class ReviewResponse(BaseModel):
    good: str
    concern: str
    lesson: str


def _build_prompt(req: ReviewRequest) -> str:
    lines: list[str] = [
        f"종목: {req.stockName}",
        f"매매: {'매수' if req.action == 'buy' else '매도'}",
        f"가격: {int(req.price):,}원 × {req.quantity}주 = {int(req.total):,}원",
        f"시각: {req.at}",
    ]
    if req.action == "sell":
        if req.avgBuyPrice is not None:
            lines.append(f"평균 매수가: {int(req.avgBuyPrice):,}원")
        if req.returnPct is not None:
            sign = "+" if req.returnPct >= 0 else ""
            lines.append(f"수익률: {sign}{req.returnPct:.2f}%")
    if req.memo:
        lines.append(f"\n사용자 메모: {req.memo}")
    else:
        lines.append("\n(메모 없음 — 결정 이유를 적지 않은 점도 한 가지 코멘트 포인트)")
    lines.append("")
    lines.append("위 거래를 복기해서 JSON으로 답해.")
    return "\n".join(lines)


def _parse_json_response(text: str) -> Optional[dict[str, str]]:
    if not text:
        return None
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        obj = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    if not isinstance(obj, dict):
        return None
    if not all(k in obj for k in ("good", "concern", "lesson")):
        return None
    return {k: str(obj[k])[:500] for k in ("good", "concern", "lesson")}


async def _call_claude(prompt: str, system: str) -> str:
    """claude binary 직접 호출 — output-format json (한 번에 result 반환)."""
    proc = await asyncio.create_subprocess_exec(
        CLAUDE_BIN,
        "--print",
        "--max-turns", "1",
        "--output-format", "json",
        "--system-prompt", system,
        "--",
        prompt,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout_b, _ = await asyncio.wait_for(proc.communicate(), timeout=TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        if proc.returncode is None:
            proc.kill()
            await proc.wait()
        raise HTTPException(status_code=504, detail="AI 응답이 너무 오래 걸려요")

    out = stdout_b.decode("utf-8", errors="replace").strip()
    if not out:
        raise HTTPException(status_code=502, detail="AI 응답이 비어있어요")
    try:
        obj = json.loads(out)
    except json.JSONDecodeError:
        logger.warning("claude json output 파싱 실패 — head=%r", out[:200])
        raise HTTPException(status_code=502, detail="AI 응답 형식이 비정상")

    if obj.get("is_error"):
        msg = str(obj.get("result", "알 수 없는 오류"))[:200]
        raise HTTPException(status_code=502, detail=f"AI 호출 실패: {msg}")

    result = obj.get("result")
    if not isinstance(result, str) or not result:
        raise HTTPException(status_code=502, detail="AI 응답에 텍스트가 없어요")
    return result


@router.post("/analyze", response_model=ReviewResponse)
async def analyze(req: ReviewRequest) -> ReviewResponse:
    async with _review_sem:
        prompt = _build_prompt(req)
        try:
            full = await _call_claude(prompt, SYSTEM_PROMPT)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("review claude 호출 실패")
            raise HTTPException(status_code=502, detail=f"AI 분석 실패: {type(e).__name__}")

        parsed = _parse_json_response(full)
        if not parsed:
            logger.warning("review JSON 파싱 실패 — raw=%r", full[:200])
            return ReviewResponse(
                good="(분석 결과 파싱 실패)",
                concern="(분석 결과 파싱 실패)",
                lesson=full[:300] or "AI 응답이 비어있어요. 다시 시도해주세요.",
            )
        return ReviewResponse(**parsed)
