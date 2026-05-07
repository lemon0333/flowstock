/**
 * 추천 질문 칩 — 첫 진입 시 표시, 클릭 시 자동 전송.
 */

import { Sparkles } from "lucide-react";

const PROMPTS = [
  "PER이 뭐야?",
  "오늘 코스피 어때?",
  "모의투자 어떻게 시작해?",
  "공매도가 뭐야?",
  "이 페이지 뭐 하는 곳이야?",
];

interface Props {
  onPick: (prompt: string) => void;
  disabled?: boolean;
}

export default function QuickPrompts({ onPick, disabled }: Props) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <Sparkles className="h-3.5 w-3.5" />
        이런 거 물어봐
      </div>
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p)}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent text-foreground transition-colors disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
