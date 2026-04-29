/**
 * ============================================================
 * 거시지표 대시보드 (/macro)
 * - 한국은행 ECOS API 기반 (키 없으면 mock fallback)
 * - 기준금리 / CPI / M2 / 환율(USD-KRW) / 경기선행지수
 * ============================================================
 */

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Layout from "@/components/layout/Layout";
import { macroApi, type MacroSeries } from "@/services/api";

const COLORS: Record<string, string> = {
  base_rate: "#3B82F6",
  cpi: "#F59E0B",
  m2: "#10B981",
  usdkrw: "#A855F7",
  leading: "#EF4444",
};

export default function MacroPage() {
  const [series, setSeries] = useState<MacroSeries[]>([]);
  const [source, setSource] = useState<"ecos" | "mock" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    macroApi
      .getDashboard()
      .then((res) => {
        if (!alive) return;
        setSeries(res.data?.series ?? []);
        setSource(res.data?.source ?? null);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "로드 실패"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">거시 경제 지표</h1>
          <p className="text-sm text-muted-foreground mt-1">
            한국은행 ECOS API — 통화정책, 물가, 환율, 경기 선행성
          </p>
          {source === "mock" && (
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 rounded-lg px-3 py-2 mt-2 inline-block">
              ⚠️ ECOS API 키 미설정 — 샘플 데이터입니다.
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">로드 중…</div>
        ) : error ? (
          <div className="text-center py-20 text-negative">{error}</div>
        ) : series.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">데이터 없음</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {series.map((s) => (
              <section key={s.code} className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-semibold text-sm">{s.name}</h3>
                <p className="text-[11px] text-muted-foreground mb-3">단위: {s.unit}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={s.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" minTickGap={40} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={COLORS[s.code] ?? "#3B82F6"}
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
                {s.series.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    최근값: <span className="font-data font-bold text-foreground">
                      {s.series[s.series.length - 1].value.toLocaleString()} {s.unit}
                    </span>
                    <span className="ml-2">({s.series[s.series.length - 1].date})</span>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
