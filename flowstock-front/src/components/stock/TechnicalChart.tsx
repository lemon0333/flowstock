/**
 * ============================================================
 * 기술적 분석 차트 (4 패널 — 가격/거래량/RSI/MACD)
 * - 상단: 캔들 + MA(5,20,60) + Bollinger Bands (lightweight-charts)
 * - 거래량: 히스토그램 (lightweight-charts 별도 페인)
 * - RSI(14): 별도 패널 + 30/70 가이드
 * - MACD(12,26,9): line + signal + histogram
 * ============================================================
 */

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type OHLCV, bollinger, macd, rsi, sma } from "@/lib/indicators";

interface Props {
  data: OHLCV[];
  height?: number;
}

export default function TechnicalChart({ data, height = 380 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // ── 지표 계산 (메모) ──
  const computed = useMemo(() => {
    const closes = data.map((d) => d.close);
    return {
      ma5: sma(closes, 5),
      ma20: sma(closes, 20),
      ma60: sma(closes, 60),
      bb: bollinger(closes, 20, 2),
      rsi14: rsi(closes, 14),
      macdResult: macd(closes, 12, 26, 9),
    };
  }, [data]);

  // ── 가격 차트 (lightweight-charts) ──
  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { color: "transparent" },
        textColor: "hsl(220, 9%, 46%)",
        fontFamily: "'Pretendard Variable', system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "hsl(220, 13%, 95%)" },
        horzLines: { color: "hsl(220, 13%, 95%)" },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "hsl(224, 76%, 48%)", width: 1, style: 2 },
        horzLine: { color: "hsl(224, 76%, 48%)", width: 1, style: 2 },
      },
      rightPriceScale: { borderColor: "hsl(220, 13%, 91%)" },
      timeScale: { borderColor: "hsl(220, 13%, 91%)", timeVisible: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      // 한국 컨벤션: 상승 = 빨강, 하락 = 파랑 (토스 동일)
      upColor: "hsl(355, 80%, 56%)",
      downColor: "hsl(217, 78%, 50%)",
      borderUpColor: "hsl(355, 80%, 56%)",
      borderDownColor: "hsl(217, 78%, 50%)",
      wickUpColor: "hsl(355, 80%, 62%)",
      wickDownColor: "hsl(217, 78%, 56%)",
    });
    candleSeries.setData(
      data.map((d) => ({
        time: d.date as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })) as CandlestickData<Time>[],
    );

    const addLineOverlay = (
      values: (number | null)[],
      color: string,
      lineWidth: 1 | 2 = 1,
      dashed = false,
    ) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
        lineStyle: dashed ? 2 : 0,
      });
      series.setData(
        data
          .map((d, i) =>
            values[i] !== null
              ? { time: d.date as Time, value: values[i] as number }
              : null,
          )
          .filter((x): x is { time: Time; value: number } => x !== null),
      );
    };

    addLineOverlay(computed.ma5, "#F59E0B", 1);
    addLineOverlay(computed.ma20, "#3B82F6", 1);
    addLineOverlay(computed.ma60, "#A855F7", 1);
    addLineOverlay(computed.bb.upper, "#94A3B8", 1, true);
    addLineOverlay(computed.bb.lower, "#94A3B8", 1, true);

    // 거래량 히스토그램 (별도 페인)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "#94A3B8",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(
      data.map((d) => ({
        time: d.date as Time,
        value: d.volume,
        // 한국 컨벤션: 상승봉(close >= open) 빨강, 하락봉 파랑
        color: d.close >= d.open ? "rgba(230, 57, 70, 0.5)" : "rgba(27, 100, 218, 0.5)",
      })),
    );

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [data, height, computed]);

  // ── RSI / MACD 데이터 (recharts용) ──
  const subseries = useMemo(() => {
    return data.map((d, i) => ({
      date: d.date,
      rsi: computed.rsi14[i],
      macd: computed.macdResult.macdLine[i],
      signal: computed.macdResult.signalLine[i],
      hist: computed.macdResult.histogram[i],
    }));
  }, [data, computed]);

  if (!data.length) {
    return (
      <div className="h-[300px] bg-card border border-border rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
        차트 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 가격 + MA + BB + 거래량 */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs text-muted-foreground border-b border-border">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-amber-500" /> MA5
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-blue-500" /> MA20
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-purple-500" /> MA60
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 border-t border-dashed border-slate-400" /> Bollinger ±2σ
          </span>
        </div>
        <div ref={containerRef} className="w-full" />
      </div>

      {/* RSI */}
      <div className="bg-card border border-border rounded-2xl p-3">
        <div className="text-xs text-muted-foreground mb-1 px-2">
          RSI (14) — 70 이상 과매수, 30 이하 과매도
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={subseries} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip
              labelFormatter={(l) => l}
              formatter={(v: number | null) =>
                v !== null && v !== undefined ? v.toFixed(2) : "-"
              }
            />
            <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#3B82F6" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="rsi" stroke="#A855F7" dot={false} strokeWidth={1.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MACD */}
      <div className="bg-card border border-border rounded-2xl p-3">
        <div className="text-xs text-muted-foreground mb-1 px-2">
          MACD (12, 26, 9) — macd &gt; signal 골든크로스 매수 신호
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={subseries} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" hide />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number | null) =>
                v !== null && v !== undefined ? Number(v).toFixed(3) : "-"
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="hist" name="히스토그램" fill="#94A3B8" />
            <Line type="monotone" dataKey="macd" name="MACD" stroke="#3B82F6" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="signal" name="Signal" stroke="#F59E0B" dot={false} strokeWidth={1.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
