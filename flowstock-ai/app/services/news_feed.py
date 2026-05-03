"""한국 주요 경제/주식 뉴스 RSS 크롤링.

- 한국경제, 매일경제, 연합뉴스 경제, 조선비즈
- httpx.AsyncClient + asyncio.gather 로 4채널 병렬 fetch (직렬 1.5s+ → 0.3-0.5s)
- 결과는 60s TTL 캐시 (cachetools.TTLCache)
- httpx 호출은 OpenTelemetry httpx instrumentor 에 의해 자동 trace 기록됨
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
import urllib.parse
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import httpx
from cachetools import TTLCache

from app.services.news_stock_match import extract_related_many

logger = logging.getLogger(__name__)

# (출처 이름, RSS URL)
SOURCES: list[tuple[str, str]] = [
    ("한국경제", "https://www.hankyung.com/feed/economy"),
    ("매일경제", "https://www.mk.co.kr/rss/30100041/"),
    ("연합뉴스 경제", "https://www.yna.co.kr/rss/economy.xml"),
    ("조선비즈", "https://biz.chosun.com/arc/outboundfeeds/rss/category/finance/"),
]

_HTML_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")

# 캐시: latest news (limit 별로)는 최대 8개 키, 60초
_LATEST_CACHE: TTLCache = TTLCache(maxsize=8, ttl=60)
# 캐시: 검색 (keyword + range 조합) 최대 256개 키, 60초
_SEARCH_CACHE: TTLCache = TTLCache(maxsize=256, ttl=60)

_POS_KW = (
    "상승", "급등", "호조", "강세", "최고가", "신고가", "흑자", "수주", "성장",
    "확대", "증가", "역대", "돌파", "기대", "회복", "긍정",
)
_NEG_KW = (
    "하락", "급락", "약세", "최저가", "신저가", "적자", "감소", "축소", "리스크",
    "둔화", "위기", "부진", "철회", "지연", "충격", "부정", "우려",
)

_HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; FlowStock-RSS/1.0)",
    "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.5",
}


async def _fetch_one(client: httpx.AsyncClient, name: str, url: str, limit: int) -> list[dict]:
    """단일 RSS 채널 fetch + parse + 매핑까지 한 번에."""
    try:
        resp = await client.get(url, timeout=_HTTP_TIMEOUT, headers=_HEADERS)
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)
    except Exception as e:
        logger.warning("RSS fetch 실패 (%s): %s", name, e)
        return []

    items: list[dict] = []
    for e in (feed.entries or [])[:limit]:
        link = e.get("link") or ""
        title = _strip(e.get("title"))
        summary = _strip(e.get("summary"))[:300]
        items.append(
            {
                "id": e.get("id") or link,
                "title": title,
                "summary": summary,
                "link": link,
                "source": name,
                "publishedAt": _parse_dt(e.get("published")) or _parse_dt(e.get("updated")),
                "sentiment": _heuristic_sentiment(f"{title} {summary}"),
                "relatedStocks": extract_related_many([title, summary]),
            }
        )
    return items


async def get_latest_news_async(limit: int = 30) -> list[dict]:
    """주요 4개 RSS 병렬 fetch + 통합 정렬."""
    cache_key = limit
    cached = _LATEST_CACHE.get(cache_key)
    if cached is not None:
        return cached

    started = time.perf_counter()
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            *[_fetch_one(client, name, url, limit) for name, url in SOURCES],
            return_exceptions=False,
        )

    items: list[dict] = []
    for chunk in results:
        items.extend(chunk)
    items.sort(key=lambda x: x.get("publishedAt") or "", reverse=True)
    items = items[:limit]
    _LATEST_CACHE[cache_key] = items
    logger.info("RSS 4채널 병렬 fetch %.0fms n=%d", (time.perf_counter() - started) * 1000, len(items))
    return items


def get_latest_news(limit: int = 30) -> list[dict]:
    """sync wrapper — 기존 호출자 호환."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        # 이미 async context이면 새 thread에서 실행 (드물게 발생)
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as ex:
            return ex.submit(asyncio.run, get_latest_news_async(limit)).result()
    return asyncio.run(get_latest_news_async(limit))


async def get_stock_news_async(
    keyword: str,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 10,
) -> list[dict]:
    """Google News RSS — 종목/키워드 + 기간 필터. 60s 캐시."""
    cache_key = (keyword, date_from, date_to, limit)
    cached = _SEARCH_CACHE.get(cache_key)
    if cached is not None:
        return cached

    q_parts = [keyword]
    if date_from:
        q_parts.append(f"after:{date_from}")
    if date_to:
        q_parts.append(f"before:{date_to}")
    q = "%20".join(urllib.parse.quote(p) for p in q_parts)
    url = f"https://news.google.com/rss/search?q={q}&hl=ko&gl=KR&ceid=KR:ko"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=_HTTP_TIMEOUT, headers=_HEADERS)
            resp.raise_for_status()
            feed = feedparser.parse(resp.text)
    except Exception as e:
        logger.warning("google news rss 실패 (%s): %s", keyword, e)
        return []

    items: list[dict] = []
    for e in (feed.entries or [])[:limit]:
        link = e.get("link") or ""
        title = _strip(e.get("title"))
        items.append(
            {
                "id": e.get("id") or link,
                "title": title,
                "summary": _strip(e.get("summary"))[:200],
                "link": link,
                "source": _strip(e.get("source", {}).get("title")) if isinstance(e.get("source"), dict) else "Google News",
                "publishedAt": _parse_dt(e.get("published")),
                "sentiment": _heuristic_sentiment(title),
            }
        )
    _SEARCH_CACHE[cache_key] = items
    return items


def get_stock_news(keyword: str, date_from: str | None = None, date_to: str | None = None, limit: int = 10) -> list[dict]:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as ex:
            return ex.submit(asyncio.run, get_stock_news_async(keyword, date_from, date_to, limit)).result()
    return asyncio.run(get_stock_news_async(keyword, date_from, date_to, limit))


def _heuristic_sentiment(text: str) -> str:
    if not text:
        return "neutral"
    pos = sum(1 for k in _POS_KW if k in text)
    neg = sum(1 for k in _NEG_KW if k in text)
    if pos - neg >= 2:
        return "positive"
    if neg - pos >= 2:
        return "negative"
    return "neutral"


def _strip(text: str | None) -> str:
    if not text:
        return ""
    s = _HTML_TAG.sub("", text)
    s = _WS.sub(" ", s).strip()
    return s


def _parse_dt(value: str | None) -> str:
    if not value:
        return ""
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        return value or ""
