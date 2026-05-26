"""
Naver Finance 모바일 API 래퍼 — Airflow task에서 부르는 stdlib-only 버전.

ai-service의 stock_data.py를 minimal subset으로 옮긴 것. 차이점:
- 캐시 없음 (Airflow task는 보통 one-shot run당 1회 호출)
- StockDataService 클래스 없이 함수만 — DAG에서 부르기 깔끔
- urllib만 사용 (requests 등 외부 dep 없음)

데이터 스키마는 ai-service와 동일 → 나중에 두 곳을 합치기 쉬움.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

NAVER_UA = {"User-Agent": "Mozilla/5.0"}


def _get_json(url: str, timeout: int = 15) -> dict[str, Any]:
    req = urllib.request.Request(url, headers=NAVER_UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8")
    return json.loads(raw)


def _to_int(value: Any) -> int:
    if value is None:
        return 0
    s = str(value).replace(",", "").replace("+", "").strip()
    if not s or s == "-":
        return 0
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return 0


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    s = str(value).replace(",", "").replace("+", "").strip()
    if not s or s == "-":
        return 0.0
    try:
        return float(s)
    except (TypeError, ValueError):
        return 0.0


def fetch_market_ohlcv(market: str = "KOSPI", max_pages: int = 4) -> list[dict[str, Any]]:
    """
    Naver 모바일 시가총액 API에서 KOSPI 또는 KOSDAQ 종목 OHLCV 스냅샷을 가져온다.
    한 페이지 pageSize=100, 최대 4페이지(400 종목)까지.
    """
    if market not in ("KOSPI", "KOSDAQ"):
        raise ValueError(f"지원하지 않는 market: {market}")

    results: list[dict[str, Any]] = []
    for page in range(1, max_pages + 1):
        url = f"https://m.stock.naver.com/api/stocks/marketValue/{market}?pageSize=100&page={page}"
        try:
            data = _get_json(url)
        except urllib.error.HTTPError as e:
            logger.warning("Naver %s page=%d HTTP %s", market, page, e.code)
            continue
        except Exception as e:
            logger.warning("Naver %s page=%d 실패: %s", market, page, e)
            continue

        stocks = data.get("stocks") or []
        if not stocks:
            break

        for s in stocks:
            results.append(
                {
                    "ticker": s.get("itemCode") or "",
                    "name": s.get("stockName") or "",
                    "market": market,
                    "close": _to_int(s.get("closePrice")),
                    "change": _to_int(s.get("compareToPreviousClosePrice")),
                    "change_rate": _to_float(s.get("fluctuationsRatio")),
                    "volume": _to_int(s.get("accumulatedTradingVolume")),
                    "market_value": _to_int(s.get("marketValue")),
                }
            )

    # 거래량 desc 정렬 (ai-service와 동일)
    results.sort(key=lambda x: x["volume"], reverse=True)
    return results
