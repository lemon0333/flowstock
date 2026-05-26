/**
 * InfoTooltip — 차트/지표 라벨 옆에 "?" 아이콘.
 * 클릭하면 popover에 풀이 + 선택적 /learn 링크.
 *
 * 사용 예:
 *   <InfoTooltip
 *     title="공포·탐욕 지수가 뭐예요?"
 *     learnSlug="fear-greed-index"
 *   >
 *     0(극공포) ~ 100(극탐욕)으로 시장 분위기를 한 숫자로 압축한 거예요.
 *     50 근처는 중립, 80+는 과열로 봐서 조심해야 할 신호.
 *   </InfoTooltip>
 *
 * 토스 스타일: hover 말고 click — 모바일에서도 동일하게 동작.
 */

import type { ReactNode } from "react";
import { HelpCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  /** popover 제목 — "OO이 뭐예요?" 형태 권장 */
  title: string;
  /** 본문 (한 단락 정도, 주린이 톤) */
  children: ReactNode;
  /** /learn 토픽 slug — 있으면 "더 알아보기 →" 링크 노출. 없으면 표시 X */
  learnSlug?: string;
  /** 아이콘 크기 등 — HelpCircle에 직접 적용 */
  iconClassName?: string;
  /** trigger button 스타일 override — 색깔 카드 위에서 white/80 등으로 가독성 확보 */
  className?: string;
  /** popover 위치 */
  side?: "top" | "right" | "bottom" | "left";
}

export default function InfoTooltip({
  title,
  children,
  learnSlug,
  iconClassName,
  className,
  side = "bottom",
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={title}
          className={cn(
            "inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            className,
          )}
        >
          <HelpCircle className={cn("h-3.5 w-3.5", iconClassName)} />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} className="w-72 text-sm" align="start">
        <h4 className="font-semibold mb-1.5">{title}</h4>
        <div className="text-muted-foreground leading-relaxed text-[13px]">
          {children}
        </div>
        {learnSlug && (
          <Link
            to={`/learn/${learnSlug}`}
            className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            더 알아보기 <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
