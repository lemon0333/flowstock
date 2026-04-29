/**
 * ============================================================
 * 기술적 지표 계산 (클라이언트 사이드)
 * - OHLCV 배열만 받으면 RSI / MACD / 이동평균 / Bollinger 계산
 * - 외부 라이브러리 없이 numpy-free 구현
 * ============================================================
 */

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** 단순 이동평균 (Simple Moving Average) */
export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

/** 지수 이동평균 (Exponential Moving Average) */
export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev === null) {
      // 첫 값은 SMA로 시드
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += values[j];
      prev = s / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

/**
 * RSI (Relative Strength Index) — Wilder smoothing (period 기본 14)
 * 70 이상 과매수, 30 이하 과매도 신호로 통상 해석
 */
export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum -= diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/**
 * MACD: { macdLine, signalLine, histogram }
 * 기본 (12, 26, 9). macd > signal 골든크로스 매수 신호 등으로 해석
 */
export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): { macdLine: (number | null)[]; signalLine: (number | null)[]; histogram: (number | null)[] } {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = values.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null ? (emaFast[i] as number) - (emaSlow[i] as number) : null,
  );
  // signalLine = EMA(macdLine, signal). null은 0으로 채워서 ema 계산하지 말고
  // null 무시해서 정확히 macdLine 시작 시점부터 계산
  const macdValid: number[] = [];
  const offsets: number[] = [];
  macdLine.forEach((v, idx) => {
    if (v !== null) {
      macdValid.push(v);
      offsets.push(idx);
    }
  });
  const signalRaw = ema(macdValid, signal);
  const signalLine: (number | null)[] = new Array(values.length).fill(null);
  signalRaw.forEach((v, i) => {
    if (v !== null) signalLine[offsets[i]] = v;
  });
  const histogram = values.map((_, i) =>
    macdLine[i] !== null && signalLine[i] !== null
      ? (macdLine[i] as number) - (signalLine[i] as number)
      : null,
  );
  return { macdLine, signalLine, histogram };
}

/** Bollinger Bands (period 기본 20, multiplier 기본 2) */
export function bollinger(
  values: number[],
  period = 20,
  mult = 2,
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let sum = 0;
    const m = middle[i] as number;
    for (let j = i - period + 1; j <= i; j++) sum += (values[j] - m) ** 2;
    const std = Math.sqrt(sum / period);
    upper.push(m + std * mult);
    lower.push(m - std * mult);
  }
  return { upper, middle, lower };
}

/** 52주 위치 (0%=저점, 100%=고점) */
export function fiftyTwoWeekPosition(closes: number[]): number | null {
  if (!closes.length) return null;
  const window = closes.slice(-Math.min(252, closes.length));
  const high = Math.max(...window);
  const low = Math.min(...window);
  const cur = closes[closes.length - 1];
  if (high === low) return 50;
  return ((cur - low) / (high - low)) * 100;
}

/**
 * 단순 수익률 / 변동성 / Sharpe (무위험 0 가정)
 * 일별 close 시리즈 기준
 */
export function returnStats(closes: number[]): {
  totalReturn: number;
  dailyVolatility: number;
  annualizedVolatility: number;
  sharpe: number;
} {
  if (closes.length < 2) {
    return { totalReturn: 0, dailyVolatility: 0, annualizedVolatility: 0, sharpe: 0 };
  }
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  const annualVol = dailyVol * Math.sqrt(252);
  const totalReturn = (closes[closes.length - 1] - closes[0]) / closes[0];
  const annualReturn = mean * 252;
  const sharpe = annualVol === 0 ? 0 : annualReturn / annualVol;
  return {
    totalReturn,
    dailyVolatility: dailyVol,
    annualizedVolatility: annualVol,
    sharpe,
  };
}

/** 정규화된 시계열 (시작점 100 기준) — 비교 차트용 */
export function normalize(closes: number[]): number[] {
  if (!closes.length) return [];
  const base = closes[0];
  if (!base) return closes;
  return closes.map((c) => (c / base) * 100);
}
