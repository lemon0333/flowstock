/**
 * ============================================================
 * Zustand 글로벌 스토어
 * - 인증 상태 관리 (localStorage 연동)
 * - 포트폴리오 (보유 종목) 관리
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
  // ── 인증 초기 상태 (localStorage에서 복원) ──
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  /** 로그인 처리 */
  login: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  /** 로그아웃 처리 */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  // ── 포트폴리오 초기 상태 ──
  holdings: [],

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
