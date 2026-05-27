/**
 * 투자 에이전트 빌더 — 프리셋 템플릿 + 조건 스키마 + 스크리닝 필터.
 *
 * 백엔드 /stocks가 주는 필드(price/volume/changePercent)만으로 구성.
 * marketValue·재무지표는 데이터 소스 확장(미장 포함) 후 추가 예정.
 */

export interface AgentConditions {
  minPrice: number;
  maxPrice: number;
  minChangePercent: number;
  maxChangePercent: number;
  minVolume: number;
  sortKey: "volume" | "changePercent" | "price";
  sortDesc: boolean;
  topN: number;
}

export interface AgentStock {
  id: string;
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
}

export interface AgentTemplate {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  /** 이 전략을 한 줄로 설명 — SKILL.md/미리보기에 노출 */
  rationale: string;
  conditions: AgentConditions;
}

const DEFAULTS: AgentConditions = {
  minPrice: 0,
  maxPrice: 10_000_000,
  minChangePercent: -30,
  maxChangePercent: 30,
  minVolume: 0,
  sortKey: "volume",
  sortDesc: true,
  topN: 10,
};

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "volume_momentum",
    name: "거래량 모멘텀",
    emoji: "🚀",
    tagline: "오늘 거래 폭발 + 상승 중인 종목",
    rationale:
      "거래량이 평소보다 크게 터지면서 오르는 종목 = 시장 관심이 쏠리는 곳. 단기 모멘텀 추종 전략.",
    conditions: {
      ...DEFAULTS,
      minChangePercent: 1,
      minVolume: 1_000_000,
      sortKey: "volume",
      sortDesc: true,
    },
  },
  {
    id: "contrarian_dip",
    name: "역발상 저가",
    emoji: "🩹",
    tagline: "오늘 빠졌지만 거래량은 살아있는 종목",
    rationale:
      "하락했지만 거래가 충분히 일어난 종목 = 던지는 사람과 받는 사람이 공존. 반등 노리는 역발상 전략. (떨어지는 칼날 주의 — 반드시 본인 판단)",
    conditions: {
      ...DEFAULTS,
      minChangePercent: -30,
      maxChangePercent: -2,
      minVolume: 500_000,
      sortKey: "changePercent",
      sortDesc: false,
    },
  },
  {
    id: "stable_sideways",
    name: "안정 횡보",
    emoji: "🛟",
    tagline: "거의 안 움직이며 거래되는 안정주",
    rationale:
      "등락이 작고(±1.5% 이내) 거래량은 충분한 종목 = 변동성 낮은 방어적 후보. 주린이·안정형 성향에 적합.",
    conditions: {
      ...DEFAULTS,
      minChangePercent: -1.5,
      maxChangePercent: 1.5,
      minVolume: 300_000,
      sortKey: "volume",
      sortDesc: true,
    },
  },
  {
    id: "custom",
    name: "직접 설정",
    emoji: "🛠️",
    tagline: "조건을 처음부터 내가 정하기",
    rationale: "내 요건에 맞춰 가격·등락률·거래량 필터를 직접 조정.",
    conditions: { ...DEFAULTS },
  },
];

export function templateById(id: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find((t) => t.id === id);
}

/** 조건으로 종목 스크리닝 — 프론트 미리보기 + 생성된 screen.py와 동일 로직. */
export function screenStocks(stocks: AgentStock[], c: AgentConditions): AgentStock[] {
  const filtered = stocks.filter(
    (s) =>
      s.price >= c.minPrice &&
      s.price <= c.maxPrice &&
      s.changePercent >= c.minChangePercent &&
      s.changePercent <= c.maxChangePercent &&
      s.volume >= c.minVolume,
  );
  filtered.sort((a, b) => {
    const av = a[c.sortKey];
    const bv = b[c.sortKey];
    return c.sortDesc ? bv - av : av - bv;
  });
  return filtered.slice(0, c.topN);
}
