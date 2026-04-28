"""한국 주요 경제/주식 뉴스 RSS 크롤링.

- 한국경제, 매일경제, 연합뉴스 경제, 조선비즈
- feedparser로 각 RSS feed 파싱 후 통합/정렬해 반환
- 외부 사이트 응답이 다양하므로 각 feed는 try/except로 격리
"""

import logging
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser

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

# 비용 큰 LLM 호출 없이 키워드 기반 감성 점수 (Claude 호출은 단건 endpoint에서)
_POS_KW = (
    "상승", "급등", "호조", "강세", "최고가", "신고가", "흑자", "수주", "성장",
    "확대", "증가", "역대", "돌파", "기대", "회복", "긍정",
)
_NEG_KW = (
    "하락", "급락", "약세", "최저가", "신저가", "적자", "감소", "축소", "리스크",
    "둔화", "위기", "부진", "철회", "지연", "충격", "부정", "우려",
)


def get_stock_news(keyword: str, date_from: str | None = None, date_to: str | None = None, limit: int = 10) -> list[dict]:
    """Google News RSS로 종목/키워드 + 기간 뉴스 검색.

    date_from/date_to 형식: yyyy-mm-dd. 둘 중 하나만 있어도 동작.
    """
    q_parts = [keyword]
    if date_from:
        q_parts.append(f"after:{date_from}")
    if date_to:
        q_parts.append(f"before:{date_to}")
    q = urllib.parse.quote_plus(" ".join(q_parts)) if False else "%20".join(urllib.parse.quote(p) for p in q_parts)
    url = f"https://news.google.com/rss/search?q={q}&hl=ko&gl=KR&ceid=KR:ko"
    try:
        feed = feedparser.parse(url)
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
    return items


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


def get_latest_news(limit: int = 30) -> list[dict]:
    items: list[dict] = []
    for name, url in SOURCES:
        try:
            feed = feedparser.parse(url)
        except Exception as e:
            logger.warning("RSS fetch 실패 (%s): %s", name, e)
            continue
        for e in (feed.entries or [])[: limit]:
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
    # 최신순 정렬
    items.sort(key=lambda x: x.get("publishedAt") or "", reverse=True)
    return items[:limit]
