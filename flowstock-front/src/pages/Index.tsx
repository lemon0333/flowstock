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
  Database, Sparkles, BookOpen, Briefcase,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
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
    to: "/learn",
    title: "주식 공부 (주린이 시작)",
    desc: "PER이 뭔지, 코스피가 뭔지 — 진짜 처음부터 쉬운 말로",
    icon: BookOpen,
    accent: "text-primary",
  },
  {
    to: "/portfolio",
    title: "모의투자",
    desc: "가상 1,000만원으로 진짜 돈 안 잃고 연습 (로그인 시)",
    icon: Briefcase,
    accent: "text-emerald-500",
  },
  {
    to: "/screener",
    title: "종목 찾기",
    desc: "가격·등락률·거래량 조건으로 관심 종목 발굴",
    icon: Filter,
    accent: "text-blue-500",
  },
  {
    to: "/sectors",
    title: "섹터 히트맵",
    desc: "어떤 산업이 오르고 내리는지 한눈에 (반도체·자동차 등)",
    icon: Grid3x3,
    accent: "text-amber-500",
  },
  {
    to: "/economy",
    title: "경제 지표",
    desc: "공포·탐욕 지수, 외국인/기관 매매 동향 — 시장 분위기 체크",
    icon: LineChart,
    accent: "text-rose-500",
  },
  {
    to: "/macro",
    title: "거시 지표",
    desc: "금리·환율·물가 — 시장 큰 그림 한 페이지에",
    icon: Globe,
    accent: "text-cyan-500",
  },
  {
    to: "/compare",
    title: "종목 비교",
    desc: "종목 4개 같은 그래프에 — 누가 더 잘 갔나",
    icon: GitCompareArrows,
    accent: "text-purple-500",
  },
  {
    to: "/backtest",
    title: "백테스트 게임",
    desc: "과거 시점부터 매매 시뮬레이션 — 안전하게 전략 연습",
    icon: FlaskConical,
    accent: "text-orange-500",
  },
  {
    to: "/earnings",
    title: "실적 캘린더",
    desc: "분기별 실적 발표 일정 — 종목별 추적",
    icon: Calendar,
    accent: "text-yellow-600",
  },
  {
    to: "/articles",
    title: "커뮤니티",
    desc: "다른 사람 분석·복기 읽고 쓰기",
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
      <SEO
        title="당신의 전략은 실전에서 통할까요? 여기서 먼저 검증하세요"
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "FlowStock",
            alternateName: "플로우스톡",
            url: "https://flowstock.info",
            description:
              "주식 1도 모르는 주린이부터 단계적으로 성장하는 한국 주식 학습 사이트. 45개 학습 토픽, 1,000만원 가상 모의투자, AI 복기 분석, 백테스트 게임.",
            inLanguage: "ko-KR",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://flowstock.info/learn?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "FlowStock",
            url: "https://flowstock.info",
            logo: "https://flowstock.info/favicon.svg",
            description:
              "주린이를 위한 한국 주식 학습 사이트 — 학습·모의투자·AI 복기까지 한 곳에서.",
            sameAs: ["https://github.com/lemon0333/flowstock"],
          },
        ]}
      />
      {/* HERO — min-h 명시로 첫 렌더에 layout 흔들림(CLS) 방지 */}
      <section className="mb-10 md:mb-14 pt-2 md:pt-6 min-h-[340px] md:min-h-[380px]">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            주린이를 키우는 한국 주식 학습 사이트
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            당신의 전략은<br className="md:hidden" /> <span className="text-primary">실전에서 통할까요?</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 leading-relaxed">
            <strong className="text-foreground">여기서 먼저 검증하세요.</strong>
            <br />
            45개 학습 토픽 → 가상 1,000만원 모의투자 → AI 복기 분석까지 —
            진짜 돈 안 잃고 안전하게 연습하는 주린이 학습 사이트.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <Link
              to="/learn"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              주식 공부 먼저 보기
            </Link>
            <a
              href="#today-market"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium border border-border hover:bg-accent text-foreground transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              오늘 시장 둘러보기
              <ArrowRight className="h-4 w-4" />
            </a>
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
              주린이부터 차근차근 — 카드를 누르면 바로 시작
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
