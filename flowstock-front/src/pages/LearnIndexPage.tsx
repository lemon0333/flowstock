/**
 * ============================================================
 * 주식 공부 인덱스 (/learn)
 *
 * - 6개 토픽 카드 (입문 / 초급 / 중급 표시)
 * - 비유 중심, 초등생도 읽을 수 있는 톤
 * - 각 카드 → /learn/:slug 상세 페이지
 * ============================================================
 */

import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { LEARN_TOPICS } from "@/lib/learn-content";

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

export default function LearnIndexPage() {
  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero */}
        <section className="text-center max-w-2xl mx-auto pt-2 md:pt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            주식, 처음부터 차근차근
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
            <span className="text-primary">초등생</span>도 이해할 수 있는 주식 이야기
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-3 leading-relaxed">
            어려운 용어 대신 비유로 설명해요. 우리 사이트의 <strong className="text-foreground">실제 데이터</strong>로
            예시를 보고, 짧은 퀴즈로 확인해요.
          </p>
        </section>

        {/* Topics */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              주제별로 보기 ({LEARN_TOPICS.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              완성 {LEARN_TOPICS.filter((t) => t.status === "ready").length} · 준비 중{" "}
              {LEARN_TOPICS.filter((t) => t.status === "soon").length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {LEARN_TOPICS.map((t) => {
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
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{t.emoji}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${LEVEL_COLOR[t.level]}`}
                      >
                        {LEVEL_LABEL[t.level]}
                      </span>
                      {!isReady && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          준비 중
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-sm md:text-base">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t.oneLiner}</p>
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
        </section>

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
    </Layout>
  );
}
