/**
 * ============================================================
 * 주식 공부 콘텐츠 — 초등생 ~ 입문자 대상 비유와 예시
 *
 * 각 토픽:
 *  - intro: 비유로 시작 (그림 이모지 포함)
 *  - sections: 본문 (작은 단위로 쪼개서 가독성)
 *  - example: FlowStock 실제 데이터 활용 예시 + 페이지 링크
 *  - quiz: 4지선다 퀴즈 (이해 확인용)
 *
 * 토픽 추가/수정은 이 파일만 건드리면 됨.
 * ============================================================
 */

export interface QuizOption {
  text: string;
  correct?: boolean;
}
export interface Quiz {
  question: string;
  options: QuizOption[];
  explanation: string;
}

export interface LearnSection {
  heading?: string;
  body: string;
  emoji?: string;
}

export interface LearnTopic {
  slug: string;
  level: 1 | 2 | 3; // 1=입문, 2=초급, 3=중급
  emoji: string;
  title: string;
  oneLiner: string;
  intro: string;
  sections: LearnSection[];
  example?: { title: string; body: string; link?: { to: string; label: string } };
  quiz?: Quiz[];
  status: "ready" | "soon"; // 준비된 콘텐츠 vs 추가 예정
}

export const LEARN_TOPICS: LearnTopic[] = [
  // ─────────────────────────────────────────────────────────
  {
    slug: "what-is-stock",
    level: 1,
    emoji: "🍕",
    title: "주식이 뭐예요?",
    oneLiner: "회사를 피자처럼 잘라서 한 조각 사는 것",
    intro:
      "주식은 회사를 아주 작은 조각으로 나눈 것이에요. 큰 피자를 100조각으로 자르면, 그중 한 조각이 바로 주식 1주예요. 그 조각을 가진 사람을 '주주'라고 불러요.",
    sections: [
      {
        emoji: "🏢",
        heading: "주식회사는 어떻게 생기나요?",
        body: "친구들끼리 가게를 차리려면 돈이 많이 들어요. 한 사람이 다 내기 어려우니까, 여러 사람이 조금씩 모아 만든 게 '주식회사'예요. 돈을 낸 사람은 그만큼 회사의 주인이 되고, 그 증서가 바로 '주식'이에요.",
      },
      {
        emoji: "💰",
        heading: "주주가 되면 뭐가 좋아요?",
        body: "두 가지 좋은 점이 있어요. 첫째, 회사가 돈을 잘 벌면 그중 일부를 '배당금'으로 받아요. 둘째, 회사 가치가 올라가면 내가 가진 주식 가격도 올라가서 비싸게 팔 수 있어요.",
      },
      {
        emoji: "📉",
        heading: "그럼 위험은 없나요?",
        body: "있어요! 회사가 돈을 못 벌거나 망하면 주식 가격이 떨어져요. 그래서 한 회사에 모든 돈을 넣지 말고, 여러 회사에 조금씩 나눠 사는 게 안전해요. 이걸 '분산투자'라고 부르는데, 다른 토픽에서 자세히 배워봐요.",
      },
    ],
    example: {
      title: "FlowStock에서 직접 보기",
      body:
        "삼성전자, 카카오 같은 한국 대표 회사들의 실제 주식 가격이 우리 사이트에 다 있어요. 시장 페이지에서 시세를 확인해보세요.",
      link: { to: "/screener", label: "스크리너로 종목 보기" },
    },
    quiz: [
      {
        question: "주식 1주를 가진다는 건 무슨 뜻일까요?",
        options: [
          { text: "회사에 돈을 빌려준 거예요" },
          { text: "회사의 아주 작은 부분을 가진 거예요", correct: true },
          { text: "회사 직원이 된 거예요" },
          { text: "회사 물건을 살 수 있는 쿠폰이에요" },
        ],
        explanation:
          "주식은 회사를 잘게 나눈 조각이에요. 1주를 가지면 그만큼 회사의 작은 주인이 된 거예요.",
      },
      {
        question: "회사가 돈을 잘 벌어 주주에게 나눠주는 돈을 뭐라고 할까요?",
        options: [
          { text: "월급" },
          { text: "이자" },
          { text: "배당금", correct: true },
          { text: "선물" },
        ],
        explanation:
          "회사 이익의 일부를 주주에게 돌려주는 것을 '배당금'이라고 해요. 배당이 많은 회사를 '배당주'라고 불러요.",
      },
    ],
    status: "ready",
  },
  // ─────────────────────────────────────────────────────────
  {
    slug: "market-cap",
    level: 1,
    emoji: "🏦",
    title: "시가총액이란?",
    oneLiner: "회사 전체를 통째로 사려면 얼마가 필요한가",
    intro:
      "시가총액은 회사를 통째로 사려면 필요한 돈이에요. 계산은 간단해요: 주식 1주 가격 × 발행된 모든 주식 수. 이걸 보면 그 회사가 얼마나 큰 회사인지 한눈에 알 수 있어요.",
    sections: [
      {
        emoji: "🧮",
        heading: "계산해보기",
        body:
          "예를 들어 어떤 회사 주식 가격이 1만원이고, 발행된 주식이 1억 주라면, 시가총액은 1만원 × 1억 = 1조원이에요. 즉 그 회사를 통째로 사려면 1조원이 든다는 뜻이에요.",
      },
      {
        emoji: "🏆",
        heading: "시가총액 순위",
        body:
          "한국 1등 회사는 삼성전자예요. 시가총액 약 400조원 정도. 그 다음 SK하이닉스, LG에너지솔루션 같은 회사들이 뒤를 이어요. 시가총액이 큰 회사를 '대형주', 작은 회사를 '소형주'라고 불러요.",
      },
      {
        emoji: "⚖️",
        heading: "왜 중요해요?",
        body:
          "시가총액이 크면 보통 안정적이지만 가격이 빨리 오르긴 어려워요. 반대로 작은 회사는 변동이 커서 잘하면 많이 오르지만 떨어질 위험도 커요. 처음 배우는 사람은 큰 회사부터 보는 게 좋아요.",
      },
    ],
    example: {
      title: "삼성전자의 시가총액",
      body:
        "주식 가격이 7만원, 발행 주식이 약 60억 주라고 하면 시가총액은 약 420조원. 우리나라 1년 예산의 절반보다 큰 규모예요!",
      link: { to: "/sectors", label: "섹터별 시가총액 보기" },
    },
    quiz: [
      {
        question: "어떤 회사의 주식이 1주 5만원이고 100만 주가 발행됐다면 시가총액은?",
        options: [
          { text: "5천만원" },
          { text: "5억원" },
          { text: "500억원", correct: true },
          { text: "5조원" },
        ],
        explanation: "5만원 × 100만 = 500억원이에요. 시가총액 = 주가 × 발행 주식 수.",
      },
    ],
    status: "ready",
  },
  // ─────────────────────────────────────────────────────────
  {
    slug: "per-pbr",
    level: 2,
    emoji: "📐",
    title: "PER, PBR 이해하기",
    oneLiner: "이 회사 주식이 비싼지 싼지 비교하는 자",
    intro:
      "PER과 PBR은 주식이 비싼지 싼지 가늠하는 두 가지 자예요. 시가총액만 보면 큰 회사는 다 비싸 보이는데, 이 자를 쓰면 '실속있게 비싼 건지' 알 수 있어요.",
    sections: [
      {
        emoji: "💵",
        heading: "PER (Price Earnings Ratio) — 이익 대비 주가",
        body:
          "PER은 '주가가 1년 이익의 몇 배인가'를 나타내요. PER 10이면 회사가 10년 동안 지금처럼 돈을 벌면 투자한 돈을 다 회수한다는 뜻. 작을수록 싸 보이고, 클수록 비싸 보여요. 단, 미래 성장이 크게 기대되는 회사는 PER이 높아도 정당화될 수 있어요.",
      },
      {
        emoji: "🏠",
        heading: "PBR (Price Book Ratio) — 자산 대비 주가",
        body:
          "PBR은 '주가가 회사 순자산의 몇 배인가'예요. PBR 1이면 회사를 통째로 사도 그 안에 든 자산만큼만 받는다는 뜻. 1보다 작으면 '청산가치 이하로 거래된다'고 해서 저평가 신호로 보기도 해요. 단, 나쁜 이유로 낮은 경우(곧 망할 회사)도 있어요.",
      },
      {
        emoji: "🤔",
        heading: "주의할 점",
        body:
          "PER, PBR은 같은 업종끼리 비교해야 의미가 있어요. 은행은 보통 PER 4~7, IT는 20~50도 흔해요. 단순히 PER 작으면 좋다고 생각하면 안 돼요.",
      },
    ],
    example: {
      title: "FlowStock에서 PER 보기",
      body:
        "종목 상세 페이지(예: /stock/005930)에 들어가면 하단에 PER/PBR 추이 차트가 있어요. 시간에 따라 어떻게 변했는지 한눈에.",
      link: { to: "/stock/005930", label: "삼성전자 PER 보기" },
    },
    quiz: [
      {
        question: "PER이 작을수록 어떤 의미인가요?",
        options: [
          { text: "이익 대비 주가가 싼 편이에요", correct: true },
          { text: "회사가 곧 망해요" },
          { text: "배당금이 많아요" },
          { text: "주식 수가 적어요" },
        ],
        explanation:
          "PER이 작으면 회사가 버는 돈에 비해 주가가 낮은 거예요. 단, 업종마다 적정 PER이 달라요.",
      },
    ],
    status: "ready",
  },
  // ─────────────────────────────────────────────────────────
  {
    slug: "volume-and-price",
    level: 2,
    emoji: "🌊",
    title: "거래량과 가격",
    oneLiner: "왜 가격이 오르고 내릴까 — 수요와 공급",
    intro: "거래량은 그날 사고 판 주식 수예요. 가격이 움직이려면 거래가 있어야 하고, 거래량을 보면 사람들이 그 주식에 얼마나 관심 있는지 알 수 있어요.",
    sections: [
      {
        emoji: "🛒",
        body: "사려는 사람이 팔려는 사람보다 많으면 가격이 올라가요 (수요 > 공급). 반대로 팔려는 사람이 많으면 떨어져요. 시장에서 사과 가격이 정해지는 원리랑 똑같아요.",
      },
    ],
    status: "soon",
  },
  // ─────────────────────────────────────────────────────────
  {
    slug: "diversification",
    level: 2,
    emoji: "🥚",
    title: "분산투자",
    oneLiner: "계란을 한 바구니에 담지 마세요",
    intro: "한 회사에 모든 돈을 넣었다가 그 회사가 어려워지면 다 잃어요. 여러 회사에 나눠 사면 한 회사가 흔들려도 다른 회사가 받쳐줘요. 이게 분산투자의 핵심.",
    sections: [
      {
        emoji: "📦",
        body: "이 토픽은 곧 자세한 콘텐츠로 채워질 예정이에요.",
      },
    ],
    status: "soon",
  },
  // ─────────────────────────────────────────────────────────
  {
    slug: "risk-and-return",
    level: 3,
    emoji: "⚖️",
    title: "위험과 수익",
    oneLiner: "수익이 큰 곳엔 위험도 크다",
    intro: "투자에서 가장 중요한 원칙: 높은 수익 가능성엔 항상 큰 위험이 따라요. 안전한 예금은 이자가 적고, 변동성이 큰 주식은 수익도 손실도 커요.",
    sections: [
      {
        emoji: "📊",
        body: "이 토픽은 곧 자세한 콘텐츠로 채워질 예정이에요.",
      },
    ],
    status: "soon",
  },
];

export function getTopic(slug: string): LearnTopic | undefined {
  return LEARN_TOPICS.find((t) => t.slug === slug);
}
