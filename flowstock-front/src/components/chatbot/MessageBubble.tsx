/**
 * 챗봇 메시지 버블 — 사용자(우측 primary) / 봇(좌측 card) + 출처 칩 + 스트리밍 cursor
 */

import { Link } from "react-router-dom";
import type { ChatMessage } from "@/stores/useChatbotStore";

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card border border-border text-foreground rounded-bl-md"
          }`}
        >
          {message.content || (isStreaming && !isUser ? "..." : "")}
          {isStreaming && !isUser && message.content && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-foreground/60 animate-pulse align-middle" />
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {message.sources.map((s, i) => (
              <Link
                key={`${s.slug}-${i}`}
                to={`/learn/${s.slug}`}
                className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                📖 {s.topic}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
