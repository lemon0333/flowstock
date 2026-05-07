/**
 * 챗봇 스토어 — 패널 열림 상태 + 대화 이력 + sessionId
 * sessionStorage persist (개인정보 X, 새 탭 새 대화)
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { topic: string; slug: string }[];
  createdAt: number;
}

interface ChatbotState {
  isOpen: boolean;
  sessionId: string;
  messages: ChatMessage[];
}

interface ChatbotActions {
  open: () => void;
  close: () => void;
  toggle: () => void;
  reset: () => void;
  addMessage: (m: Omit<ChatMessage, "id" | "createdAt"> & { id?: string }) => string;
  appendDelta: (id: string, delta: string) => void;
  addSources: (id: string, sources: { topic: string; slug: string }[]) => void;
}

const newSessionId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const newMessageId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const useChatbotStore = create<ChatbotState & ChatbotActions>()(
  persist(
    (set) => ({
      isOpen: false,
      sessionId: newSessionId(),
      messages: [],

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      reset: () =>
        set({
          messages: [],
          sessionId: newSessionId(),
        }),

      addMessage: (m) => {
        const id = m.id ?? newMessageId();
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id,
              role: m.role,
              content: m.content,
              sources: m.sources,
              createdAt: Date.now(),
            },
          ],
        }));
        return id;
      },

      appendDelta: (id, delta) =>
        set((s) => ({
          messages: s.messages.map((msg) =>
            msg.id === id ? { ...msg, content: msg.content + delta } : msg
          ),
        })),

      addSources: (id, sources) =>
        set((s) => ({
          messages: s.messages.map((msg) =>
            msg.id === id
              ? { ...msg, sources: [...(msg.sources ?? []), ...sources] }
              : msg
          ),
        })),
    }),
    {
      name: "flowstock-chatbot",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        messages: state.messages,
      }),
    }
  )
);
