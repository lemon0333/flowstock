/**
 * /quiz/risk — 투자성향 분석 퀴즈 (MVP)
 * 7문항 step-by-step → 결과 카드. 결과는 useStore.riskProfile에 persist.
 */

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, RefreshCw, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useStore } from "@/stores/useStore";
import {
  RISK_QUESTIONS,
  RISK_LEVEL_META,
  TOTAL_QUESTIONS,
  calculateProfile,
} from "@/lib/risk-profile";

export default function RiskQuizPage() {
  const navigate = useNavigate();
  const { riskProfile, setRiskProfile, resetRiskProfile } = useStore();
  // 이미 푼 결과가 있어도 "다시 풀기"를 명시적으로 누른 경우만 퀴즈 모드. 기본은 결과 표시.
  const [retake, setRetake] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  const showQuiz = retake || !riskProfile;
  const profile = useMemo(
    () => (done ? calculateProfile(answers) : riskProfile),
    [done, answers, riskProfile],
  );

  const q = RISK_QUESTIONS[step];
  const progress = (step + 1) / TOTAL_QUESTIONS;
  const isLast = step === TOTAL_QUESTIONS - 1;
  const answered = q ? answers[q.id] != null : false;

  const pick = (score: number) => {
    setAnswers((prev) => ({ ...prev, [q.id]: score }));
  };

  const goNext = () => {
    if (!answered) return;
    if (isLast) {
      const result = calculateProfile(answers);
      setRiskProfile(result);
      setDone(true);
      setRetake(false);
    } else {
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const startRetake = () => {
    setAnswers({});
    setStep(0);
    setDone(false);
    setRetake(true);
  };

  const resetAll = () => {
    if (!confirm("저장된 투자성향 결과를 지울까요?")) return;
    resetRiskProfile();
    setAnswers({});
    setStep(0);
    setDone(false);
    setRetake(false);
  };

  // ── 결과 화면 ──
  if (!showQuiz && profile) {
    const meta = RISK_LEVEL_META[profile.level];
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-5">
          <header className="flex items-center gap-2 flex-wrap">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">투자성향 분석 결과</h1>
          </header>

          <section
            className="rounded-2xl p-6 text-white"
            style={{ background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color}cc 100%)` }}
          >
            <div className="text-xs opacity-80 uppercase tracking-wide">당신의 투자 성향</div>
            <div className="text-3xl font-extrabold mt-1">{meta.label}</div>
            <p className="text-sm opacity-90 mt-1">{meta.tagline}</p>
            <p className="text-xs opacity-80 mt-3">
              점수 {profile.score} / {TOTAL_QUESTIONS * 3} ·{" "}
              {new Date(profile.completedAt).toLocaleDateString("ko-KR")} 결과
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold text-sm mb-2">이런 성향이에요</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{meta.description}</p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold text-sm mb-3">다음 단계</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Link
                to="/portfolio"
                className="rounded-xl border border-border p-4 hover:bg-accent transition-colors"
              >
                <div className="font-semibold mb-1">모의투자로 연습하기</div>
                <div className="text-xs text-muted-foreground">
                  가상 1,000만원으로 내 성향에 맞는 종목을 골라보세요
                </div>
              </Link>
              <Link
                to="/learn"
                className="rounded-xl border border-border p-4 hover:bg-accent transition-colors"
              >
                <div className="font-semibold mb-1">투자 공부하기</div>
                <div className="text-xs text-muted-foreground">
                  성향과 무관하게 기본 원리부터 차근차근
                </div>
              </Link>
            </div>
          </section>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border border-border hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" /> 홈으로
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-muted-foreground hover:text-destructive"
              >
                결과 지우기
              </button>
              <button
                type="button"
                onClick={startRetake}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4" /> 다시 풀기
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── 퀴즈 화면 ──
  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5">
        <header>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">투자성향 분석</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            7문항 1분. 결과는 브라우저에만 저장돼요.
          </p>
        </header>

        {/* 진행 바 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {step + 1} / {TOTAL_QUESTIONS}
            </span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* 질문 카드 */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-base">{q.question}</h2>
          <div className="space-y-2">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.score;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => pick(opt.score)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-center justify-between gap-3 ${
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <span>{opt.label}</span>
                  {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" /> 이전
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!answered}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLast ? "결과 보기" : "다음"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
