/**
 * ============================================================
 * 목업 데이터 모듈
 * - 실제 API 연동 전까지 사용할 가짜 데이터
 * - 주식 종목, 뉴스, 공시, 시장 지수 등
 * - 나중에 실제 API 연동 시 이 파일만 제거하면 됨
 * ============================================================
 */

/** 시장 지수 데이터 (코스피, 코스닥) */
export const marketIndices = [
  {
    id: "kospi",
    name: "KOSPI",
    value: 2687.45,
    change: 23.12,
    changePercent: 0.87,
    volume: "4.2억",
    high: 2695.30,
    low: 2662.18,
  },
  {
    id: "kosdaq",
    name: "KOSDAQ",
    value: 878.92,
    change: -5.67,
    changePercent: -0.64,
    volume: "8.7억",
    high: 885.10,
    low: 875.33,
  },
];

/** 종목 목록 (급등/급락 포함) */
export const stocks = [
  { id: "005930", name: "삼성전자", price: 72400, change: 1200, changePercent: 1.69, volume: "12,345,678", sector: "반도체", market: "KOSPI" },
  { id: "000660", name: "SK하이닉스", price: 178500, change: 4500, changePercent: 2.59, volume: "3,456,789", sector: "반도체", market: "KOSPI" },
  { id: "035420", name: "NAVER", price: 214000, change: -3000, changePercent: -1.38, volume: "1,234,567", sector: "IT/플랫폼", market: "KOSPI" },
  { id: "035720", name: "카카오", price: 47850, change: -950, changePercent: -1.95, volume: "5,678,901", sector: "IT/플랫폼", market: "KOSPI" },
  { id: "006400", name: "삼성SDI", price: 398000, change: 12000, changePercent: 3.11, volume: "567,890", sector: "2차전지", market: "KOSPI" },
  { id: "051910", name: "LG화학", price: 385000, change: 8500, changePercent: 2.26, volume: "234,567", sector: "2차전지", market: "KOSPI" },
  { id: "247540", name: "에코프로비엠", price: 265000, change: -7500, changePercent: -2.75, volume: "1,890,123", sector: "2차전지", market: "KOSDAQ" },
  { id: "373220", name: "LG에너지솔루션", price: 412000, change: 5000, changePercent: 1.23, volume: "345,678", sector: "2차전지", market: "KOSPI" },
  { id: "068270", name: "셀트리온", price: 178900, change: -2100, changePercent: -1.16, volume: "890,123", sector: "바이오", market: "KOSPI" },
  { id: "207940", name: "삼성바이오로직스", price: 815000, change: 15000, changePercent: 1.88, volume: "123,456", sector: "바이오", market: "KOSPI" },
  { id: "003670", name: "포스코퓨처엠", price: 298000, change: 13500, changePercent: 4.74, volume: "987,654", sector: "2차전지", market: "KOSPI" },
  { id: "352820", name: "하이브", price: 234500, change: -8900, changePercent: -3.66, volume: "2,345,678", sector: "엔터", market: "KOSPI" },
];

/** 급등 종목 (changePercent 기준 상위) */
export const topGainers = stocks
  .filter((s) => s.changePercent > 0)
  .sort((a, b) => b.changePercent - a.changePercent);

/** 급락 종목 (changePercent 기준 하위) */
export const topLosers = stocks
  .filter((s) => s.changePercent < 0)
  .sort((a, b) => a.changePercent - b.changePercent);

