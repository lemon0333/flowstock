/**
 * 모의투자 store 거래 로직 단위 테스트
 * - 잔고 부족 / 보유 수량 부족 같은 boundary 검증
 * - 평균 단가 갱신 정확성
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./useStore";

describe("useStore — 모의투자", () => {
  beforeEach(() => {
    useStore.getState().resetSimulation();
  });

  it("초기 잔고는 1,000만원", () => {
    expect(useStore.getState().cash).toBe(10_000_000);
    expect(useStore.getState().holdings).toEqual([]);
  });

  it("매수 → cash 차감 + holdings에 종목 등록", () => {
    const { buyStock } = useStore.getState();
    const result = buyStock({
      stockId: "005930",
      stockName: "삼성전자",
      sector: "전기전자",
      quantity: 10,
      price: 70_000,
    });
    expect(result.ok).toBe(true);
    const s = useStore.getState();
    expect(s.cash).toBe(10_000_000 - 700_000);
    expect(s.holdings).toHaveLength(1);
    expect(s.holdings[0].quantity).toBe(10);
    expect(s.holdings[0].avgPrice).toBe(70_000);
  });

  it("잔고 부족 시 거부", () => {
    const { buyStock } = useStore.getState();
    const result = buyStock({
      stockId: "005930",
      stockName: "삼성전자",
      quantity: 1,
      price: 100_000_000, // 1억
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/잔고/);
    expect(useStore.getState().cash).toBe(10_000_000); // 변동 없음
  });

  it("연속 매수 → 평균 단가 가중평균으로 갱신", () => {
    const { buyStock } = useStore.getState();
    buyStock({ stockId: "005930", stockName: "삼성", quantity: 10, price: 70_000 });
    buyStock({ stockId: "005930", stockName: "삼성", quantity: 10, price: 80_000 });
    const h = useStore.getState().holdings[0];
    expect(h.quantity).toBe(20);
    // (70k * 10 + 80k * 10) / 20 = 75,000
    expect(h.avgPrice).toBe(75_000);
  });

  it("보유하지 않은 종목 매도 시 거부", () => {
    const { sellStock } = useStore.getState();
    const r = sellStock({ stockId: "999999", quantity: 1, price: 1000 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/보유/);
  });

  it("보유 수량 초과 매도 시 거부", () => {
    const { buyStock, sellStock } = useStore.getState();
    buyStock({ stockId: "005930", stockName: "삼성", quantity: 5, price: 70_000 });
    const r = sellStock({ stockId: "005930", quantity: 10, price: 70_000 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/수량/);
  });

  it("0/음수 수량은 거부", () => {
    const { buyStock } = useStore.getState();
    expect(buyStock({ stockId: "x", stockName: "x", quantity: 0, price: 1000 }).ok).toBe(false);
    expect(buyStock({ stockId: "x", stockName: "x", quantity: -1, price: 1000 }).ok).toBe(false);
  });
});

describe("useStore — 알림 watchlist", () => {
  beforeEach(() => {
    const { watchlist, removeWatch } = useStore.getState();
    watchlist.forEach((w) => removeWatch(w.ticker));
  });

  it("addWatch — 같은 ticker 중복 등록 무시", () => {
    const { addWatch } = useStore.getState();
    addWatch({ ticker: "005930", name: "삼성", basePrice: 70000, threshold: 3 });
    addWatch({ ticker: "005930", name: "삼성", basePrice: 80000, threshold: 5 });
    expect(useStore.getState().watchlist).toHaveLength(1);
    expect(useStore.getState().watchlist[0].basePrice).toBe(70000);
  });

  it("updateWatch — 부분 업데이트 적용", () => {
    const { addWatch, updateWatch } = useStore.getState();
    addWatch({ ticker: "005930", name: "삼성", basePrice: 70000, threshold: 3 });
    updateWatch("005930", { lastNotifiedAt: "2026-01-01T00:00:00Z" });
    expect(useStore.getState().watchlist[0].lastNotifiedAt).toBe(
      "2026-01-01T00:00:00Z",
    );
  });
});
