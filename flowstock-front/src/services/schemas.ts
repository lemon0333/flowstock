/**
 * ============================================================
 * API 응답 검증 schema (zod)
 * - 백엔드/AI 서비스 응답이 가끔 필드를 누락하거나 null/undefined로 와서
 *   런타임에 .slice / .map / .toLocaleString 에서 터지는 일을 막기 위한 방어선
 * - parse 실패해도 throw 하지 않고 fallback 값을 돌려준다 (UI 빈 화면 회피)
 * ============================================================
 */

import { z } from "zod";

// 공통 ApiResponse 래퍼
export const apiResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.boolean().optional(),
    data: data.optional(),
    message: z.string().optional(),
    errorCode: z.string().optional(),
  });

// ── Stock ──
export const stockSchema = z
  .object({
    id: z.string(),
    ticker: z.string().optional(),
    name: z.string(),
    price: z.number().default(0),
    change: z.number().optional(),
    changePercent: z.number().optional().default(0),
    volume: z.union([z.string(), z.number()]).optional(),
    sector: z.string().optional(),
  })
  .passthrough();
export type Stock = z.infer<typeof stockSchema>;

// ── News ──
export const newsItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    summary: z.string().optional(),
    source: z.string().optional(),
    link: z.string().optional(),
    date: z.string().optional(),
    publishedAt: z.string().optional(),
    impact: z.enum(["positive", "negative", "neutral"]).optional(),
    sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
    relatedStocks: z.array(z.string()).optional().default([]),
    category: z.string().optional(),
  })
  .passthrough();
export type NewsItem = z.infer<typeof newsItemSchema>;

// ── OHLCV ──
export const ohlcvSchema = z
  .object({
    date: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().optional().default(0),
  })
  .passthrough();
export type OHLCV = z.infer<typeof ohlcvSchema>;

// ── Market index ──
export const marketIndexSchema = z
  .object({
    id: z.string().optional(),
    code: z.string().optional(),
    name: z.string(),
    close: z.number().optional(),
    price: z.number().optional(),
    change: z.number().optional(),
    changePercent: z.number().optional(),
    high: z.number().optional(),
    low: z.number().optional(),
  })
  .passthrough();

/**
 * 응답을 안전하게 array로 변환 — 검증 실패해도 throw 안 하고 빈 배열 반환
 * 화면 깨지는 것보다 빈 상태가 차라리 낫다
 */
export function safeArray<T extends z.ZodTypeAny>(
  schema: T,
  raw: unknown,
): z.infer<T>[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const r = schema.safeParse(item);
    return r.success ? [r.data as z.infer<T>] : [];
  });
}
