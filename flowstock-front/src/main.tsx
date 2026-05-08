import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { ThemeProvider } from "@/components/theme-provider";
import { initWebVitals } from "@/lib/web-vitals";
import { initUmami } from "@/lib/umami";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </HelmetProvider>,
);

// Core Web Vitals 측정 시작 (DevTools 콘솔에서 [web-vitals] 로그 확인)
initWebVitals();

// Umami Analytics — VITE_UMAMI_* env 둘 다 설정된 경우에만 활성
initUmami();
