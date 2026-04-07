import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * MSW 서비스 워커 초기화 후 앱 렌더링
 * - 개발 환경에서만 MSW가 활성화됨
 * - 나중에 실제 API 연동 시 이 부분 제거
 */
async function enableMocking() {
  // 프로덕션에서는 MSW 비활성화
  if (import.meta.env.PROD) return;

  const { worker } = await import("./mocks/browser");
  return worker.start({
    onUnhandledRequest: "bypass", // 처리되지 않은 요청은 그대로 통과
  });
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
