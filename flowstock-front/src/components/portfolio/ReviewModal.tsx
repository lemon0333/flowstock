/**
 * 거래 복기 모달 — Trade 한 건에 대해 AI 분석(good/concern/lesson) 받음.
 * - 메모 비어있으면 모달에서 직접 입력해서 분석
 * - 분석 결과는 Trade.aiReview에 영속(zustand) — 다시 열면 cached 결과
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { reviewApi, type ReviewAnalyzeResult } from "@/services/api";
import { useStore } from "@/stores/useStore";
import type { Trade } from "@/stores/useStore";

interface Props {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 매도 거래일 때 이 종목의 평균 매수가 (있으면 수익률 계산해서 같이 보냄) */
  avgBuyPrice?: number;
}

export default function ReviewModal({ trade, open, onOpenChange, avgBuyPrice }: Props) {
  const setTradeReview = useStore((s) => s.setTradeReview);
  const updateTradeMemo = useStore((s) => s.updateTradeMemo);
  const [memoEdit, setMemoEdit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!trade) return null;

  const memo = trade.memo ?? "";
  const review = trade.aiReview;
  const isSell = trade.type === "sell";
  const returnPct =
    isSell && avgBuyPrice
      ? ((trade.price - avgBuyPrice) / avgBuyPrice) * 100
      : undefined;

  const handleAnalyze = async () => {
    setError("");
    setLoading(true);
    try {
      const memoToUse = (memoEdit || memo).trim() || undefined;
      // 메모가 새로 입력됐으면 trade에 반영
      if (memoEdit && memoEdit.trim() !== memo) {
        updateTradeMemo(trade.id, memoEdit.trim());
      }
      const res = await reviewApi.analyze({
        stockName: trade.stockName,
        action: trade.type,
        price: trade.price,
        quantity: trade.quantity,
        total: trade.total,
        at: trade.at,
        memo: memoToUse,
        avgBuyPrice,
        returnPct,
      });
      const data = res?.data?.data ?? res?.data;
      if (data && (data as ReviewAnalyzeResult).good) {
        const r = data as ReviewAnalyzeResult;
        setTradeReview(trade.id, {
          good: r.good,
          concern: r.concern,
          lesson: r.lesson,
          at: new Date().toISOString(),
        });
      } else {
        setError("분석 결과를 받지 못했어요. 다시 시도해주세요.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 분석에 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {trade.stockName} {isSell ? "매도" : "매수"} 복기
          </DialogTitle>
        </DialogHeader>

        {/* 거래 요약 */}
        <div className="bg-accent/40 rounded-xl p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">거래</span>
            <span className="font-data">
              {trade.price.toLocaleString()}원 × {trade.quantity}주 = {trade.total.toLocaleString()}원
            </span>
          </div>
          {returnPct !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">수익률</span>
              <span className={returnPct >= 0 ? "text-positive font-semibold" : "text-negative font-semibold"}>
                {returnPct >= 0 ? "+" : ""}
                {returnPct.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">시각</span>
            <span>{new Date(trade.at).toLocaleString("ko-KR")}</span>
          </div>
        </div>

        {/* 메모 (없으면 입력 가능, 있으면 readonly 표시) */}
        {!review && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {isSell ? "왜 팔았는지" : "왜 샀는지"} (선택)
            </label>
            <textarea
              value={memoEdit || memo}
              onChange={(e) => setMemoEdit(e.target.value)}
              placeholder={
                isSell
                  ? "예: 목표가 도달, 매크로 악화로 손절"
                  : "예: 실적 호조 + 차트 정배열, 5% 빠진 김에"
              }
              maxLength={300}
              rows={2}
              className="w-full bg-accent border border-border rounded-xl px-3 py-2 text-sm resize-none"
            />
          </div>
        )}

        {/* AI 분석 결과 또는 분석 버튼 */}
        {review ? (
          <div className="space-y-2">
            <ReviewCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="잘한 점"
              text={review.good}
              tone="good"
            />
            <ReviewCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="아쉬운 점"
              text={review.concern}
              tone="concern"
            />
            <ReviewCard
              icon={<Lightbulb className="h-4 w-4" />}
              label="다음 교훈"
              text={review.lesson}
              tone="lesson"
            />
            <p className="text-[10px] text-muted-foreground text-center">
              {new Date(review.at).toLocaleString("ko-KR")} · 정보 제공용 · 투자 결정은 본인 책임
            </p>
          </div>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={handleAnalyze}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "AI가 복기 중…" : "AI 복기 분석"}
          </button>
        )}

        {error && <p className="text-xs text-negative">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

function ReviewCard({
  icon,
  label,
  text,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  tone: "good" | "concern" | "lesson";
}) {
  const cls =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
      : tone === "concern"
        ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
        : "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300";
  return (
    <div className={`border rounded-xl p-3 ${cls}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
        {icon}
        {label}
      </div>
      <p className="text-[13px] leading-relaxed text-foreground/90">{text}</p>
    </div>
  );
}
