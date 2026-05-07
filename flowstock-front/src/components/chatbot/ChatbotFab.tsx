/**
 * 챗봇 플로팅 버튼 + 패널 마운트.
 * /login 페이지에서는 안 보임.
 */

import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useChatbotStore } from "@/stores/useChatbotStore";
import ChatbotPanel from "./ChatbotPanel";

export default function ChatbotFab() {
  const location = useLocation();
  const { isOpen, toggle } = useChatbotStore();

  if (location.pathname === "/login") return null;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="챗봇 열기"
        title="스톡이에게 물어보기"
        className={`fixed bottom-5 right-5 md:bottom-6 md:right-6 z-50 inline-flex items-center justify-center rounded-full shadow-lg transition-all ${
          isOpen
            ? "h-12 w-12 bg-muted text-muted-foreground"
            : "h-14 w-14 bg-primary text-primary-foreground hover:scale-105"
        }`}
        style={{
          boxShadow: "0 8px 24px rgba(49, 130, 246, 0.35)",
        }}
      >
        <MessageCircle className={isOpen ? "h-5 w-5" : "h-6 w-6"} />
      </button>
      <ChatbotPanel />
    </>
  );
}
