/**
 * ============================================================
 * 로그인 페이지 (/login)
 * - Google / Naver OAuth 로그인
 * - 토스 스타일: 깔끔한 흰 카드 + 부드러운 라운딩
 * ============================================================
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useStore } from "@/stores/useStore";
import { authApi } from "@/services/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_CLIENT_ID || '';
const NAVER_CALLBACK_URL = import.meta.env.VITE_NAVER_CALLBACK_URL || `${window.location.origin}/login`;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 이미 로그인된 경우 홈으로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // OAuth 콜백 처리
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Google implicit flow: access_token이 URL hash에 있음
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        if (accessToken) {
          setLoading(true);
          setError('');
          try {
            const res = await authApi.oauthLogin('google', accessToken);
            if (res.data?.accessToken) {
              const d = res.data as { accessToken: string; memberId?: string | number; nickname?: string };
              login(
                { id: String(d.memberId ?? ''), email: '', name: d.nickname ?? '' },
                d.accessToken,
              );
              navigate('/', { replace: true });
            }
          } catch {
            setError('Google 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
          } finally {
            setLoading(false);
            // URL에서 hash 제거
            window.history.replaceState(null, '', window.location.pathname);
          }
          return;
        }
      }

      // Naver: code와 state가 URL search params에 있음
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const savedState = sessionStorage.getItem('naver_state');

      if (code && state) {
        if (savedState && state !== savedState) {
          setError('잘못된 인증 요청입니다. 다시 시도해주세요.');
          return;
        }
        sessionStorage.removeItem('naver_state');
        setLoading(true);
        setError('');
        try {
          const res = await authApi.naverCallback(code, state);
          if (res.data?.accessToken) {
            const d = res.data as { accessToken: string; memberId?: string | number; nickname?: string };
            login(
              { id: String(d.memberId ?? ''), email: '', name: d.nickname ?? '' },
              d.accessToken,
            );
            navigate('/', { replace: true });
          }
        } catch {
          setError('네이버 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
          setLoading(false);
          // URL에서 params 제거
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    };

    handleOAuthCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleLogin = () => {
    const redirectUri = `${window.location.origin}/login`;
    const scope = 'openid email profile';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
    window.location.href = url;
  };

  const handleNaverLogin = () => {
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('naver_state', state);
    const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${NAVER_CALLBACK_URL}&state=${state}`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <TrendingUp className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold text-foreground">
            STOCK<span className="text-primary">FLOW</span>
          </span>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-card rounded-2xl p-8" style={{ boxShadow: 'var(--shadow-elevated)' }}>
          <h1 className="text-lg font-bold text-foreground mb-2 text-center">로그인</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">AI 기반 주식 뉴스 분석 플랫폼</p>

          {error && (
            <div className="bg-negative/5 border border-negative/20 text-negative text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-sm text-muted-foreground text-center mb-4">
              로그인 처리 중...
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-12 text-sm font-medium bg-card border border-border rounded-xl hover:bg-accent/40 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 로그인
            </button>

            <button
              onClick={handleNaverLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-12 text-sm font-medium bg-[#03C75A] hover:bg-[#02b351] text-white rounded-xl transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="white" d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
              </svg>
              네이버로 로그인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
