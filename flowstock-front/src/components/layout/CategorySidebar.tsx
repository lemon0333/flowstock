/**
 * 좌측 평면 카테고리 사이드바 (토스 패턴).
 * - 현재 경로가 NAV_GROUPS의 어떤 카테고리에 속하면 그 sub 항목들을 좌측에 평면 리스트로
 * - 미소속(/login, /stock/:id, /me 등)이면 null → Layout이 fullwidth로 폴백
 * - md 미만: 가로 스크롤 chip bar / md+: sticky 좌측 컬럼
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
                flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                ${active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent"
                }
              `}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
              {authRequired && !isAuthenticated && (
                <span className="text-[9px] opacity-70">·로그인</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 데스크탑: sticky 좌측 컬럼 */}
      <aside className="hidden md:block">
        <div className="sticky top-20">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pb-2">
            {group.label}
          </div>
          <ul className="space-y-0.5">
            {group.items.map(({ path, label, icon: Icon, authRequired }) => {
              const active = isItemActive(path, pathname);
              return (
                <li key={path}>
                  <Link
                    to={path}
                    className={`
                      flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {authRequired && !isAuthenticated && (
                      <span className="text-[10px] opacity-70">로그인</span>
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
