/**
 * ============================================================
 * 헤더 — 토스 패턴: 4개 카테고리 단순 링크 (드롭다운 X).
 * sub 항목은 CategorySidebar(좌측 평면)에서 처리.
 *
 * 데스크탑(md+): 4 카테고리 탭 (defaultPath로 진입)
 * 모바일(<md): 햄버거 + Sheet (그룹/항목 트리 — 발견성 유지)
 * ============================================================
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { TrendingUp, LogIn, LogOut, Sun, Moon, Menu } from "lucide-react";
import { useStore } from "@/stores/useStore";
import { useTheme } from "@/components/theme-provider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NAV_GROUPS, isItemActive, findActiveGroup } from "./nav-config";

export default function Header() {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useStore();
  const { resolved, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const activeGroup = findActiveGroup(location.pathname);

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

        {/* ── 데스크탑: 4 카테고리 단순 링크 ── */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_GROUPS.map((group) => {
            const active = activeGroup?.label === group.label;
            return (
              <Link
                key={group.label}
                to={group.defaultPath}
                className={`
                  px-4 py-2 text-sm font-medium rounded-full transition-colors
                  ${active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }
                `}
              >
                {group.label}
              </Link>
            );
          })}
        </nav>

        {/* ── 데스크탑 우측 ── */}
        <div className="hidden md:flex items-center gap-3">
          {ThemeBtn}
          {isAuthenticated ? (
            <>
              <Link
                to="/me"
                className="text-sm text-muted-foreground hover:text-foreground hidden lg:inline transition-colors"
                title="마이페이지"
              >
                {user?.name}
              </Link>
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

        {/* ── 모바일 우측 ── */}
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
            <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0">
              <div className="flex flex-col h-full">
                <div className="px-5 py-4 border-b border-border">{Logo}</div>
                <nav className="flex-1 overflow-y-auto py-2">
                  {NAV_GROUPS.map((group) => (
                    <div key={group.label} className="mb-3">
                      <div className="px-5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </div>
                      {group.items.map(({ path, label, icon: Icon, authRequired }) => {
                        const active = isItemActive(path, location.pathname);
                        return (
                          <Link
                            key={path}
                            to={path}
                            className={`
                              flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors
                              ${active
                                ? "bg-primary/10 text-primary border-l-2 border-l-primary"
                                : "text-foreground hover:bg-accent border-l-2 border-l-transparent"
                              }
                            `}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="flex-1">{label}</span>
                            {authRequired && !isAuthenticated && (
                              <span className="text-[10px] text-muted-foreground">로그인</span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </nav>
                <div className="px-5 py-4 border-t border-border">
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      {user?.name && (
                        <Link
                          to="/me"
                          className="block text-xs text-primary hover:underline"
                        >
                          {user.name} · 마이페이지
                        </Link>
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
