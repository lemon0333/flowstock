/**
 * ============================================================
 * 헤더 네비게이션 — 13개 → 5개 카테고리 드롭다운으로 정리
 *
 * 데스크탑(md+): 카테고리 hover 드롭다운
 * 모바일(<md): 햄버거 + Sheet 사이드 패널 (카테고리별 섹션)
 * ============================================================
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  TrendingUp, Newspaper, Briefcase, LogIn, LogOut, BarChart3,
  LineChart, Gamepad2, Bell, Sun, Moon, Menu,
  Filter, GitCompareArrows, Grid3x3, FlaskConical, Globe, Calendar, Users,
  ChevronDown, type LucideIcon,
} from "lucide-react";
import { useStore } from "@/stores/useStore";
import { useTheme } from "@/components/theme-provider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  authRequired?: boolean;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "시장",
    items: [
      { path: "/", label: "홈", icon: BarChart3 },
      { path: "/economy", label: "경제지표", icon: LineChart },
      { path: "/macro", label: "거시", icon: Globe },
      { path: "/sectors", label: "섹터", icon: Grid3x3 },
    ],
  },
  {
    label: "종목",
    items: [
      { path: "/screener", label: "스크리너", icon: Filter },
      { path: "/compare", label: "비교", icon: GitCompareArrows },
      { path: "/backtest", label: "백테스트", icon: FlaskConical },
      { path: "/earnings", label: "실적 캘린더", icon: Calendar },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { path: "/news", label: "뉴스", icon: Newspaper },
      { path: "/articles", label: "커뮤니티", icon: Users },
    ],
  },
  {
    label: "내 거",
    items: [
      { path: "/portfolio", label: "모의투자", icon: Briefcase, authRequired: true },
      { path: "/portfolio/game", label: "투자 게임", icon: Gamepad2, authRequired: true },
      { path: "/alerts", label: "알림", icon: Bell, authRequired: true },
    ],
  },
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

  const isPathActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const isGroupActive = (group: NavGroup) =>
    group.items.some((it) => isPathActive(it.path));

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

        {/* ── 데스크탑(md+) 카테고리 드롭다운 ── */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_GROUPS.map((group) => {
            const active = isGroupActive(group);
            return (
              <DropdownMenu key={group.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`
                      flex items-center gap-1 px-3 lg:px-4 py-2 text-sm font-medium rounded-full transition-colors
                      ${active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }
                    `}
                  >
                    {group.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {group.items.map(({ path, label, icon: Icon, authRequired }) => {
                    const itemActive = isPathActive(path);
                    return (
                      <DropdownMenuItem key={path} asChild>
                        <Link
                          to={path}
                          className={`
                            flex items-center gap-2 cursor-pointer
                            ${itemActive ? "bg-primary/10 text-primary" : ""}
                          `}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1">{label}</span>
                          {authRequired && !isAuthenticated && (
                            <span className="text-[10px] text-muted-foreground">로그인</span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
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
                        const active = isPathActive(path);
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
                        <div className="text-xs text-muted-foreground">{user.name}</div>
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
