/**
 * ============================================================
 * Zustand 글로벌 스토어
 * - 인증 상태 관리
 * - 포트폴리오 (보유 종목) 관리
 * - 나중에 실제 API 연동 시 persist 미들웨어 추가 가능
 * ============================================================
 */

import { create } from "zustand";

/** 사용자 정보 타입 */
interface User {
  id: string;
  email: string;
  name: string;
}

/** 포트폴리오 보유 종목 타입 */
interface Holding {
  stockId: string;
  stockName: string;
  quantity: number;       // 보유 수량
  avgPrice: number;       // 평균 매입가
  sector: string;
}

/** 스토어 전체 상태 타입 */
interface AppState {
  // ── 인증 ──
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;

  // ── 포트폴리오 ──
  holdings: Holding[];
  addHolding: (holding: Holding) => void;
  removeHolding: (stockId: string) => void;
  updateHolding: (stockId: string, updates: Partial<Holding>) => void;
}

export const useStore = create<AppState>((set) => ({
  // ── 인증 초기 상태 ──
  user: null,
  token: null,
  isAuthenticated: false,

  /** 로그인 처리 */
  login: (user, token) =>
    set({ user, token, isAuthenticated: true }),

  /** 로그아웃 처리 */
  logout: () =>
    set({ user: null, token: null, isAuthenticated: false }),

  // ── 포트폴리오 초기 상태 (데모용 기본 데이터) ──
  holdings: [
    { stockId: "005930", stockName: "삼성전자", quantity: 100, avgPrice: 71000, sector: "반도체" },
    { stockId: "000660", stockName: "SK하이닉스", quantity: 20, avgPrice: 170000, sector: "반도체" },
    { stockId: "006400", stockName: "삼성SDI", quantity: 10, avgPrice: 380000, sector: "2차전지" },
    { stockId: "035420", stockName: "NAVER", quantity: 30, avgPrice: 220000, sector: "IT/플랫폼" },
    { stockId: "068270", stockName: "셀트리온", quantity: 15, avgPrice: 175000, sector: "바이오" },
  ],

  /** 종목 추가 */
  addHolding: (holding) =>
    set((state) => ({ holdings: [...state.holdings, holding] })),

  /** 종목 제거 */
  removeHolding: (stockId) =>
    set((state) => ({
      holdings: state.holdings.filter((h) => h.stockId !== stockId),
    })),

  /** 종목 수정 */
  updateHolding: (stockId, updates) =>
    set((state) => ({
      holdings: state.holdings.map((h) =>
        h.stockId === stockId ? { ...h, ...updates } : h
      ),
    })),
}));
