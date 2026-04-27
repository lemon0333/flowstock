import { describe, it, expect } from "vitest";
import { newsItemSchema, safeArray, stockSchema } from "./schemas";

describe("safeArray", () => {
  it("returns [] when input is not array", () => {
    expect(safeArray(stockSchema, undefined)).toEqual([]);
    expect(safeArray(stockSchema, null)).toEqual([]);
    expect(safeArray(stockSchema, "oops")).toEqual([]);
    expect(safeArray(stockSchema, { content: [] })).toEqual([]);
  });

  it("filters out invalid items rather than throwing", () => {
    const raw = [
      { id: "005930", name: "삼성전자", price: 70000 },
      { id: 9999, name: "잘못된 id" }, // id가 number → invalid
      null,
    ];
    const result = safeArray(stockSchema, raw);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("005930");
  });

  it("applies defaults — relatedStocks missing in news → []", () => {
    const raw = [
      { id: "n1", title: "삼성전자 어쩌구" }, // relatedStocks 없음
    ];
    const result = safeArray(newsItemSchema, raw);
    expect(result[0].relatedStocks).toEqual([]);
  });

  it("preserves passthrough fields (extra fields kept)", () => {
    const raw = [
      { id: "005930", name: "삼성", price: 70000, customField: "x" },
    ];
    const result = safeArray(stockSchema, raw);
    expect((result[0] as any).customField).toBe("x");
  });
});
