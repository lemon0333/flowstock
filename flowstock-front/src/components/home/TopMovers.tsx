/**
 * ============================================================
 * 급등/급락 종목 리스트 컴포넌트
 * - 상승/하락 탭으로 구분
 * - 토스 스타일: 부드러운 카드 + pill 탭
 * - 종목 클릭 시 상세 페이지로 이동
 * ============================================================
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Stock {
  id: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
}

interface Props {
  gainers: Stock[];
  losers: Stock[];
}

export default function TopMovers({ gainers, losers }: Props) {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const list = tab === "gainers" ? gainers : losers;

  return (
    <div className="bg-card rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      {/* 탭 헤더 */}
      <div className="flex gap-2 p-4 pb-0">
        <button
          onClick={() => setTab("gainers")}
          className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
            tab === "gainers"
              ? "bg-positive/10 text-positive"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          급등
        </button>
        <button
          onClick={() => setTab("losers")}
          className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
            tab === "losers"
              ? "bg-negative/10 text-negative"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <ArrowDownRight className="h-3.5 w-3.5" />
          급락
        </button>
      </div>

      {/* 종목 리스트 */}
      <div className="p-2">
        {list.slice(0, 6).map((stock, i) => (
          <Link
            key={stock.id}
            to={`/stock/${stock.id}`}
            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-accent/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-medium w-5 text-center">{i + 1}</span>
              <span className="text-sm font-semibold text-foreground">{stock.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-data text-sm font-medium text-foreground">
                {stock.price.toLocaleString()}원
              </span>
              <span className={`font-data text-sm font-semibold min-w-[70px] text-right ${
                stock.changePercent > 0 ? "text-positive" : "text-negative"
              }`}>
                {stock.changePercent > 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
