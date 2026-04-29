/**
 * ============================================================
 * 종목 스크리너 (/screener)
 * - 거래량/등락률/가격대 필터로 KOSPI 종목 발굴
 * - 정렬: 거래량 / 등락률 / 가격
 * - 행 클릭 → 종목 상세
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { stockApi } from "@/services/api";

interface StockRow {
  id: string;
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  high?: number;
  low?: number;
}

type SortKey = "volume" | "changePercent" | "price";

export default function ScreenerPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1_000_000);
  const [minChange, setMinChange] = useState(-30);
  const [maxChange, setMaxChange] = useState(30);
  const [minVolume, setMinVolume] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    let alive = true;
    stockApi
      .getAll()
      .then((res) => {
        if (!alive) return;
        const arr = (res.data ?? []) as Array<Record<string, unknown>>;
        const norm: StockRow[] = arr.map((s) => ({
          id: String(s.id ?? s.ticker),
          ticker: String(s.ticker ?? s.id),
          name: String(s.name ?? ""),
          price: Number(s.price ?? s.close ?? 0),
          changePercent: Number(s.changePercent ?? 0),
          volume: Number(s.volume ?? 0),
          high: s.high !== undefined ? Number(s.high) : undefined,
          low: s.low !== undefined ? Number(s.low) : undefined,
        }));
        setRows(norm);
      })
      .catch(() => setRows([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.price >= minPrice &&
        r.price <= maxPrice &&
        r.changePercent >= minChange &&
        r.changePercent <= maxChange &&
        r.volume >= minVolume &&
        (kw ? r.name.toLowerCase().includes(kw) || r.ticker.includes(kw) : true),
    );
  }, [rows, minPrice, maxPrice, minChange, maxChange, minVolume, keyword]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return sortDesc ? bv - av : av - bv;
    });
    return arr;
  }, [filtered, sortKey, sortDesc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDesc(!sortDesc);
    else {
      setSortKey(k);
      setSortDesc(true);
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            종목 스크리너
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            거래량 상위 KOSPI {rows.length}종목에서 조건 필터로 후보 발굴
          </p>
        </div>

        {/* 필터 패널 */}
        <section className="bg-card border border-border rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <FilterField label="키워드 (종목명/코드)">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="삼성, 005930"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
            />
          </FilterField>
          <FilterField label={`가격: ${minPrice.toLocaleString()} ~ ${maxPrice.toLocaleString()}원`}>
            <div className="flex gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              />
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              />
            </div>
          </FilterField>
          <FilterField label={`등락률: ${minChange}% ~ ${maxChange}%`}>
            <div className="flex gap-2">
              <input
                type="number"
                value={minChange}
                onChange={(e) => setMinChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              />
              <input
                type="number"
                value={maxChange}
                onChange={(e) => setMaxChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              />
            </div>
          </FilterField>
          <FilterField label={`최소 거래량: ${minVolume.toLocaleString()}`}>
            <input
              type="range"
              min={0}
              max={10_000_000}
              step={100_000}
              value={minVolume}
              onChange={(e) => setMinVolume(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </FilterField>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setMinPrice(0);
                setMaxPrice(1_000_000);
                setMinChange(-30);
                setMaxChange(30);
                setMinVolume(0);
                setKeyword("");
              }}
              className="px-4 py-2 rounded-full text-xs font-medium border border-border hover:bg-accent"
            >
              초기화
            </button>
            <div className="text-xs text-muted-foreground">{sorted.length}종목 결과</div>
          </div>
        </section>

        {/* 결과 테이블 */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">불러오는 중…</div>
          ) : sorted.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">조건에 맞는 종목이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left py-2 px-4">종목</th>
                    <th className="text-right py-2 px-4 cursor-pointer" onClick={() => toggleSort("price")}>
                      현재가 {sortKey === "price" && (sortDesc ? "↓" : "↑")}
                    </th>
                    <th
                      className="text-right py-2 px-4 cursor-pointer"
                      onClick={() => toggleSort("changePercent")}
                    >
                      등락률 {sortKey === "changePercent" && (sortDesc ? "↓" : "↑")}
                    </th>
                    <th className="text-right py-2 px-4 cursor-pointer" onClick={() => toggleSort("volume")}>
                      거래량 {sortKey === "volume" && (sortDesc ? "↓" : "↑")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, 200).map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-accent/40">
                      <td className="py-2 px-4">
                        <Link to={`/stock/${r.id}`} className="hover:text-primary">
                          <span className="font-semibold">{r.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{r.ticker}</span>
                        </Link>
                      </td>
                      <td className="py-2 px-4 text-right font-data">
                        {r.price.toLocaleString()}원
                      </td>
                      <td
                        className={`py-2 px-4 text-right font-data font-medium ${
                          r.changePercent > 0
                            ? "text-positive"
                            : r.changePercent < 0
                              ? "text-negative"
                              : "text-muted-foreground"
                        }`}
                      >
                        {r.changePercent > 0 ? "+" : ""}
                        {r.changePercent.toFixed(2)}%
                      </td>
                      <td className="py-2 px-4 text-right font-data text-muted-foreground">
                        {r.volume.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sorted.length > 200 && (
                <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
                  상위 200개만 표시 (전체 {sorted.length})
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
