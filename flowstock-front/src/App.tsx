/**
 * ============================================================
 * 앱 루트 — 페이지 lazy load로 초기 번들 분할
 * ============================================================
 */

import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const Index = lazy(() => import("./pages/Index"));
const StockDetail = lazy(() => import("./pages/StockDetail"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const EconomyPage = lazy(() => import("./pages/EconomyPage"));
const InvestGamePage = lazy(() => import("./pages/InvestGamePage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
    불러오는 중…
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Index />} />
            <Route path="/stock/:id" element={<StockDetail />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/economy" element={<EconomyPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/portfolio/game" element={<InvestGamePage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
