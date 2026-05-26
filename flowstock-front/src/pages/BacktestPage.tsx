/**
 * ============================================================
 * 백테스터 (/backtest)
 * - 전략: MA cross / RSI / Bollinger
 * - 파라미터 조절 → 즉시 백테스트 → 자산곡선 + 통계
 * ============================================================
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import Layout from "@/components/layout/Layout";
import InfoTooltip from "@/components/ui/info-tooltip";
import { stockApi } from "@/services/api";
import { runBacktest, type Strategy } from "@/lib/backtest";
import { type OHLCV } from "@/lib/indicators";

interface StockBrief {
  id: string;
  ticker: string;
  name: string;
}

export default function BacktestPage() {
  const [universe, setUniverse] = useState<StockBrief[]>([]);
  const [tickerId, setTickerId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [ohlcv, setOhlcv] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(false);

  const [strategy, setStrategy] = useState<Strategy>({
    kind: "ma_cross",
    fastPeriod: 5,
    slowPeriod: 20,
  });
  const [initial, setInitial] = useState(10_000_000);
  const [fee, setFee] = useState(0.0015);
  const [slippage, setSlippage] = useState(0.001);

  // 종목 리스트 로드
  useEffect(() => {
    let alive = true;
    stockApi.getAll().then((res) => {
      if (!alive) return;
      const arr = (res.data ?? []) as Array<Record<string, unknown>>;
      const norm = arr.map((s) => ({
        id: String(s.id ?? s.ticker),
        ticker: String(s.ticker ?? s.id),
        name: String(s.name ?? ""),
      }));
      setUniverse(norm);
      if (!tickerId && norm.length) setTickerId(norm[0].id);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ohlcv 로드
  useEffect(() => {
    if (!tickerId) return;
    let alive = true;
    setLoading(true);
    stockApi
      .getOhlcv(tickerId, 730)
      .then((res) => {
        if (!alive) return;
        const arr = (res.data ?? []) as Array<Record<string, unknown>>;
        setOhlcv(
          arr.map((d) => ({
            date: String(d.date ?? ""),
            open: Number(d.open),
            high: Number(d.high),
            low: Number(d.low),
            close: Number(d.close),
            volume: Number(d.volume),
          })),
        );
      })
      .catch(() => setOhlcv([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tickerId]);

  const result = useMemo(() => {
    if (!ohlcv.length) return null;
    return runBacktest(ohlcv, strategy, { initialCapital: initial, fee, slippage });
  }, [ohlcv, strategy, initial, fee, slippage]);

  const buyAndHold = useMemo(() => {
    if (!ohlcv.length) return null;
    const r0 = ohlcv[0].close;
    const rN = ohlcv[ohlcv.length - 1].close;
    return {
      totalReturn: (rN - r0) / r0,
      equity: ohlcv.map((d) => ({ date: d.date, bh: (d.close / r0) * initial })),
    };
  }, [ohlcv, initial]);

  const merged = useMemo(() => {
    if (!result || !buyAndHold) return [];
    return result.equity.map((e, i) => ({
      date: e.date,
      strategy: e.value,
      buyAndHold: buyAndHold.equity[i]?.bh,
    }));
  }, [result, buyAndHold]);

  const searchResults = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return [];
    return universe
      .filter((s) => s.name.toLowerCase().includes(kw) || s.ticker.includes(kw))
      .slice(0, 8);
  }, [universe, search]);

  const selectedMeta = universe.find((s) => s.id === tickerId);

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">백테스터</h1>
          <p className="text-sm text-muted-foreground mt-1">
            과거 가격 데이터로 전략 검증 — MA 교차 / RSI / 볼린저 평균회귀
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            ⚠️ 과거 수익률이 미래 수익률을 보장하지 않습니다. 실거래 슬리피지·스프레드는 설정값과 다를 수 있습니다.
          </p>
        </div>

        <details className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold flex items-center gap-2">
            🤔 백테스트가 뭐예요?
          </summary>
          <div className="mt-3 text-muted-foreground text-[13px] space-y-1.5 pl-1">
            <p><strong className="text-foreground">"이 전략을 과거에 썼으면 얼마 벌었을까?"</strong>를 시뮬레이션하는 도구.</p>
            <p>예) <strong>MA 교차</strong>: 단기 이동평균선이 장기선 위로 올라오면 매수, 아래로 내려가면 매도. 이 룰을 5년치 차트에 그대로 돌려서 결과 보기.</p>
            <p>👉 종목 → 전략 → 기간 선택 → 실행. 결과로 누적 수익률·MDD(최대 손실)·Sharpe(위험 대비 수익) 나옴.</p>
          </div>
        </details>

        {/* 파라미터 패널 */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
          {/* 종목 선택 — 입력은 항상 search state로만 controlled. 현재 선택값은 label에 같이 표기.
              (이전엔 value={search || selectedMeta.name}로 fallback → 입력 다 지우면 선택 종목명으로 snap back되는 버그) */}
          <div className="relative">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span>종목</span>
              {selectedMeta && (
                <span className="text-foreground font-medium">
                  현재: {selectedMeta.name}
                  <span className="ml-1 text-muted-foreground font-normal">({selectedMeta.ticker})</span>
                </span>
              )}
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="다른 종목을 검색하려면 입력하세요"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 left-0 right-0 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                {searchResults.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setTickerId(s.id);
                      setSearch("");
                    }}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
                  >
                    <span>{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.ticker}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 전략 탭 */}
          <div className="flex gap-2 flex-wrap">
            {(["ma_cross", "rsi", "bollinger"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setStrategy({ kind: k })}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  strategy.kind === k
                    ? "bg-primary/10 text-primary"
                    : "border border-border hover:bg-accent text-muted-foreground"
                }`}
              >
                {k === "ma_cross" ? "MA 교차" : k === "rsi" ? "RSI" : "볼린저"}
              </button>
            ))}
          </div>

          {/* 전략별 파라미터 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {strategy.kind === "ma_cross" && (
              <>
                <Param
                  label={`Fast 기간: ${strategy.fastPeriod ?? 5}`}
                  value={strategy.fastPeriod ?? 5}
                  min={2}
                  max={50}
                  step={1}
                  onChange={(v) => setStrategy({ ...strategy, fastPeriod: v })}
                />
                <Param
                  label={`Slow 기간: ${strategy.slowPeriod ?? 20}`}
                  value={strategy.slowPeriod ?? 20}
                  min={5}
                  max={200}
                  step={1}
                  onChange={(v) => setStrategy({ ...strategy, slowPeriod: v })}
                />
              </>
            )}
            {strategy.kind === "rsi" && (
              <>
                <Param
                  label={`RSI 기간: ${strategy.rsiPeriod ?? 14}`}
                  value={strategy.rsiPeriod ?? 14}
                  min={5}
                  max={30}
                  step={1}
                  onChange={(v) => setStrategy({ ...strategy, rsiPeriod: v })}
                />
                <Param
                  label={`매수 임계: ${strategy.rsiBuy ?? 30}`}
                  value={strategy.rsiBuy ?? 30}
                  min={10}
                  max={45}
                  step={1}
                  onChange={(v) => setStrategy({ ...strategy, rsiBuy: v })}
                />
                <Param
                  label={`매도 임계: ${strategy.rsiSell ?? 70}`}
                  value={strategy.rsiSell ?? 70}
                  min={55}
                  max={90}
                  step={1}
                  onChange={(v) => setStrategy({ ...strategy, rsiSell: v })}
                />
              </>
            )}
            {strategy.kind === "bollinger" && (
              <>
                <Param
                  label={`기간: ${strategy.bbPeriod ?? 20}`}
                  value={strategy.bbPeriod ?? 20}
                  min={5}
                  max={50}
                  step={1}
                  onChange={(v) => setStrategy({ ...strategy, bbPeriod: v })}
                />
                <Param
                  label={`Multiplier σ: ${strategy.bbMult ?? 2}`}
                  value={strategy.bbMult ?? 2}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(v) => setStrategy({ ...strategy, bbMult: v })}
                />
              </>
            )}
            <Param
              label={`수수료: ${(fee * 100).toFixed(2)}%`}
              value={fee}
              min={0}
              max={0.005}
              step={0.0005}
              onChange={setFee}
            />
            <Param
              label={`슬리피지: ${(slippage * 100).toFixed(2)}%`}
              value={slippage}
              min={0}
              max={0.005}
              step={0.0005}
              onChange={setSlippage}
            />
            <div>
              <label className="text-xs text-muted-foreground">초기 자금</label>
              <input
                type="number"
                value={initial}
                onChange={(e) => setInitial(Number(e.target.value) || 0)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-data"
              />
            </div>
          </div>
        </section>

        {/* 결과 */}
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">데이터 로딩…</div>
        ) : result ? (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat
                label="전략 수익률"
                value={`${(result.totalReturn * 100).toFixed(2)}%`}
                tone={result.totalReturn >= 0 ? "positive" : "negative"}
                tooltipTitle="전략 수익률이 뭐예요?"
                tooltipBody={
                  <>
                    설정한 전략(MA 교차/RSI/볼린저)을 과거 데이터에 적용했을 때 누적 수익률.
                    수수료·슬리피지 모두 반영된 값. Buy & Hold 수익률보다 높아야 "전략이 일했다"고 볼 수 있어요.
                  </>
                }
              />
              <Stat
                label="Buy & Hold 수익률"
                value={`${((buyAndHold?.totalReturn ?? 0) * 100).toFixed(2)}%`}
                tone={(buyAndHold?.totalReturn ?? 0) >= 0 ? "positive" : "negative"}
                tooltipTitle="Buy & Hold가 뭐예요?"
                tooltipBody={
                  <>
                    같은 기간 동안 "그냥 사서 안 팔고 들고 있었다면" 얼마 벌었을지.
                    <br /><br />
                    전략 수익률이 Buy & Hold보다 낮으면 → 사고팔며 신경 쓴 보람이 없다는 뜻.
                    역사적으로 대부분의 단순 전략은 Buy & Hold를 못 이겨요.
                  </>
                }
              />
              <Stat
                label="MDD"
                value={`${(result.maxDrawdown * 100).toFixed(2)}%`}
                tone="negative"
                tooltipTitle="MDD가 뭐예요?"
                tooltipBody={
                  <>
                    <strong className="text-foreground">최대 손실폭</strong>(Maximum Drawdown).
                    백테스트 기간 중 가장 안 좋았던 시점에 얼마나 까였는지.
                    <br /><br />
                    예: MDD -30%면 1,000만원 → 700만원까지 빠졌다가 회복한 거. 멘탈로 버틸 수 있는
                    수치인지 미리 보는 지표예요.
                    20%↑면 일반인이 손절 욕구 참기 힘들어요.
                  </>
                }
              />
              <Stat
                label="Sharpe"
                value={result.sharpe.toFixed(2)}
                tone={result.sharpe >= 0 ? "positive" : "negative"}
                tooltipTitle="Sharpe Ratio가 뭐예요?"
                tooltipBody={
                  <>
                    <strong className="text-foreground">위험 대비 수익</strong> 지표. 변동성(=흔들림) 1단위당 몇 % 벌었나.
                    <br /><br />
                    1↑ 우수, 2↑ 매우 우수, 3↑ 거의 사기. 음수면 변동성에 비해 손해.
                    같은 수익률이어도 Sharpe가 높을수록 멘탈 덜 갈리며 번 거예요.
                  </>
                }
              />
              <Stat
                label="CAGR"
                value={`${(result.cagr * 100).toFixed(2)}%`}
                tooltipTitle="CAGR이 뭐예요?"
                tooltipBody={
                  <>
                    <strong className="text-foreground">연복리 수익률</strong>(Compound Annual Growth Rate).
                    "총 수익률을 1년 단위 복리로 환산하면 평균 몇 %?"
                    <br /><br />
                    예: 5년 동안 +60% = CAGR 약 9.86%. 기간이 달라도 비교 가능하게 만드는 표준 지표.
                  </>
                }
              />
              <Stat
                label="총 거래"
                value={`${result.trades.length}회`}
                tooltipTitle="거래 횟수가 너무 많으면?"
                tooltipBody={
                  <>
                    거래마다 수수료 + 슬리피지가 빠지므로 너무 자주 매매하면 수익이 깎여요.
                    같은 수익률이면 거래 횟수가 적은 전략이 실전에서 더 강해요.
                  </>
                }
              />
              <Stat
                label="승률"
                value={`${(result.winRate * 100).toFixed(1)}%`}
                tooltipTitle="승률만 보면 되는 거예요?"
                tooltipBody={
                  <>
                    수익으로 끝난 거래 비율. 승률이 높아도 "이긴 거래는 +1%, 진 거래는 -10%"면 결국 손해.
                    승률 + 평균 손익비를 같이 봐야 해요.
                    <br /><br />
                    추세추종 전략은 보통 승률 30~40%인데도 수익 — 한 번 크게 따고 여러 번 작게 잃는 구조.
                  </>
                }
              />
              <Stat
                label="최종 자산"
                value={`${Math.round(result.finalValue).toLocaleString()}원`}
                tooltipTitle="초기 자금 대비 얼마나 늘었나"
                tooltipBody={
                  <>
                    초기 자금에서 시작해 백테스트 끝난 시점에 남은 금액. 초기 자금을 1,000만원으로 둔
                    상태에서 1,200만원이 되면 +20%.
                  </>
                }
              />
            </section>

            <section className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-sm mb-3">자산 곡선 vs Buy &amp; Hold</h2>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={merged}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" minTickGap={50} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${Math.round(v).toLocaleString()}원`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="strategy" name="전략" stroke="#3B82F6" dot={false} strokeWidth={1.8} />
                  <Line type="monotone" dataKey="buyAndHold" name="Buy & Hold" stroke="#9CA3AF" dot={false} strokeWidth={1.5} strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </section>

            {result.trades.length > 0 && (
              <section className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-3 text-sm font-semibold border-b border-border">
                  거래 로그 (최근 20)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="text-left py-2 px-4">매수일</th>
                        <th className="text-right py-2 px-4">매수가</th>
                        <th className="text-left py-2 px-4">매도일</th>
                        <th className="text-right py-2 px-4">매도가</th>
                        <th className="text-right py-2 px-4">손익률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.slice(-20).reverse().map((t, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="py-2 px-4 text-muted-foreground">{t.buyDate}</td>
                          <td className="py-2 px-4 text-right font-data">
                            {Math.round(t.buyPrice).toLocaleString()}
                          </td>
                          <td className="py-2 px-4 text-muted-foreground">{t.sellDate}</td>
                          <td className="py-2 px-4 text-right font-data">
                            {Math.round(t.sellPrice).toLocaleString()}
                          </td>
                          <td
                            className={`py-2 px-4 text-right font-data font-medium ${
                              t.pnlPct >= 0 ? "text-positive" : "text-negative"
                            }`}
                          >
                            {(t.pnlPct * 100).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            종목을 선택하면 백테스트 결과가 표시됩니다.
          </div>
        )}
      </div>
    </Layout>
  );
}

function Param({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}

function Stat({
  label,
  value,
  tone,
  tooltipTitle,
  tooltipBody,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  tooltipTitle?: string;
  tooltipBody?: ReactNode;
}) {
  const cls =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-2xl p-3">
      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
        {label}
        {tooltipTitle && tooltipBody && (
          <InfoTooltip title={tooltipTitle} iconClassName="h-3 w-3">
            {tooltipBody}
          </InfoTooltip>
        )}
      </div>
      <div className={`font-data text-base font-bold mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}
