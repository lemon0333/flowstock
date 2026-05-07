/**
 * 챗봇 SSE 클라이언트 — fetch + ReadableStream으로 SSE 파싱.
 * (axios api.ts와 별도 — SSE는 fetch가 깔끔)
 */

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AskRequest {
  sessionId: string;
  messages: ChatTurn[];
  currentPath?: string;
}

export type SseEvent =
  | { type: "chunk"; data: { delta: string } }
  | { type: "source"; data: { topic: string; slug: string; audience?: string; score?: number } }
  | { type: "done"; data: { messageId: string } }
  | { type: "error"; data: { code: string; message: string } };

/**
 * SSE 스트림 호출. AsyncIterable<SseEvent>로 yield.
 * AbortController로 중간 취소 가능.
 */
export async function* askChatbot(
  req: AskRequest,
  signal?: AbortSignal,
): AsyncIterable<SseEvent> {
  const res = await fetch(`${API_BASE}/chatbot/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(req),
    signal,
  });

  if (!res.ok || !res.body) {
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      /* ignore */
    }
    yield {
      type: "error",
      data: {
        code: res.status === 429 ? "RATE_LIMIT" : "INTERNAL",
        message: bodyText || `HTTP ${res.status}`,
      },
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE: 이벤트 단위는 빈 줄(\n\n)로 구분
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const ev = parseSseBlock(block);
        if (ev) yield ev;
      }
    }
    // 잔여 buffer 처리
    if (buffer.trim()) {
      const ev = parseSseBlock(buffer);
      if (ev) yield ev;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSseBlock(block: string): SseEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return null;
  const dataStr = dataLines.join("\n");
  let data: unknown;
  try {
    data = JSON.parse(dataStr);
  } catch {
    return null;
  }
  if (event === "chunk" || event === "source" || event === "done" || event === "error") {
    return { type: event, data: data as never };
  }
  return null;
}
