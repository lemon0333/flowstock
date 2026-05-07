/**
 * ============================================================
 * 메인 레이아웃 — 헤더 + (좌측 카테고리 사이드바) + 콘텐츠 + 푸터.
 * 카테고리 소속 페이지면 grid 2-col, 아니면 fullwidth.
 * ============================================================
 */

import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import CategorySidebar from "./CategorySidebar";
import { findActiveGroup } from "./nav-config";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const hasSidebar = findActiveGroup(pathname) !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 px-4 md:px-6 py-6 max-w-[1400px] w-full mx-auto">
        {hasSidebar ? (
          <div className="md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-8">
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
