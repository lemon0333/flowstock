# Frontend 작업 규칙 — React 18 + Vite + Tailwind + shadcn/ui

## Layout/Sticky/Grid 변경 시 — Multi-page Self-QA 필수

shell(RootShell, sidebar, grid, sticky 등) 손대면 **사용자가 잡기 전에 스스로**:

- 각 카테고리 그룹의 **짧은 페이지 + 긴 페이지** 시뮬레이션
  - 시장: `/` vs `/economy`
  - 종목: `/screener`(긴 표) vs `/earnings`(캘린더, 짧을 수 있음)
  - 콘텐츠: `/articles`(글 1건) vs `/learn`(카드 45개)
  - 내 거: `/portfolio` vs `/alerts`
- sticky/grid 변경 시 **부모 height가 일관된지** 확인
  - `min-h-full`이 cascade 안 되면 명시적 `min-h-[calc(...)]`까지 박기
- 같은 종류 fix를 두 번째로 박는 거면 **한 번에 안 끝난 이유부터 분석**. 부분 fix 반복 X.

## 색 / Contrast

- 배경 색을 등락률 비례로 진하게 만드는 컴포넌트(SectorPage 등)에서 텍스트도 같은 색이면 묻힘
  - 진한 셀(`Math.abs(value) >= 임계`)에서는 텍스트 white 강제
  - 약한 셀은 색 텍스트 유지
- 차트 라벨 (Recharts Pie 등)에서 작은 슬라이스 라벨은 hide + Legend 활용
  - `label={(e) => e.percent >= 0.05 ? ... : ""}`
  - `labelLine={false}` + `<Legend />`

## API 호출 패턴

- 모든 API는 `src/services/api.ts`의 ApiClient 통해. 직접 fetch 금지.
- 401은 ApiClient가 자동 처리(/login 리다이렉트 + token clear)
- 사용자 액션 실패는 alert/toast로 노출 — silent fail 금지

## Form 컨트롤

- 작성/제출 후 refetch 필요한 곳은 `useEffect` 의존성 트리거 또는 명시적 refetch 함수
- `try/catch` 안 거는 fetch는 silent fail — 사용자 의견(comment 등록 fix) 따라

## 페이지 구조

- 모든 페이지: `<Layout>` wrapper (deprecated이지만 SEO Helmet 자동 주입 — 그대로 유지)
- ProtectedRoute는 본인 정보 페이지(/me, /admin)에만
- 공개 read-only(/news, /articles, /leaderboard 등)는 비로그인 OK
