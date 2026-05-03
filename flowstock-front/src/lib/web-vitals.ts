/**
 * ============================================================
 * Web Vitals 리포터
 * - Core Web Vitals (CLS, LCP, INP, FCP, TTFB) 측정
 * - 콘솔 + (옵션) localStorage rolling buffer 에 기록
 * - 운영 환경에서 분석하려면 backend `/api/metrics/web-vitals` 같은
 *   수집 endpoint 추가 후 fetch 호출하면 됨 (지금은 로깅만)
 *
 * 임계값 (Google 권장):
 *   LCP  ≤ 2500ms (Good), ≤ 4000ms (Needs Improvement)
 *   INP  ≤ 200ms,  ≤ 500ms
 *   CLS  ≤ 0.1,    ≤ 0.25
 *   FCP  ≤ 1800ms, ≤ 3000ms
 *   TTFB ≤ 800ms,  ≤ 1800ms
 * ============================================================
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

const STORAGE_KEY = "flowstock_web_vitals";
const MAX_BUFFER = 50;

function rate(metric: Metric): "good" | "ni" | "poor" {
  const t = THRESHOLDS[metric.name];
  if (!t) return "good";
  if (metric.value <= t[0]) return "good";
  if (metric.value <= t[1]) return "ni";
  return "poor";
}

function report(metric: Metric) {
  const r = rate(metric);
  const value = metric.name === "CLS" ? metric.value.toFixed(3) : `${Math.round(metric.value)}ms`;
  const tag =
    r === "good" ? "✅" : r === "ni" ? "⚠️" : "🔴";

  // 콘솔 로깅 (DevTools에서 바로 보임)
  // eslint-disable-next-line no-console
  console.log(
    `[web-vitals] ${tag} ${metric.name} = ${value}  (rating=${r}, id=${metric.id})`,
  );

  // localStorage에 누적 (개발자가 나중에 분석 가능)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const buf: Array<{ name: string; value: number; rating: string; ts: number; path: string }> =
      raw ? JSON.parse(raw) : [];
    buf.push({
      name: metric.name,
      value: metric.value,
      rating: r,
      ts: Date.now(),
      path: window.location.pathname,
    });
    if (buf.length > MAX_BUFFER) buf.splice(0, buf.length - MAX_BUFFER);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buf));
  } catch {
    /* localStorage 만료 등 — 무시 */
  }
}

export function initWebVitals() {
  onLCP(report);
  onINP(report);
  onCLS(report);
  onFCP(report);
  onTTFB(report);
}

/** DevTools 콘솔에서 `flowstockWebVitals()` 호출하면 누적 데이터 확인 */
export function dumpWebVitals(): unknown[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

if (typeof window !== "undefined") {
  // 콘솔에서 누적 데이터 보기 위해 전역에 노출
  (window as unknown as Record<string, unknown>).flowstockWebVitals = dumpWebVitals;
}
