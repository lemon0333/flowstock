/**
 * ============================================================
 * 홈 페이지 (/)
 * - 시장 지수 (KOSPI/KOSDAQ) 카드
 * - 급등/급락 종목 리스트
 * - 오늘의 주요 뉴스 + 공시 요약
 * ============================================================
 */

import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import MarketIndexCard from "@/components/home/MarketIndexCard";
import TopMovers from "@/components/home/TopMovers";
import NewsSummary from "@/components/home/NewsSummary";
import { marketApi, stockApi, newsApi } from "@/services/api";
import {
  marketIndexSchema,
  newsItemSchema,
  safeArray,
  stockSchema,
} from "@/services/schemas";

export default function Index() {
  const [marketIndices, setMarketIndices] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [marketRes, stockRes, newsRes] = await Promise.all([
          marketApi.getIndices(),
          stockApi.getAll(),
          newsApi.getLatest(),
        ]);
        setMarketIndices(safeArray(marketIndexSchema, marketRes.data));
        setStocks(safeArray(stockSchema, stockRes.data));
        const rawNews = Array.isArray(newsRes.data)
          ? newsRes.data
          : (newsRes.data as { content?: unknown[] } | undefined)?.content ?? [];
        setNews(safeArray(newsItemSchema, rawNews));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const topGainers = stocks
    .filter((s: any) => (s.changePercent ?? 0) > 0)
    .sort((a: any, b: any) => (b.changePercent ?? 0) - (a.changePercent ?? 0));

  const topLosers = stocks
    .filter((s: any) => (s.changePercent ?? 0) < 0)
    .sort((a: any, b: any) => (a.changePercent ?? 0) - (b.changePercent ?? 0));

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
      {/* ── 시장 지수 카드 ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {marketIndices.map((idx: any) => (
          <MarketIndexCard key={idx.id} index={idx} />
        ))}
      </section>

      {/* ── 메인 콘텐츠: 급등/급락 + 뉴스 ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 좌측: 급등/급락 종목 */}
        <div className="lg:col-span-1">
          <TopMovers gainers={topGainers} losers={topLosers} />
        </div>

        {/* 우측: 뉴스 + 공시 */}
        <div className="lg:col-span-2">
          <NewsSummary news={news} disclosures={[]} />
        </div>
      </section>
    </Layout>
  );
}
