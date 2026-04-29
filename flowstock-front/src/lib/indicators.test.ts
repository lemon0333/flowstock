import { describe, expect, it } from "vitest";
import { bollinger, ema, fiftyTwoWeekPosition, macd, normalize, returnStats, rsi, sma } from "./indicators";

describe("sma", () => {
  it("period 3 평균 정확", () => {
    const result = sma([1, 2, 3, 4, 5], 3);
    expect(result).toEqual([null, null, 2, 3, 4]);
  });
  it("빈 배열은 빈 배열", () => {
    expect(sma([], 3)).toEqual([]);
  });
});

describe("ema", () => {
  it("EMA 첫 값은 SMA seed", () => {
    const v = [1, 2, 3, 4, 5];
    const e = ema(v, 3);
    expect(e[0]).toBeNull();
    expect(e[1]).toBeNull();
    expect(e[2]).toBeCloseTo(2, 5); // SMA(1,2,3)
    expect(e[3]).toBeCloseTo(3, 5); // 4*0.5 + 2*0.5
    expect(e[4]).toBeCloseTo(4, 5);
  });
});

describe("rsi", () => {
  it("100 일정 상승 → 100", () => {
    const v = Array.from({ length: 30 }, (_, i) => 100 + i);
    const r = rsi(v, 14);
    expect(r[r.length - 1]).toBe(100);
  });
  it("일정 하락 → 0", () => {
    const v = Array.from({ length: 30 }, (_, i) => 100 - i);
    const r = rsi(v, 14);
    expect(r[r.length - 1]).toBe(0);
  });
  it("초기 period 동안은 null", () => {
    const v = [1, 2, 3, 4, 5];
    const r = rsi(v, 14);
    expect(r.every((x) => x === null)).toBe(true);
  });
});

describe("macd", () => {
  it("상수 입력은 macdLine == 0", () => {
    const v = Array(50).fill(100);
    const { macdLine } = macd(v);
    const last = macdLine[macdLine.length - 1] as number;
    expect(Math.abs(last)).toBeLessThan(1e-6);
  });
});

describe("bollinger", () => {
  it("상수 입력은 upper==middle==lower", () => {
    const v = Array(30).fill(100);
    const { upper, middle, lower } = bollinger(v, 20, 2);
    expect(upper[20]).toBeCloseTo(100, 5);
    expect(middle[20]).toBeCloseTo(100, 5);
    expect(lower[20]).toBeCloseTo(100, 5);
  });
});

describe("fiftyTwoWeekPosition", () => {
  it("최근가가 고점이면 100", () => {
    const v = [...Array(252).keys()].map((i) => 100 + i);
    expect(fiftyTwoWeekPosition(v)).toBe(100);
  });
  it("최근가가 저점이면 0", () => {
    const v = [...Array(252).keys()].map((i) => 1000 - i);
    expect(fiftyTwoWeekPosition(v)).toBe(0);
  });
  it("빈 배열 null", () => {
    expect(fiftyTwoWeekPosition([])).toBeNull();
  });
});

describe("normalize", () => {
  it("시작점 100 기준", () => {
    const v = [50, 60, 75, 100];
    const n = normalize(v);
    expect(n[0]).toBe(100);
    expect(n[3]).toBe(200);
  });
});

describe("returnStats", () => {
  it("일정 상승 시 totalReturn 양수", () => {
    const v = [100, 101, 102, 103, 104];
    const s = returnStats(v);
    expect(s.totalReturn).toBeGreaterThan(0);
    expect(s.dailyVolatility).toBeGreaterThan(0);
  });
});
