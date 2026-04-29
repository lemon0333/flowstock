/**
 * ============================================================
 * 종목 상세 페이지 (/stock/:id)
 * - 기술지표 (MA/BB/RSI/MACD/거래량) 통합 차트
 * - 52주 위치, 수익률·변동성·Sharpe
 * - 뉴스 네트워크 그래프, AI 공시 요약
 * - DART 재무제표(Phase 2)
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bot, FileText, TrendingDown, TrendingUp } from "lucide-react";
import Layout from "@/components/layout/Layout";
import NetworkGraph from "@/components/stock/NetworkGraph";
import TechnicalChart from "@/components/stock/TechnicalChart";
import StockFinancials from "@/components/stock/StockFinancials";
import { stockApi } from "@/services/api";
import { fiftyTwoWeekPosition, type OHLCV, returnStats } from "@/lib/indicators";

interface StockMeta {
  id: string;
  ticker: string;
  name?: string;
  market?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  relatedNews?: Array<Record<string, unknown>>;
  disclosures?: Array<Record<string, unknown>>;
  chartData?: Array<Record<string, unknown>>;
}

export default function StockDetail() {
  const { id } = useParams<{ id: string }>();
  const [stock, setStock] = useState<StockMeta | null>(null);
  const [ohlcv, setOhlcv] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const [detail, candles] = await Promise.all([
          stockApi.getById(id).catch(() => ({ data: null as StockMeta | null })),
          stockApi.getOhlcv(id, 365).catch(() => ({ data: [] as unknown[] })),
        ]);
        if (!alive) return;
        const meta = (detail.data ?? detail) as StockMeta | null;
        setStock(meta ?? { id, ticker: id });
        const arr = (candles.data ?? candles) as Array<Record<string, unknown>>;
        const norm: OHLCV[] = (Array.isArray(arr) ? arr : []).map((d) => ({
          date: String(d.date ?? ""),
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
          volume: Number(d.volume),
        }));
        setOhlcv(norm);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  // ── 통계 메모 ──
  const stats = useMemo(() => {
    const closes = ohlcv.map((d) => d.close);
    const last = closes[closes.length - 1] ?? null;
    const prev = closes[closes.length - 2] ?? null;
    const dailyChange = last !== null && prev ? ((last - prev) / prev) * 100 : null;
    return {
      last,
      dailyChange,
      pos52: fiftyTwoWeekPosition(closes),
      ...returnStats(closes),
    };
  }, [ohlcv]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </Layout>
    );
  }

  if (error || !stock) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">{error || "종목을 찾을 수 없습니다."}</p>
          <Link to="/" className="text-primary text-sm mt-2 hover:underline font-medium">
            홈으로 돌아가기
          </Link>
        </div>
      </Layout>
    );
  }

  // 가격은 stock.price 우선, fallback ohlcv 마지막
  const price = stock.price ?? stats.last ?? 0;
  const changePct = stock.changePercent ?? stats.dailyChange ?? 0;
  const isPositive = changePct >= 0;
  const relatedNews = (stock.relatedNews ?? []) as Array<{
    id: string;
    title: string;
    relatedStocks: string[];
    impact: "positive" | "negative" | "neutral";
  }>;
  const relatedDisclosures = (stock.disclosures ?? []) as Array<{
    id: string | number;
    date: string;
    title: string;
  }>;

  return (
    <Layout>
      {/* ── 상단: 뒤로가기 + 종목 요약 ── */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/"
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{stock.name ?? stock.ticker}</h1>
            <span className="ticker-tag">{stock.id ?? stock.ticker}</span>
            {stock.market && <span className="text-sm text-muted-foreground">{stock.market}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-data text-2xl font-bold text-foreground">
              {price.toLocaleString()}원
            </span>
            <span
              className={`font-data text-sm font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full ${
                isPositive ? "text-positive bg-positive/10" : "text-negative bg-negative/10"
              }`}
            >
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {isPositive ? "+" : ""}
              {changePct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── 통계 요약 카드 ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="52주 위치"
          value={stats.pos52 !== null ? `${stats.pos52.toFixed(1)}%` : "-"}
          hint="0%=저점, 100%=고점"
        />
        <StatCard
          label="총 수익률 (1년)"
          value={`${(stats.totalReturn * 100).toFixed(2)}%`}
          tone={stats.totalReturn >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="연환산 변동성"
          value={`${(stats.annualizedVolatility * 100).toFixed(2)}%`}
          hint="일별 수익률 표준편차 × √252"
        />
        <StatCard
          label="Sharpe (rf=0)"
          value={stats.sharpe.toFixed(2)}
          hint="연간수익률 / 연변동성"
          tone={stats.sharpe >= 0 ? "positive" : "negative"}
        />
      </section>

      {/* ── 기술지표 차트 ── */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-foreground mb-3">
          기술적 분석 차트 (1년)
        </h2>
        <TechnicalChart data={ohlcv} height={380} />
      </section>

      {/* ── DART 재무제표 ── */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-foreground mb-3">재무제표 / 밸류에이션</h2>
        <StockFinancials ticker={stock.id ?? stock.ticker} price={price} />
      </section>

      {/* ── 네트워크 그래프 + AI 공시 요약 ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-foreground mb-3">뉴스 연결 관계</h2>
          {relatedNews.length > 0 ? (
            <NetworkGraph
              newsItems={relatedNews}
              stocks={stock ? [{ id: stock.id, name: stock.name ?? stock.ticker }] : []}
              height={300}
            />
          ) : (
            <div className="h-[300px] bg-card border border-border rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
              관련 뉴스가 없습니다
            </div>
          )}
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-primary" />
            AI 공시 요약
          </h2>
          <div
            className="bg-card border border-border rounded-2xl p-5 h-[300px] overflow-y-auto"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {relatedDisclosures.length > 0 ? (
              <div className="space-y-4">
                {relatedDisclosures.map((disc) => (
                  <div key={disc.id} className="border-l-2 border-primary pl-4 py-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{disc.date}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{disc.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                공시 데이터가 없습니다
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
}) {
  const valueClass =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : "text-foreground";
  return (
    <div
      className="bg-card border border-border rounded-2xl p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-data text-lg font-bold mt-1 ${valueClass}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
