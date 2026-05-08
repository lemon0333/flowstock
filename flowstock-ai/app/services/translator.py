"""영문 → 한국어 헤드라인 일괄 번역.

claude binary subprocess + JSON output (chatbot/review와 동일 패턴).
헤드라인은 거의 변하지 않으므로 LRU 영구 캐시(2048개)로 비용 절감.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re

from cachetools import LRUCache

logger = logging.getLogger(__name__)

CLAUDE_BIN = "/usr/bin/claude"
TIMEOUT_SECONDS = 45.0
_translate_sem = asyncio.Semaphore(2)

_HEADLINE_CACHE: LRUCache = LRUCache(maxsize=2048)


SYSTEM_PROMPT = """너는 영문 경제 뉴스를 자연스러운 한국어로 옮기는 번역가야.

원칙:
- 입력은 JSON 배열. 각 원소는 {"title": "...", "summary": "..."}.
- 같은 길이의 한국어 배열을 JSON으로 응답.
- title은 신문 헤드라인처럼 간결하게. 의역 OK.
- summary는 자연스러운 1~2 문장으로 다듬기. 입력이 비어있으면 빈 문자열.
- 인명/기업명은 한국 통용 표기 (예: Powell→파월, Tesla→테슬라, Nvidia→엔비디아).
- 출력은 반드시 JSON 배열 하나만. 다른 텍스트 X.
"""


async def _claude_translate(items: list[dict[str, str]]) -> list[dict[str, str]]:
    payload = json.dumps(items, ensure_ascii=False)
    proc = await asyncio.create_subprocess_exec(
        CLAUDE_BIN,
        "--print",
        "--max-turns", "1",
        "--output-format", "json",
        "--system-prompt", SYSTEM_PROMPT,
        "--",
        payload,
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
        raise RuntimeError("translation timeout")

    out = stdout_b.decode("utf-8", errors="replace").strip()
    if not out:
        raise RuntimeError("empty stdout")

    try:
        obj = json.loads(out)
    except json.JSONDecodeError:
        raise RuntimeError(f"claude json output parse failed: {out[:200]}")

    if obj.get("is_error"):
        raise RuntimeError(f"claude error: {obj.get('result')}")

    result_str = (obj.get("result") or "").strip()
    result_str = re.sub(r"^```(?:json)?\s*|\s*```$", "", result_str, flags=re.MULTILINE).strip()

    parsed = json.loads(result_str)
    if not isinstance(parsed, list):
        raise RuntimeError("result is not a list")
    return parsed


async def translate_headlines(items: list[dict[str, str]]) -> list[dict[str, str]]:
    """영문 [{title, summary}] → 한국어 [{title, summary}].

    - LRU 캐시 hit한 항목은 claude 호출 제외
    - 실패 시 빈 문자열 반환 (caller가 fallback 처리)
    """
    if not items:
        return []

    results: list[dict[str, str] | None] = [None] * len(items)
    to_translate_idx: list[int] = []

    for i, item in enumerate(items):
        key = (item.get("title") or "", item.get("summary") or "")
        if key in _HEADLINE_CACHE:
            results[i] = _HEADLINE_CACHE[key]
        else:
            to_translate_idx.append(i)

    if to_translate_idx:
        async with _translate_sem:
            try:
                batch = [items[i] for i in to_translate_idx]
                translated = await _claude_translate(batch)
                for j, idx in enumerate(to_translate_idx):
                    if j < len(translated) and isinstance(translated[j], dict):
                        t = translated[j]
                        entry = {
                            "title": str(t.get("title", "") or "")[:300],
                            "summary": str(t.get("summary", "") or "")[:500],
                        }
                    else:
                        entry = {"title": "", "summary": ""}
                    results[idx] = entry
                    key = (items[idx].get("title") or "", items[idx].get("summary") or "")
                    _HEADLINE_CACHE[key] = entry
            except Exception as e:
                logger.warning("batch translation failed: %s", e)
                for idx in to_translate_idx:
                    results[idx] = {"title": "", "summary": ""}

    return [r if r is not None else {"title": "", "summary": ""} for r in results]
