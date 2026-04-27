/**
 * ============================================================
 * 뉴스 시각화 페이지 (/news)
 * - 뉴스 목록 (클릭 시 네트워크 그래프에 반영)
 * - 토스 스타일: 부드러운 카드 + 라운딩
 * ============================================================
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Layout from "@/components/layout/Layout";
import NetworkGraph from "@/components/stock/NetworkGraph";
import { newsApi, stockApi } from "@/services/api";
import { newsItemSchema, safeArray, stockSchema } from "@/services/schemas";

export default function NewsPage() {
  const [news, setNews] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [newsRes, stockRes] = await Promise.all([
          newsApi.getLatest(),
          stockApi.getAll(),
        ]);
        const rawNews = Array.isArray(newsRes.data)
          ? newsRes.data
          : (newsRes.data as { content?: unknown[] } | undefined)?.content ?? [];
        const newsData = safeArray(newsItemSchema, rawNews);
        const stockData = safeArray(stockSchema, stockRes.data);
        setNews(newsData);
        setStocks(stockData);
        setSelectedIds(newsData.slice(0, 3).map((n) => n.id));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleNews = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedNews = news.filter((n: any) => selectedIds.includes(n.id));
  const affectedStockIds = [...new Set(selectedNews.flatMap((n: any) => n.relatedStocks || []))];
  const affectedStocks = stocks.filter((s: any) => affectedStockIds.includes(s.id));

  const ImpactIcon = ({ impact }: { impact: string }) => {
    if (impact === "positive") return <TrendingUp className="h-4 w-4 text-positive" />;
    if (impact === "negative") return <TrendingDown className="h-4 w-4 text-negative" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <p className="text-negative">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── 좌측: 뉴스 목록 ── */}
        <div className="lg:col-span-1">
          <h2 className="text-base font-bold text-foreground mb-3">
            뉴스 선택
          </h2>
          <div className="bg-card rounded-2xl overflow-hidden max-h-[600px] overflow-y-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
            {news.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground px-4">
                불러올 뉴스가 없습니다.
                <div className="text-xs mt-1">잠시 후 새로고침해주세요.</div>
              </div>
            ) : (
              news.map((item: any) => {
                const isSelected = selectedIds.includes(item.id);
                const sentiment = item.sentiment || item.impact;
                const dateStr = item.publishedAt
                  ? new Date(item.publishedAt).toLocaleDateString("ko-KR")
                  : item.date || "";
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleNews(item.id)}
                    className={`w-full text-left px-5 py-4 transition-all border-b border-border/50 last:border-0 ${
                      isSelected ? "bg-primary/5 border-l-3 border-l-primary" : "hover:bg-accent/40 border-l-3 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <ImpactIcon impact={sentiment} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                          {item.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.summary}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.source}
                            {dateStr ? ` · ${dateStr}` : ""}
                          </span>
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-primary hover:underline"
                            >
                              원문
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── 우측: 네트워크 그래프 + 영향 종목 ── */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">
              뉴스-기업 관계 네트워크
            </h2>
            {selectedNews.length > 0 ? (
              <NetworkGraph newsItems={selectedNews} stocks={stocks} height={350} />
            ) : (
              <div className="h-[350px] bg-card border border-border rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
                뉴스를 선택하면 관계 그래프가 표시됩니다
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base font-bold text-foreground mb-3">
              영향받는 종목 ({affectedStocks.length})
            </h2>
            <div className="bg-card rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
              {affectedStocks.length > 0 ? (
                <div>
                  <div className="flex items-center px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground">
                    <span className="flex-1">종목</span>
                    <span className="w-24 text-right">현재가</span>
                    <span className="w-20 text-right">등락률</span>
                    <span className="w-20 text-right">섹터</span>
                  </div>
                  {affectedStocks.map((s: any) => (
                    <Link
                      key={s.id}
                      to={`/stock/${s.id}`}
                      className="flex items-center px-5 py-3.5 hover:bg-accent/40 transition-colors border-b border-border/30 last:border-0"
                    >
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{s.name}</span>
                        <span className="ticker-tag">{s.id}</span>
                      </div>
                      <span className="w-24 text-right font-data text-sm font-medium text-foreground">
                        {s.price?.toLocaleString()}
                      </span>
                      <span className={`w-20 text-right font-data text-sm font-semibold ${
                        s.changePercent >= 0 ? "text-positive" : "text-negative"
                      }`}>
                        {s.changePercent >= 0 ? "+" : ""}{s.changePercent?.toFixed(2)}%
                      </span>
                      <span className="w-20 text-right text-xs text-muted-foreground">
                        {s.sector}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  선택된 뉴스와 관련된 종목이 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
