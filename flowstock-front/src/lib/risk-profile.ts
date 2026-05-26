/**
 * 투자성향 분석 — MVP frontend-only.
 * - 7문항 × 1~3점 → 합산 7~21점 → 3등급(안정/중립/공격)
 * - 결과는 useStore에 persist (localStorage). backend에는 아직 안 박음.
 * - 추후 backend 동기화 시 동일 점수/라벨 체계 유지 가능하도록 RAW_SCORE도 함께 저장.
 */

export type RiskLevel = "conservative" | "moderate" | "aggressive";

export interface RiskOption {
  label: string;
  score: 1 | 2 | 3;
}

export interface RiskQuestion {
  id: string;
  question: string;
  options: RiskOption[];
}

export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: "horizon",
    question: "투자 기간은 어느 정도로 생각하고 있어요?",
    options: [
      { label: "1년 안에 다시 쓸 돈", score: 1 },
      { label: "1~5년 정도 묻어둘 수 있어요", score: 2 },
      { label: "5년 이상 장기 투자", score: 3 },
    ],
  },
  {
    id: "loss_tolerance",
    question: "보유 종목이 단기에 -20% 빠지면 어떻게 할 것 같아요?",
    options: [
      { label: "바로 손절. 더 빠지기 전에 정리", score: 1 },
      { label: "원래 시나리오 보고 일단 버틴다", score: 2 },
      { label: "오히려 기회로 보고 추가 매수", score: 3 },
    ],
  },
  {
    id: "experience",
    question: "주식·금융 상품 투자 경험은요?",
    options: [
      { label: "처음이거나 거의 없어요", score: 1 },
      { label: "예금/적금·ETF 정도 해봤어요", score: 2 },
      { label: "개별 종목 직접 매매 경험 多", score: 3 },
    ],
  },
  {
    id: "income",
    question: "월 수입의 안정성은요?",
    options: [
      { label: "불규칙하거나 줄어들 수 있어요", score: 1 },
      { label: "꾸준한 편이에요", score: 2 },
      { label: "매우 안정적이고 여유 있어요", score: 3 },
    ],
  },
  {
    id: "target_return",
    question: "1년 동안 기대하는 수익률은요?",
    options: [
      { label: "은행 예금보다 조금 더 (3~5%)", score: 1 },
      { label: "물가 상승률 + α (5~12%)", score: 2 },
      { label: "20% 이상도 노려보고 싶어요", score: 3 },
    ],
  },
  {
    id: "reaction",
    question: "보유 종목이 크게 떨어진 날, 가장 가까운 모습은?",
    options: [
      { label: "잠이 안 와요. 빨리 처분하고 싶어요", score: 1 },
      { label: "뉴스 찾아보고 이유를 파악해요", score: 2 },
      { label: "한 발 떨어져서 차트만 봐요", score: 3 },
    ],
  },
  {
    id: "allocation",
    question: "투자에 쓰는 돈은 전체 자산 중 어느 정도예요?",
    options: [
      { label: "생활비·비상금이 섞여 있어요", score: 1 },
      { label: "여유 자금 일부만 (30% 이하)", score: 2 },
      { label: "투자 가능 자금의 대부분 (70%+)", score: 3 },
    ],
  },
];

export const TOTAL_QUESTIONS = RISK_QUESTIONS.length;
export const MAX_SCORE = TOTAL_QUESTIONS * 3;
export const MIN_SCORE = TOTAL_QUESTIONS * 1;

export function scoreToLevel(score: number): RiskLevel {
  if (score <= 11) return "conservative";
  if (score <= 16) return "moderate";
  return "aggressive";
}

export interface RiskLevelMeta {
  label: string;
  short: string;
  tagline: string;
  description: string;
  color: string; // tailwind color name 또는 hex
  badgeClass: string; // tailwind 클래스
}

export const RISK_LEVEL_META: Record<RiskLevel, RiskLevelMeta> = {
  conservative: {
    label: "안정형",
    short: "안정",
    tagline: "원금 보호 우선 — 잃지 않는 게 최고",
    description:
      "단기 변동에 민감하고, 손실을 크게 부담스러워하는 성향이에요. 우량주 + 채권/예금 비중을 크게 가져가는 게 잘 맞아요. 모의투자에선 대형주 위주로 천천히 학습해 보세요.",
    color: "#2563eb",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  moderate: {
    label: "중립형",
    short: "중립",
    tagline: "안정과 수익 사이 균형 — 분산이 핵심",
    description:
      "위험을 어느 정도 감수하지만 무리는 안 하는 성향이에요. 우량주 + 성장주를 6:4 정도로 섞어 분산하는 게 적합합니다. 모의투자로 섹터별 차이를 체감해 보세요.",
    color: "#16a34a",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  aggressive: {
    label: "공격형",
    short: "공격",
    tagline: "큰 수익 추구 — 변동성 감수",
    description:
      "단기 변동을 기회로 보고 적극적으로 움직이는 성향이에요. 성장주·테마주 비중이 높을 수 있지만 손절선과 분산 원칙을 꼭 챙기세요. 모의투자에서 매수/매도 타이밍을 검증해 보면 좋습니다.",
    color: "#dc2626",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  },
};

export interface RiskProfileResult {
  level: RiskLevel;
  score: number;
  completedAt: string; // ISO timestamp
  answers: Record<string, number>; // questionId → 선택한 score
}

export function calculateProfile(answers: Record<string, number>): RiskProfileResult {
  const score = Object.values(answers).reduce((a, b) => a + b, 0);
  return {
    level: scoreToLevel(score),
    score,
    completedAt: new Date().toISOString(),
    answers,
  };
}
