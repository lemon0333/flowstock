/**
 * ============================================================
 * 종목 비교 (/compare)
 * - 2~4 종목 선택 → 시작점 100 정규화하여 한 차트
 * - 수익률·변동성·Sharpe 표
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { stockApi } from "@/services/api";
import { type OHLCV, normalize, returnStats } from "@/lib/indicators";

interface Stock {
  id: string;
  ticker: string;
  name: string;
}

interface Loaded {
  ticker: string;
  name: string;
  ohlcv: OHLCV[];
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#A855F7"];
const MAX = 4;

export default function ComparePage() {
  const [universe, setUniverse] = useState<Stock[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<Loaded[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    stockApi
      .getAll()
      .then((res) => {
        if (!alive) return;
        const arr = (res.data ?? []) as Array<Record<string, unknown>>;
        setUniverse(
          arr.map((s) => ({
            id: String(s.id ?? s.ticker),
            ticker: String(s.ticker ?? s.id),
            name: String(s.name ?? ""),
          })),
        );
      })
      .catch(() => setUniverse([]));
    return () => {
      alive = false;
    };
  }, []);

  // 선택된 ticker들의 ohlcv 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      const results: Loaded[] = [];
      for (const id of selected) {
        const meta = universe.find((s) => s.id === id);
        const res = await stockApi
          .getOhlcv(id, 365)
          .catch(() => ({ data: [] as unknown[] }));
        const arr = (res.data ?? []) as Array<Record<string, unknown>>;
        results.push({
          ticker: id,
          name: meta?.name ?? id,
          ohlcv: arr.map((d) => ({
            date: String(d.date ?? ""),
            open: Number(d.open),
            high: Number(d.high),
            low: Number(d.low),
            close: Number(d.close),
            volume: Number(d.volume),
          })),
        });
      }
      if (alive) setLoaded(results);
    })();
    return () => {
      alive = false;
    };
  }, [selected, universe]);

  // 정규화된 통합 데이터
  const merged = useMemo(() => {
    if (loaded.length === 0) return [];
    // 가장 짧은 시계열 길이로 잘라서 시작점 align
    const minLen = Math.min(...loaded.map((l) => l.ohlcv.length));
    if (minLen === 0) return [];
    const seriesMap: Record<string, number[]> = {};
    loaded.forEach((l) => {
      const closes = l.ohlcv.slice(-minLen).map((d) => d.close);
      seriesMap[l.ticker] = normalize(closes);
    });
    const dates = loaded[0].ohlcv.slice(-minLen).map((d) => d.date);
    return dates.map((date, i) => {
      const point: Record<string, number | string> = { date };
      loaded.forEach((l) => {
        point[l.ticker] = seriesMap[l.ticker][i];
      });
      return point;
    });
  }, [loaded]);

  const stats = useMemo(() => {
    return loaded.map((l) => {
      const closes = l.ohlcv.map((d) => d.close);
      return { ...l, ...returnStats(closes) };
    });
  }, [loaded]);

  // 검색 결과
  const searchResults = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return [];
    return universe
      .filter((s) => !selected.includes(s.id))
      .filter((s) => s.name.toLowerCase().includes(kw) || s.ticker.includes(kw))
      .slice(0, 8);
  }, [universe, selected, search]);

  const addStock = (id: string) => {
    if (selected.length >= MAX) return;
    setSelected([...selected, id]);
    setSearch("");
  };
  const removeStock = (id: string) => {
    setSelected(selected.filter((s) => s !== id));
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">종목 비교</h1>
          <p className="text-sm text-muted-foreground mt-1">
            최대 {MAX}개 종목을 선택하여 1년 수익률을 시작점 100 기준으로 비교
          </p>
        </div>

        {/* 종목 추가 */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {selected.map((id, i) => {
              const meta = loaded.find((l) => l.ticker === id) ?? universe.find((s) => s.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-2 rounded-full pl-3 pr-2 py-1 text-sm font-medium border border-border"
                  style={{ borderColor: COLORS[i] + "55", background: COLORS[i] + "11" }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                  {meta?.name ?? id}
                  <button
                    onClick={() => removeStock(id)}
                    className="p-0.5 rounded-full hover:bg-accent"
                    aria-label="제거"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            {selected.length < MAX && (
              <div className="relative flex-1 min-w-[200px]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="종목명/코드로 추가"
                  className="w-full px-3 py-1.5 text-sm rounded-full border border-border bg-background"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                    {searchResults.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addStock(s.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                      >
                        <Plus className="h-3 w-3 text-muted-foreground" />
                        <span>{s.name}</span>
                        <span className="text-xs text-muted-foreground">{s.ticker}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 차트 */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-sm mb-3">정규화 비교 (시작점 = 100)</h2>
          {merged.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              종목을 추가하세요
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={merged}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" minTickGap={50} tick={{ fontSize: 11 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => v?.toFixed(2)}
                  labelFormatter={(d) => `날짜: ${d}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {loaded.map((l, i) => (
                  <Line
                    key={l.ticker}
                    type="monotone"
                    dataKey={l.ticker}
                    name={l.name}
                    stroke={COLORS[i]}
                    dot={false}
                    strokeWidth={1.8}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* 통계 표 */}
        {stats.length > 0 && (
          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-4">종목</th>
                  <th className="text-right py-2 px-4">총 수익률</th>
                  <th className="text-right py-2 px-4">연환산 변동성</th>
                  <th className="text-right py-2 px-4">Sharpe (rf=0)</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.ticker} className="border-t border-border">
                    <td className="py-2 px-4">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                        {s.name}
                      </span>
                    </td>
                    <td
                      className={`py-2 px-4 text-right font-data ${
                        s.totalReturn >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {(s.totalReturn * 100).toFixed(2)}%
                    </td>
                    <td className="py-2 px-4 text-right font-data text-muted-foreground">
                      {(s.annualizedVolatility * 100).toFixed(2)}%
                    </td>
                    <td
                      className={`py-2 px-4 text-right font-data ${
                        s.sharpe >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {s.sharpe.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </Layout>
  );
}
