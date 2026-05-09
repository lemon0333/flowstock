/**
 * 좌측 평면 카테고리 사이드바 (토스 패턴).
 * - 진입한 카테고리의 sub 항목을 좌측 평면 리스트로 — 큰 폰트, fill active.
 * - md 미만: 가로 스크롤 chip / md+: sticky 좌측 컬럼
 */

import { Link, useLocation } from "react-router-dom";
import { useStore } from "@/stores/useStore";
import { findActiveGroup, isItemActive } from "./nav-config";

export default function CategorySidebar() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useStore();
  const group = findActiveGroup(pathname);

  if (!group) return null;

  return (
    <>
      {/* 모바일: 가로 스크롤 chip */}
      <nav
        aria-label={`${group.label} 메뉴`}
        className="md:hidden -mx-4 px-4 mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      >
        {group.items.map(({ path, label, icon: Icon, authRequired }) => {
          const active = isItemActive(path, pathname);
          return (
            <Link
              key={path}
              to={path}
              className={`
                flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors
                ${active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent"
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {authRequired && !isAuthenticated && (
                <span className="text-[9px] opacity-70">·로그인</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 데스크탑: sticky 좌측 컬럼 — 토스 #43 패턴.
          min-h를 직접 박아 grid row가 페이지 컨텐츠 길이와 무관하게 일정.
          → 짧은 페이지/긴 페이지 모두 sticky 자연 위치가 같음 (viewport 좌표 일관). */}
      <aside className="hidden md:block md:min-h-[calc(100vh-12rem)]">
        <div className="sticky top-24">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 pb-3">
            {group.label}
          </div>
          <ul className="space-y-1">
            {group.items.map(({ path, label, icon: Icon, authRequired }) => {
              const active = isItemActive(path, pathname);
              return (
                <li key={path}>
                  <Link
                    to={path}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-semibold transition-colors
                      ${active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }
                    `}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {authRequired && !isAuthenticated && (
                      <span className="text-[10px] opacity-70 font-medium">로그인</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}
