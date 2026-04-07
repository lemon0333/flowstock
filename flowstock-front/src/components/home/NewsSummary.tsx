/**
 * ============================================================
 * 뉴스/공시 요약 카드 컴포넌트
 * - 오늘의 주요 뉴스와 공시 카드 형태로 표시
 * - 토스 스타일: 부드러운 카드 + 깔끔한 리스트
 * - 영향도(positive/negative/neutral) 인디케이터
 * ============================================================
 */

import { Link } from "react-router-dom";
import { Clock, ExternalLink } from "lucide-react";
import { stocks } from "@/mocks/data";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  category: string;
  relatedStocks: string[];
  impact: "positive" | "negative" | "neutral";
}

interface DisclosureItem {
  id: string;
  stockId: string;
  stockName: string;
  title: string;
  date: string;
  type: string;
}

interface Props {
  news: NewsItem[];
  disclosures: DisclosureItem[];
}

/** 영향도에 따른 인디케이터 색상 */
function ImpactDot({ impact }: { impact: string }) {
  const colorClass =
    impact === "positive" ? "bg-positive" :
    impact === "negative" ? "bg-negative" :
    "bg-muted-foreground/40";

  return <span className={`inline-block w-2 h-2 rounded-full ${colorClass}`} />;
}

export default function NewsSummary({ news: newsItems, disclosures }: Props) {
  /** stockId로 종목명 찾기 */
  const getStockName = (id: string) =>
    stocks.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      {/* ── 뉴스 섹션 ── */}
      <div className="bg-card rounded-2xl" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">
            주요 뉴스
          </h2>
          <Link to="/news" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
            전체보기 <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-border/50">
          {newsItems.slice(0, 4).map((item) => (
            <Link
              key={item.id}
              to="/news"
              className="block px-5 py-4 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <ImpactDot impact={item.impact} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                    {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {item.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-2.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.source} · {item.date}
                    </span>
                    {/* 관련 종목 태그 */}
                    {item.relatedStocks.slice(0, 3).map((sid) => (
                      <span key={sid} className="ticker-tag">
                        {getStockName(sid)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 공시 섹션 ── */}
      <div className="bg-card rounded-2xl" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">
            최근 공시
          </h2>
        </div>

        <div className="divide-y divide-border/50">
          {disclosures.slice(0, 4).map((disc) => (
            <Link
              key={disc.id}
              to={`/stock/${disc.stockId}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  disc.type === "주요" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                }`}>
                  {disc.type}
                </span>
                <span className="ticker-tag">{disc.stockName}</span>
                <span className="text-sm text-foreground truncate">{disc.title}</span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                {disc.date}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
