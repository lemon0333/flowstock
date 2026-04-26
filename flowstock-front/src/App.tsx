/**
 * ============================================================
 * 앱 루트 컴포넌트
 * - TanStack Query + React Router 설정
 * - 모든 페이지 라우팅 정의
 * - 토스트 알림 프로바이더
 * ============================================================
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import Index from "./pages/Index";
import StockDetail from "./pages/StockDetail";
import NewsPage from "./pages/NewsPage";
import PortfolioPage from "./pages/PortfolioPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ── 인증 ── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── 메인 / 시세 / 뉴스: 비로그인도 열람 가능 ── */}
          <Route path="/" element={<Index />} />
          <Route path="/stock/:id" element={<StockDetail />} />
          <Route path="/news" element={<NewsPage />} />

          {/* ── 포트폴리오 (개인 기능): 로그인 필요 ── */}
          <Route path="/portfolio" element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />

          {/* ── 404 ── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
