/**
 * 네비게이션 설정 — Header(상단 4개 카테고리) + CategorySidebar(좌측 sub) 공유.
 */

import {
  BarChart3, LineChart, Globe, Grid3x3,
  Filter, GitCompareArrows, FlaskConical, Calendar,
  Newspaper, Users, BookOpen, Lightbulb, Trophy,
  Briefcase, Gamepad2, Bell,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  authRequired?: boolean;
}

export interface NavGroup {
  label: string;
  /** 카테고리 클릭 시 진입할 기본 경로 (= items[0].path) */
  defaultPath: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "시장",
    defaultPath: "/",
    items: [
      { path: "/", label: "홈", icon: BarChart3 },
      { path: "/economy", label: "경제지표", icon: LineChart },
      { path: "/macro", label: "거시", icon: Globe },
      { path: "/sectors", label: "섹터", icon: Grid3x3 },
    ],
  },
  {
    label: "종목",
    defaultPath: "/screener",
    items: [
      { path: "/screener", label: "스크리너", icon: Filter },
      { path: "/compare", label: "비교", icon: GitCompareArrows },
      { path: "/backtest", label: "백테스트", icon: FlaskConical },
      { path: "/earnings", label: "실적 캘린더", icon: Calendar },
    ],
  },
  {
    label: "콘텐츠",
    defaultPath: "/news",
    items: [
      { path: "/news", label: "뉴스", icon: Newspaper },
      { path: "/articles", label: "커뮤니티", icon: Users },
      { path: "/leaderboard", label: "랭킹", icon: Trophy },
      { path: "/learn", label: "주식 공부", icon: BookOpen },
      { path: "/feedback", label: "개선 제안", icon: Lightbulb },
    ],
  },
  {
    label: "내 거",
    defaultPath: "/portfolio",
    items: [
      { path: "/portfolio", label: "모의투자", icon: Briefcase, authRequired: true },
      { path: "/portfolio/game", label: "투자 게임", icon: Gamepad2, authRequired: true },
      { path: "/alerts", label: "알림", icon: Bell, authRequired: true },
    ],
  },
];

/** 현재 path가 어떤 항목과 매칭되는지 — 가장 긴 prefix가 이김. */
export function isItemActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === "/") return currentPath === "/";
  return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}

/** 현재 path가 속한 카테고리 — 가장 잘 맞는 항목 기준. 없으면 null. */
export function findActiveGroup(currentPath: string): NavGroup | null {
  let best: { group: NavGroup; len: number } | null = null;
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      if (!isItemActive(it.path, currentPath)) continue;
      const len = it.path.length;
      if (!best || len > best.len) best = { group: g, len };
    }
  }
  return best?.group ?? null;
}

/**
 * 자체 좌측 레이아웃을 가진 페이지 — 카테고리 사이드바를 숨김.
 * 현재는 없음. 콘텐츠 카테고리는 어떤 항목을 눌러도 같은 사이드바 유지(일관성).
 */
const SELF_LAYOUT_PATHS = new Set<string>();
export function hasSelfLayout(currentPath: string): boolean {
  return SELF_LAYOUT_PATHS.has(currentPath);
}
