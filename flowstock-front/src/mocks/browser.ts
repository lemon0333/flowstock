/**
 * ============================================================
 * MSW 브라우저 서비스 워커 설정
 * - 개발 환경에서만 활성화
 * - main.tsx에서 앱 렌더링 전에 초기화
 * ============================================================
 */

import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
