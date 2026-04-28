"""뉴스 본문에서 관련 종목(티커) 추출.

비용 큰 LLM/NER 없이 종목 사전(이름/축약/티커) substring 매칭.
중복 제거 + 빈도순 정렬.
"""

from __future__ import annotations

import re
from typing import Iterable

# (ticker, names...) — 한국 시총 상위 + 자주 언급되는 종목 위주
# 동음이의어 위험 있는 너무 짧은 이름은 의도적으로 제외 (예: "한진" 단독, "현대" 단독)
STOCK_DICT: list[tuple[str, tuple[str, ...]]] = [
    ("005930", ("삼성전자",)),
    ("000660", ("SK하이닉스", "하이닉스")),
    ("373220", ("LG에너지솔루션", "LG엔솔")),
    ("207940", ("삼성바이오로직스", "삼성바이오")),
    ("005380", ("현대차", "현대자동차")),
    ("051910", ("LG화학",)),
    ("006400", ("삼성SDI",)),
    ("000270", ("기아",)),
    ("105560", ("KB금융",)),
    ("055550", ("신한지주",)),
    ("035420", ("NAVER", "네이버")),
    ("035720", ("카카오",)),
    ("068270", ("셀트리온",)),
    ("005490", ("POSCO홀딩스", "포스코홀딩스")),
    ("003670", ("포스코퓨처엠",)),
    ("012330", ("현대모비스",)),
    ("028260", ("삼성물산",)),
    ("066570", ("LG전자",)),
    ("003550", ("LG",)),
    ("034730", ("SK",)),
    ("015760", ("한국전력",)),
    ("017670", ("SK텔레콤",)),
    ("030200", ("KT",)),
    ("032830", ("삼성생명",)),
    ("009150", ("삼성전기",)),
    ("018260", ("삼성에스디에스", "삼성SDS")),
    ("010130", ("고려아연",)),
    ("010950", ("S-Oil", "에쓰오일")),
    ("011170", ("롯데케미칼",)),
    ("009830", ("한화솔루션",)),
    ("086790", ("하나금융지주",)),
    ("316140", ("우리금융지주",)),
    ("024110", ("기업은행",)),
    ("033780", ("KT&G",)),
    ("251270", ("넷마블",)),
    ("036570", ("엔씨소프트", "엔씨")),
    ("259960", ("크래프톤",)),
    ("293490", ("카카오게임즈",)),
    ("352820", ("하이브",)),
    ("041510", ("에스엠", "SM엔터")),
    ("122870", ("YG엔터테인먼트", "YG엔터")),
    ("035900", ("JYP엔터테인먼트", "JYP엔터")),
    ("042700", ("한미반도체",)),
    ("000810", ("삼성화재",)),
    ("034020", ("두산에너빌리티",)),
    ("267260", ("HD현대일렉트릭",)),
    ("009540", ("HD한국조선해양",)),
    ("042660", ("한화오션",)),
    ("010620", ("현대미포조선",)),
    ("064350", ("현대로템",)),
    ("047810", ("한국항공우주", "KAI")),
    ("079550", ("LIG넥스원",)),
    ("272210", ("한화시스템",)),
    ("028050", ("삼성엔지니어링",)),
    ("000720", ("현대건설",)),
    ("047040", ("대우건설",)),
]


def _build_index() -> list[tuple[str, str]]:
    """(매칭문자열, ticker) 펼친 list — 긴 이름 우선이 부분일치 우선되도록 정렬."""
    flat: list[tuple[str, str]] = []
    for ticker, names in STOCK_DICT:
        for n in names:
            if n:
                flat.append((n, ticker))
    flat.sort(key=lambda x: -len(x[0]))
    return flat


_INDEX = _build_index()


def extract_related(text: str, limit: int = 8) -> list[str]:
    """뉴스 텍스트에서 관련 종목 ticker 추출.

    - 6자리 ticker 직접 매칭 우선
    - 종목명은 긴 이름부터 매칭 (LG화학 → LG 충돌 방지). 매칭 시 본문에서 해당 부분 제거 후 다음으로
    - 등장 순서 유지, 중복 제거, limit개까지
    """
    if not text:
        return []
    seen: set[str] = set()
    ordered: list[str] = []
    # ticker 자체(005930) 매칭
    for m in re.finditer(r"\b\d{6}\b", text):
        t = m.group(0)
        if t not in seen:
            seen.add(t)
            ordered.append(t)
            if len(ordered) >= limit:
                return ordered

    # 종목명 매칭 — 본문에서 매칭된 부분을 공백으로 치환해 짧은 이름이 substring으로 다시 잡히는 것 방지
    # 등장 위치(가장 먼저 나오는 인덱스) 기준으로 결과 정렬
    found_at: dict[str, int] = {}
    working = text
    for name, ticker in _INDEX:
        if ticker in seen:
            continue
        idx = working.find(name)
        if idx >= 0:
            seen.add(ticker)
            found_at[ticker] = idx
            # 매칭된 부분 마스킹
            working = working[:idx] + (" " * len(name)) + working[idx + len(name):]
    # 등장 위치 순으로 정렬해서 ordered에 추가
    for ticker in sorted(found_at, key=lambda t: found_at[t]):
        ordered.append(ticker)
        if len(ordered) >= limit:
            break
    return ordered


def extract_related_many(texts: Iterable[str], limit: int = 8) -> list[str]:
    """여러 텍스트 합쳐 매칭 (뉴스 title + summary 같이 넣을 때 편의)."""
    return extract_related(" ".join(t for t in texts if t), limit)
