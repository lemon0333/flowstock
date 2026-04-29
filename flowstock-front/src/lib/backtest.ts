/**
 * ============================================================
 * 백테스트 엔진 (클라이언트 사이드)
 * - 신호 기반 단순 매수/전량매도 (no leverage, no shorting)
 * - 수수료 / 슬리피지 옵션
 * - 결과: 수익률, MDD, Sharpe, 승률, 거래 로그
 * ============================================================
 */

import { ema, rsi, sma, type OHLCV } from "./indicators";

export type StrategyKind = "ma_cross" | "rsi" | "bollinger";

export interface Strategy {
  kind: StrategyKind;
  // ma_cross
  fastPeriod?: number;
  slowPeriod?: number;
  // rsi
  rsiPeriod?: number;
  rsiBuy?: number;
  rsiSell?: number;
  // bollinger
  bbPeriod?: number;
  bbMult?: number;
}

export interface BacktestOptions {
  initialCapital?: number;
  fee?: number; // 0.0015 = 0.15%
  slippage?: number; // 0.001 = 0.1%
}

export interface Trade {
  buyDate: string;
  buyPrice: number;
  sellDate: string;
  sellPrice: number;
  pnl: number;
  pnlPct: number;
}

export interface BacktestResult {
  equity: { date: string; value: number }[];
  trades: Trade[];
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
  winRate: number;
  finalValue: number;
}

/**
 * 1: 매수 신호, -1: 매도 신호, 0: 유지
 * MA cross: fast SMA가 slow SMA 위로 돌파→매수, 아래로 이탈→매도
 * RSI: rsi < buy 매수, rsi > sell 매도
 * Bollinger: close < lower 매수(평균회귀), close > upper 매도
 */
export function generateSignals(data: OHLCV[], strategy: Strategy): number[] {
  const closes = data.map((d) => d.close);
  const sig = new Array(data.length).fill(0);

  if (strategy.kind === "ma_cross") {
    const fast = sma(closes, strategy.fastPeriod ?? 5);
    const slow = sma(closes, strategy.slowPeriod ?? 20);
    for (let i = 1; i < closes.length; i++) {
      const f = fast[i],
        s = slow[i],
        pf = fast[i - 1],
        ps = slow[i - 1];
      if (f === null || s === null || pf === null || ps === null) continue;
      if (pf <= ps && f > s) sig[i] = 1;
      else if (pf >= ps && f < s) sig[i] = -1;
    }
  } else if (strategy.kind === "rsi") {
    const r = rsi(closes, strategy.rsiPeriod ?? 14);
    const buy = strategy.rsiBuy ?? 30;
    const sell = strategy.rsiSell ?? 70;
    for (let i = 1; i < closes.length; i++) {
      const cur = r[i];
      const prev = r[i - 1];
      if (cur === null || prev === null) continue;
      if (prev > buy && cur <= buy) sig[i] = 1;
      else if (prev < sell && cur >= sell) sig[i] = -1;
    }
  } else if (strategy.kind === "bollinger") {
    const period = strategy.bbPeriod ?? 20;
    const mult = strategy.bbMult ?? 2;
    const mid = sma(closes, period);
    for (let i = period; i < closes.length; i++) {
      let sum = 0;
      const m = mid[i] as number;
      for (let j = i - period + 1; j <= i; j++) sum += (closes[j] - m) ** 2;
      const std = Math.sqrt(sum / period);
      const upper = m + std * mult;
      const lower = m - std * mult;
      if (closes[i] < lower) sig[i] = 1;
      else if (closes[i] > upper) sig[i] = -1;
    }
  }
  return sig;
}

export function runBacktest(
  data: OHLCV[],
  strategy: Strategy,
  opts: BacktestOptions = {},
): BacktestResult {
  const initial = opts.initialCapital ?? 10_000_000;
  const fee = opts.fee ?? 0.0015;
  const slip = opts.slippage ?? 0.001;

  const sig = generateSignals(data, strategy);
  const equity: { date: string; value: number }[] = [];
  const trades: Trade[] = [];

  let cash = initial;
  let shares = 0;
  let entry: { date: string; price: number } | null = null;
  let peak = initial;
  let mdd = 0;

  for (let i = 0; i < data.length; i++) {
    const px = data[i].close;
    const value = cash + shares * px;
    if (value > peak) peak = value;
    const dd = (peak - value) / peak;
    if (dd > mdd) mdd = dd;
    equity.push({ date: data[i].date, value });

    if (sig[i] === 1 && shares === 0 && cash > 0) {
      const buyPrice = px * (1 + slip);
      const totalCost = cash;
      const sharesToBuy = Math.floor(totalCost / (buyPrice * (1 + fee)));
      if (sharesToBuy > 0) {
        const spent = sharesToBuy * buyPrice * (1 + fee);
        cash -= spent;
        shares = sharesToBuy;
        entry = { date: data[i].date, price: buyPrice };
      }
    } else if (sig[i] === -1 && shares > 0 && entry) {
      const sellPrice = px * (1 - slip);
      const proceeds = shares * sellPrice * (1 - fee);
      const cost = shares * entry.price * (1 + fee);
      cash += proceeds;
      trades.push({
        buyDate: entry.date,
        buyPrice: entry.price,
        sellDate: data[i].date,
        sellPrice,
        pnl: proceeds - cost,
        pnlPct: (sellPrice - entry.price) / entry.price,
      });
      shares = 0;
      entry = null;
    }
  }

  // 미청산 포지션 종가 청산
  if (shares > 0 && entry && data.length > 0) {
    const px = data[data.length - 1].close;
    const sellPrice = px * (1 - slip);
    const proceeds = shares * sellPrice * (1 - fee);
    const cost = shares * entry.price * (1 + fee);
    cash += proceeds;
    trades.push({
      buyDate: entry.date,
      buyPrice: entry.price,
      sellDate: data[data.length - 1].date,
      sellPrice,
      pnl: proceeds - cost,
      pnlPct: (sellPrice - entry.price) / entry.price,
    });
    shares = 0;
  }

  const finalValue = cash;
  const totalReturn = (finalValue - initial) / initial;

  // CAGR (연환산)
  const days = data.length;
  const years = days / 252;
  const cagr = years > 0 ? Math.pow(finalValue / initial, 1 / years) - 1 : 0;

  // Sharpe (rf=0)
  let sharpe = 0;
  if (equity.length > 1) {
    const rets: number[] = [];
    for (let i = 1; i < equity.length; i++) {
      const r = (equity[i].value - equity[i - 1].value) / equity[i - 1].value;
      rets.push(r);
    }
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
    const stdDaily = Math.sqrt(variance);
    sharpe = stdDaily === 0 ? 0 : (mean * 252) / (stdDaily * Math.sqrt(252));
  }

  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length === 0 ? 0 : wins / trades.length;

  // ema 사용 여부 회피용 — 컴파일러에 export 유지
  void ema;

  return {
    equity,
    trades,
    totalReturn,
    cagr,
    maxDrawdown: -mdd,
    sharpe,
    winRate,
    finalValue,
  };
}
