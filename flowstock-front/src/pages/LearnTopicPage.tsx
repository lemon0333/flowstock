/**
 * ============================================================
 * 주식 공부 토픽 상세 (/learn/:slug)
 *
 * - intro 비유
 * - 본문 sections (이모지 + heading + body)
 * - FlowStock 실제 데이터 활용 예시 + 페이지 링크
 * - 퀴즈 (4지선다, 정답 클릭 시 즉시 채점 + 해설)
 * - 다음 토픽 / 인덱스 네비게이션
 * ============================================================
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, XCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import {
  AUDIENCE_EMOJI,
  AUDIENCE_LABEL,
  LEARN_TOPICS,
  getTopic,
} from "@/lib/learn-content";

export default function LearnTopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const topic = slug ? getTopic(slug) : undefined;

  if (!topic) {
    return (
      <Layout>
        <div className="text-center py-20 space-y-3">
          <p className="text-muted-foreground">아직 준비되지 않은 토픽이에요.</p>
          <Link
            to="/learn"
            className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> 인덱스로
          </Link>
        </div>
      </Layout>
    );
  }

  const idx = LEARN_TOPICS.findIndex((t) => t.slug === topic.slug);
  const next = LEARN_TOPICS.slice(idx + 1).find((t) => t.status === "ready");

  return (
    <Layout>
      <SEO
        title={`${topic.title} — 주린이도 이해하는 ${AUDIENCE_LABEL[topic.audience]} 트랙`}
        description={`${topic.oneLiner} · ${topic.intro.slice(0, 100)}…`}
        path={`/learn/${topic.slug}`}
      />
      <div className="max-w-2xl mx-auto space-y-7">
        <Link
          to="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 모든 토픽
        </Link>

        {/* Title */}
        <header className="space-y-3">
          <span className="text-5xl">{topic.emoji}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {AUDIENCE_EMOJI[topic.audience]} {AUDIENCE_LABEL[topic.audience]}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{topic.title}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{topic.oneLiner}</p>
        </header>

        {/* Intro 비유 */}
        <section className="bg-primary/5 border border-primary/20 rounded-2xl p-5 md:p-6">
          <p className="text-sm md:text-base leading-relaxed">{topic.intro}</p>
        </section>

        {/* Sections */}
        {topic.sections.map((s, i) => (
          <section key={i} className="space-y-2">
            {s.heading && (
              <h2 className="text-lg font-bold flex items-center gap-2">
                {s.emoji && <span className="text-2xl">{s.emoji}</span>}
                {s.heading}
              </h2>
            )}
            {!s.heading && s.emoji && <span className="text-2xl">{s.emoji}</span>}
            <p className="text-sm leading-relaxed text-foreground/90">{s.body}</p>
          </section>
        ))}

        {/* Example */}
        {topic.example && (
          <section className="bg-card border border-border rounded-2xl p-5 md:p-6">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              {topic.example.title}
            </h3>
            <p className="text-sm text-foreground/90 leading-relaxed">{topic.example.body}</p>
            {topic.example.link && (
              <Link
                to={topic.example.link.to}
                className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline"
              >
                {topic.example.link.label} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </section>
        )}

        {/* Quiz */}
        {topic.quiz && topic.quiz.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-bold text-base">🧠 이해 확인</h3>
            {topic.quiz.map((q, qi) => (
              // key에 slug 포함 — 토픽 이동 시(컴포넌트 unmount 안 됨) 강제 remount하여
              // useState(picked) 초기화. 안 그러면 다음 토픽 가도 이전 풀린 답이 박혀 있음.
              <QuizCard key={`${topic.slug}-${qi}`} quiz={q} />
            ))}
          </section>
        )}

        {/* Status badge for soon topics */}
        {topic.status === "soon" && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-sm">
            <strong>아직 준비 중인 토픽이에요.</strong> 본문이 곧 채워질 거예요. 그동안
            모의투자에서 직접 사 보면서 감을 잡아 보세요.
          </div>
        )}

        {/* Next */}
        <nav className="pt-4 flex items-center justify-between gap-3 border-t border-border">
          <Link
            to="/learn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border border-border hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> 모든 토픽
          </Link>
          {next ? (
            <Link
              to={`/learn/${next.slug}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              다음: {next.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              모의투자로 직접 해보기 <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </nav>
      </div>
    </Layout>
  );
}

function QuizCard({ quiz }: { quiz: NonNullable<ReturnType<typeof getTopic>>["quiz"] extends (infer T)[] | undefined ? T : never }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correctIdx = quiz.options.findIndex((o) => o.correct);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-sm font-semibold mb-3">{quiz.question}</p>
      <div className="space-y-2">
        {quiz.options.map((o, i) => {
          const isPicked = picked === i;
          const isCorrect = i === correctIdx;
          const showResult = picked !== null;
          // 한국 주식 컨벤션(positive=빨강/negative=파랑)과 별개로 퀴즈는
          // 일반 UI 컨벤션 — 정답=초록(emerald), 오답=빨강(rose).
          let cls =
            "w-full text-left px-4 py-2.5 rounded-xl text-sm border transition-colors ";
          if (!showResult) {
            cls += "border-border hover:bg-accent";
          } else if (isCorrect) {
            cls += "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
          } else if (isPicked) {
            cls += "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300";
          } else {
            cls += "border-border opacity-60";
          }
          return (
            <button
              key={i}
              disabled={showResult}
              onClick={() => setPicked(i)}
              className={cls}
            >
              <span className="inline-flex items-center gap-2">
                {showResult && isCorrect && <CheckCircle2 className="h-4 w-4" />}
                {showResult && isPicked && !isCorrect && <XCircle className="h-4 w-4" />}
                {o.text}
              </span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mt-3 text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
          <strong className="text-foreground">해설.</strong> {quiz.explanation}
        </div>
      )}
    </div>
  );
}
