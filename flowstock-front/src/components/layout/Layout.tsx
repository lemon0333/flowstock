/**
 * ============================================================
 * Layout (deprecated wrapper) — 실제 레이아웃은 App의 RootShell.
 * 기존 페이지가 <Layout>을 import 해서 쓰고 있어 fragment로만 통과.
 * 페이지 전환 시 헤더/사이드바 remount + Suspense 풀스크린 깜빡임 방지.
 * ============================================================
 */

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return <>{children}</>;
}
