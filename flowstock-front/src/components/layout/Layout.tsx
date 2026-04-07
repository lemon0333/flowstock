/**
 * ============================================================
 * 메인 레이아웃 컴포넌트
 * - 헤더 + 콘텐츠 영역
 * - 모든 페이지에서 공통으로 사용
 * ============================================================
 */

import Header from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-6 py-6 max-w-[1400px] mx-auto">
        {children}
      </main>
    </div>
  );
}
