/**
 * 정적 라우트별 SEO title/description.
 * "주린이 성장" 톤으로 통일 — 일반 종목 분석 사이트 카피와 차별화.
 * 동적 페이지(/learn/:slug, /stock/:id, /articles/:id)는 페이지 자체에서 <SEO> 덮어씀.
 */

export interface PageSEO {
  title: string;
  description: string;
}

export const DEFAULT_SEO: PageSEO = {
  title: "주린이를 키우는 한국 주식 학습 사이트",
  description:
    "주식 1도 모르는 주린이부터 단계적으로 성장 — 비유로 시작하는 45개 학습 토픽, 1,000만원 가상 모의투자, 실시간 KOSPI/KOSDAQ 시세, 백테스트 게임.",
};

export const SEO_BY_PATH: Record<string, PageSEO> = {
  "/": DEFAULT_SEO,
  "/learn": {
    title: "주식 공부 45개 토픽 — 초등생부터 전공자까지",
    description:
      "주린이가 단계적으로 성장하는 45개 학습 토픽. 비유로 시작해 수식으로 끝나는 커리큘럼 — 초등/대학생/전공자 트랙 자유 선택.",
  },
  "/news": {
    title: "주식 뉴스 — 주린이도 흐름 한눈에",
    description:
      "한국경제·매일경제·연합뉴스 RSS와 종목 자동 매핑. 주린이가 시장 흐름을 쉽게 따라잡는 뉴스 모음.",
  },
  "/economy": {
    title: "경제 지표 — Fear & Greed, 매매주체, 52주 모멘텀",
    description:
      "주린이가 시장 신호를 읽는 법. 공포·탐욕 지수, 외국인/기관 매매주체 흐름, 섹터 상관관계.",
  },
  "/macro": {
    title: "거시 지표 — 환율·금리·원자재",
    description:
      "주린이도 거시 흐름을 이해할 수 있는 지표 한 페이지 — 달러 환율, 미국채 금리, WTI 유가, 금값.",
  },
  "/screener": {
    title: "종목 스크리너 — 조건별 KOSPI/KOSDAQ 종목 찾기",
    description:
      "PER·ROE·시가총액·52주 모멘텀 등 조건으로 KOSPI/KOSDAQ 전체 종목 필터링. 주린이가 좋은 종목을 직접 찾는 법.",
  },
  "/compare": {
    title: "종목 비교 — 재무·기술 지표 한눈에",
    description:
      "여러 종목의 재무·기술 지표를 나란히 비교. 주린이가 종목 선택에 자신감을 갖도록.",
  },
  "/sectors": {
    title: "섹터별 종목 — 산업 흐름 보기",
    description:
      "코스피·코스닥 섹터별 등락률과 대표 종목. 주린이가 산업 흐름을 이해하는 섹터 맵.",
  },
  "/backtest": {
    title: "전략 백테스트 — 과거 시점에서 안전하게 검증",
    description:
      "내 투자 전략을 과거 시점에서 시뮬레이션. 주린이가 실수 없이 전략 검증.",
  },
  "/earnings": {
    title: "실적 발표 캘린더 — 분기별 잠정·확정",
    description:
      "DART 공시 기반 분기별 실적 발표 일정. 주린이가 실적 시즌을 놓치지 않게.",
  },
  "/articles": {
    title: "투자 커뮤니티 — 다른 주린이들의 글",
    description:
      "주린이 동료들의 분석과 인사이트. 다양한 관점을 보고 함께 성장하는 공간.",
  },
  "/portfolio": {
    title: "1,000만원 가상 모의투자 — 실수해도 괜찮은 연습장",
    description:
      "실제 돈 없이 1,000만원 가상 잔고로 매수/매도 연습. 주린이가 안전하게 실전 감각을 익히는 모의투자.",
  },
  "/portfolio/game": {
    title: "투자 게임 — 백테스트 + 시점별 뉴스",
    description:
      "과거 시점으로 돌아가 그날의 뉴스만 보고 매매 결정. 주린이가 게임처럼 시장을 배우는 백테스트 게임.",
  },
  "/feedback": {
    title: "개선 제안 — 사이트를 함께 키우기",
    description: "FlowStock 개선 제안과 버그 리포트. 주린이가 원하는 기능을 직접 요청.",
  },
};

/** 인증/개인 페이지는 noindex 처리. */
export const NOINDEX_PATHS = new Set<string>(["/login", "/me", "/alerts"]);
