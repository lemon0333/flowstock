/**
 * ============================================================
 * 홈 페이지 (/)
 * - 시장 지수 (KOSPI/KOSDAQ) 카드
 * - 급등/급락 종목 리스트
 * - 오늘의 주요 뉴스 + 공시 요약
 * ============================================================
 */

import Layout from "@/components/layout/Layout";
import MarketIndexCard from "@/components/home/MarketIndexCard";
import TopMovers from "@/components/home/TopMovers";
import NewsSummary from "@/components/home/NewsSummary";
import { marketIndices, topGainers, topLosers, news, disclosures } from "@/mocks/data";

export default function Index() {
  return (
    <Layout>
      {/* ── 시장 지수 카드 ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {marketIndices.map((idx) => (
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
          <NewsSummary news={news} disclosures={disclosures} />
        </div>
      </section>
    </Layout>
  );
}
