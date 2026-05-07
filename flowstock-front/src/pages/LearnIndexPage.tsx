/**
 * ============================================================
 * 주식 공부 인덱스 (/learn) — 토스 "주식 골라보기" 패턴
 *
 * - 좌측 사이드바: 대상별 필터 (전체/초등/대학/전공자) — sticky
 * - 우측 메인: 선택된 트랙 토픽 그리드
 * - 카테고리 사이드바는 nav-config.hasSelfLayout('/learn')으로 숨김
 * ============================================================
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import Layout from "@/components/layout/Layout";
import {
  AUDIENCE_DESC,
  AUDIENCE_EMOJI,
  AUDIENCE_LABEL,
  LEARN_TOPICS,
  type Audience,
} from "@/lib/learn-content";

const LEVEL_LABEL: Record<1 | 2 | 3, string> = {
  1: "입문",
  2: "초급",
  3: "중급",
};
const LEVEL_COLOR: Record<1 | 2 | 3, string> = {
  1: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  2: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  3: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

type Tab = "all" | Audience;
const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "all", label: "전체", emoji: "📚" },
  { key: "kid", label: AUDIENCE_LABEL.kid, emoji: AUDIENCE_EMOJI.kid },
  { key: "student", label: AUDIENCE_LABEL.student, emoji: AUDIENCE_EMOJI.student },
  { key: "pro", label: AUDIENCE_LABEL.pro, emoji: AUDIENCE_EMOJI.pro },
];

export default function LearnIndexPage() {
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    if (tab === "all") return LEARN_TOPICS;
    return LEARN_TOPICS.filter((t) => t.audience === tab);
  }, [tab]);

  const counts = useMemo(() => {
    const c: Record<Audience, number> = { kid: 0, student: 0, pro: 0 };
    LEARN_TOPICS.forEach((t) => {
      c[t.audience] += 1;
    });
    return c;
  }, []);

  const headerLabel = tab === "all" ? "모든 토픽" : `${AUDIENCE_LABEL[tab as Audience]} 트랙`;
  const headerDesc =
    tab === "all"
      ? "비유로 시작해 수식으로 끝나는 단계적 커리큘럼. 실제 데이터로 보고 짧은 퀴즈로 확인."
      : AUDIENCE_DESC[tab as Audience];

  return (
    <Layout>
      <div className="md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
        {/* ── 좌측: 토스 #43 패턴 사이드바 ── */}
        {/* 모바일: 가로 chip */}
        <nav
          aria-label="대상별 필터"
          className="md:hidden -mx-4 px-4 mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none"
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            const count = t.key === "all" ? LEARN_TOPICS.length : counts[t.key as Audience];
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`
                  shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors
                  ${active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent"
                  }
                `}
              >
                <span>{t.emoji}</span>
                {t.label}
                <span className={`text-xs ${active ? "opacity-80" : "text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* 데스크탑: sticky 좌측 사이드바 */}
        <aside className="hidden md:block">
          <div className="sticky top-24">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 pb-3">
              대상별
            </div>
            <ul className="space-y-1">
              {TABS.map((t) => {
                const active = tab === t.key;
                const count =
                  t.key === "all" ? LEARN_TOPICS.length : counts[t.key as Audience];
                return (
                  <li key={t.key}>
                    <button
                      onClick={() => setTab(t.key)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-semibold transition-colors
                        ${active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }
                      `}
                    >
                      <span className="text-lg">{t.emoji}</span>
                      <span className="flex-1 text-left truncate">{t.label}</span>
                      <span
                        className={`text-xs font-medium ${
                          active ? "text-primary/80" : "text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* ── 우측: 메인 토픽 그리드 ── */}
        <div className="min-w-0 space-y-5">
          <header>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              {headerLabel}
              <span className="text-base text-muted-foreground font-semibold">
                {filtered.length}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{headerDesc}</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t) => {
              const isReady = t.status === "ready";
              return (
                <Link
                  key={t.slug}
                  to={`/learn/${t.slug}`}
                  className={`group bg-card border border-border rounded-2xl p-5 transition-all ${
                    isReady ? "hover:border-primary/40 hover:bg-accent/30" : "opacity-70"
                  }`}
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <span className="text-3xl">{t.emoji}</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${LEVEL_COLOR[t.level]}`}
                        title="난이도"
                      >
                        {LEVEL_LABEL[t.level]}
                      </span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                        title={AUDIENCE_DESC[t.audience]}
                      >
                        {AUDIENCE_EMOJI[t.audience]} {AUDIENCE_LABEL[t.audience]}
                      </span>
                      {!isReady && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          준비 중
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-sm md:text-base">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {t.oneLiner}
                  </p>
                  {isReady && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                      배우기
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* CTA */}
          <section className="bg-card/50 border border-border rounded-2xl p-6 text-center">
            <h3 className="font-bold text-base mb-1">배운 걸 직접 해보고 싶다면</h3>
            <p className="text-xs text-muted-foreground mb-4">
              모의투자는 가상 잔고 1,000만원으로 실전처럼 매수/매도 연습할 수 있어요. 실제 돈은
              오가지 않으니 마음껏 실수해도 괜찮아요.
            </p>
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              모의투자 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    </Layout>
  );
}
