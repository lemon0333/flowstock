/**
 * ============================================================
 * 메인 레이아웃 — 헤더 + 콘텐츠 + 푸터 (sticky footer 패턴)
 * ============================================================
 */

import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 px-4 md:px-6 py-6 max-w-[1400px] w-full mx-auto">
        {children}
      </main>
      <Footer />
    </div>
  );
}
