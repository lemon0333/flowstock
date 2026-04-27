/**
 * ============================================================
 * 모의투자 페이지 (/portfolio)
 * - 가상 잔고 (1,000만원 시작) + 매수/매도 시뮬레이션
 * - 보유 종목 평가금액 / 수익률 (현재가는 /api/stocks 응답 사용)
 * - 거래 내역
 * - localStorage persist (브라우저 단위 영속화)
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, RefreshCw, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useStore } from "@/stores/useStore";
import { stockApi } from "@/services/api";

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

export default function PortfolioPage() {
  const { cash, holdings, trades, buyStock, sellStock, resetSimulation } = useStore();
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 매수/매도 폼
  const [showForm, setShowForm] = useState(false);
  const [formStockId, setFormStockId] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formAction, setFormAction] = useState<"buy" | "sell">("buy");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await stockApi.getAll();
        setStocks((res.data ?? []) as StockRow[]);
      } catch {
        setStocks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stockMap = useMemo(() => {
    const m: Record<string, StockRow> = {};
    stocks.forEach((s) => {
      m[s.id] = s;
      if (s.ticker) m[s.ticker] = s;
    });
    return m;
  }, [stocks]);

  // 종목 list (보유 종목은 매도 폼에서 따로)
  const buySelectable = stocks;
  const sellSelectable = holdings.map((h) => ({
    id: h.stockId,
    name: h.stockName,
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
    const result =
      formAction === "buy"
        ? buyStock({
            stockId: stock.id,
            stockName: stock.name,
            sector: "기타",
            quantity: qty,
            price,
          })
        : sellStock({ stockId: stock.id, quantity: qty, price });

    if (!result.ok) {
      setFormError(result.error ?? "거래에 실패했습니다.");
      return;
    }
    setFormStockId("");
    setFormQuantity("");
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
            <p className="text-sm text-muted-foreground mt-1">
              1,000만원 가상 잔고로 매수/매도를 연습 — 실제 시장가는 KOSPI 시세 기준
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm("정말 초기화 하시겠습니까? (잔고/보유/거래내역 모두 삭제)")) {
                resetSimulation();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-full hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> 초기화
          </button>
        </div>

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
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">평가손익</div>
            <div
              className={`font-data text-xl font-bold mt-1 ${
                profit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {profit >= 0 ? "+" : ""}
              {profit.toLocaleString()}원 ({profitRate.toFixed(2)}%)
            </div>
          </div>
        </div>

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">종목</label>
                  <select
                    value={formStockId}
                    onChange={(e) => setFormStockId(e.target.value)}
                    className="w-full bg-accent border border-border rounded-xl px-3 py-2.5 text-sm"
                  >
                    <option value="">선택</option>
                    {(formAction === "buy" ? buySelectable : sellSelectable).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.price.toLocaleString()}원)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">수량</label>
                  <input
                    type="number"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="10"
                    className="w-full bg-accent border border-border rounded-xl px-3 py-2.5 text-sm font-data"
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
              {formError && (
                <div className="text-sm text-red-600 mt-3">{formError}</div>
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
              <div className="py-12 text-center text-sm text-muted-foreground">
                아직 보유한 종목이 없습니다. 거래하기 버튼으로 매수해보세요.
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
                          isUp ? "text-green-600" : "text-red-600"
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
                    label={(e) => e.name}
                  >
                    {allocation.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()}원`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 거래 내역 */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-sm font-semibold">
            거래 내역 (최근 {trades.length})
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
                  className="flex items-center justify-between px-5 py-2.5 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {t.type === "buy" ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {t.type === "buy" ? "매수" : "매도"} · {t.stockName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.at).toLocaleString("ko-KR")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-data font-semibold">
                      {t.quantity.toLocaleString()}주 × {t.price.toLocaleString()}원
                    </div>
                    <div className="text-xs text-muted-foreground font-data">
                      {t.total.toLocaleString()}원
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
