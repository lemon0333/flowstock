from app.services.news_stock_match import extract_related, extract_related_many


def test_단일_종목명_매칭():
    assert extract_related("삼성전자 호실적 발표") == ["005930"]


def test_여러_종목_등장_순서_유지():
    assert extract_related("삼성전자와 SK하이닉스가 동반 상승") == ["005930", "000660"]


def test_중복_제거():
    assert extract_related("삼성전자 신고가, 삼성전자 외국인 매수") == ["005930"]


def test_ticker_숫자_직접_매칭():
    # 본문에 6자리 ticker만 있어도 매칭
    assert extract_related("005930 외국인 순매수") == ["005930"]


def test_종목명_없으면_빈리스트():
    assert extract_related("일반적인 경제 기사") == []


def test_긴_이름_우선():
    # "LG"와 "LG화학" 둘 다 매칭 가능 → 긴 이름이 먼저 잡혀야 한 종목으로 통합
    result = extract_related("LG화학 호실적")
    assert result == ["051910"]


def test_여러_텍스트_합치기():
    result = extract_related_many(["삼성전자 어쩌구", "SK하이닉스 저쩌구"])
    assert "005930" in result
    assert "000660" in result


def test_빈_텍스트():
    assert extract_related("") == []
    assert extract_related_many([]) == []


def test_limit_적용():
    text = " ".join(["삼성전자", "SK하이닉스", "기아", "현대차", "LG화학"])
    result = extract_related(text, limit=2)
    assert len(result) == 2
