/**
 * ============================================================
 * 경제 지표 대시보드 (/economy)
 * - 매매주체별 동향 (개인/외국인/기관) — 자본 흐름
 * - 상승/하락 종목 비율 — 시장 폭(market breadth)
 * - 52주 고저 대비 현재가 — 가격 모멘텀
 * - KOSPI/KOSDAQ 1년 시계열 — 추세
 * 맨큐 거시/미시 관점
 * ============================================================
 */

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as ReLineChart,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Layout from "@/components/layout/Layout";
import InfoTooltip from "@/components/ui/info-tooltip";
import { economyApi } from "@/services/api";

interface DealTrendItem {
  name: string;
  personal: number;
  foreign: number;
  institutional: number;
  bizdate?: string;
}
interface UpDownItem {
  name: string;
  upper: number;
  rise: number;
  steady: number;
  fall: number;
  lower: number;
}
interface FiftyTwoWeekItem {
  name: string;
  high_52w: number;
  low_52w: number;
  close: number;
  ratio: number | null;
}
interface SeriesPoint {
  date: string;
  close: number;
  volume: number;
}

interface FearGreed {
  score: number;
  label: string;
  mood: "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";
  components: {
    momentum_52w: number;
    market_breadth: number;
    smart_money: number;
  };
}

interface DashboardData {
  indices?: Array<{ code: string; name: string; close: number }>;
  deal_trend?: Record<string, DealTrendItem>;
  up_down?: Record<string, UpDownItem>;
  fifty_two_week?: Record<string, FiftyTwoWeekItem>;
  series?: Record<string, SeriesPoint[]>;
  fear_greed?: FearGreed;
}

interface CorrelationData {
  tickers: string[];
  names: string[];
  matrix: number[][];
}

function corrColor(v: number): string {
  // -1(파란) ~ 0(중립) ~ +1(빨간) 그라데이션
  if (Number.isNaN(v)) return "#e5e7eb";
  if (v >= 0) {
    const a = Math.min(1, v);
    return `rgba(220, 38, 38, ${0.15 + a * 0.7})`;
  }
  const a = Math.min(1, Math.abs(v));
  return `rgba(59, 130, 246, ${0.15 + a * 0.7})`;
}

const MOOD_COLOR: Record<FearGreed["mood"], string> = {
  extreme_fear: "#1E40AF",
  fear: "#3B82F6",
  neutral: "#9CA3AF",
  greed: "#F59E0B",
  extreme_greed: "#DC2626",
};

// mood별 주린이 톤 한 줄 해석 — 숫자만 보여주지 말고 "그래서 어쩌라고"까지 친절히
const MOOD_HINT: Record<FearGreed["mood"], string> = {
  extreme_fear: "모두가 무서워서 던질 때 — 역사적으론 오히려 매수 기회로 본 케이스가 많아요",
  fear: "조심 분위기. 뉴스만 쫓아가지 말고 본인 시나리오로 판단할 때",
  neutral: "딱히 한쪽으로 쏠리지 않은 보합. 가장 평범한 상태예요",
  greed: "낙관 분위기. 분할 매수·익절 라인 미리 정해두는 게 좋아요",
  extreme_greed: "과열 신호. 신규 매수보단 수익 챙기는 걸 고민해볼 시점",
};

// 매매주체 (개인/외국인/기관) — 의미적 mapping 자유, 토스 톤으로 정렬
const COLORS_DEAL = ["#3B82F6", "#10B981", "#F59E0B"];
// 한국 컨벤션: 상한가/상승 = 빨강 계열, 하락/하한가 = 파랑 계열, 보합 = 회색
const COLORS_UPDOWN = ["#DC2626", "#EF4444", "#9CA3AF", "#2563EB", "#1E40AF"];

// 한 호출이 hang해도 N초 후 fallback으로 resolve — networkidle/loading 무한 대기 방지.
// (전역 ApiClient에 AbortController 박는 게 더 정통. 이건 EconomyPage 한정 patch.)
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const API_TIMEOUT_MS = 8000;

