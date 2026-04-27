"""섹터/종목 일별 수익률 상관계수 행렬.

시가총액 top N 종목의 최근 N일 종가에서 일별 수익률을 계산하고
Pearson 상관계수 행렬을 반환한다 — 효율시장 가설 / 분산투자 관점의 시각화 자료.
"""

import logging
from datetime import datetime, timedelta

import numpy as np

from app.services.stock_data import _get_json, stock_data_service

logger = logging.getLogger(__name__)


def _top_tickers(market: str, top: int) -> list[dict]:
    try:
        data = _get_json(
            f"https://m.stock.naver.com/api/stocks/marketValue/{market}?pageSize={top}&page=1"
        )
    except Exception as e:
        logger.warning("top tickers 실패 (%s): %s", market, e)
        return []
    out: list[dict] = []
    for s in (data.get("stocks") or [])[:top]:
        out.append({"ticker": s.get("itemCode") or "", "name": s.get("stockName") or ""})
    return out


def get_correlation_matrix(market: str = "KOSPI", top: int = 10, days: int = 60) -> dict:
    if market not in ("KOSPI", "KOSDAQ"):
        market = "KOSPI"
    top = max(2, min(top, 30))
    days = max(20, min(days, 365))

    tickers = _top_tickers(market, top)
    if not tickers:
        return {"tickers": [], "names": [], "matrix": []}

    end = datetime.now()
    start = end - timedelta(days=days * 2)  # 영업일 고려해 넉넉히
    e = end.strftime("%Y%m%d")
    s = start.strftime("%Y%m%d")

    series_by_ticker: dict[str, list[tuple[str, float]]] = {}
    for t in tickers:
        try:
            data = stock_data_service.get_ohlcv(t["ticker"], s, e)
        except Exception as ex:
            logger.warning("ohlcv 실패 %s: %s", t["ticker"], ex)
            data = []
        # date 오름차순 (이미 그렇게 옴), 종가 추출
        series_by_ticker[t["ticker"]] = [(d["date"], float(d["close"])) for d in data if d.get("close")]

    # 공통 날짜 교집합
    common_dates: set[str] | None = None
    for arr in series_by_ticker.values():
        ds = {d for d, _ in arr}
        common_dates = ds if common_dates is None else (common_dates & ds)
    if not common_dates:
        return {"tickers": [], "names": [], "matrix": []}
    sorted_dates = sorted(common_dates)[-days:]

    # 종가 매트릭스 (T일 x N종목)
    closes: list[list[float]] = []
    for d in sorted_dates:
        row: list[float] = []
        for t in tickers:
            arr = series_by_ticker.get(t["ticker"]) or []
            close = next((c for dt, c in arr if dt == d), None)
            row.append(close if close is not None else float("nan"))
        closes.append(row)

    a = np.asarray(closes, dtype=float)
    if a.shape[0] < 5 or a.shape[1] < 2:
        return {"tickers": [], "names": [], "matrix": []}

    # 일별 로그 수익률
    a = np.where(np.isnan(a), np.nanmedian(a), a)
    returns = np.diff(np.log(a), axis=0)

    # 상관계수
    if returns.shape[0] < 5:
        return {"tickers": [], "names": [], "matrix": []}
    corr = np.corrcoef(returns, rowvar=False)
    corr = np.where(np.isnan(corr), 0.0, corr)
    matrix = np.round(corr, 3).tolist()

    return {
        "tickers": [t["ticker"] for t in tickers],
        "names": [t["name"] for t in tickers],
        "matrix": matrix,
    }
