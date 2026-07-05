/**
 * ============================================================
 * Kakao JS SDK lazy loader
 * - VITE_KAKAO_JS_KEY 없으면 null 반환 → 호출부가 폴백 (링크 복사 등)
 * - 첫 호출 때만 스크립트 주입, 이후엔 초기화된 인스턴스 재사용
 * - 로드 실패 시 캐시를 비워 다음 클릭에서 재시도
 * ============================================================
 */

const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

let pending: Promise<KakaoSdk | null> | null = null;

/** Kakao SDK에서 실제로 쓰는 표면만 타입으로 고정 */
export interface KakaoSdk {
  isInitialized(): boolean;
  init(key: string): void;
  Share?: {
    sendDefault(settings: Record<string, unknown>): void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

export function loadKakao(): Promise<KakaoSdk | null> {
  const key = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
  if (!key) return Promise.resolve(null);

  const existing = window.Kakao;
  if (existing?.isInitialized?.()) return Promise.resolve(existing);
  if (pending) return pending;

  pending = new Promise<KakaoSdk | null>((resolve) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      try {
        const K = window.Kakao;
        if (K && !K.isInitialized()) K.init(key);
        resolve(K ?? null);
      } catch {
        pending = null;
        resolve(null);
      }
    };
    script.onerror = () => {
      pending = null;
      script.remove();
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return pending;
}
