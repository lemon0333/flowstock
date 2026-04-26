"""주식 데이터 수집 서비스.

KRX 사이트는 미니PC IP에서 403 Forbidden을 자주 반환하고, pykrx 1.0.45는
KRX 응답 변경 영향으로 index 함수가 KeyError를 던지는 문제가 있어
**네이버 금융 모바일 API를 1차 데이터 소스**로 사용한다.
- 지수:    https://api.stock.naver.com/chart/domestic/index/{KOSPI|KOSDAQ}?periodType=dayCandle
- 종목:    https://m.stock.naver.com/api/stocks/marketValue/{KOSPI|KOSDAQ}?pageSize=100&page=1

pykrx는 종목 일봉 OHLCV(특정 ticker 시계열) 같은 백업 용도로만 남겨둔다.
"""

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

logger = logging.getLogger(__name__)

NAVER_UA = {"User-Agent": "Mozilla/5.0"}


def _get_json(url: str, timeout: int = 15) -> dict:
    req = urllib.request.Request(url, headers=NAVER_UA)
    raw = urllib.request.urlopen(req, timeout=timeout).read().decode()
    return json.loads(raw)


def _to_int(value) -> int:
    if value is None:
        return 0
    s = str(value).replace(",", "").replace("+", "").strip()
    if not s or s == "-":
        return 0
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return 0


def _to_float(value) -> float:
    if value is None:
        return 0.0
    s = str(value).replace(",", "").replace("+", "").strip()
    if not s or s == "-":
        return 0.0
    try:
        return float(s)
    except (TypeError, ValueError):
        return 0.0


