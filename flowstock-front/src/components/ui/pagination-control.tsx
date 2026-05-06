/**
 * ============================================================
 * Pagination 재사용 컴포넌트
 *
 * - 모바일 친화: 작은 화면이면 숫자 버튼 ±1만 표시
 * - 페이지 7개 이하면 전부, 그 이상이면 [1 ... cur-1 cur cur+1 ... last] 압축
 * - totalItems 표시 옵션
 * ============================================================
 */

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number; // 0-based
  totalPages: number;
  totalItems?: number;
  onChange: (page: number) => void;
  className?: string;
}

export default function PaginationControl({
  page,
  totalPages,
  totalItems,
  onChange,
  className = "",
}: Props) {
  if (totalPages <= 1) {
    return totalItems !== undefined ? (
      <div className={`text-xs text-muted-foreground ${className}`}>
        총 {totalItems.toLocaleString()}개
      </div>
    ) : null;
  }

  // 압축 페이지 범위 계산: [1, ..., cur-1, cur, cur+1, ..., last]
  const cur = page + 1; // 1-based for display
  const last = totalPages;
  const range: Array<number | "..."> = [];
  if (last <= 7) {
    for (let i = 1; i <= last; i++) range.push(i);
  } else {
    range.push(1);
    if (cur > 3) range.push("...");
    for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++) {
      range.push(i);
    }
    if (cur < last - 2) range.push("...");
    range.push(last);
  }

  const goto = (n: number) => {
    if (n < 0 || n >= totalPages || n === page) return;
    onChange(n);
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 flex-wrap ${className}`}
    >
      <div className="text-xs text-muted-foreground">
        {totalItems !== undefined && <>총 {totalItems.toLocaleString()}개 · </>}
        {cur} / {last} 페이지
      </div>

      <nav className="inline-flex items-center gap-1" aria-label="페이지네이션">
        <button
          type="button"
          onClick={() => goto(page - 1)}
          disabled={page === 0}
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {range.map((n, i) =>
          n === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex items-center justify-center h-8 px-1 text-xs text-muted-foreground"
            >
              ⋯
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => goto(n - 1)}
              className={`inline-flex items-center justify-center h-8 min-w-[32px] px-2.5 rounded-full text-xs font-medium transition-colors ${
                n === cur
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              aria-current={n === cur ? "page" : undefined}
            >
              {n}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => goto(page + 1)}
          disabled={page >= totalPages - 1}
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors"
          aria-label="다음 페이지"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
