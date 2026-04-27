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
            items.append(
                {
                    "id": e.get("id") or link,
                    "title": _strip(e.get("title")),
                    "summary": _strip(e.get("summary"))[:300],
                    "link": link,
                    "source": name,
                    "publishedAt": _parse_dt(e.get("published")) or _parse_dt(e.get("updated")),
                }
            )
    # 최신순 정렬
    items.sort(key=lambda x: x.get("publishedAt") or "", reverse=True)
    return items[:limit]