export default function EconomyPage() {
  const [data, setData] = useState<DashboardData>({});
  const [corr, setCorr] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      // Promise.allSettled — 한 endpoint 실패/timeout 해도 다른 데이터는 렌더
      const [dashRes, corrRes] = await Promise.allSettled([
        withTimeout(
          economyApi.getDashboard(),
          API_TIMEOUT_MS,
          { success: false, data: {} as DashboardData },
        ),
        withTimeout(
          economyApi.getCorrelation("KOSPI", 10, 60),
          API_TIMEOUT_MS,
          { success: false, data: null as CorrelationData | null },
        ),
      ]);

      if (!alive) return;

      if (dashRes.status === "fulfilled" && dashRes.value?.data) {
        setData(dashRes.value.data);
      }
      if (corrRes.status === "fulfilled") {
        setCorr(corrRes.value?.data ?? null);
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-4 py-6 max-w-3xl mx-auto" aria-label="경제 지표 로딩 중">
          <div className="h-7 w-48 bg-muted/60 rounded animate-pulse" />
          <div className="h-32 bg-muted/40 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-muted/40 rounded-2xl animate-pulse" />
            <div className="h-48 bg-muted/40 rounded-2xl animate-pulse" />
          </div>
          <div className="h-48 bg-muted/40 rounded-2xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  const hasNoData =
    !data.fear_greed &&
    !(data.indices && data.indices.length) &&
    !(data.deal_trend && Object.keys(data.deal_trend).length);
  if (hasNoData) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">
          아직 시장 데이터를 받지 못했어요.
          <div className="text-xs mt-2">잠시 후 새로고침하면 보통 풀려요.</div>
        </div>
      </Layout>
    );
  }
  const fg = data.fear_greed;

  // ── 매매주체 동향 (개인/외국인/기관) ──
  const dealTrendBars = Object.values(data.deal_trend ?? {}).flatMap((d) => [
    { market: d.name, 주체: "개인", value: d.personal },
    { market: d.name, 주체: "외국인", value: d.foreign },
    { market: d.name, 주체: "기관", value: d.institutional },
  ]);

  // ── 상승/하락 종목 비율 (도넛, KOSPI 우선) ──
  const ud = data.up_down?.KOSPI;
  // 한국 컨벤션: 상한가/상승 = 빨강, 보합 = 회색, 하락/하한가 = 파랑
  // 0 종목인 카테고리는 슬라이스 자체를 제외 — 라벨 중첩(상한가/하한가가 0에 가까울 때) 방지.
  const upDownPie = ud
    ? [
        { name: "상한가", value: ud.upper, color: "#DC2626" },
        { name: "상승", value: ud.rise, color: "#EF4444" },
        { name: "보합", value: ud.steady, color: "#9CA3AF" },
        { name: "하락", value: ud.fall, color: "#2563EB" },
        { name: "하한가", value: ud.lower, color: "#1E40AF" },
      ].filter((d) => d.value > 0)
    : [];

  // ── 52주 고저 대비 현재 위치 ──
  const fiftyTwoBars = Object.values(data.fifty_two_week ?? {}).map((f) => ({
    name: f.name,
    저점대비: f.ratio ?? 0,
    "고점까지 여유": Math.max(0, 100 - (f.ratio ?? 0)),
  }));

  // ── KOSPI/KOSDAQ 시계열 (정규화: 시작점 100 기준) ──
  const series = data.series ?? {};
  const merged: Array<Record<string, number | string>> = [];
  const codes = Object.keys(series);
  if (codes.length) {
    const baseLine: Record<string, number> = {};
    codes.forEach((code) => {
      const arr = series[code];
      if (arr && arr.length) baseLine[code] = arr[0].close;
    });
    const len = Math.max(...codes.map((c) => series[c]?.length ?? 0));
    for (let i = 0; i < len; i++) {
      const point: Record<string, number | string> = {};
      let date = "";
      codes.forEach((code) => {
        const p = series[code]?.[i];
        if (p) {
          date = p.date;
          const base = baseLine[code] || 1;
          point[code] = Math.round((p.close / base) * 100 * 100) / 100;
        }
      });
      if (date) point.date = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
      merged.push(point);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">경제 지표 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-1">
            매매주체별 동향, 시장 폭(market breadth), 52주 모멘텀, 지수 추세 — 거시/미시 관점에서의 시장 상태
          </p>
        </div>

        {/* 0. Fear & Greed Index — 3단 노출: 큰 숫자 → 인라인 해석 한 줄 → "?" 클릭 시 풀이.
            토스 스타일 학습 곡선: 보자마자 OK → 더 알고 싶으면 클릭 */}
        {fg && (
          <section
            className="rounded-2xl p-6 text-white"
            style={{ background: `linear-gradient(135deg, ${MOOD_COLOR[fg.mood]} 0%, ${MOOD_COLOR[fg.mood]}cc 100%)` }}
          >
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="text-xs opacity-80 uppercase tracking-wide">
                    공포·탐욕 지수 (Fear &amp; Greed)
                  </div>
                  <InfoTooltip
                    title="공포·탐욕 지수가 뭐예요?"
                    className="text-white/80 hover:text-white"
                    iconClassName="h-3.5 w-3.5"
                  >
                    오늘 KOSPI 투자자들이 얼마나 무서워하는지(공포) / 들떠있는지(탐욕)를
                    0~100 한 숫자로 압축한 거예요.
                    <br /><br />
                    <strong className="text-foreground">계산 방식</strong>: 52주 가격 위치,
                    오른 종목 비율(시장 폭), 외국인·기관 매매 흐름을 가중평균.
                    <br /><br />
                    <strong className="text-foreground">읽는 법</strong>: 25 아래는 극공포,
                    25~45 공포, 45~55 중립, 55~75 탐욕, 75 위는 극탐욕. 0/100 가까울수록
                    추세 반전 가능성 ↑.
                  </InfoTooltip>
                </div>
                <div className="text-3xl font-extrabold mt-1">{fg.score} — {fg.label}</div>
                <p className="text-sm opacity-95 mt-1.5 leading-snug">
                  {MOOD_HINT[fg.mood]}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-white/15 rounded-xl px-3 py-2 text-center min-w-[90px]">
                  <div className="opacity-80 flex items-center justify-center gap-1">
                    52주 위치
                    <InfoTooltip
                      title="52주 위치가 뭐예요?"
                      className="text-white/70 hover:text-white"
                      iconClassName="h-3 w-3"
                    >
                      지금 KOSPI 지수가 최근 1년 변동폭에서 어느 쯤 와있는지.
                      0%면 1년 저점, 100%면 1년 고점.
                    </InfoTooltip>
                  </div>
                  <div className="text-lg font-bold mt-0.5">{fg.components.momentum_52w}%</div>
                </div>
                <div className="bg-white/15 rounded-xl px-3 py-2 text-center min-w-[90px]">
                  <div className="opacity-80 flex items-center justify-center gap-1">
                    시장 폭
                    <InfoTooltip
                      title="시장 폭이 뭐예요?"
                      className="text-white/70 hover:text-white"
                      iconClassName="h-3 w-3"
                    >
                      KOSPI 종목 중에 오늘 오른 게 몇 %인지. 지수가 올라도 시장 폭이 좁으면(예: 30%) 소수 대형주만 끌고가는 거라 진짜 강세장은 아니에요.
                    </InfoTooltip>
                  </div>
                  <div className="text-lg font-bold mt-0.5">{fg.components.market_breadth}%</div>
                </div>
                <div className="bg-white/15 rounded-xl px-3 py-2 text-center min-w-[90px]">
                  <div className="opacity-80 flex items-center justify-center gap-1">
                    스마트머니
                    <InfoTooltip
                      title="스마트머니가 뭐예요?"
                      className="text-white/70 hover:text-white"
                      iconClassName="h-3 w-3"
                    >
                      외국인·기관(=정보 빠른 큰손)의 매수 흐름. 양수면 큰손이 사고 있는 중, 음수면 팔고 나가는 중. 큰손 따라가는 게 능사는 아니지만 흐름 참고용으로 봐요.
                    </InfoTooltip>
                  </div>
                  <div className="text-lg font-bold mt-0.5">{fg.components.smart_money}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 1. 매매주체별 동향 */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-2">매매주체별 순매수 (억원)</h2>
          <p className="text-xs text-muted-foreground mb-4">
            누가 시장에 자금을 넣고/뺐는지 — 자본 흐름과 정보 비대칭의 지표
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dealTrendBars}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="주체" />
              <YAxis />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend />
              <Bar dataKey="value" name="순매수" fill="#3B82F6">
                {dealTrendBars.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.value >= 0 ? COLORS_DEAL[i % 3] : "#2563EB"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* 2. 상승/하락 종목 분포 */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-2">상승/하락 종목 비율 (KOSPI)</h2>
          <p className="text-xs text-muted-foreground mb-4">
            시장 폭(market breadth) — 지수만큼이나 중요한 시장 강도 지표
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={upDownPie}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                // 5% 미만 슬라이스는 라벨을 숨김(인접 라벨 중첩 방지). Legend로 식별 가능.
                label={(e: { name?: string; value?: number; percent?: number }) =>
                  e.percent && e.percent >= 0.05 ? `${e.name} ${e.value}` : ""
                }
                labelLine={false}
              >
                {upDownPie.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, n: string) => [`${v}종목`, n]} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </section>

        {/* 3. 52주 고저 대비 현재 위치 */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-2">52주 모멘텀 (저점→고점 위치, %)</h2>
          <p className="text-xs text-muted-foreground mb-4">
            현재가가 1년 변동폭 어디 — 0%면 1년 저점, 100%면 1년 고점
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fiftyTwoBars} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="name" />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="저점대비" stackId="a" fill="#EF4444" />
              <Bar dataKey="고점까지 여유" stackId="a" fill="#E5E7EB" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* 5. 종목 상관관계 히트맵
            열 헤더는 ticker 6자리(짧고 회전 불필요), 행 헤더는 회사명(가독성 우선).
            hover 시 tooltip에 회사명 풀로 노출. 이전엔 회사명이 vertical-rl로 회전돼 읽기 힘들었음. */}
        {corr && corr.tickers.length > 0 && (
          <section className="bg-card border border-border rounded-2xl p-5 overflow-x-auto">
            <h2 className="font-semibold mb-2">시가총액 Top 10 상관관계 (60일 일별 수익률)</h2>
            <p className="text-xs text-muted-foreground mb-4">
              빨강일수록 함께 움직임(높은 상관), 파랑일수록 반대로 움직임 — 분산투자 효과 가늠.
              열 헤더는 종목 코드, 행 헤더는 종목명.
            </p>
            <table className="text-xs font-data border-collapse">
              <thead>
                <tr>
                  <th className="p-1"></th>
                  {corr.tickers.map((t, i) => (
                    <th
                      key={i}
                      className="px-2 py-1 text-center whitespace-nowrap font-mono text-[11px] text-muted-foreground"
                      title={corr.names[i]}
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corr.matrix.map((row, r) => (
                  <tr key={r}>
                    <td
                      className="px-2 py-1 whitespace-nowrap font-medium text-right"
                      title={corr.tickers[r]}
                    >
                      {corr.names[r]}
                    </td>
                    {row.map((v, c) => (
                      <td
                        key={c}
                        className="p-1 text-center"
                        style={{
                          backgroundColor: corrColor(v),
                          minWidth: 44,
                          color: Math.abs(v) > 0.7 ? "white" : "inherit",
                        }}
                        title={`${corr.names[r]} ↔ ${corr.names[c]}: ${v.toFixed(2)}`}
                      >
                        {v.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 4. KOSPI/KOSDAQ 시계열 (정규화) */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-2">KOSPI / KOSDAQ 1년 추세 (시작점 = 100)</h2>
          <p className="text-xs text-muted-foreground mb-4">
            정규화하여 두 지수의 상대 성과를 비교 — 효율시장 가설 관점에서의 정보 반영 추세
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ReLineChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" minTickGap={50} />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip />
              <Legend />
              {codes.map((c, i) => (
                <Line
                  key={c}
                  type="monotone"
                  dataKey={c}
                  stroke={i === 0 ? "#3B82F6" : "#F59E0B"}
                  dot={false}
                />
              ))}
            </ReLineChart>
          </ResponsiveContainer>
        </section>
      </div>
    </Layout>
  );
}
