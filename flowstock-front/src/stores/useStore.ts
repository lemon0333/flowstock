/**
 * ============================================================
 * Zustand 글로벌 스토어
 * - 인증 상태 관리 (localStorage 연동)
 * - 모의투자 (가상 잔고 + 보유 종목 + 거래내역) — localStorage persist
 * ============================================================
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 사용자 정보 타입 */
interface User {
  id: string;
  email: string;
  name: string;
}

/** 보유 종목 */
interface Holding {
  stockId: string;
  stockName: string;
  quantity: number;
  avgPrice: number;
  sector: string;
}

/** 거래 내역 */
interface Trade {
  id: string;
  type: "buy" | "sell";
  stockId: string;
  stockName: string;
  quantity: number;
  price: number;
  total: number;
  at: string; // ISO timestamp
}

interface BuyInput {
  stockId: string;
  stockName: string;
  sector?: string;
  quantity: number;
  price: number;
}
interface SellInput {
  stockId: string;
  quantity: number;
  price: number;
}
interface TradeResult {
  ok: boolean;
  error?: string;
}

const INITIAL_CASH = 10_000_000; // 가상 잔고 1,000만원

interface AppState {
  // ── 인증 ──
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;

  // ── 모의투자 ──
  cash: number;
  holdings: Holding[];
  trades: Trade[];
  buyStock: (input: BuyInput) => TradeResult;
  sellStock: (input: SellInput) => TradeResult;
  resetSimulation: () => void;

  // ── deprecated, 호환용 ──
  addHolding: (holding: Holding) => void;
  removeHolding: (stockId: string) => void;
  updateHolding: (stockId: string, updates: Partial<Holding>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── 인증 (localStorage에서 복원) ──
      user: JSON.parse(localStorage.getItem("user") || "null"),
      token: localStorage.getItem("token"),
      isAuthenticated: !!localStorage.getItem("token"),

      login: (user, token) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, token: null, isAuthenticated: false });
      },

      // ── 모의투자 ──
      cash: INITIAL_CASH,
      holdings: [],
      trades: [],

      buyStock: ({ stockId, stockName, sector = "기타", quantity, price }) => {
        if (quantity <= 0 || price <= 0) {
          return { ok: false, error: "수량과 가격은 0보다 커야 합니다." };
        }
        const total = quantity * price;
        const state = get();
        if (state.cash < total) {
          return { ok: false, error: "잔고가 부족합니다." };
        }
        const existing = state.holdings.find((h) => h.stockId === stockId);
        let newHoldings: Holding[];
        if (existing) {
          // 평균 단가 갱신
          const newQty = existing.quantity + quantity;
          const newAvg = (existing.avgPrice * existing.quantity + price * quantity) / newQty;
          newHoldings = state.holdings.map((h) =>
            h.stockId === stockId
              ? { ...h, quantity: newQty, avgPrice: Math.round(newAvg) }
              : h,
          );
        } else {
          newHoldings = [
            ...state.holdings,
            { stockId, stockName, quantity, avgPrice: price, sector },
          ];
        }
        const trade: Trade = {
          id: `${Date.now()}-${stockId}`,
          type: "buy",
          stockId,
          stockName,
          quantity,
          price,
          total,
          at: new Date().toISOString(),
        };
        set({
          cash: state.cash - total,
          holdings: newHoldings,
          trades: [trade, ...state.trades].slice(0, 200),
        });
        return { ok: true };
      },

      sellStock: ({ stockId, quantity, price }) => {
        if (quantity <= 0 || price <= 0) {
          return { ok: false, error: "수량과 가격은 0보다 커야 합니다." };
        }
        const state = get();
        const existing = state.holdings.find((h) => h.stockId === stockId);
        if (!existing) {
          return { ok: false, error: "보유하지 않은 종목입니다." };
        }
        if (existing.quantity < quantity) {
          return { ok: false, error: "보유 수량이 부족합니다." };
        }
        const total = quantity * price;
        const remaining = existing.quantity - quantity;
        const newHoldings =
          remaining === 0
            ? state.holdings.filter((h) => h.stockId !== stockId)
            : state.holdings.map((h) =>
                h.stockId === stockId ? { ...h, quantity: remaining } : h,
              );
        const trade: Trade = {
          id: `${Date.now()}-${stockId}`,
          type: "sell",
          stockId,
          stockName: existing.stockName,
          quantity,
          price,
          total,
          at: new Date().toISOString(),
        };
        set({
          cash: state.cash + total,
          holdings: newHoldings,
          trades: [trade, ...state.trades].slice(0, 200),
        });
        return { ok: true };
      },

      resetSimulation: () =>
        set({ cash: INITIAL_CASH, holdings: [], trades: [] }),

      // ── deprecated 호환 메서드 ──
      addHolding: (holding) =>
        set((state) => ({ holdings: [...state.holdings, holding] })),
      removeHolding: (stockId) =>
        set((state) => ({
          holdings: state.holdings.filter((h) => h.stockId !== stockId),
        })),
      updateHolding: (stockId, updates) =>
        set((state) => ({
          holdings: state.holdings.map((h) =>
            h.stockId === stockId ? { ...h, ...updates } : h,
          ),
        })),
    }),
    {
      name: "flowstock-simulation", // localStorage key
      partialize: (state) => ({
        cash: state.cash,
        holdings: state.holdings,
        trades: state.trades,
      }),
    },
  ),
);
