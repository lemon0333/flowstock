/**
 * 챗봇 스트리밍 훅 — store에서 sessionId/messages 가져와 SSE 호출 + delta 누적.
 */

import { useCallback, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { askChatbot } from "@/services/chatbotApi";
import { useChatbotStore } from "@/stores/useChatbotStore";

const MAX_HISTORY_TURNS = 6;

export function useChatbotStream() {
  const { sessionId, messages, addMessage, appendDelta, addSources } = useChatbotStore();
  const location = useLocation();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (userInput: string) => {
      const text = userInput.trim();
      if (!text || isStreaming) return;
      setError(null);

      // 1. user 메시지 추가
      addMessage({ role: "user", content: text });

      // 2. assistant placeholder 생성 (스트림 delta 누적용)
      const assistantId = addMessage({ role: "assistant", content: "" });

      // 3. 직전 N턴 + 새 user 메시지로 서버 요청
      const history = [
        ...messages.slice(-(MAX_HISTORY_TURNS - 1)),
        { id: "tmp", role: "user" as const, content: text, createdAt: Date.now() },
      ].map((m) => ({ role: m.role, content: m.content }));

      const ac = new AbortController();
      abortRef.current = ac;
      setIsStreaming(true);

      try {
        for await (const ev of askChatbot(
          { sessionId, messages: history, currentPath: location.pathname },
          ac.signal,
        )) {
          if (ev.type === "chunk") {
            appendDelta(assistantId, ev.data.delta);
          } else if (ev.type === "source") {
            addSources(assistantId, [{ topic: ev.data.topic, slug: ev.data.slug }]);
          } else if (ev.type === "error") {
            const code = ev.data.code;
            const raw = ev.data.message || "";
            let msg: string;
            if (code === "RATE_LIMIT") {
              msg = "잠시 후 다시 시도해주세요 (요청이 너무 많아요)";
            } else if (raw.includes("CLINotFound") || raw.includes("NotFound")) {
              msg = "스톡이는 지금 잠시 점검 중이에요 🔧 곧 돌아올게요. 그동안은 학습(/learn) 페이지나 모의투자를 둘러봐주세요!";
            } else {
              msg = `잠깐, 답변하다 문제가 생겼어. 다시 물어봐줄래? (사유: ${raw || code})`;
            }
            appendDelta(assistantId, `\n\n⚠️ ${msg}`);
            setError(msg);
            break;
          } else if (ev.type === "done") {
            break;
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          const msg = (e as Error).message || "네트워크 오류";
          appendDelta(assistantId, `\n\n⚠️ ${msg}`);
          setError(msg);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [sessionId, messages, addMessage, appendDelta, addSources, location.pathname, isStreaming],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, cancel, isStreaming, error };
}
