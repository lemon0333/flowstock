/**
 * ============================================================
 * 모의투자 게임 (/portfolio/game)
 * - 종목과 기간(과거 OHLCV) 선택 → 그 기간을 가린 채 한 일자씩 보여주며 매수/매도/홀딩 결정
 * - 결과: 사용자 수익률 vs Buy & Hold 수익률 비교
 * - 효율시장 가설/추세추종 vs 가치투자 같은 의사결정 훈련용
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Play, RefreshCw } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { stockApi } from "@/services/api";

interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockMeta {
  id: string;
  ticker?: string;
  name: string;
  price?: number;
}

const INITIAL_CASH = 10_000_000;

export default function InvestGamePage() {
  const [stocks, setStocks] = useState<StockMeta[]>([]);
  const [selectedTicker, setSelectedTicker] = useState("");
  const [days, setDays] = useState(120);
  const [series, setSeries] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(false);

  // 게임 상태
  const [started, setStarted] = useState(false);
  const [cursor, setCursor] = useState(0); // 현재 시점 index
  const [cash, setCash] = useState(INITIAL_CASH);
  const [shares, setShares] = useState(0);
  const [costBasis, setCostBasis] = useState(0); // 평균 매입가
  const [log, setLog] = useState<Array<{ at: string; action: string; price: number; qty?: number }>>([]);

  useEffect(() => {
    (async () => {
      const res = await stockApi.getAll();
      setStocks((res.data ?? []) as StockMeta[]);
    })();
  }, []);

  const startGame = async () => {
    if (!selectedTicker) return;
    setLoading(true);
    try {
      const res = await stockApi.getOhlcv(selectedTicker, days);
      const data = (res.data ?? []) as OHLCV[];
      // 최소 20일 이상이어야 게임 가능
      if (data.length < 20) {
        alert("이 기간 데이터가 부족합니다. 더 긴 기간을 선택해주세요.");
        setLoading(false);
        return;
      }
      setSeries(data);
      setCursor(10); // 초반 10일만 보여주고 시작
      setCash(INITIAL_CASH);
      setShares(0);
      setCostBasis(0);
      setLog([]);
      setStarted(true);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStarted(false);
    setSeries([]);
    setCursor(0);
    setCash(INITIAL_CASH);
    setShares(0);
    setCostBasis(0);
    setLog([]);
  };

  // 보이는 차트 (cursor까지만)
  const visible = useMemo(() => series.slice(0, cursor + 1), [series, cursor]);
  const today = series[cursor];
  const finished = cursor >= series.length - 1;

  // 매수 (현재 잔고 100% 또는 일부)
  const buyAll = () => {
    if (!today) return;
    const qty = Math.floor(cash / today.close);
    if (qty <= 0) return;
    const newShares = shares + qty;
    const newCost = (costBasis * shares + today.close * qty) / newShares;
    setShares(newShares);
    setCostBasis(Math.round(newCost));
    setCash(cash - qty * today.close);
    setLog([{ at: today.date, action: "매수", price: today.close, qty }, ...log]);
  };
  const sellAll = () => {
    if (!today || shares <= 0) return;
    setCash(cash + shares * today.close);
    setLog([{ at: today.date, action: "매도", price: today.close, qty: shares }, ...log]);
    setShares(0);
    setCostBasis(0);
  };
  const hold = () => {
    if (!today) return;
    setLog([{ at: today.date, action: "보유", price: today.close }, ...log]);
  };
  const advance = () => {
    if (cursor < series.length - 1) setCursor(cursor + 1);
  };

  // 결과
  const finalPrice = today?.close ?? 0;
  const portfolioValue = cash + shares * finalPrice;
  const userReturn = ((portfolioValue - INITIAL_CASH) / INITIAL_CASH) * 100;
  const startPrice = series[0]?.close ?? 0;
  const buyHoldReturn = startPrice
    ? ((finalPrice - startPrice) / startPrice) * 100
    : 0;
  const beat = userReturn - buyHoldReturn;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">모의투자 게임 (백테스트)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            과거 차트의 일부를 가리고 한 일자씩 의사결정 — Buy &amp; Hold 대비 얼마나 잘 했는지 측정
          </p>
        </div>

        {!started ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">종목</label>
                <select
                  value={selectedTicker}
                  onChange={(e) => setSelectedTicker(e.target.value)}
                  className="w-full bg-accent border border-border rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value="">종목 선택</option>
                  {stocks.map((s) => (
                    <option key={s.id} value={s.ticker || s.id}>
                      {s.name} ({s.ticker || s.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">기간 (일)</label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full bg-accent border border-border rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value={60}>최근 60일</option>
                  <option value={120}>최근 120일</option>
                  <option value={180}>최근 180일</option>
                  <option value={360}>최근 1년</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={startGame}
                  disabled={!selectedTicker || loading}
                  className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Play className="h-4 w-4 inline mr-1" />
                  {loading ? "데이터 로딩..." : "게임 시작"}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              규칙: 차트 첫 10일이 보인 상태로 시작 → 매수/매도/보유/다음 날 버튼으로 진행 → 마지막 날까지 도달하면 결과 비교
            </p>
          </div>
        ) : (
          <>
            {/* 자산 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="text-xs text-muted-foreground">현재 일자</div>
                <div className="font-data font-bold mt-1">{today?.date}</div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="text-xs text-muted-foreground">현재가</div>
                <div className="font-data font-bold mt-1">{today?.close.toLocaleString()}원</div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="text-xs text-muted-foreground">보유 / 평단</div>
                <div className="font-data font-bold mt-1">
                  {shares}주 / {costBasis ? costBasis.toLocaleString() : "-"}원
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="text-xs text-muted-foreground">평가자산</div>
                <div className="font-data font-bold mt-1">
                  {portfolioValue.toLocaleString()}원
                </div>
                <div
                  className={`text-xs mt-0.5 ${userReturn >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {userReturn >= 0 ? "+" : ""}
                  {userReturn.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* 차트 (cursor까지만) */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={visible}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" minTickGap={40} />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Line type="monotone" dataKey="close" stroke="#3B82F6" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 컨트롤 */}
            {!finished ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={buyAll}
                  disabled={cash < (today?.close ?? Infinity)}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50"
                >
                  매수 (잔고 풀투입)
                </button>
                <button
                  onClick={sellAll}
                  disabled={shares <= 0}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50"
                >
                  매도 (전량)
                </button>
                <button
                  onClick={hold}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-accent text-foreground hover:bg-accent/80"
                >
                  보유
                </button>
                <button
                  onClick={advance}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 ml-auto"
                >
                  다음 날 <ArrowRight className="h-4 w-4 inline ml-1" />
                </button>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <div className="text-xs text-muted-foreground">게임 종료 — 결과</div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-xs text-muted-foreground">내 수익률</div>
                    <div
                      className={`text-2xl font-bold mt-1 ${userReturn >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {userReturn >= 0 ? "+" : ""}
                      {userReturn.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Buy &amp; Hold</div>
                    <div
                      className={`text-2xl font-bold mt-1 ${buyHoldReturn >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {buyHoldReturn >= 0 ? "+" : ""}
                      {buyHoldReturn.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">차이 (Alpha)</div>
                    <div
                      className={`text-2xl font-bold mt-1 ${beat >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {beat >= 0 ? "+" : ""}
                      {beat.toFixed(2)}%p
                    </div>
                  </div>
                </div>
                <button
                  onClick={reset}
                  className="mt-6 px-4 py-2 text-sm border border-border rounded-full hover:bg-accent"
                >
                  <RefreshCw className="h-4 w-4 inline mr-1" /> 새 게임
                </button>
              </div>
            )}

            {/* 거래 로그 */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border text-sm font-semibold">의사결정 로그</div>
              {log.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">아직 결정 없음</div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {log.map((l, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-5 py-2 border-b border-border/30 last:border-0 text-sm"
                    >
                      <span className="font-data text-muted-foreground">{l.at}</span>
                      <span
                        className={`font-medium ${
                          l.action === "매수"
                            ? "text-green-600"
                            : l.action === "매도"
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {l.action}
                        {l.qty ? ` ${l.qty}주` : ""}
                      </span>
                      <span className="font-data">{l.price.toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
