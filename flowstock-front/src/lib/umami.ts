/**
 * ============================================================
 * Umami Analytics 트래커 부트스트랩
 *
 * - VITE_UMAMI_WEBSITE_ID 와 VITE_UMAMI_SCRIPT_URL 환경변수 둘 다 설정되어야 동작
 * - 둘 중 하나라도 없으면 silently skip (개발 환경에서 안 띄움)
 * - 운영 빌드: VITE_UMAMI_SCRIPT_URL=https://analytics.flowstock.info/script.js
 *             VITE_UMAMI_WEBSITE_ID=<Umami UI 에서 발급받은 UUID>
 * - script.js 는 cookie 사용 안 함 → GDPR 동의 배너 불필요
 * ============================================================
 */

const SCRIPT_ID = "umami-tracker";

export function initUmami() {
  if (typeof document === "undefined") return;
  // 이미 박혀있으면 skip
  if (document.getElementById(SCRIPT_ID)) return;

  const url = import.meta.env.VITE_UMAMI_SCRIPT_URL as string | undefined;
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;
  if (!url || !websiteId) {
    // 개발 환경 또는 미설정 — silently skip
    return;
  }

  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.defer = true;
  s.src = url;
  s.dataset.websiteId = websiteId;
  // 운영 hostname 외에서 트래킹 안 하게 (localhost 등)
  s.dataset.domains = "flowstock.info";
  document.head.appendChild(s);
}

/**
 * 커스텀 이벤트 전송 (옵션). 예: 모의투자 매수 클릭, 회원가입 완료.
 * Umami window.umami 가 로드된 후에만 동작.
 */
export function trackEvent(name: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    umami?: { track: (name: string, data?: Record<string, unknown>) => void };
  };
  w.umami?.track(name, data);
}
