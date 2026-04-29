import { describe, expect, it } from "vitest";
import { type OHLCV } from "./indicators";
import { generateSignals, runBacktest } from "./backtest";

function fakeOhlcv(closes: number[]): OHLCV[] {
  return closes.map((c, i) => ({
    date: `2025-01-${String((i % 28) + 1).padStart(2, "0")}`,
    open: c,
    high: c + 1,
    low: c - 1,
    close: c,
    volume: 1000,
  }));
}

describe("generateSignals", () => {
  it("ma_cross — 상승 추세에서 매수 신호 1회 이상", () => {
    const closes = [
      ...Array(20).fill(100),
      ...Array.from({ length: 30 }, (_, i) => 100 + i * 2),
    ];
    const sig = generateSignals(fakeOhlcv(closes), {
      kind: "ma_cross",
      fastPeriod: 5,
      slowPeriod: 20,
    });
    expect(sig.filter((s) => s === 1).length).toBeGreaterThan(0);
  });

  it("rsi — 출력 길이는 입력과 동일", () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 3) * 10);
    const sig = generateSignals(fakeOhlcv(closes), {
      kind: "rsi",
      rsiPeriod: 14,
      rsiBuy: 30,
      rsiSell: 70,
    });
    expect(sig.length).toBe(50);
  });
});

describe("runBacktest", () => {
  it("가격이 일정 상승할 때 ma_cross 전략 양수 수익률", () => {
    const closes = Array.from({ length: 100 }, (_, i) => 100 + i * 0.5);
    const result = runBacktest(
      fakeOhlcv(closes),
      { kind: "ma_cross", fastPeriod: 5, slowPeriod: 20 },
      { fee: 0, slippage: 0 },
    );
    expect(result.totalReturn).toBeGreaterThanOrEqual(0);
  });

  it("MDD는 음수 또는 0", () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 - i);
    const r = runBacktest(fakeOhlcv(closes), { kind: "ma_cross" }, { fee: 0, slippage: 0 });
    expect(r.maxDrawdown).toBeLessThanOrEqual(0);
  });
});
