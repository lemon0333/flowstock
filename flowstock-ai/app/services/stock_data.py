import logging
from datetime import datetime, timedelta

from pykrx import stock as krx_stock

logger = logging.getLogger(__name__)


class StockDataService:
    """pykrx를 이용한 한국 주식 데이터 수집 서비스."""

    @staticmethod
    def _format_date(date_str: str) -> str:
        """날짜 문자열을 yyyymmdd 형식으로 정규화한다."""
        return date_str.replace("-", "")

    @staticmethod
    def _today() -> str:
        return datetime.now().strftime("%Y%m%d")

    # ── OHLCV ───────────────────────────────────────────────

    def get_ohlcv(
        self, ticker: str, start_date: str, end_date: str
    ) -> list[dict]:
        """종목 일봉 OHLCV 데이터를 반환한다.

        Args:
            ticker: 종목 코드 (예: "005930")
            start_date: 시작일 (yyyymmdd)
            end_date: 종료일 (yyyymmdd)

        Returns:
            [{"date", "open", "high", "low", "close", "volume"}, ...]
        """
        start = self._format_date(start_date)
        end = self._format_date(end_date)
        try:
            df = krx_stock.get_market_ohlcv_by_date(start, end, ticker)
            if df.empty:
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
            logger.error(f"OHLCV 조회 실패 (ticker={ticker}): {e}")
            raise

    # ── 전체 시장 시세 ───────────────────────────────────────

    def get_market_ohlcv(self, date: str, market: str = "KOSPI") -> list[dict]:
        """특정 날짜의 전체 시장 시세를 반환한다.

        Args:
            date: 조회 날짜 (yyyymmdd)
            market: 시장 구분 ("KOSPI" 또는 "KOSDAQ")

        Returns:
            [{"ticker", "name", "open", "high", "low", "close", "volume", "change_rate"}, ...]
        """
        d = self._format_date(date)
        try:
            df = krx_stock.get_market_ohlcv_by_ticker(d, market=market)
            if df.empty:
                return []

            # 종목명 매핑
            ticker_name = krx_stock.get_market_ticker_and_name(d, market=market)

            records: list[dict] = []
            for ticker, row in df.iterrows():
                name = ticker_name.get(ticker, "")
                records.append(
                    {
                        "ticker": ticker,
                        "name": name,
                        "open": int(row["시가"]),
                        "high": int(row["고가"]),
                        "low": int(row["저가"]),
                        "close": int(row["종가"]),
                        "volume": int(row["거래량"]),
                        "change_rate": round(float(row["등락률"]), 2),
                    }
                )
            return records
        except Exception as e:
            logger.error(f"시장 시세 조회 실패 (date={date}, market={market}): {e}")
            raise

    # ── 종목 리스트 ──────────────────────────────────────────

    def get_stock_list(self, market: str = "ALL", date: str | None = None) -> list[dict]:
        """종목 코드와 이름 리스트를 반환한다.

        Args:
            market: "KOSPI", "KOSDAQ", "ALL" (기본값)
            date: 기준일 (yyyymmdd). None이면 오늘.

        Returns:
            [{"ticker": "005930", "name": "삼성전자"}, ...]
        """
        d = self._format_date(date) if date else self._today()
        try:
            results: list[dict] = []
            markets = ["KOSPI", "KOSDAQ"] if market == "ALL" else [market]

            for mkt in markets:
                tickers = krx_stock.get_market_ticker_list(d, market=mkt)
                for t in tickers:
                    name = krx_stock.get_market_ticker_name(t)
                    results.append(
                        {
                            "ticker": t,
                            "name": name,
                            "market": mkt,
                        }
                    )
            return results
        except Exception as e:
            logger.error(f"종목 리스트 조회 실패 (market={market}): {e}")
            raise

    # ── 시장 지수 ────────────────────────────────────────────

    def get_market_index(self, date: str) -> list[dict]:
        """코스피/코스닥 주요 지수를 반환한다.

        Args:
            date: 조회 날짜 (yyyymmdd)

        Returns:
            [{"name", "close", "change", "change_rate"}, ...]
        """
        d = self._format_date(date)
        # 지수 데이터를 가져오기 위해 짧은 기간 조회
        start = (datetime.strptime(d, "%Y%m%d") - timedelta(days=7)).strftime("%Y%m%d")
        try:
            target_indices = {
                "1001": "코스피",
                "2001": "코스닥",
            }

            results: list[dict] = []
            for idx_code, idx_name in target_indices.items():
                df = krx_stock.get_index_ohlcv_by_date(start, d, idx_code)
                if df.empty:
                    continue

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
            return results
        except Exception as e:
            logger.error(f"시장 지수 조회 실패 (date={date}): {e}")
            raise


# 싱글턴 인스턴스
stock_data_service = StockDataService()
