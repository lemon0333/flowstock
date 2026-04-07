/**
 * ============================================================
 * 포트폴리오 페이지 (/portfolio)
 * - 보유 종목 수동 입력/관리
 * - 섹터 비중 파이차트 (Recharts)
 * - 토스 스타일: 부드러운 카드 + 깔끔한 폼
 * ============================================================
 */

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Trash2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useStore } from "@/stores/useStore";
import { stocks, news } from "@/mocks/data";

/** 섹터별 색상 맵 */
const SECTOR_COLORS: Record<string, string> = {
  "반도체": "hsl(224, 76%, 48%)",
  "2차전지": "hsl(142, 71%, 45%)",
  "IT/플랫폼": "hsl(262, 60%, 55%)",
  "바이오": "hsl(38, 92%, 50%)",
  "엔터": "hsl(0, 84%, 60%)",
};

export default function PortfolioPage() {
  const { holdings, addHolding, removeHolding } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [formStockId, setFormStockId] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formAvgPrice, setFormAvgPrice] = useState("");

  /** 섹터별 비중 계산 */
  const sectorData = Object.entries(
    holdings.reduce<Record<string, number>>((acc, h) => {
      const stock = stocks.find((s) => s.id === h.stockId);
      const value = (stock?.price ?? h.avgPrice) * h.quantity;
      acc[h.sector] = (acc[h.sector] || 0) + value;
      return acc;
    }, {})
  ).map(([name, value]) => ({
    name,
    value,
    color: SECTOR_COLORS[name] || "hsl(220, 13%, 75%)",
  }));

  const totalValue = holdings.reduce((sum, h) => {
    const stock = stocks.find((s) => s.id === h.stockId);
    return sum + (stock?.price ?? h.avgPrice) * h.quantity;
  }, 0);

  const impactNews = news.filter((n) =>
    n.relatedStocks.some((sid) => holdings.some((h) => h.stockId === sid))
  );

  const handleAdd = () => {
    const stock = stocks.find((s) => s.id === formStockId);
    if (!stock || !formQuantity || !formAvgPrice) return;

    addHolding({
      stockId: stock.id,
      stockName: stock.name,
      quantity: Number(formQuantity),
      avgPrice: Number(formAvgPrice),
      sector: stock.sector,
    });

    setFormStockId("");
    setFormQuantity("");
    setFormAvgPrice("");
    setShowForm(false);
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── 좌측: 보유 종목 리스트 ── */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">
              보유 종목
            </h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-full transition-colors"
            >
              <Plus className="h-4 w-4" />
              종목 추가
            </button>
          </div>

          {/* 종목 추가 폼 */}
          {showForm && (
            <div className="bg-card rounded-2xl p-5 mb-4 animate-fade-in-up" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">종목 선택</label>
                  <select
                    value={formStockId}
                    onChange={(e) => setFormStockId(e.target.value)}
                    className="w-full bg-accent border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">선택</option>
                    {stocks
                      .filter((s) => !holdings.some((h) => h.stockId === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">수량</label>
                  <input
                    type="number"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="100"
                    className="w-full bg-accent border border-border rounded-xl px-3 py-2.5 text-sm text-foreground font-data focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">평균 매입가</label>
                  <input
                    type="number"
                    value={formAvgPrice}
                    onChange={(e) => setFormAvgPrice(e.target.value)}
                    placeholder="70000"
                    className="w-full bg-accent border border-border rounded-xl px-3 py-2.5 text-sm text-foreground font-data focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <button
                onClick={handleAdd}
                className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full hover:bg-primary/90 transition-colors"
              >
                추가
              </button>
            </div>
          )}

          {/* 보유 종목 테이블 */}
          <div className="bg-card rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground">
              <span className="flex-1">종목</span>
              <span className="w-20 text-right">수량</span>
              <span className="w-24 text-right">평균가</span>
              <span className="w-24 text-right">현재가</span>
              <span className="w-24 text-right">평가금액</span>
              <span className="w-20 text-right">수익률</span>
              <span className="w-10" />
            </div>

            {holdings.map((h) => {
              const stock = stocks.find((s) => s.id === h.stockId);
              const currentPrice = stock?.price ?? h.avgPrice;
              const evalValue = currentPrice * h.quantity;
              const profitRate = ((currentPrice - h.avgPrice) / h.avgPrice) * 100;
              const isProfit = profitRate >= 0;

              return (
                <div
                  key={h.stockId}
                  className="flex items-center px-5 py-3.5 border-b border-border/30 last:border-0 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{h.stockName}</span>
                    <span className="ticker-tag">{h.stockId}</span>
                  </div>
                  <span className="w-20 text-right font-data text-sm text-foreground">
                    {h.quantity.toLocaleString()}
                  </span>
                  <span className="w-24 text-right font-data text-sm text-muted-foreground">
                    {h.avgPrice.toLocaleString()}
                  </span>
                  <span className="w-24 text-right font-data text-sm font-medium text-foreground">
                    {currentPrice.toLocaleString()}
                  </span>
                  <span className="w-24 text-right font-data text-sm font-medium text-foreground">
                    {evalValue.toLocaleString()}
                  </span>
                  <span className={`w-20 text-right font-data text-sm font-semibold ${
                    isProfit ? "text-positive" : "text-negative"
                  }`}>
                    {isProfit ? "+" : ""}{profitRate.toFixed(2)}%
                  </span>
                  <span className="w-10 flex justify-end">
                    <button
                      onClick={() => removeHolding(h.stockId)}
                      className="p-1.5 rounded-full text-muted-foreground hover:text-negative hover:bg-negative/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>

          {/* 총 평가금액 */}
          <div className="flex items-center justify-between mt-3 px-5 py-4 bg-card rounded-2xl" style={{ boxShadow: 'var(--shadow-card)' }}>
            <span className="text-sm font-medium text-muted-foreground">총 평가금액</span>
            <span className="font-data text-xl font-bold text-foreground">
              ₩{totalValue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── 우측: 파이차트 + 영향 뉴스 ── */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">
              섹터 비중
            </h2>
            <div className="bg-card rounded-2xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={3}
                  >
                    {sectorData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid hsl(220, 13%, 91%)",
                      borderRadius: "12px",
                      fontSize: "13px",
                      color: "hsl(222, 47%, 11%)",
                      boxShadow: "var(--shadow-elevated)",
                    }}
                    formatter={(value: number) => [`₩${value.toLocaleString()}`, "평가금액"]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", color: "hsl(220, 9%, 46%)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              포트폴리오 영향 뉴스
            </h2>
            <div className="bg-card rounded-2xl divide-y divide-border/50" style={{ boxShadow: 'var(--shadow-card)' }}>
              {impactNews.length > 0 ? (
                impactNews.map((n) => (
                  <div key={n.id} className="px-5 py-4">
                    <div className="flex items-start gap-2.5">
                      {n.impact === "positive" ? (
                        <TrendingUp className="h-4 w-4 text-positive mt-0.5" />
                      ) : n.impact === "negative" ? (
                        <TrendingDown className="h-4 w-4 text-negative mt-0.5" />
                      ) : null}
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {n.source} · {n.date}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  관련 뉴스가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
