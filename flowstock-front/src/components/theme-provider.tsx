/**
 * 라이트/다크/시스템 테마 토글
 * - localStorage key: flowstock-theme
 * - 기본값: system
 */

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const STORAGE_KEY = "flowstock-theme";

function getSystem(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t: "light" | "dark") {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.classList.toggle("dark", t === "dark");
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      if (typeof window === "undefined") return "system";
      return ((localStorage.getItem(STORAGE_KEY) as Theme) || "system");
    } catch {
      return "system";
    }
  });
  const [resolved, setResolved] = useState<"light" | "dark">(() => {
    try {
      return theme === "system" ? getSystem() : theme;
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const r = theme === "system" ? getSystem() : theme;
    setResolved(r);
    applyTheme(r);
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        const r2 = getSystem();
        setResolved(r2);
        applyTheme(r2);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  // Provider 밖에서 호출돼도 깨지지 않도록 fallback
  if (!ctx) {
    return {
      theme: "system" as Theme,
      resolved: "light" as const,
      setTheme: () => {},
    };
  }
  return ctx;
}
