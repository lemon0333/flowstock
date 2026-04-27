"""correlation 모듈 단위 테스트 — 외부 호출은 monkeypatch 처리."""

import numpy as np
import pytest

from app.services import correlation


class TestGetCorrelationMatrix:
    def test_market_정규화_및_경계값(self, monkeypatch):
        # _top_tickers가 빈 응답 → empty matrix
        monkeypatch.setattr(correlation, "_top_tickers", lambda m, t: [])
        result = correlation.get_correlation_matrix(market="INVALID", top=999, days=999)
        assert result == {"tickers": [], "names": [], "matrix": []}

    def test_정상_경로(self, monkeypatch):
        # 두 종목, 30일 임의 데이터
        tickers = [{"ticker": "005930", "name": "삼성전자"}, {"ticker": "000660", "name": "SK하이닉스"}]
        monkeypatch.setattr(correlation, "_top_tickers", lambda m, t: tickers)

        # OHLCV 가짜 데이터: 동일한 날짜 30개 + 약한 상관
        rng = np.random.default_rng(seed=42)
        dates = [f"2026{m:02d}{d:02d}" for m in (1, 2) for d in range(1, 16)]
        prices1 = (100 + rng.normal(0, 1, len(dates)).cumsum()).tolist()
        prices2 = (100 + rng.normal(0, 1, len(dates)).cumsum()).tolist()

        def fake_ohlcv(ticker, s, e):
            ps = prices1 if ticker == "005930" else prices2
            return [{"date": d, "close": p} for d, p in zip(dates, ps)]

        monkeypatch.setattr(
            correlation.stock_data_service, "get_ohlcv", fake_ohlcv,
        )

        result = correlation.get_correlation_matrix(market="KOSPI", top=2, days=30)
        assert result["tickers"] == ["005930", "000660"]
        assert result["names"] == ["삼성전자", "SK하이닉스"]
        m = np.asarray(result["matrix"])
        # 2x2 matrix, 대각선 = 1
        assert m.shape == (2, 2)
        assert m[0][0] == pytest.approx(1.0, abs=0.01)
        assert m[1][1] == pytest.approx(1.0, abs=0.01)
        # 대칭
        assert m[0][1] == pytest.approx(m[1][0], abs=0.01)
        # 값 범위
        assert -1.0 <= m[0][1] <= 1.0

    def test_데이터_부족시_빈_매트릭스(self, monkeypatch):
        # 5일 미만은 corr 안 나감
        tickers = [{"ticker": "A", "name": "A"}, {"ticker": "B", "name": "B"}]
        monkeypatch.setattr(correlation, "_top_tickers", lambda m, t: tickers)

        def short(ticker, s, e):
            return [{"date": "20260101", "close": 100}]  # 1일치만

        monkeypatch.setattr(correlation.stock_data_service, "get_ohlcv", short)
        result = correlation.get_correlation_matrix(market="KOSPI", top=2, days=30)
        assert result == {"tickers": [], "names": [], "matrix": []}