/** 뉴스 데이터 */
export const news = [
  {
    id: "news-1",
    title: "삼성전자, AI 반도체 HBM4 양산 계획 발표",
    summary: "삼성전자가 차세대 AI 반도체 HBM4의 양산 일정을 공식 발표했다. 내년 상반기부터 양산에 돌입하며, 주요 글로벌 AI 기업들과의 공급 계약이 진행 중이다.",
    source: "한국경제",
    date: "2026-03-31",
    category: "반도체",
    relatedStocks: ["005930", "000660"],
    impact: "positive" as const,
  },
  {
    id: "news-2",
    title: "미 연준, 기준금리 동결... 하반기 인하 가능성 시사",
    summary: "미국 연방준비제도가 기준금리를 현 수준에서 동결했다. 다만 하반기 중 경기 둔화가 확인되면 인하를 검토할 수 있다는 입장을 밝혔다.",
    source: "연합뉴스",
    date: "2026-03-31",
    category: "매크로",
    relatedStocks: [],
    impact: "neutral" as const,
  },
  {
    id: "news-3",
    title: "카카오, 개인정보 유출 과징금 150억원 확정",
    summary: "개인정보보호위원회가 카카오에 대해 개인정보 유출 관련 과징금 150억원을 확정 부과했다. 카카오 측은 행정소송을 검토 중이다.",
    source: "매일경제",
    date: "2026-03-30",
    category: "IT/플랫폼",
    relatedStocks: ["035720", "035420"],
    impact: "negative" as const,
  },
  {
    id: "news-4",
    title: "2차전지 소재주 일제히 강세... EU 배터리 규제 완화 기대",
    summary: "EU가 배터리 규제 일부를 완화할 것이라는 보도가 나오면서 국내 2차전지 소재 관련주가 일제히 강세를 보이고 있다.",
    source: "조선비즈",
    date: "2026-03-30",
    category: "2차전지",
    relatedStocks: ["006400", "051910", "247540", "003670"],
    impact: "positive" as const,
  },
  {
    id: "news-5",
    title: "하이브, 걸그룹 신인 데뷔 앨범 100만장 돌파",
    summary: "하이브 산하 신인 걸그룹의 데뷔 앨범이 출시 일주일 만에 100만장을 돌파했으나, 엔터 업종 전반적인 실적 우려로 주가는 약세.",
    source: "스포츠서울",
    date: "2026-03-29",
    category: "엔터",
    relatedStocks: ["352820"],
    impact: "negative" as const,
  },
  {
    id: "news-6",
    title: "셀트리온, 미국 FDA 신약 승인 획득",
    summary: "셀트리온이 자체 개발한 자가면역질환 치료제가 미국 FDA 승인을 획득했다. 연간 매출 1조원 이상이 기대된다.",
    source: "바이오스펙테이터",
    date: "2026-03-29",
    category: "바이오",
    relatedStocks: ["068270", "207940"],
    impact: "positive" as const,
  },
];

/** 공시 데이터 */
export const disclosures = [
  { id: "disc-1", stockId: "005930", stockName: "삼성전자", title: "주요사항보고서(자기주식취득결정)", date: "2026-03-31", type: "주요" },
  { id: "disc-2", stockId: "000660", stockName: "SK하이닉스", title: "분기보고서 (2026.03)", date: "2026-03-31", type: "정기" },
  { id: "disc-3", stockId: "035720", stockName: "카카오", title: "기타 경영사항(과징금 부과)", date: "2026-03-30", type: "주요" },
  { id: "disc-4", stockId: "006400", stockName: "삼성SDI", title: "투자판단 관련 주요경영사항", date: "2026-03-30", type: "주요" },
  { id: "disc-5", stockId: "068270", stockName: "셀트리온", title: "주요사항보고서(신약허가)", date: "2026-03-29", type: "주요" },
];

/** 차트용 OHLC 데이터 생성 헬퍼 */
export function generateOHLCData(days = 90) {
  const data = [];
  let basePrice = 70000;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // 주말 제외
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const open = basePrice + (Math.random() - 0.48) * 1500;
    const close = open + (Math.random() - 0.48) * 2000;
    const high = Math.max(open, close) + Math.random() * 800;
    const low = Math.min(open, close) - Math.random() * 800;

    data.push({
      time: date.toISOString().split("T")[0],
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
    });

    basePrice = close;
  }

  return data;
}

/** 포트폴리오 섹터 비중 데이터 (파이차트용) */
export const sectorWeights = [
  { name: "반도체", value: 35, color: "hsl(210, 80%, 55%)" },
  { name: "2차전지", value: 25, color: "hsl(142, 70%, 45%)" },
  { name: "IT/플랫폼", value: 15, color: "hsl(280, 60%, 55%)" },
  { name: "바이오", value: 15, color: "hsl(38, 92%, 50%)" },
  { name: "엔터", value: 10, color: "hsl(0, 72%, 51%)" },
];
