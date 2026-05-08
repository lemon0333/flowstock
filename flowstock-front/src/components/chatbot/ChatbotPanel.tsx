/**
 * 챗봇 패널 — Sheet (shadcn). 데스크톱 우측 440px, 모바일 풀폭.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Send, RotateCcw, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useChatbotStore } from "@/stores/useChatbotStore";
import { useChatbotStream } from "@/hooks/useChatbotStream";
import MessageBubble from "./MessageBubble";
import QuickPrompts from "./QuickPrompts";

export default function ChatbotPanel() {
  const { isOpen, close, messages, reset } = useChatbotStore();
  const { send, cancel, isStreaming } = useChatbotStream();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 자동 스크롤 (메시지/스트림 변경 시)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // 패널 열릴 때 input focus
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    await send(text);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    if (isStreaming) cancel();
    reset();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(o) => (o ? null : close())}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col gap-0 h-[100dvh]"
      >
        <SheetHeader className="px-4 py-3 border-b border-border flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base font-semibold">
            스톡이
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              주린이 도움 챗봇
            </span>
          </SheetTitle>
          <button
            type="button"
            onClick={handleReset}
            title="대화 초기화"
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground mr-7"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-background">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground mt-6 mb-3">
              안녕! 주식 처음이라 어렵지? 뭐든 물어봐 🙂
            </div>
          ) : (
            messages.map((m, i) => {
              const lastIdx = messages.length - 1;
              const isLast = i === lastIdx;
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isStreaming={isLast && isStreaming && m.role === "assistant"}
                />
              );
            })
          )}
        </div>

        {messages.length === 0 && (
          <QuickPrompts onPick={(p) => send(p)} disabled={isStreaming} />
        )}

        <div className="px-3 py-3 border-t border-border bg-card">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="질문을 입력해 (Shift+Enter 줄바꿈)"
              rows={1}
              maxLength={500}
              disabled={isStreaming}
              // text-base(16px) 강제 — 14px 미만이면 iOS Safari가 input focus 시 자동 줌인 → 패널 깨짐
              className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 max-h-32"
              style={{ minHeight: 38, fontSize: "max(16px, 0.875rem)" }}
            />
            <button
              type="button"
              onClick={isStreaming ? cancel : handleSend}
              disabled={!isStreaming && !input.trim()}
              className="shrink-0 inline-flex items-center justify-center h-[38px] w-[38px] rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={isStreaming ? "중지" : "전송"}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1.5 px-1">
            정보 제공용이며 투자 판단은 본인 책임. 종목 추천 X.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
