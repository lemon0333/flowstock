/**
 * ============================================================
 * 후회 계산기 ("내가 얼마나 못 벌었을까?")
 * - 종목 + 진입 시점 + 금액만 받으면:
 *   · 그때 샀다면 지금 얼마? (현재가 기준 손익)
 *   · 보유기간 최고가에 팔았다면? (놓친 최대 수익 = FOMO)
 * - 순수 함수(테스트 가능). 가격 데이터는 OHLCV 배열로 주입.
 * ============================================================
 */

import type { OHLCV } from "./indicators";

export interface RegretInput {
  ohlcv: OHLCV[];
  entryDate: string; // YYYY-MM-DD (요청 진입일)
  amount: number; // 그때 넣었을 금액(원)
}

export interface RegretResult {
  entryDate: string; // 실제 적용된 진입일 (요청일 이후 첫 거래일)
  entryPrice: number;
  latestDate: string;
  latestPrice: number;
  shares: number;
  currentValue: number; // 지금 평가액
  profit: number; // currentValue - amount (못 번 돈 / 잃었을 돈)
  pct: number; // 현재 수익률
  peakDate: string; // 보유기간 중 종가 최고일
  peakPrice: number;
  peakValue: number; // 최고점에 팔았다면 평가액
  maxProfit: number; // 놓친 최대 수익
  maxPct: number;
  days: number; // 보유 일수
  adjusted: boolean; // 요청 진입일이 데이터 범위 밖이라 가장 이른 날로 보정됨
}

/** 진입일 이후 첫 거래일을 기준으로 손익과 최대 수익(FOMO)을 계산. */
export function calcRegret({ ohlcv, entryDate, amount }: RegretInput): RegretResult | null {
  if (!ohlcv?.length || !(amount > 0)) return null;
  const sorted = [...ohlcv].sort((a, b) => a.date.localeCompare(b.date));

  // 요청 진입일 이후 첫 거래일. 없으면(미래 등) null, 너무 과거면 가장 이른 날로 보정.
  let idx = sorted.findIndex((d) => d.date >= entryDate);
  let adjusted = false;
  if (idx === -1) return null; // 진입일이 마지막 거래일보다 미래
  if (sorted[idx].date !== entryDate && entryDate < sorted[0].date) adjusted = true;

  const entry = sorted[idx];
  const latest = sorted[sorted.length - 1];
  if (!entry || !latest || !(entry.close > 0)) return null;

  const shares = amount / entry.close; // 소수 주식 허용(단순화)
  const currentValue = shares * latest.close;
  const profit = currentValue - amount;
  const pct = (latest.close - entry.close) / entry.close;

  // 보유기간 종가 최고점 (정직하게 close 기준)
  let peak = entry;
  for (let i = idx; i < sorted.length; i++) if (sorted[i].close > peak.close) peak = sorted[i];
  const peakValue = shares * peak.close;
  const maxProfit = peakValue - amount;
  const maxPct = (peak.close - entry.close) / entry.close;

  const days = Math.round(
    (new Date(latest.date).getTime() - new Date(entry.date).getTime()) / 86_400_000,
  );

  return {
    entryDate: entry.date,
    entryPrice: entry.close,
    latestDate: latest.date,
    latestPrice: latest.close,
    shares,
    currentValue,
    profit,
    pct,
    peakDate: peak.date,
    peakPrice: peak.close,
    peakValue,
    maxProfit,
    maxPct,
    days,
    adjusted,
  };
}

/** ₩ 천단위 콤마. */
export function won(n: number): string {
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}

/** 큰 금액을 사람이 읽기 쉬운 한국어(억/만)로. 예: 13,400,000 → "1,340만원" */
export function wonKo(n: number): string {
  const abs = Math.abs(Math.round(n));
  const sign = n < 0 ? "-" : "";
  if (abs >= 100_000_000) {
    const eok = abs / 100_000_000;
    return `${sign}${eok % 1 === 0 ? eok : eok.toFixed(1)}억원`;
  }
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000).toLocaleString("ko-KR")}만원`;
  return `${sign}${abs.toLocaleString("ko-KR")}원`;
}

/** +12.3% / -4.5% */
export function pctStr(p: number): string {
  return (p >= 0 ? "+" : "") + (p * 100).toFixed(1) + "%";
}
