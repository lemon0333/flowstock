# FlowStock Frontend

React 18 + TypeScript + Vite 기반 프론트엔드. AI 기반 주식 뉴스 분석 시각화.

## 스택
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI)
- TanStack React Query + Zustand (localStorage 영속화)
- React Router v6 + ProtectedRoute

## 주요 라이브러리
- `@xyflow/react` — 뉴스-종목 네트워크 그래프
- `lightweight-charts` — TradingView 캔들스틱 차트
- `recharts` — 포트폴리오 섹터 분포 차트

## 명령어

```bash
npm install
npm run dev        # http://localhost:3000 (개발, /api → :8080 프록시)
npm run build      # 프로덕션 빌드
npm run lint       # ESLint
npm run test       # Vitest
```

## 페이지

| 경로 | 인증 | 설명 |
|------|------|------|
| `/login` | 공개 | Google/Naver OAuth 로그인 |
| `/` | 필수 | 시장 지수, 등락 종목, 뉴스 요약 |
| `/stock/:id` | 필수 | 캔들차트 + 뉴스 네트워크 그래프 |
| `/news` | 필수 | 뉴스 목록 + 네트워크 시각화 |
| `/portfolio` | 필수 | 포트폴리오 관리, 섹터 분포 |

## 인증
- **OAuth Only**: Google/Naver 소셜 로그인만 지원
- `ProtectedRoute`로 미인증 사용자 `/login` 리다이렉트
- JWT 토큰 localStorage 저장, API 요청 시 자동 첨부
- 401 응답 시 자동 로그아웃 + 리다이렉트

## 주요 파일
- `src/services/api.ts` — 중앙 API 클라이언트 (authApi, stockApi, newsApi, marketApi, portfolioApi)
- `src/components/auth/ProtectedRoute.tsx` — 인증 라우트 가드
- `src/stores/useStore.ts` — Zustand 상태 관리 (auth + portfolio)

## 환경변수

| 변수 | 설명 |
|------|------|
| `VITE_API_URL` | 백엔드 API URL (기본: `/api`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `VITE_NAVER_CLIENT_ID` | Naver OAuth Client ID |
| `VITE_NAVER_CALLBACK_URL` | Naver OAuth 콜백 URL |

## 경로 alias
- `@/` → `src/`
