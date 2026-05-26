/**
 * ============================================================
 * 모의투자 페이지 (/portfolio)
 * - 가상 잔고 (1,000만원 시작) + 매수/매도 시뮬레이션
 * - 보유 종목 평가금액 / 수익률 (현재가는 /api/stocks 응답 사용)
 * - 거래 내역
 * - localStorage persist (브라우저 단위 영속화)
 * ============================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Download, Plus, RefreshCw, Search, TrendingDown, TrendingUp, Newspaper, Globe, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import ReviewModal from "@/components/portfolio/ReviewModal";
import RiskProfileBanner from "@/components/risk/RiskProfileBanner";
import { useStore, type Trade } from "@/stores/useStore";
import { stockApi, marketApi, newsApi, macroApi } from "@/services/api";

interface MarketIndexLite { id?: string; name: string; value: number; change: number; changePercent: number; }
interface NewsLite { id?: string | number; title: string; publishedAt?: string; source?: string; url?: string; }
interface MacroSeriesLite { code: string; name: string; series: Array<{ date: string; value: number }> }

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#06B6D4",
];

interface StockRow {
  id: string;
  ticker?: string;
  name: string;
  price: number;
  changePercent?: number;
}

const POLL_INTERVAL_MS = 30_000;

export default function PortfolioPage() {
  const { cash, holdings, trades, buyStock, sellStock, resetSimulation } = useStore();
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 사이드 정보: 시장지수 + 환율(USD/KRW) + 최근 뉴스
  const [indices, setIndices] = useState<MarketIndexLite[]>([]);
  const [news, setNews] = useState<NewsLite[]>([]);
  const [usdKrw, setUsdKrw] = useState<{ value: number; date: string } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      marketApi.getIndices().catch(() => null),
      newsApi.getLatest().catch(() => null),
      macroApi.getDashboard().catch(() => null),
    ]).then(([mRes, nRes, macroRes]) => {
      if (!alive) return;
      setIndices(((mRes?.data ?? []) as MarketIndexLite[]).slice(0, 2));
      const rawNews = nRes?.data;
      const list = Array.isArray(rawNews) ? rawNews : (rawNews as { content?: NewsLite[] } | undefined)?.content ?? [];
      setNews(list.slice(0, 5));
      const series = (macroRes?.data?.series ?? []) as MacroSeriesLite[];
      const ex = series.find((s) => s.code?.toUpperCase().includes("EXCHANGE") || s.code === "USD_KRW" || s.name?.includes("환율"));
      const last = ex?.series?.[ex.series.length - 1];
      if (last) setUsdKrw({ value: last.value, date: last.date });
    });
    return () => { alive = false; };
  }, []);

  // 매수/매도 폼
  const [showForm, setShowForm] = useState(false);
  const [formStockId, setFormStockId] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formAction, setFormAction] = useState<"buy" | "sell">("buy");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [formMemo, setFormMemo] = useState("");
  // 복기 모달
  const [reviewTrade, setReviewTrade] = useState<Trade | null>(null);

  // 30초마다 시세 polling — 탭이 hidden이면 멈춤
  useEffect(() => {
    let active = true;
    const fetchOnce = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await stockApi.getAll();
        if (!active) return;
        setStocks((res.data ?? []) as StockRow[]);
        setLastUpdated(new Date());
      } catch {
        // ignore — 직전 시세 유지
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchOnce();
    const id = window.setInterval(fetchOnce, POLL_INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") fetchOnce();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      active = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const stockMap = useMemo(() => {
    const m: Record<string, StockRow> = {};
    stocks.forEach((s) => {
      m[s.id] = s;
      if (s.ticker) m[s.ticker] = s;
    });
    return m;
  }, [stocks]);

  // 매수 — 검색어 필터 적용
  const buySelectable = useMemo(() => {
    if (!search.trim()) return stocks.slice(0, 50);
    const q = search.trim().toLowerCase();
    return stocks
      .filter((s) =>
        (s.name?.toLowerCase().includes(q) ?? false) ||
        (s.id?.toLowerCase().includes(q) ?? false) ||
        (s.ticker?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 50);
  }, [stocks, search]);

  // 매도 — 보유한 종목만 + 보유 수량 표기
  const sellSelectable = holdings.map((h) => ({
    id: h.stockId,
    name: `${h.stockName} (${h.quantity}주 보유)`,
    price: stockMap[h.stockId]?.price ?? h.avgPrice,
  }));

  // 평가금액 / 수익률
  const totalEval = holdings.reduce((sum, h) => {
    const cur = stockMap[h.stockId]?.price ?? h.avgPrice;
    return sum + cur * h.quantity;
  }, 0);
  const totalCost = holdings.reduce((s, h) => s + h.avgPrice * h.quantity, 0);
  const totalAsset = totalEval + cash;
  const profit = totalEval - totalCost;
  const profitRate = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  // 평가손익 변동 시 카드 flash
  const prevProfit = useRef(profit);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (prevProfit.current !== profit) {
      const dir = profit > prevProfit.current ? "up" : "down";
      setFlash(dir);
      const t = window.setTimeout(() => setFlash(null), 600);
      prevProfit.current = profit;
      return () => window.clearTimeout(t);
    }
  }, [profit]);

  const exportTradesCsv = () => {
    if (!trades.length) return;
    const header = "id,type,stockId,stockName,quantity,price,total,at";
    const rows = trades.map((t) =>
      [t.id, t.type, t.stockId, JSON.stringify(t.stockName), t.quantity, t.price, t.total, t.at].join(","),
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowstock-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 종목별 비중
  const allocation = holdings.map((h, i) => {
    const cur = stockMap[h.stockId]?.price ?? h.avgPrice;
    return {
      name: h.stockName,
      value: cur * h.quantity,
      color: COLORS[i % COLORS.length],
    };
  });

  const handleSubmit = () => {
    setFormError("");
    const stock =
      formAction === "buy"
        ? buySelectable.find((s) => s.id === formStockId)
        : sellSelectable.find((s) => s.id === formStockId);
    const qty = Number(formQuantity);
    if (!stock || !qty) {
      setFormError("종목과 수량을 선택해주세요.");
      return;
    }
    const price = stock.price;
    const memo = formMemo.trim() || undefined;
    const result =
      formAction === "buy"
        ? buyStock({
            stockId: stock.id,
            stockName: stock.name,
            sector: "기타",
            quantity: qty,
            price,
            memo,
          })
        : sellStock({ stockId: stock.id, quantity: qty, price, memo });

    if (!result.ok) {
      setFormError(result.error ?? "거래를 처리하지 못했어요.");
      return;
    }
    setFormStockId("");
    setFormQuantity("");
    setFormMemo("");
    setShowForm(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">불러오는 중...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 헤더 + 자산 요약 */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">모의투자</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              1,000만원 가상 잔고 · 실시간 KOSPI 시세 기준
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse" />
                30초마다 갱신
                {lastUpdated && (
                  <span className="text-muted-foreground/70">
                    · {lastUpdated.toLocaleTimeString("ko-KR")}
                  </span>
                )}
              </span>
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm("모두 초기화할까요? 잔고와 보유 종목, 거래 내역이 함께 사라져요.")) {
                resetSimulation();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-full hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> 초기화
          </button>
        </div>

        {/* 투자성향 배너 — 결과 있으면 배지, 없으면 CTA */}
        <RiskProfileBanner variant="compact" />

        {/* 자산 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">총 자산</div>
            <div className="font-data text-xl font-bold mt-1">
              {totalAsset.toLocaleString()}원
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">현금 잔고</div>
            <div className="font-data text-xl font-bold mt-1 text-blue-600">
              {cash.toLocaleString()}원
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">평가금액</div>
            <div className="font-data text-xl font-bold mt-1">
              {totalEval.toLocaleString()}원
            </div>
          </div>
          <div
            className={`bg-card border border-border rounded-2xl p-4 transition-colors ${
              flash === "up" ? "ring-2 ring-green-400/60" : flash === "down" ? "ring-2 ring-red-400/60" : ""
            }`}
          >
            <div className="text-xs text-muted-foreground">평가손익</div>
            <div
              className={`font-data text-xl font-bold mt-1 ${
                profit >= 0 ? "text-positive" : "text-negative"
              }`}
            >
              {profit >= 0 ? "+" : ""}
              {profit.toLocaleString()}원 ({profitRate.toFixed(2)}%)
            </div>
          </div>
        </div>

        {/* 투자 참고 정보 — 지수 + 환율 + 뉴스 */}
        {(indices.length > 0 || news.length > 0 || usdKrw) && (
          <section className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">투자 참고 — 지금 시장</h2>
              <span className="text-[11px] text-muted-foreground">투자 결정에 도움되는 실시간 정보</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 지수 + 환율 */}
              <div className="space-y-2">
                {indices.map((idx) => {
                  const up = (idx.change ?? 0) > 0;
                  const down = (idx.change ?? 0) < 0;
                  return (
                    <div key={idx.id ?? idx.name} className="rounded-xl border border-border bg-background/50 p-3">
                      <div className="text-[11px] text-muted-foreground">{idx.name}</div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="font-num text-base font-bold">
                          {idx.value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                        <span className={`text-xs font-num ${up ? "text-positive" : down ? "text-negative" : "text-muted-foreground"}`}>
                          {up ? "▲" : down ? "▼" : "·"} {Math.abs(idx.change ?? 0).toFixed(2)} ({(idx.changePercent ?? 0).toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
                {usdKrw && (
                  <div className="rounded-xl border border-border bg-background/50 p-3">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" /> 원·달러 환율
                    </div>
                    <div className="font-num text-base font-bold mt-0.5">
                      {usdKrw.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}원
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {usdKrw.date}
                    </div>
                  </div>
                )}
              </div>
              {/* 최근 뉴스 */}
              <div className="md:col-span-2 rounded-xl border border-border bg-background/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11px] text-muted-foreground">📰 최근 뉴스 {news.length}개</div>
                  <Link to="/news" className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5">
                    전체 <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
                {news.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">뉴스를 불러오는 중…</div>
                ) : (
                  <ul className="space-y-1.5">
                    {news.map((n, i) => (
                      <li key={n.id ?? i} className="text-xs leading-snug">
                        {n.url ? (
                          <a
                            href={n.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary line-clamp-2 break-words"
                          >
                            {n.title}
                          </a>
                        ) : (
                          <span className="line-clamp-2 break-words">{n.title}</span>
                        )}
                        {n.source && (
                          <span className="ml-1 text-[10px] text-muted-foreground">· {n.source}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              💡 매수 전에 시장 분위기와 관련 뉴스를 한 번 확인하면 좋아요. 자세한 정보는 <Link to="/economy" className="text-primary hover:underline">경제 지표</Link> · <Link to="/macro" className="text-primary hover:underline">거시</Link>.
            </div>
          </section>
        )}

        {/* 매수/매도 폼 */}
        <div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-full transition-colors"
          >
            <Plus className="h-4 w-4" /> 거래하기
          </button>
          {showForm && (
            <div className="bg-card border border-border rounded-2xl p-5 mt-3">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setFormAction("buy")}
                  className={`px-4 py-1.5 rounded-full text-sm ${
                    formAction === "buy"
                      ? "bg-green-100 text-green-800 font-semibold"
                      : "bg-accent text-muted-foreground"
                  }`}
                >
                  매수
                </button>
                <button
                  onClick={() => setFormAction("sell")}
                  className={`px-4 py-1.5 rounded-full text-sm ${
                    formAction === "sell"
                      ? "bg-red-100 text-red-800 font-semibold"
                      : "bg-accent text-muted-foreground"
                  }`}
                >
                  매도
                </button>
              </div>
              {/* ── 종목 선택 ── */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">종목</label>
                  {formAction === "buy" && (
                    <div className="relative mb-2">
                      <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="종목명/티커 검색"
                        className="w-full bg-accent border border-border rounded-xl pl-8 pr-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  <select
                    value={formStockId}
                    onChange={(e) => setFormStockId(e.target.value)}
                    className="w-full bg-accent border border-border rounded-xl px-3 py-2.5 text-sm"
                    disabled={formAction === "buy" && stocks.length === 0}
                  >
                    <option value="">
                      {formAction === "buy" && stocks.length === 0
                        ? "종목 목록을 불러오는 중…"
                        : `선택 (${(formAction === "buy" ? buySelectable : sellSelectable).length}개)`}
                    </option>
                    {(formAction === "buy" ? buySelectable : sellSelectable).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.price.toLocaleString()}원)
                      </option>
                    ))}
                  </select>
                  {formAction === "buy" && stocks.length === 0 && !loading && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      장 마감 시간에는 종목 목록이 잠시 비어 있을 수 있어요. 30초 뒤 자동으로 다시 받아와요.
                    </p>
                  )}
                </div>

                {/* ── 매수/매도 컨텍스트 정보 + 퀵 버튼 ── */}
                {(() => {
                  const selectedStock =
                    formAction === "buy"
                      ? buySelectable.find((s) => s.id === formStockId)
                      : sellSelectable.find((s) => s.id === formStockId);
                  if (!selectedStock) return null;

                  const price = selectedStock.price;
                  const heldQty = formAction === "sell"
                    ? holdings.find((h) => h.stockId === formStockId)?.quantity ?? 0
                    : 0;
                  const maxBuyable = formAction === "buy" ? Math.floor(cash / price) : heldQty;
                  const qtyNum = Number(formQuantity) || 0;
                  const totalAmount = qtyNum * price;
                  const presets = formAction === "buy"
                    ? [1, 10, Math.max(1, Math.floor(maxBuyable / 2)), maxBuyable].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
                    : [1, Math.max(1, Math.floor(heldQty / 2)), heldQty].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);

                  return (
                    <>
                      <div className="bg-accent/50 border border-border rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">현재가</span>
                          <span className="font-data font-medium">{price.toLocaleString()}원</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {formAction === "buy" ? "최대 매수 가능" : "보유 수량"}
                          </span>
                          <span className="font-data font-bold text-primary">
                            {maxBuyable.toLocaleString()}주
                          </span>
                        </div>
                        {qtyNum > 0 && (
                          <>
                            <div className="flex items-center justify-between pt-1.5 border-t border-border">
                              <span className="text-muted-foreground">주문 금액</span>
                              <span className="font-data font-medium">{totalAmount.toLocaleString()}원</span>
                            </div>
                            {formAction === "buy" ? (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">매수 후 현금 잔고</span>
                                <span
                                  className={`font-data font-medium ${
                                    cash - totalAmount < 0 ? "text-negative" : ""
                                  }`}
                                >
                                  {(cash - totalAmount).toLocaleString()}원
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">매도 후 현금 잔고</span>
                                <span className="font-data font-medium">
                                  {(cash + totalAmount).toLocaleString()}원
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* 퀵 버튼 */}
                      <div className="flex flex-wrap gap-2">
                        {presets.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setFormQuantity(String(n))}
                            className="px-3 py-1.5 text-xs font-medium rounded-full border border-border hover:bg-accent transition-colors"
                          >
                            {n === maxBuyable && formAction === "buy"
                              ? `최대 ${n}주`
                              : n === heldQty && formAction === "sell"
                                ? `전량 ${n}주`
                                : `${n}주`}
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* ── 수량 + 주문 버튼 ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">수량</label>
                    <input
                      type="number"
                      min={1}
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      placeholder="10"
                      className="w-full bg-accent border border-border rounded-xl px-3 py-2.5 text-sm font-data"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {formAction === "buy" ? "왜 사는지 (선택)" : "왜 파는지 (선택)"}
                      <span className="ml-1.5 text-[10px] opacity-70">
                        — 나중에 AI가 복기 분석해줘요
                      </span>
                    </label>
                    <textarea
                      value={formMemo}
                      onChange={(e) => setFormMemo(e.target.value)}
                      placeholder={
                        formAction === "buy"
                          ? "예: 실적 호조 + 차트 정배열, 5% 빠진 김에"
                          : "예: 목표가 도달, 매크로 악화로 손절"
                      }
                      maxLength={300}
                      rows={2}
                      className="w-full bg-accent border border-border rounded-xl px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSubmit}
                      className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      {formAction === "buy" ? "매수 주문" : "매도 주문"}
                    </button>
                  </div>
                </div>
              </div>
              {formError && (
                <div className="text-sm text-negative mt-3">{formError}</div>
              )}
            </div>
          )}
        </div>

        {/* 보유 종목 + 비중 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border text-sm font-semibold">
              보유 종목 ({holdings.length})
            </div>
            {holdings.length === 0 ? (
              <div className="px-5 py-8">
                <div className="text-center mb-5">
                  <div className="text-2xl mb-2">🌱</div>
                  <h3 className="text-base font-bold mb-1">처음이세요? 1분이면 시작!</h3>
                  <p className="text-xs text-muted-foreground">
                    1,000만원 가상 잔고로 실수해도 괜찮은 연습장이에요.
                  </p>
                </div>
                <ol className="space-y-2.5 max-w-md mx-auto text-sm">
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">1</span>
                    <span className="text-foreground">
                      위 <strong className="text-primary">+ 거래하기</strong> 버튼 누르기
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">2</span>
                    <span className="text-foreground">
                      종목 검색해서 고르고 <strong>수량</strong> 입력 (1주부터 가능)
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">3</span>
                    <span className="text-foreground">
                      <strong>"왜 사는지"</strong> 메모 남기기 — 나중에 AI가 복기해줘요
                    </span>
                  </li>
                </ol>
                <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90"
                  >
                    + 첫 매수해보기
                  </button>
                  <Link
                    to="/learn"
                    className="px-5 py-2.5 border border-border rounded-full text-sm font-medium hover:bg-accent text-center"
                  >
                    📚 먼저 주식 공부
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-12 px-5 py-2.5 text-xs text-muted-foreground border-b border-border">
                  <div className="col-span-4">종목</div>
                  <div className="col-span-2 text-right">수량</div>
                  <div className="col-span-2 text-right">평균가</div>
                  <div className="col-span-2 text-right">현재가</div>
                  <div className="col-span-2 text-right">손익</div>
                </div>
                {holdings.map((h) => {
                  const cur = stockMap[h.stockId]?.price ?? h.avgPrice;
                  const evalValue = cur * h.quantity;
                  const cost = h.avgPrice * h.quantity;
                  const rate = ((cur - h.avgPrice) / h.avgPrice) * 100;
                  const isUp = rate >= 0;
                  return (
                    <div
                      key={h.stockId}
                      className="grid grid-cols-12 px-5 py-3 border-b border-border/30 last:border-0 hover:bg-accent/40"
                    >
                      <div className="col-span-4 flex items-center gap-2">
                        <span className="text-sm font-semibold">{h.stockName}</span>
                        <span className="text-xs text-muted-foreground">{h.stockId}</span>
                      </div>
                      <div className="col-span-2 text-right text-sm font-data">
                        {h.quantity.toLocaleString()}
                      </div>
                      <div className="col-span-2 text-right text-sm font-data text-muted-foreground">
                        {h.avgPrice.toLocaleString()}
                      </div>
                      <div className="col-span-2 text-right text-sm font-data font-medium">
                        {cur.toLocaleString()}
                      </div>
                      <div
                        className={`col-span-2 text-right text-sm font-data font-semibold ${
                          isUp ? "text-positive" : "text-negative"
                        }`}
                      >
                        {isUp ? "+" : ""}
                        {(evalValue - cost).toLocaleString()}원
                        <div className="text-xs">
                          {isUp ? "+" : ""}
                          {rate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 비중 차트 */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="text-sm font-semibold mb-3">종목 비중</div>
            {allocation.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                매수하면 비중이 표시됩니다
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label={(e) => `${e.name} ${(e.percent * 100).toFixed(1)}%`}
                  >
                    {allocation.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, _name, ctx) => {
                      const total = allocation.reduce((s, a) => s + a.value, 0);
                      const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0";
                      return [`${v.toLocaleString()}원 (${pct}%)`, ctx.payload?.name as string];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 거래 내역 */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-sm font-semibold flex items-center justify-between">
            <span>거래 내역 (최근 {trades.length})</span>
            {trades.length > 0 && (
              <button
                onClick={exportTradesCsv}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            )}
          </div>
          {trades.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              아직 거래 내역이 없습니다
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {trades.slice(0, 50).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {t.type === "buy" ? (
                      <TrendingUp className="h-4 w-4 text-positive shrink-0" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-negative shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {t.type === "buy" ? "매수" : "매도"} · {t.stockName}
                        {t.aiReview && (
                          <span className="ml-1.5 text-[10px] text-primary">✓ 복기됨</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.at).toLocaleString("ko-KR")}
                        {t.memo && (
                          <span className="ml-1.5 italic opacity-80">"{t.memo.slice(0, 30)}{t.memo.length > 30 ? "…" : ""}"</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-data font-semibold">
                        {t.quantity.toLocaleString()}주 × {t.price.toLocaleString()}원
                      </div>
                      <div className="text-xs text-muted-foreground font-data">
                        {t.total.toLocaleString()}원
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewTrade(t)}
                      title={t.aiReview ? "복기 결과 보기" : "AI 복기 분석"}
                      className={`p-1.5 rounded-lg transition-colors ${
                        t.aiReview
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ReviewModal
        trade={reviewTrade}
        open={reviewTrade !== null}
        onOpenChange={(o) => !o && setReviewTrade(null)}
        avgBuyPrice={
          reviewTrade?.type === "sell"
            ? holdings.find((h) => h.stockId === reviewTrade.stockId)?.avgPrice
            : undefined
        }
      />
    </Layout>
  );
}
