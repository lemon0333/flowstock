/**
 * ============================================================
 * 섹터 히트맵 (/sectors)
 * - KOSPI 섹터별 등락률 그리드
 * - 빨강(상승) / 파랑(하락) 그라데이션
 * - 클릭 시 섹터 상위 종목 모달
 * ============================================================
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { sectorApi, type SectorRow } from "@/services/api";

function color(v: number): string {
  if (Number.isNaN(v) || v === 0) return "rgba(148, 163, 184, 0.15)";
  if (v > 0) {
    const a = Math.min(1, v / 5);
    return `rgba(220, 38, 38, ${0.2 + a * 0.7})`;
  }
  const a = Math.min(1, Math.abs(v) / 5);
  return `rgba(59, 130, 246, ${0.2 + a * 0.7})`;
}

export default function SectorPage() {
  const [rows, setRows] = useState<SectorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<SectorRow | null>(null);

  useEffect(() => {
    let alive = true;
    sectorApi
      .getSectors("KOSPI")
      .then((res) => alive && setRows(res.data ?? []))
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
          <h1 className="text-2xl font-bold tracking-tight">KOSPI 섹터 히트맵</h1>
          <p className="text-sm text-muted-foreground mt-1">
            섹터별 평균 등락률 — 빨강일수록 상승, 파랑일수록 하락. 셀 클릭 시 상위 종목.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">로드 중…</div>
        ) : error ? (
          <div className="text-center py-20 text-negative">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            아직 섹터 데이터를 받지 못했습니다.
          </div>
        ) : (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {rows.map((s) => {
              // 진한 배경(절대 등락률 ≥ 2.5%)에서는 빨강/파랑 텍스트가 같은 색 배경에 묻힘 → 흰 글자.
              const strongBg = Math.abs(s.changeRate) >= 2.5;
              const valueClass = strongBg
                ? "text-white"
                : s.changeRate >= 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-blue-600 dark:text-blue-400";
              const nameClass = strongBg ? "text-white" : "text-foreground";
              const subClass = strongBg ? "text-white/85" : "text-muted-foreground";
              return (
                <button
                  key={s.code}
                  onClick={() => setSelected(s)}
                  className="rounded-xl p-4 text-left transition-transform hover:scale-[1.03] border border-border"
                  style={{ background: color(s.changeRate) }}
                >
                  <div className={`text-sm font-semibold ${nameClass}`}>{s.name}</div>
                  <div className={`font-data text-lg font-bold mt-1 ${valueClass}`}>
                    {s.changeRate >= 0 ? "+" : ""}
                    {s.changeRate.toFixed(2)}%
                  </div>
                  <div className={`text-[11px] mt-1 ${subClass}`}>{s.count}종목</div>
                </button>
              );
            })}
          </section>
        )}

        {/* 모달 */}
        {selected && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{selected.name}</h3>
                <span
                  className={`font-data text-base font-bold ${
                    selected.changeRate >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {selected.changeRate >= 0 ? "+" : ""}
                  {selected.changeRate.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                상위 종목 ({selected.count}종목 중)
              </div>
              <div className="space-y-1">
                {(selected.topStocks ?? []).map((s) => (
                  <Link
                    key={s.ticker}
                    to={`/stock/${s.ticker}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent text-sm"
                  >
                    <span className="font-semibold">{s.name}</span>
                    <span
                      className={`font-data ${
                        s.changeRate >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {s.changeRate >= 0 ? "+" : ""}
                      {s.changeRate.toFixed(2)}%
                    </span>
                  </Link>
                ))}
                {(selected.topStocks?.length ?? 0) === 0 && (
                  <div className="text-xs text-muted-foreground py-2">상위 종목 데이터 없음</div>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="mt-4 w-full px-4 py-2 rounded-full text-sm font-medium border border-border hover:bg-accent"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
