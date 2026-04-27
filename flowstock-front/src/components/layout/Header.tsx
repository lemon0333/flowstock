/**
 * ============================================================
 * 헤더 네비게이션 컴포넌트
 * - 토스 스타일 깔끔한 상단 네비게이션 바
 * - 흰색 배경 + 하단 보더
 * - 로그인/로그아웃 상태 반영
 * ============================================================
 */

import { Link, useLocation } from "react-router-dom";
import { TrendingUp, Newspaper, Briefcase, LogIn, LogOut, BarChart3, LineChart } from "lucide-react";
import { useStore } from "@/stores/useStore";

/** 네비게이션 링크 정의 */
const navItems = [
  { path: "/", label: "홈", icon: BarChart3 },
  { path: "/economy", label: "경제지표", icon: LineChart },
  { path: "/news", label: "뉴스", icon: Newspaper },
  { path: "/portfolio", label: "모의투자", icon: Briefcase },
];

export default function Header() {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useStore();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
      {/* ── 상단: 로고 + 네비게이션 ── */}
      <div className="flex items-center justify-between px-6 h-14 max-w-[1400px] mx-auto">
        {/* 로고 */}
        <Link to="/" className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="font-bold text-base tracking-tight text-foreground">
            STOCK<span className="text-primary">FLOW</span>
          </span>
        </Link>

        {/* 중앙 네비게이션 */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`
                  flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors
                  ${isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* 우측: 로그인/로그아웃 */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user?.name}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
