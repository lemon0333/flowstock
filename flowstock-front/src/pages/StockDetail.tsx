/**
 * ============================================================
 * 종목 상세 페이지 (/stock/:id)
 * - TradingView Lightweight Charts 캔들스틱 차트
 * - ReactFlow 뉴스-기업 관계 네트워크 그래프
 * - AI 공시 요약 (목업)
 * - 토스 스타일: 부드러운 카드 + 라운딩
 * ============================================================
 */

import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Bot, FileText, TrendingUp, TrendingDown } from "lucide-react";
import Layout from "@/components/layout/Layout";
import StockChart from "@/components/stock/StockChart";
import NetworkGraph from "@/components/stock/NetworkGraph";
import { stocks, news, disclosures, generateOHLCData } from "@/mocks/data";

export default function StockDetail() {
  const { id } = useParams<{ id: string }>();

  // ── 종목 데이터 조회 ──
  const stock = stocks.find((s) => s.id === id);
  if (!stock) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">종목을 찾을 수 없습니다.</p>
          <Link to="/" className="text-primary text-sm mt-2 hover:underline font-medium">
            홈으로 돌아가기
          </Link>
        </div>
      </Layout>
    );
  }

  const isPositive = stock.changePercent >= 0;
  const relatedNews = news.filter((n) => n.relatedStocks.includes(stock.id));
  const relatedDisclosures = disclosures.filter((d) => d.stockId === stock.id);
  const chartData = generateOHLCData(90);

  return (
    <Layout>
      {/* ── 상단: 뒤로가기 + 종목 요약 ── */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{stock.name}</h1>
            <span className="ticker-tag">{stock.id}</span>
            <span className="text-sm text-muted-foreground">{stock.market}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-data text-2xl font-bold text-foreground">
              {stock.price.toLocaleString()}원
            </span>
            <span className={`font-data text-sm font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full ${
              isPositive ? "text-positive bg-positive/10" : "text-negative bg-negative/10"
            }`}>
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {isPositive ? "+" : ""}{stock.change.toLocaleString()} ({isPositive ? "+" : ""}{stock.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* ── 차트 영역 ── */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-foreground mb-3">
          주가 차트 (90일)
        </h2>
        <StockChart data={chartData} height={350} />
      </section>

      {/* ── 네트워크 그래프 + AI 공시 요약 ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* 뉴스-기업 관계 그래프 */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-3">
            뉴스 연결 관계
          </h2>
          {relatedNews.length > 0 ? (
            <NetworkGraph newsItems={relatedNews} height={300} />
          ) : (
            <div className="h-[300px] bg-card border border-border rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
              관련 뉴스가 없습니다
            </div>
          )}
        </div>

        {/* AI 공시 요약 (목업) */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-primary" />
            AI 공시 요약
          </h2>
          <div className="bg-card border border-border rounded-2xl p-5 h-[300px] overflow-y-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
            {relatedDisclosures.length > 0 ? (
              <div className="space-y-4">
                {relatedDisclosures.map((disc) => (
                  <div key={disc.id} className="border-l-3 border-primary pl-4 py-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{disc.date}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        disc.type === "주요" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                      }`}>
                        {disc.type}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{disc.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      해당 공시는 {stock.name}의 기업가치에 긍정적인 영향을 미칠 것으로 분석됩니다.
                      투자자들은 관련 내용을 면밀히 검토할 필요가 있습니다.
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                공시 데이터가 없습니다
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
