/**
 * 전역 ErrorBoundary — 페이지 컴포넌트가 throw해도 root 통째로 unmount되는 걸 막아
 * "가끔 빈 화면" 케이스를 방어. 사용자에게 안내 + 다시 시도 버튼.
 *
 * React error boundary는 동기 render 에러만 잡음 (이벤트 핸들러나 async는 X).
 * 그쪽은 try/catch + alert/toast 패턴으로 별도 처리.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 운영 환경에선 console.error로 남겨두면 Loki promtail이 수집함.
    // 향후 Sentry 등 추가 시 여기서 capture.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  handleReload = () => {
    // 단순 새로고침 — chunk 미스/일시 네트워크 오류는 보통 한 번 더로 풀림.
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-amber-500" />
          <h1 className="text-xl font-bold">잠깐, 화면을 못 그렸어요</h1>
          <p className="text-sm text-muted-foreground">
            일시적인 오류가 있었던 것 같아요. 새로고침하면 보통 풀려요.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-muted-foreground/70 font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>
      </div>
    );
  }
}
