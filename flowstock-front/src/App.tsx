/**
 * ============================================================
 * 앱 루트
 * - RootShell(Header/Footer/Sidebar) 은 Suspense 밖 → 페이지 전환 시 헤더 안 깜빡임
 * - Suspense fallback = null → chunk 다운로드 동안에도 헤더/사이드바 유지
 * ============================================================
 */

import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CategorySidebar from "@/components/layout/CategorySidebar";
import { findActiveGroup, hasSelfLayout } from "@/components/layout/nav-config";

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
const MePage = lazy(() => import("./pages/MePage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const LearnIndexPage = lazy(() => import("./pages/LearnIndexPage"));
const LearnTopicPage = lazy(() => import("./pages/LearnTopicPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const ChatbotFab = lazy(() => import("./components/chatbot/ChatbotFab"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 같은 페이지 재진입 시 즉시 표시 (백그라운드 refetch는 별개)
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function RootShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const selfLayout = hasSelfLayout(pathname);
  const showCategorySidebar = !selfLayout && findActiveGroup(pathname) !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 px-4 md:px-6 py-6 max-w-[1400px] w-full mx-auto overflow-x-hidden">
        {showCategorySidebar ? (
          <div className="md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
            <CategorySidebar />
            <div className="min-w-0">{children}</div>
          </div>
        ) : (
          children
        )}
      </main>
      <Footer />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RootShell>
          <Suspense fallback={null}>
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
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/learn" element={<LearnIndexPage />} />
              <Route path="/learn/:slug" element={<LearnTopicPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route
                path="/me"
                element={
                  <ProtectedRoute>
                    <MePage />
                  </ProtectedRoute>
                }
              />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/portfolio/game" element={<InvestGamePage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootShell>
        <Suspense fallback={null}>
          <ChatbotFab />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
