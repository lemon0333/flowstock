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

/** 거래 내역 — 복기노트(memo) 옵셔널 */
export interface Trade {
  id: string;
  type: "buy" | "sell";
  stockId: string;
  stockName: string;
  quantity: number;
  price: number;
  total: number;
  at: string; // ISO timestamp
  memo?: string; // 매수: 매수 이유 / 매도: 매도 회고
  aiReview?: {
    good: string;     // 잘한 점
    concern: string;  // 아쉬운 점
    lesson: string;   // 다음 교훈
    at: string;       // 분석 시각
  };
}

/** 알림 관심 종목 */
export interface WatchlistItem {
  ticker: string;
  name: string;
  basePrice: number;          // 등록 시 기준가
  threshold: number;          // ±% 임계 (예: 3 = ±3%)
  lastNotifiedAt?: string;    // ISO
}

interface BuyInput {
  stockId: string;
  stockName: string;
  sector?: string;
  quantity: number;
  price: number;
  memo?: string;
}
interface SellInput {
  stockId: string;
  quantity: number;
  price: number;
  memo?: string;
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
  /** Trade에 AI 복기 결과 저장 */
  setTradeReview: (tradeId: string, review: NonNullable<Trade["aiReview"]>) => void;
  /** Trade 메모 사후 수정 (복기 모달에서 비어있을 때 입력) */
  updateTradeMemo: (tradeId: string, memo: string) => void;

  // ── 알림 관심 종목 ──
  watchlist: WatchlistItem[];
  addWatch: (item: Omit<WatchlistItem, "lastNotifiedAt">) => void;
  removeWatch: (ticker: string) => void;
  updateWatch: (ticker: string, updates: Partial<WatchlistItem>) => void;

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
        // 다른 탭/zustand persist 캐시까지 깨끗하게 초기화하기 위해
        // 명시적 navigate + 새로고침. 이 패턴 없으면 헤더가 옛 사용자 이름
        // 표시하는 케이스 발생 (zustand 메모리 상태와 localStorage 불일치).
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, token: null, isAuthenticated: false });
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      },

      // ── 모의투자 ──
      cash: INITIAL_CASH,
      holdings: [],
      trades: [],

      buyStock: ({ stockId, stockName, sector = "기타", quantity, price, memo }) => {
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
          ...(memo ? { memo } : {}),
        };
        set({
          cash: state.cash - total,
          holdings: newHoldings,
          trades: [trade, ...state.trades].slice(0, 200),
        });
        return { ok: true };
      },

      sellStock: ({ stockId, quantity, price, memo }) => {
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
          ...(memo ? { memo } : {}),
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

      setTradeReview: (tradeId, review) =>
        set((state) => ({
          trades: state.trades.map((t) =>
            t.id === tradeId ? { ...t, aiReview: review } : t,
          ),
        })),

      updateTradeMemo: (tradeId, memo) =>
        set((state) => ({
          trades: state.trades.map((t) =>
            t.id === tradeId ? { ...t, memo } : t,
          ),
        })),

      // ── 알림 관심 종목 ──
      watchlist: [],
      addWatch: (item) =>
        set((state) => {
          if (state.watchlist.some((w) => w.ticker === item.ticker)) return state;
          return { watchlist: [...state.watchlist, item] };
        }),
      removeWatch: (ticker) =>
        set((state) => ({ watchlist: state.watchlist.filter((w) => w.ticker !== ticker) })),
      updateWatch: (ticker, updates) =>
        set((state) => ({
          watchlist: state.watchlist.map((w) =>
            w.ticker === ticker ? { ...w, ...updates } : w,
          ),
        })),

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
      version: 2,
      partialize: (state) => ({
        cash: state.cash,
        holdings: state.holdings,
        trades: state.trades,
        watchlist: state.watchlist,
      }),
      // 옛 스키마(holdings/trades/cash 만 저장)에서 hydrate될 때 watchlist 등 누락 방어
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        watchlist:
          (persisted as { watchlist?: WatchlistItem[] } | undefined)?.watchlist ?? current.watchlist,
        holdings:
          (persisted as { holdings?: Holding[] } | undefined)?.holdings ?? current.holdings,
        trades:
          (persisted as { trades?: Trade[] } | undefined)?.trades ?? current.trades,
        cash:
          (persisted as { cash?: number } | undefined)?.cash ?? current.cash,
      }),
    },
  ),
);
