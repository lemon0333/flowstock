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
const ScreenerPage = lazy(() => import("./pages/ScreenerPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const SectorPage = lazy(() => import("./pages/SectorPage"));
const BacktestPage = lazy(() => import("./pages/BacktestPage"));
const MacroPage = lazy(() => import("./pages/MacroPage"));
const EarningsPage = lazy(() => import("./pages/EarningsPage"));
const ArticlesPage = lazy(() => import("./pages/ArticlesPage"));
const ArticleDetailPage = lazy(() => import("./pages/ArticleDetailPage"));
const ArticleEditPage = lazy(() => import("./pages/ArticleEditPage"));

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
            <Route path="/macro" element={<MacroPage />} />
            <Route path="/screener" element={<ScreenerPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/sectors" element={<SectorPage />} />
            <Route path="/backtest" element={<BacktestPage />} />
            <Route path="/earnings" element={<EarningsPage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/new" element={<ArticleEditPage />} />
            <Route path="/articles/:id" element={<ArticleDetailPage />} />
            <Route path="/articles/:id/edit" element={<ArticleEditPage />} />
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
