import logging
from datetime import datetime, timedelta

from pykrx import stock as krx_stock

logger = logging.getLogger(__name__)


class StockDataService:
    """pykrx를 이용한 한국 주식 데이터 수집 서비스."""

    # 시스템 시각이 미래(시뮬레이션) 또는 휴일일 때 KRX의 가장 최근 거래일을
    # 자동으로 찾아 캐시한다. 모든 호출에서 입력 날짜에 KRX 데이터가 없으면 이 값으로 fallback.
    _latest_trading_day_cache: str | None = None

    @staticmethod
    def _format_date(date_str: str) -> str:
        return date_str.replace("-", "")

    @staticmethod
    def _today() -> str:
        return datetime.now().strftime("%Y%m%d")

    @classmethod
    def _get_latest_trading_day(cls, max_back_days: int = 400) -> str | None:
        """KRX에 실제 데이터가 있는 가장 최근 거래일을 찾는다 (process-level 캐시)."""
        if cls._latest_trading_day_cache:
            return cls._latest_trading_day_cache
        today = datetime.now()
        # 1단계: 7일 단위로 점프하며 KRX 데이터 있는 구간 탐색
        found_offset: int | None = None
        for offset in range(0, max_back_days, 7):
            ds = (today - timedelta(days=offset)).strftime("%Y%m%d")
            try:
                tickers = krx_stock.get_market_ticker_list(ds, market="KOSPI")
                if tickers:
                    found_offset = offset
                    break
            except Exception:
                continue
        if found_offset is None:
            logger.error("KRX 거래일을 찾지 못했음 (max_back_days=%d)", max_back_days)
            return None
        # 2단계: 그 구간(7일) 안에서 가장 최근 거래일 정확히 찾기
        for offset in range(max(0, found_offset - 6), found_offset + 1):
            ds = (today - timedelta(days=offset)).strftime("%Y%m%d")
            try:
                tickers = krx_stock.get_market_ticker_list(ds, market="KOSPI")
                if tickers:
                    cls._latest_trading_day_cache = ds
                    logger.info("KRX latest trading day = %s", ds)
                    return ds
            except Exception:
                continue
        # fallback: 1단계에서 찾은 날짜
        ds = (today - timedelta(days=found_offset)).strftime("%Y%m%d")
        cls._latest_trading_day_cache = ds
        return ds

    @classmethod
    def _resolve_date(cls, date: str | None) -> str:
        """입력 날짜에 KRX 데이터가 없으면 _get_latest_trading_day로 fallback."""
        if not date:
            return cls._get_latest_trading_day() or cls._today()
        d = cls._format_date(date)
        try:
            tickers = krx_stock.get_market_ticker_list(d, market="KOSPI")
            if tickers:
                return d
        except Exception:
            pass
        return cls._get_latest_trading_day() or d

    # ── 종목 일봉 OHLCV ─────────────────────────────────────
    def get_ohlcv(self, ticker: str, start_date: str, end_date: str) -> list[dict]:
        start = self._format_date(start_date)
        end = self._resolve_date(end_date)
        try:
            df = krx_stock.get_market_ohlcv_by_date(start, end, ticker)
            if df.empty or "시가" not in df.columns:
                return []
            records: list[dict] = []
            for date_idx, row in df.iterrows():
                records.append(
                    {
                        "date": date_idx.strftime("%Y-%m-%d"),
                        "open": int(row["시가"]),
                        "high": int(row["고가"]),
                        "low": int(row["저가"]),
                        "close": int(row["종가"]),
                        "volume": int(row["거래량"]),
                    }
                )
            return records
        except Exception as e:
            logger.error("OHLCV 조회 실패 (ticker=%s): %s", ticker, e)
            return []

    # ── 전체 시장 시세 ─────────────────────────────────────
    def get_market_ohlcv(self, date: str, market: str = "KOSPI") -> list[dict]:
        d = self._resolve_date(date)
        try:
            df = krx_stock.get_market_ohlcv_by_ticker(d, market=market)
            if df.empty or "시가" not in df.columns:
                return []
            try:
                ticker_name = krx_stock.get_market_ticker_and_name(d, market=market)
            except Exception:
                ticker_name = {}
            records: list[dict] = []
            for ticker, row in df.iterrows():
                name = ticker_name.get(ticker, "") if hasattr(ticker_name, "get") else ""
                records.append(
                    {
                        "ticker": ticker,
                        "name": name,
                        "open": int(row["시가"]),
                        "high": int(row["고가"]),
                        "low": int(row["저가"]),
                        "close": int(row["종가"]),
                        "volume": int(row["거래량"]),
                        "change_rate": round(float(row.get("등락률", 0) or 0), 2),
                    }
                )
            return records
        except Exception as e:
            logger.error("시장 시세 조회 실패 (date=%s market=%s): %s", date, market, e)
            return []

    # ── 종목 리스트 ────────────────────────────────────────
    def get_stock_list(self, market: str = "ALL", date: str | None = None) -> list[dict]:
        d = self._resolve_date(date)
        try:
            results: list[dict] = []
            markets = ["KOSPI", "KOSDAQ"] if market == "ALL" else [market]
            for mkt in markets:
                try:
                    tickers = krx_stock.get_market_ticker_list(d, market=mkt)
                except Exception as e:
                    logger.warning("ticker list 실패 (market=%s): %s", mkt, e)
                    continue
                for t in tickers:
                    try:
                        name = krx_stock.get_market_ticker_name(t)
                    except Exception:
                        name = ""
                    results.append({"ticker": t, "name": name, "market": mkt})
            return results
        except Exception as e:
            logger.error("종목 리스트 조회 실패: %s", e)
            return []

    # ── 시장 지수 ──────────────────────────────────────────
    def get_market_index(self, date: str) -> list[dict]:
        d = self._resolve_date(date)
        start = (datetime.strptime(d, "%Y%m%d") - timedelta(days=14)).strftime("%Y%m%d")
        target_indices = {"1001": "코스피", "2001": "코스닥"}
        results: list[dict] = []
        for idx_code, idx_name in target_indices.items():
            try:
                df = krx_stock.get_index_ohlcv_by_date(start, d, idx_code)
            except Exception as e:
                logger.warning("지수 %s 조회 실패: %s", idx_code, e)
                continue
            if df is None or df.empty:
                continue
            try:
                last = df.iloc[-1]
                prev_close = df.iloc[-2]["종가"] if len(df) >= 2 else last["종가"]
                change = round(float(last["종가"] - prev_close), 2)
                change_rate = (
                    round(change / prev_close * 100, 2) if prev_close != 0 else 0.0
                )
                results.append(
                    {
                        "index_code": idx_code,
                        "name": idx_name,
                        "close": round(float(last["종가"]), 2),
                        "change": change,
                        "change_rate": change_rate,
                        "volume": int(last["거래량"]),
                    }
                )
            except Exception as e:
                logger.warning("지수 %s 가공 실패: %s", idx_code, e)
                continue
        return results


# 싱글턴 인스턴스
stock_data_service = StockDataService()
