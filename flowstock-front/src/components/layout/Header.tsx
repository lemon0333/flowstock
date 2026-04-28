/**
 * ============================================================
 * 헤더 네비게이션 컴포넌트
 * - 데스크탑(md+): 가로 nav
 * - 모바일(<md): 햄버거 + Sheet 사이드 패널 — 종전 우측 영역 잘림 픽스
 * ============================================================
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  TrendingUp, Newspaper, Briefcase, LogIn, LogOut, BarChart3,
  LineChart, Gamepad2, Bell, Sun, Moon, Menu,
} from "lucide-react";
import { useStore } from "@/stores/useStore";
import { useTheme } from "@/components/theme-provider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { path: "/", label: "홈", icon: BarChart3 },
  { path: "/economy", label: "경제지표", icon: LineChart },
  { path: "/news", label: "뉴스", icon: Newspaper },
  { path: "/portfolio", label: "모의투자", icon: Briefcase },
  { path: "/portfolio/game", label: "투자게임", icon: Gamepad2 },
  { path: "/alerts", label: "알림", icon: Bell },
];

export default function Header() {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useStore();
  const { resolved, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 라우트 변경 시 모바일 시트 자동 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const Logo = (
    <Link to="/" className="flex items-center gap-2">
      <TrendingUp className="h-5 w-5 text-primary" />
      <span className="font-bold text-base tracking-tight text-foreground">
        Flow<span className="text-primary">Stock</span>
      </span>
    </Link>
  );

  const ThemeBtn = (
    <button
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
      aria-label="테마 토글"
      className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 md:px-6 h-14 max-w-[1400px] mx-auto gap-2">
        {Logo}

        {/* ── 데스크탑(md+) 가로 nav ── */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`
                  flex items-center gap-1.5 px-3 lg:px-4 py-2 text-sm font-medium rounded-full transition-colors
                  ${isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── 데스크탑(md+) 우측 ── */}
        <div className="hidden md:flex items-center gap-3">
          {ThemeBtn}
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground hidden lg:inline">
                {user?.name}
              </span>
              <button
                onClick={logout}
                aria-label="로그아웃"
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
              <span>로그인</span>
            </Link>
          )}
        </div>

        {/* ── 모바일(<md) 우측: 테마 + 햄버거 ── */}
        <div className="flex md:hidden items-center gap-1">
          {ThemeBtn}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="메뉴 열기"
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
              <div className="flex flex-col h-full">
                <div className="px-5 py-4 border-b border-border">{Logo}</div>
                <nav className="flex-1 overflow-y-auto py-2">
                  {navItems.map(({ path, label, icon: Icon }) => {
                    const isActive = location.pathname === path;
                    return (
                      <Link
                        key={path}
                        to={path}
                        className={`
                          flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors
                          ${isActive
                            ? "bg-primary/10 text-primary border-l-2 border-l-primary"
                            : "text-foreground hover:bg-accent border-l-2 border-l-transparent"
                          }
                        `}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="px-5 py-4 border-t border-border">
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      {user?.name && (
                        <div className="text-xs text-muted-foreground">
                          {user.name}
                        </div>
                      )}
                      <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-accent transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        로그아웃
                      </button>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      <LogIn className="h-4 w-4" />
                      로그인
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
