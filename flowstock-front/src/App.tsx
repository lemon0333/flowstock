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

import Index from "./pages/Index";
import StockDetail from "./pages/StockDetail";
import NewsPage from "./pages/NewsPage";
import PortfolioPage from "./pages/PortfolioPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ── 메인 페이지 ── */}
          <Route path="/" element={<Index />} />

          {/* ── 종목 상세 ── */}
          <Route path="/stock/:id" element={<StockDetail />} />

          {/* ── 뉴스 시각화 ── */}
          <Route path="/news" element={<NewsPage />} />

          {/* ── 포트폴리오 ── */}
          <Route path="/portfolio" element={<PortfolioPage />} />

          {/* ── 인증 ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* ── 404 ── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
