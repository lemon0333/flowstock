/**
 * ============================================================
 * 홈 페이지 (/)
 *
 * 구조:
 *   1. Hero — 서비스 한 줄 정의 + 2개 CTA
 *   2. Service Showcase Grid — 8개 핵심 기능 카드 (첫 방문자 인덱스)
 *   3. 오늘의 시장 — 시장 지수 + 급등락 + 뉴스 (기존 콘텐츠)
 *   4. 데이터 출처 / 면책
 * ============================================================
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Filter, GitCompareArrows, Grid3x3, FlaskConical,
  LineChart, Globe, Calendar, Users, TrendingUp, ShieldCheck,
  Database, Sparkles,
} from "lucide-react";
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

interface FeatureCard {
  to: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string; // tailwind text color for icon
}

const FEATURES: FeatureCard[] = [
  {
    to: "/screener",
    title: "종목 스크리너",
    desc: "가격·등락률·거래량 필터로 KOSPI 종목 발굴",
    icon: Filter,
    accent: "text-blue-500",
  },
  {
    to: "/compare",
    title: "종목 비교",
    desc: "최대 4개 종목 시작점 100 정규화 그래프 + 수익률·변동성·Sharpe",
    icon: GitCompareArrows,
    accent: "text-purple-500",
  },
  {
    to: "/backtest",
    title: "백테스터",
    desc: "MA 교차 / RSI / 볼린저 평균회귀 전략 — 수수료·슬리피지 옵션",
    icon: FlaskConical,
    accent: "text-amber-500",
  },
  {
    to: "/sectors",
    title: "섹터 히트맵",
    desc: "KOSPI 18개 섹터 평균 등락률 한눈에",
    icon: Grid3x3,
    accent: "text-emerald-500",
  },
  {
    to: "/economy",
    title: "경제 지표",
    desc: "Fear & Greed Index, 매매주체 동향, 시장 폭, 종목 상관관계",
    icon: LineChart,
    accent: "text-rose-500",
  },
  {
    to: "/macro",
    title: "거시 대시보드",
    desc: "기준금리 / CPI / M2 / 원·달러 환율 / 경기선행지수 시계열",
    icon: Globe,
    accent: "text-cyan-500",
  },
  {
    to: "/earnings",
    title: "실적 캘린더",
    desc: "분기별 잠정/확정 실적 발표 일정 — 종목별 일정 추적",
    icon: Calendar,
    accent: "text-orange-500",
  },
  {
    to: "/articles",
    title: "커뮤니티",
    desc: "분석·복기·뉴스 공유 — 카테고리 필터 + 좋아요·댓글",
    icon: Users,
    accent: "text-indigo-500",
  },
];

// 상태는 schema 추론 그대로. 자식 컴포넌트(MarketIndexCard/TopMovers/NewsSummary)가
// 자체 prop 타입으로 검증하므로 any[] 로 흘려보내도 안전.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export default function Index() {
  const [marketIndices, setMarketIndices] = useState<Loose[]>([]);
  const [stocks, setStocks] = useState<Loose[]>([]);
  const [news, setNews] = useState<Loose[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [marketRes, stockRes, newsRes] = await Promise.all([
          marketApi.getIndices(),
          stockApi.getAll(),
          newsApi.getLatest(),
        ]);
        if (!alive) return;
        setMarketIndices(safeArray(marketIndexSchema, marketRes.data));
        setStocks(safeArray(stockSchema, stockRes.data));
        const rawNews = Array.isArray(newsRes.data)
          ? newsRes.data
          : (newsRes.data as { content?: unknown[] } | undefined)?.content ?? [];
        setNews(safeArray(newsItemSchema, rawNews));
      } catch {
        /* 에러 시에도 hero / showcase 는 노출 */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const topGainers = stocks
    .filter((s: Loose) => (s.changePercent ?? 0) > 0)
    .sort((a: Loose, b: Loose) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
  const topLosers = stocks
    .filter((s: Loose) => (s.changePercent ?? 0) < 0)
    .sort((a: Loose, b: Loose) => (a.changePercent ?? 0) - (b.changePercent ?? 0));

  return (
    <Layout>
      {/* ── 1. HERO ───────────────────────────────────────────── */}
      <section className="mb-10 md:mb-14 pt-2 md:pt-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            AI 뉴스 분석 + 모의투자 + 백테스터
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            한국 주식 시장을 <span className="text-primary">한 화면에</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 leading-relaxed">
            뉴스↔종목 네트워크 그래프, 기술적 분석 차트, 섹터 히트맵, 분기 실적 캘린더,
            전략 백테스터까지 — <strong className="text-foreground">로그인 없이</strong> 바로 둘러보세요.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <a
              href="#today-market"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              오늘 시장 보기
            </a>
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium border border-border hover:bg-accent text-foreground transition-colors"
            >
              모의투자 시작
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. SERVICE SHOWCASE ──────────────────────────────── */}
      <section className="mb-10 md:mb-14">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
              뭘 할 수 있나요
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              8가지 핵심 도구. 각 카드를 누르면 바로 사용 가능
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.to}
                to={f.to}
                className="group bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:bg-accent/30 transition-all"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <Icon className={`h-6 w-6 ${f.accent}`} />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-foreground">{f.title}</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {f.desc}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 3. 오늘의 시장 ───────────────────────────────────── */}
      <section id="today-market" className="mb-10 md:mb-14 scroll-mt-20">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
              오늘의 시장
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              실시간 지수 · 급등락 종목 · 주요 뉴스
            </p>
          </div>
          <Link
            to="/economy"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            상세 지표 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-2xl py-12 text-center text-sm text-muted-foreground">
            데이터 불러오는 중…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {marketIndices.length > 0 ? (
                marketIndices.map((idx) => <MarketIndexCard key={idx.id} index={idx} />)
              ) : (
                <div className="col-span-full bg-card border border-border rounded-2xl py-8 text-center text-sm text-muted-foreground">
                  지수 데이터를 불러오지 못했습니다. 서버 상태를 확인해주세요.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <TopMovers gainers={topGainers} losers={topLosers} />
              </div>
              <div className="lg:col-span-2">
                <NewsSummary news={news} disclosures={[]} />
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── 4. 데이터 출처 / 면책 ────────────────────────────── */}
      <section className="mb-6">
        <div className="bg-card/50 border border-border rounded-2xl p-5 md:p-6">
          <div className="flex items-start gap-3 mb-4">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-foreground">데이터 출처와 신뢰성</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                공개 출처에서 수집한 데이터를 가공해 제공합니다. 투자 권유가 아닌 정보 제공이며,
                지연·오차가 있을 수 있습니다.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <SourceItem icon={Database} title="시세·지수" detail="네이버 금융 모바일 API" />
            <SourceItem icon={Database} title="재무·공시" detail="DART OpenAPI" />
            <SourceItem icon={Database} title="뉴스" detail="한경/매경/연합/조선비즈 RSS" />
            <SourceItem icon={Database} title="검색" detail="Google News RSS" />
          </div>
        </div>
      </section>
    </Layout>
  );
}

function SourceItem({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <div className="text-foreground font-medium">{title}</div>
        <div className="text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}
