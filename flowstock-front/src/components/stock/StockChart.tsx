/**
 * ============================================================
 * TradingView Lightweight Charts 래퍼 컴포넌트
 * - 캔들스틱 차트 표시
 * - 라이트 테마 (토스 스타일 흰 배경)
 * - 컨테이너 리사이즈 자동 대응
 * - 나중에 실시간 데이터 연동 시 addData 메서드 활용
 * ============================================================
 */

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, type IChartApi, type CandlestickData, type Time } from "lightweight-charts";

interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Props {
  data: OHLCData[];
  height?: number;
}

export default function StockChart({ data, height = 400 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // ── 차트 인스턴스 생성 (토스 라이트 테마) ──
    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { color: "#ffffff" },
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
      rightPriceScale: {
        borderColor: "hsl(220, 13%, 91%)",
      },
      timeScale: {
        borderColor: "hsl(220, 13%, 91%)",
        timeVisible: false,
      },
    });

    // ── 캔들스틱 시리즈 추가 ──
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "hsl(142, 71%, 45%)",
      downColor: "hsl(0, 84%, 60%)",
      borderUpColor: "hsl(142, 71%, 45%)",
      borderDownColor: "hsl(0, 84%, 60%)",
      wickUpColor: "hsl(142, 71%, 55%)",
      wickDownColor: "hsl(0, 84%, 65%)",
    });

    // 데이터 설정
    candleSeries.setData(
      data.map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })) as CandlestickData<Time>[]
    );

    chart.timeScale().fitContent();
    chartRef.current = chart;

    // ── 리사이즈 핸들러 ──
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(containerRef.current);

    // ── 클린업 ──
    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, height]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border border-border bg-card"
    />
  );
}