class StockDataService:
    """네이버 금융 API 기반 주식 데이터 서비스."""

    INDEX_CODES = [("KOSPI", "코스피"), ("KOSDAQ", "코스닥")]

    @staticmethod
    def _today() -> str:
        return datetime.now().strftime("%Y%m%d")

    # ── 시장 지수 (KOSPI/KOSDAQ) ───────────────────────────
    def get_market_index(self, date: str | None = None) -> list[dict]:
        results: list[dict] = []
        for code, name in self.INDEX_CODES:
            try:
                data = _get_json(
                    f"https://api.stock.naver.com/chart/domestic/index/{code}?periodType=dayCandle"
                )
                infos = data.get("priceInfos") or []
                if not infos:
                    continue
                last = infos[-1]
                prev = infos[-2] if len(infos) >= 2 else last
                close = _to_float(last.get("closePrice"))
                prev_close = _to_float(prev.get("closePrice"))
                change = round(close - prev_close, 2)
                rate = round(change / prev_close * 100, 2) if prev_close else 0.0
                results.append(
                    {
                        "index_code": code,
                        "name": name,
                        "close": round(close, 2),
                        "open": _to_float(last.get("openPrice")),
                        "high": _to_float(last.get("highPrice")),
                        "low": _to_float(last.get("lowPrice")),
                        "change": change,
                        "change_rate": rate,
                        "volume": _to_int(last.get("accumulatedTradingVolume")),
                        "date": str(last.get("localDate") or ""),
                    }
                )
            except Exception as e:
                logger.warning("Naver index 조회 실패 (%s): %s", code, e)
                continue
        return results

    # ── 전체 시장 시세 (시가총액 top, 거래량 desc 정렬) ───
    def get_market_ohlcv(self, date: str | None = None, market: str = "KOSPI") -> list[dict]:
        if market not in ("KOSPI", "KOSDAQ"):
            return []
        try:
            data = _get_json(
                f"https://m.stock.naver.com/api/stocks/marketValue/{market}?pageSize=100&page=1"
            )
        except Exception as e:
            logger.error("Naver %s 종목 리스트 실패: %s", market, e)
            return []
        stocks = data.get("stocks") or []
        results: list[dict] = []
        for s in stocks:
            close = _to_int(s.get("closePrice"))
            change_amount = _to_int(s.get("compareToPreviousClosePrice"))
            rate = _to_float(s.get("fluctuationsRatio"))
            results.append(
                {
                    "ticker": s.get("itemCode") or "",
                    "name": s.get("stockName") or "",
                    "open": 0,
                    "high": 0,
                    "low": 0,
                    "close": close,
                    "change": change_amount,
                    "volume": _to_int(s.get("accumulatedTradingVolume")),
                    "change_rate": rate,
                    "market_value": _to_int(s.get("marketValue")),
                }
            )
        # 거래량 desc 정렬
        results.sort(key=lambda x: x["volume"], reverse=True)
        return results

    # ── 종목 리스트 ────────────────────────────────────────
    def get_stock_list(self, market: str = "ALL", date: str | None = None) -> list[dict]:
        markets = ["KOSPI", "KOSDAQ"] if market == "ALL" else [market]
        results: list[dict] = []
        for mkt in markets:
            try:
                data = _get_json(
                    f"https://m.stock.naver.com/api/stocks/marketValue/{mkt}?pageSize=200&page=1"
                )
            except Exception as e:
                logger.warning("Naver stock list 실패 (%s): %s", mkt, e)
                continue
            for s in (data.get("stocks") or []):
                results.append(
                    {
                        "ticker": s.get("itemCode") or "",
                        "name": s.get("stockName") or "",
                        "market": mkt,
                    }
                )
        return results

    # ── 종목 일봉 OHLCV ────────────────────────────────────
    def get_ohlcv(self, ticker: str, start_date: str, end_date: str) -> list[dict]:
        # 네이버 chart API로 일봉 시계열 조회
        try:
            data = _get_json(
                f"https://api.stock.naver.com/chart/domestic/item/{ticker}?periodType=dayCandle"
            )
        except Exception as e:
            logger.error("Naver chart %s 실패: %s", ticker, e)
            return []
        infos = data.get("priceInfos") or []
        records: list[dict] = []
        s = (start_date or "").replace("-", "")
        e = (end_date or "").replace("-", "")
        for it in infos:
            d = str(it.get("localDate") or "")
            if s and d < s:
                continue
            if e and d > e:
                continue
            records.append(
                {
                    "date": f"{d[:4]}-{d[4:6]}-{d[6:]}" if len(d) == 8 else d,
                    "open": _to_int(it.get("openPrice")),
                    "high": _to_int(it.get("highPrice")),
                    "low": _to_int(it.get("lowPrice")),
                    "close": _to_int(it.get("closePrice")),
                    "volume": _to_int(it.get("accumulatedTradingVolume")),
                }
            )
        return records


    # ── 경제 대시보드 (맨큐 거시/미시 관점) ───────────────
    def get_economy_dashboard(self) -> dict:
        """KOSPI/KOSDAQ 통합 정보 + 매매주체별 동향 + 시장폭 + 52주 고저 + 시계열."""
        result: dict = {
            "indices": [],
            "deal_trend": {},        # 외국인/기관/개인 매매 동향
            "up_down": {},           # 상승/하락/보합 종목 수
            "fifty_two_week": {},    # 52주 고/저 대비 현재가
            "series": {},            # KOSPI/KOSDAQ 일별 시계열
        }
        for code, name in self.INDEX_CODES:
            try:
                data = _get_json(
                    f"https://m.stock.naver.com/api/index/{code}/integration"
                )
            except Exception as e:
                logger.warning("Naver integration %s 실패: %s", code, e)
                continue

            # totalInfos에서 시가/고가/저가/52주
            info_map: dict = {}
            for info in data.get("totalInfos") or []:
                k = info.get("key")
                v = info.get("value")
                if k:
                    info_map[k] = v

            # dealTrendInfo
            dt = data.get("dealTrendInfo") or {}
            result["deal_trend"][code] = {
                "name": name,
                "personal": _to_int(dt.get("personalValue")),
                "foreign": _to_int(dt.get("foreignValue")),
                "institutional": _to_int(dt.get("institutionalValue")),
                "bizdate": dt.get("bizdate"),
            }

            # upDownStockInfo
            ud = data.get("upDownStockInfo") or {}
            result["up_down"][code] = {
                "name": name,
                "upper": _to_int(ud.get("upperCount")),  # 상한가
                "rise": _to_int(ud.get("riseCount")),    # 상승
                "steady": _to_int(ud.get("steadyCount")),
                "fall": _to_int(ud.get("fallCount")),
                "lower": _to_int(ud.get("lowerCount")),  # 하한가
            }

            # 52주 고/저
            high52 = _to_float(info_map.get("52주 최고"))
            low52 = _to_float(info_map.get("52주 최저"))

            # 시계열 (chart endpoint, ~1년)
            close_now = None
            try:
                chart = _get_json(
                    f"https://api.stock.naver.com/chart/domestic/index/{code}?periodType=dayCandle"
                )
                infos = chart.get("priceInfos") or []
                series = [
                    {
                        "date": str(p.get("localDate") or ""),
                        "close": _to_float(p.get("closePrice")),
                        "volume": _to_int(p.get("accumulatedTradingVolume")),
                    }
                    for p in infos
                ]
                result["series"][code] = series
                if series:
                    close_now = series[-1]["close"]
            except Exception as e:
                logger.warning("chart %s 실패: %s", code, e)

            result["fifty_two_week"][code] = {
                "name": name,
                "high_52w": high52,
                "low_52w": low52,
                "close": close_now or _to_float(info_map.get("시가")),
                "ratio": (
                    round((close_now - low52) / (high52 - low52) * 100, 2)
                    if close_now and high52 and low52 and high52 > low52
                    else None
                ),
            }

            result["indices"].append(
                {
                    "code": code,
                    "name": name,
                    "close": close_now,
                    "open": _to_float(info_map.get("시가")),
                    "high": _to_float(info_map.get("고가")),
                    "low": _to_float(info_map.get("저가")),
                    "high_52w": high52,
                    "low_52w": low52,
                }
            )

        return result


# 싱글턴 인스턴스
stock_data_service = StockDataService()
