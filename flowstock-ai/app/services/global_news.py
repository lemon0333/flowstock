"""글로벌 경제 뉴스 (Reuters/Bloomberg/FT) + Claude 번역.

- 공식 RSS는 막혀있는 매체가 많아 Google News RSS의 `source:NAME` 검색으로 우회.
- 5분 캐시 (번역 비용 보호).
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import httpx
from cachetools import TTLCache

from app.services.translator import translate_headlines

logger = logging.getLogger(__name__)

GOOGLE_NEWS_BASE = "https://news.google.com/rss/search"

GLOBAL_SOURCES: list[tuple[str, str]] = [
    ("Reuters", "when:1d+source:Reuters+(stocks+OR+market+OR+economy+OR+earnings)"),
    ("Bloomberg", "when:1d+source:Bloomberg+(stocks+OR+market+OR+economy+OR+earnings)"),
    ("Financial Times", "when:1d+source:Financial+Times"),
]

_HTML_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")
_HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; FlowStock-RSS/1.0)",
    "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.5",
}

_GLOBAL_CACHE: TTLCache = TTLCache(maxsize=4, ttl=300)


def _strip(text: str | None) -> str:
    if not text:
        return ""
    text = _HTML_TAG.sub("", text)
    return _WS.sub(" ", text).strip()


def _parse_pubdate(s: str | None) -> str:
    if not s:
        return datetime.now(timezone.utc).isoformat()
    try:
        return parsedate_to_datetime(s).isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()


async def _fetch_one(client: httpx.AsyncClient, source: str, query: str, limit: int) -> list[dict]:
    url = f"{GOOGLE_NEWS_BASE}?q={query}&hl=en&gl=US&ceid=US:en"
    try:
        resp = await client.get(url, timeout=_HTTP_TIMEOUT, headers=_HEADERS)
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)
    except Exception as e:
        logger.warning("global news fetch failed (%s): %s", source, e)
        return []

    items: list[dict] = []
    for e in (feed.entries or [])[:limit]:
        title = _strip(e.get("title"))
        # Google News title 형식 "헤드라인 - Source" 분리
        parts = title.rsplit(" - ", 1)
        if len(parts) == 2 and len(parts[1]) < 40:
            title = parts[0]
        items.append({
            "id": e.get("id") or e.get("link") or title,
            "title_en": title,
            "summary_en": _strip(e.get("summary"))[:300],
            "link": e.get("link") or "",
            "source": source,
            "published_at": _parse_pubdate(e.get("published")),
        })
    return items


async def get_global_news(limit: int = 20) -> list[dict]:
    """글로벌 경제 뉴스 + 한국어 번역 — 5분 캐시."""
    cache_key = limit
    cached = _GLOBAL_CACHE.get(cache_key)
    if cached is not None:
        return cached

    per_source = max(8, limit // len(GLOBAL_SOURCES) + 2)
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            *[_fetch_one(client, name, query, per_source) for name, query in GLOBAL_SOURCES],
            return_exceptions=False,
        )

    flat: list[dict] = []
    for items in results:
        flat.extend(items)
    flat.sort(key=lambda x: x["published_at"], reverse=True)
    flat = flat[:limit]

    if flat:
        try:
            translations = await translate_headlines(
                [{"title": x["title_en"], "summary": x["summary_en"]} for x in flat]
            )
            for item, t in zip(flat, translations):
                item["title_ko"] = t.get("title", "")
                item["summary_ko"] = t.get("summary", "")
        except Exception as e:
            logger.warning("translation step failed: %s", e)
            for item in flat:
                item.setdefault("title_ko", "")
                item.setdefault("summary_ko", "")

    _GLOBAL_CACHE[cache_key] = flat
    return flat
