"""뉴스 본문에서 관련 종목(티커) + 핵심 키워드 추출.

- 종목 추출: 사전 substring 매칭 (한자·축약 alias 포함)
- 키워드 추출: 한글 2자+ / 영문 2자+ / 한자 1자+ 명사 추출 + 불용어 제거
  (LLM/형태소 분석기 없이도 뉴스↔뉴스 클러스터링 시드로 충분)
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
    ("105560", ("KB금융", "국민銀", "KB銀", "국민은행")),
    ("055550", ("신한지주", "신한銀", "신한은행")),
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
    ("086790", ("하나금융지주", "하나銀", "하나은행")),
    ("316140", ("우리금융지주", "우리銀", "우리은행")),
    ("024110", ("기업은행", "기업銀", "IBK기업은행")),
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


# ────────────────────────────────────────────────────────────────
# 키워드 추출 (뉴스 ↔ 뉴스 클러스터링용)
# ────────────────────────────────────────────────────────────────

# 한자(CJK) 1자 + 한글 2자+ + 영문 2자+ 허용
_NOUN_RE = re.compile(r"[가-힣]{2,}|[A-Z][A-Za-z]{1,}|[一-鿿]{1,3}")

# 너무 일반적이라 클러스터링에 도움 안 되는 단어 (지속 추가 가능)
_STOPWORDS: frozenset[str] = frozenset({
    # 메타 / 기사 형식
    "단독", "속보", "특집", "종합", "분석", "기자", "사진", "영상", "관련",
    "뉴스", "보도", "취재", "경제", "산업", "사회", "정치", "국제",
    # 시간/위치
    "오늘", "내일", "어제", "최근", "현재", "당시", "이번", "이번주", "올해",
    "한국", "국내", "해외", "전국", "서울", "지역",
    # 한자 1자 일반어 (국가/방위)
    "美", "中", "日", "歐", "英", "佛", "獨", "韓",
    # 동사·서술
    "발표", "확인", "검토", "예정", "추진", "계획", "결정", "예상", "기대",
    "강조", "지적", "주장", "제기", "전망", "확대", "증가", "감소", "축소",
    "있다", "없다", "한다", "된다",
    # 보조 단어
    "대해", "대해서", "통해", "관련", "위해", "위한", "지금", "직접", "그리고",
    "그러나", "하지만", "이미", "아직", "사실", "여기", "저기", "이곳", "그곳",
    "지난해", "지난달", "내년", "올초", "올말",
    # 일반 명사 (도움 안 됨)
    "사람", "회사", "기업", "정부", "국가", "시장", "업계", "전문가", "관계자",
    "내용", "결과", "이유", "방안", "대책", "조사", "발견",
})


_PARTICLE_RE = re.compile(
    r"(은|는|이|가|을|를|에|의|와|과|도|만|까지|부터|에서|에게|으로|이라|로서|"
    r"로써|보다|뿐|마다|에는|에서는|이라는|이라고|에서도|이며|이고)$"
)
_VERB_END_RE = re.compile(
    r"(하는|되는|있는|없는|한다|된다|있다|없다|이다|아니다|었다|됐다|했다|"
    r"였다|이었다|어|아|며|면서|지만|돼|되어|되며|되었으며|되었다|"
    r"한|된|돈|어가|아가|네|다)$"
)


def _normalize_token(w: str) -> str:
    """한국어 조사/어미를 빠르게 trim. 한자/영문은 그대로."""
    if not w or not "가" <= w[0] <= "힣":
        return w
    # 어미 → 조사 순서로 한 번씩 제거
    for _ in range(2):
        new = _VERB_END_RE.sub("", w)
        if new != w and len(new) >= 2:
            w = new
            continue
        new = _PARTICLE_RE.sub("", w)
        if new != w and len(new) >= 2:
            w = new
        else:
            break
    return w


def extract_keywords(text: str, top_n: int = 6) -> list[str]:
    """뉴스 텍스트에서 의미 있는 명사 키워드 추출 (빈도 + 길이 가중).

    - 한자 1~3자 / 영문 2자+ (대문자 시작) / 한글 2자+
    - 한국어 조사/어미 trim (금융결제원이 → 금융결제원, 변화하는 → 변화)
    - 불용어 제거 + 등장 빈도 기준 상위 top_n 개
    - 같은 단어가 여러 번 나오면 가중치 ↑, 길이도 약간 가중
    """
    if not text:
        return []
    # 종목명은 별도 추출이라 제외 (중복 방지)
    masked = text
    for name, _ in _INDEX:
        if name in masked:
            masked = masked.replace(name, " ")

    candidates = _NOUN_RE.findall(masked)
    counts: dict[str, int] = {}
    for raw in candidates:
        w = _normalize_token(raw)
        if w in _STOPWORDS:
            continue
        if len(w) < 2 and not _is_chinese_char(w):
            continue
        counts[w] = counts.get(w, 0) + 1

    def score(w: str) -> float:
        return counts[w] * (1.0 + 0.2 * max(0, len(w) - 2))

    return sorted(counts, key=lambda w: (-score(w), -len(w), w))[:top_n]


def extract_keywords_many(texts: Iterable[str], top_n: int = 6) -> list[str]:
    return extract_keywords(" ".join(t for t in texts if t), top_n)


def _is_chinese_char(s: str) -> bool:
    return bool(s) and 0x4E00 <= ord(s[0]) <= 0x9FFF
