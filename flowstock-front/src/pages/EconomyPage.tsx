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

interface DashboardData {
  indices?: Array<{ code: string; name: string; close: number }>;
  deal_trend?: Record<string, DealTrendItem>;
  up_down?: Record<string, UpDownItem>;
  fifty_two_week?: Record<string, FiftyTwoWeekItem>;
  series?: Record<string, SeriesPoint[]>;
}

const COLORS_DEAL = ["#3B82F6", "#10B981", "#F59E0B"];
const COLORS_UPDOWN = ["#DC2626", "#EF4444", "#9CA3AF", "#10B981", "#059669"];

export default function EconomyPage() {
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await economyApi.getDashboard();
        setData(res.data ?? {});
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">로딩 중...</div>
      </Layout>
    );
  }
  if (error) {
    return (
      <Layout>
        <div className="text-center py-20 text-red-500">{error}</div>
      </Layout>
    );
  }

  // ── 매매주체 동향 (개인/외국인/기관) ──
  const dealTrendBars = Object.values(data.deal_trend ?? {}).flatMap((d) => [
    { market: d.name, 주체: "개인", value: d.personal },
    { market: d.name, 주체: "외국인", value: d.foreign },
    { market: d.name, 주체: "기관", value: d.institutional },
  ]);

  // ── 상승/하락 종목 비율 (도넛, KOSPI 우선) ──
  const ud = data.up_down?.KOSPI;
  const upDownPie = ud
    ? [
        { name: "상한가", value: ud.upper, color: "#DC2626" },
        { name: "상승", value: ud.rise, color: "#10B981" },
        { name: "보합", value: ud.steady, color: "#9CA3AF" },
        { name: "하락", value: ud.fall, color: "#3B82F6" },
        { name: "하한가", value: ud.lower, color: "#1E40AF" },
      ]
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
                    fill={d.value >= 0 ? COLORS_DEAL[i % 3] : "#EF4444"}
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
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={upDownPie}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label={(e) => `${e.name} ${e.value}`}
              >
                {upDownPie.map((d, i) => (
                  <Cell key={i} fill={COLORS_UPDOWN[i]} />
                ))}
              </Pie>
              <Tooltip />
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
              <Bar dataKey="저점대비" stackId="a" fill="#10B981" />
              <Bar dataKey="고점까지 여유" stackId="a" fill="#E5E7EB" />
            </BarChart>
          </ResponsiveContainer>
        </section>

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
