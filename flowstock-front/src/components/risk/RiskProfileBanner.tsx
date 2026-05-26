/**
 * 투자성향 배너 — 홈/포트폴리오에 공통 노출.
 * - 결과 있음: 성향 라벨 + 다시 풀기 링크
 * - 결과 없음: CTA 카드 (CTA만 표시. variant=compact는 작게)
 */

import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { useStore } from "@/stores/useStore";
import { RISK_LEVEL_META } from "@/lib/risk-profile";

interface Props {
  variant?: "full" | "compact"; // full=홈용 큰 카드, compact=포트폴리오 상단 한 줄
}

export default function RiskProfileBanner({ variant = "full" }: Props) {
  const { riskProfile } = useStore();

  if (riskProfile) {
    const meta = RISK_LEVEL_META[riskProfile.level];
    if (variant === "compact") {
      return (
        <Link
          to="/quiz/risk"
          className="flex items-center justify-between gap-3 bg-card border border-border rounded-2xl px-4 py-3 hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${meta.badgeClass}`}>
              {meta.label}
            </span>
            <span className="text-muted-foreground truncate">{meta.tagline}</span>
          </div>
          <span className="text-xs text-primary shrink-0">결과 보기 →</span>
        </Link>
      );
    }
    return (
      <Link
        to="/quiz/risk"
        className="block rounded-2xl p-5 text-white hover:opacity-95 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color}cc 100%)` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs opacity-80 uppercase tracking-wide">내 투자 성향</div>
            <div className="text-xl font-extrabold mt-0.5">{meta.label}</div>
            <p className="text-xs opacity-90 mt-1">{meta.tagline}</p>
          </div>
          <ArrowRight className="h-5 w-5 opacity-80 shrink-0" />
        </div>
      </Link>
    );
  }

  // 결과 없음 → CTA
  if (variant === "compact") {
    return (
      <Link
        to="/quiz/risk"
        className="flex items-center justify-between gap-3 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 hover:bg-primary/15 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground">
            내 투자 성향 1분 안에 알아보고 시작해요
          </span>
        </div>
        <span className="text-xs text-primary shrink-0">시작 →</span>
      </Link>
    );
  }

  return (
    <Link
      to="/quiz/risk"
      className="block bg-card border border-border rounded-2xl p-5 hover:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">투자성향 분석</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">NEW</span>
          </div>
          <p className="text-sm text-muted-foreground">
            7문항 1분이면 내 성향이 나와요. 모의투자 시작 전에 한 번.
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}
