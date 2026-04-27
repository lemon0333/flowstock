"""news_feed 모듈 단위 테스트.

외부 RSS 호출(get_stock_news/get_latest_news)은 네트워크 의존이라 mock 처리,
순수 로직(_heuristic_sentiment / _strip / _parse_dt)만 검증한다.
"""

from app.services.news_feed import _heuristic_sentiment, _parse_dt, _strip


class TestHeuristicSentiment:
    def test_빈문자열_neutral(self):
        assert _heuristic_sentiment("") == "neutral"
        assert _heuristic_sentiment(None) == "neutral"  # type: ignore

    def test_긍정_키워드_2개_이상이면_positive(self):
        # 상승 + 호조
        assert _heuristic_sentiment("코스피 상승 마감, 반도체 호조") == "positive"

    def test_부정_키워드_2개_이상이면_negative(self):
        # 급락 + 우려
        assert _heuristic_sentiment("코스피 급락, 경기 둔화 우려") == "negative"

    def test_혼재된_경우는_neutral(self):
        # 상승 1 vs 하락 1 → diff 1 < 2 → neutral
        assert _heuristic_sentiment("어떤 종목은 상승, 다른 종목은 하락") == "neutral"

    def test_긍정_1개만으로는_neutral(self):
        # diff < 2 컷오프
        assert _heuristic_sentiment("코스피 강세 마감") == "neutral"


class TestStrip:
    def test_HTML_태그_제거(self):
        assert _strip("<p>안녕</p>") == "안녕"

    def test_연속_공백_단일화(self):
        assert _strip("a   b\n\n\tc") == "a b c"

    def test_None과_빈값(self):
        assert _strip(None) == ""
        assert _strip("") == ""


class TestParseDt:
    def test_RFC822_파싱(self):
        # feedparser 보통 이런 형태 줌
        result = _parse_dt("Mon, 26 Apr 2026 12:00:00 +0900")
        assert result.startswith("2026-04-26")

    def test_빈값(self):
        assert _parse_dt(None) == ""
        assert _parse_dt("") == ""

    def test_잘못된_포맷은_예외없이_원본_반환(self):
        # 파싱 실패해도 raise 안 함 — 원본 문자열 그대로 돌려준다
        assert _parse_dt("garbage-not-a-date") == "garbage-not-a-date"
