/**
 * ============================================================
 * 시장 지수 카드 컴포넌트
 * - KOSPI / KOSDAQ 지수 표시
 * - 등락률에 따라 그린/레드 색상 적용
 * - 토스 스타일: 흰 카드 + 부드러운 그림자 + 큰 라운딩
 * ============================================================
 */

import { TrendingUp, TrendingDown } from "lucide-react";

interface MarketIndex {
  id: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  volume: string;
  high: number;
  low: number;
}

interface Props {
  index: MarketIndex;
}

export default function MarketIndexCard({ index }: Props) {
  const isPositive = index.change >= 0;

  return (
    <div className="bg-card rounded-2xl p-5 card-hover" style={{ boxShadow: 'var(--shadow-card)' }}>
      {/* 지수명 + 아이콘 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {index.name}
        </h3>
        <div className={`p-1.5 rounded-full ${isPositive ? "bg-positive/10" : "bg-negative/10"}`}>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-positive" />
          ) : (
            <TrendingDown className="h-4 w-4 text-negative" />
          )}
        </div>
      </div>

      {/* 현재가 */}
      <p className="font-data text-2xl font-bold text-foreground">
        {index.value.toLocaleString("ko-KR", { minimumFractionDigits: 2 })}
      </p>

      {/* 등락 */}
      <div className="flex items-center gap-2 mt-1.5">
        <span className={`font-data text-sm font-medium ${isPositive ? "text-positive" : "text-negative"}`}>
          {isPositive ? "+" : ""}{index.change.toFixed(2)}
        </span>
        <span className={`font-data text-xs px-2 py-0.5 rounded-full font-medium ${
          isPositive ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
        }`}>
          {isPositive ? "+" : ""}{index.changePercent.toFixed(2)}%
        </span>
      </div>

      {/* 부가 정보 */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <span>고 </span>
          <span className="font-data font-medium text-foreground">{index.high.toLocaleString()}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          <span>저 </span>
          <span className="font-data font-medium text-foreground">{index.low.toLocaleString()}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          <span>거래량 </span>
          <span className="font-data font-medium text-foreground">{index.volume}</span>
        </div>
      </div>
    </div>
  );
}
