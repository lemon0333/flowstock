# FlowStock 변경 이력

작업한 내용을 그때그때 정리. 새 commit/feature는 위쪽(최신)에 추가.
GitHub commit 보단 이쪽이 한눈에 봄. epic 단위 그룹.

---

## 🚧 진행 중 / TODO

- [x] 학습 콘텐츠 풍부화 R1 — kid 14 토픽 ✅ 완료
- [ ] 학습 콘텐츠 풍부화 R2 — student 18 토픽
- [ ] 학습 콘텐츠 풍부화 R3 — pro 13 토픽
- [ ] **🔥 챗봇 CLINotFoundError** — AI service 컨테이너에 claude CLI 없음.
      옵션: (A) Anthropic API 키 + anthropic SDK 전환  (B) Dockerfile에 Node+CLI 설치+credential PVC mount  (C) 챗봇 비활성
- [ ] 챗봇 RAG 재도입 (가벼운 임베딩 옵션 검토 — ONNX/외부 API/사이드카)
- [ ] (선택) Bucket4j-Lettuce(Redis)로 분산 rate limit 마이그레이션
- [ ] (외부) Naver/Google OAuth 검수 신청
- [ ] Search Console 기존 sitemap.xml 캐시 자동 갱신 대기

---

## 2026-05-07

### 🐛 챗봇 X 두 개 겹침 fix + 친절 에러 메시지
- ChatbotPanel 헤더에 X 버튼 두 개(내가 추가한 거 + shadcn Sheet 기본) 보임 → 내 X 제거
- useChatbotStream 에러 메시지: `CLINotFoundError`/`NotFound` 시
  "스톡이는 지금 잠시 점검 중이에요 🔧" 같은 친절 안내로 대체
- 진단: `kubectl exec deploy/ai-service which claude` → 없음.
  claude-code-sdk가 내부적으로 `claude` CLI를 subprocess로 호출하는데
  컨테이너에 설치되어있지 않아 NotFound. 챗봇 + 다른 AI 분석 endpoint들 영향 가능.
- 해결책 3 옵션 (사용자 결정 필요): TODO 섹션 참조

### 🔤 폰트 마루부리 → 나눔고딕 (가독성 우선)
- 사용자 요청 — 마루부리(명조 계열)는 본문/숫자 가독성이 살짝 약함
- NanumGothic OTF 4 weights (Light 300 / Regular 400 / Bold 700 / ExtraBold 800)
- public/fonts/ 마루부리 4개 삭제, NanumGothic 4개로 교체
- index.css `--font-sans` / `--font-mono` 모두 NanumGothic first
- 본문/숫자 모두 NanumGothic 통일 (tabular-nums 정렬 유지)

### 🐛 매수/매도 안 됨 fix — Naver pageSize 200 → 100
- Naver API가 `pageSize=200` 거부 (HTTP 400) → `/api/stocks` 빈 배열 → PortfolioPage 종목 list 0개.
- pageSize=100 + page 1~4 fetch (KOSPI 400 + KOSDAQ 400 = 800 종목 그대로).
- Backend StockController도 `?market=KOSPI` → `?market=ALL`로 변경 (KOSDAQ도 포함).
- 병렬 fork(R1/R2/R3) 권한 fail로 직접 진행 중 발견.

### 📚 학습 R1 — kid 14 토픽 풍부화 ✅ 완료
- 6 + 8 = 14 토픽 모두 풍부화 완료
- 토픽: what-is-stock, why-stocks-rise, how-companies-earn, save-vs-invest,
  compound-interest, kospi-vs-kosdaq, market-cap, candle-chart, diversification,
  inflation, exchange-rate, business-cycle, ipo-and-splits, fund-and-trust
- 패턴 (각 토픽):
  - intro 1-2 문장 추가 (배경/맥락)
  - 핵심 sections body 1.5~2배 확장 (구체 수치/예시)
  - 신규 section 1개 추가 (자주 헷갈리는 포인트)
  - example body에 FlowStock 활용 팁
- 추가된 컨텍스트 예시:
  - 삼성전자 60억 주, 매출 300조, 영업이익 32조
  - 카카오 5만→17만→5만 사례, 한진해운 2017 파산
  - 2008 금융위기 -40%, 2022 한국 CPI 5%
  - 워런 버핏 80% 수익이 마지막 20년에
  - LG에너지솔루션 한국 최대 IPO, 두산로보틱스 첫날 폭등
- 다음: student 트랙 18 토픽

### 📊 모의투자 종목 확장 + 시장정보 사이드 패널
- `43c52b0` — 종목 400 → **800** (KOSPI 400 + KOSDAQ 400, page 1+2 fetch).
  PortfolioPage 자산 카드 아래 **투자 참고 패널** (시장지수 2개 + 원달러 환율 + 최근 뉴스 5개 + /economy/macro 링크).
- `2caaacd` — 종목 100 → 400 (1차 확장, KOSPI/KOSDAQ 각 200).

### 👤 마이페이지 닉네임 인라인 수정
- `f655c13` — `/me`에서 닉네임 옆 ✏️ 클릭 → input + Enter/Esc 저장-취소.
  `setupProfile` 호출 시 `isProfileCompleted=true` 토글 → 마스킹 자동 해제.
  닉네임 미수정 상태에서 안내 문구.

### 🎨 UX — 작성자 마스킹 정책 + 모의투자 차트 % + API 에러 디테일
- `25f90c3`
  - `EmailMasker.authorLabel(nickname, email, isDefault)` —
    isDefault=true (`!isProfileCompleted`) → 이메일 앞 3자 마스킹 (`and***@gmail.com`)
    isDefault=false → 닉네임 그대로
  - ArticleSummary/Detail/CommentDto/FeedbackResponse 4개 DTO에 적용
  - 모의투자 파이 차트 라벨 `이름 X.X%` + 툴팁 % 추가
  - `api.ts` 에러 메시지에 HTTP status code 노출 (예: `USER_NOT_FOUND (HTTP 404)`)

### 💡 피드백 게시판 + admin 권한
- `619f922`
  - 백엔드: `domain/feedback` (Entity/Repo/Service/Controller) + Flyway V4
  - 프런트: `/feedback` 페이지 + 헤더 메뉴
  - admin: `app.admin.emails` env (default `andyhyunbin@gmail.com`) — DB role과 무관하게 권한 체크
  - 작성자 마스킹 (위 정책 적용)
  - API: GET 목록/상세 (비로그인 OK), POST/DELETE/like (인증), PATCH /status (admin)

### 🤖 챗봇 + RAG (스톡이) MVP — 우여곡절
- `de0aee1` — **RAG 임시 비활성** (sentence-transformers/torch 1.4GB로 mini PC pull 37분 timeout).
  `learn_index.py`는 graceful fallback 이미 구현 → 의존성만 빼면 자동 비활성.
  챗봇은 시스템 프롬프트만으로 동작 (사이트 페이지 안내 + Claude 자체 지식 용어 설명).
- `89608cc` — torch CPU-only + 모델 사전 다운로드 + rollout timeout 8분→20분.
  → 그래도 mini PC pull 못 끝냄 → 위 디아블화 결정.
- `5f6fe5c` — Bucket4j 의존성 제거, 순수 ConcurrentHashMap sliding window IpRateLimiter.
- `756c114` — 챗봇 + RAG MVP 신규 (3 레이어):
  - **AI**: routers/chatbot.py SSE, services/learn_index.py(임베딩 검색),
    agents/chatbot_agent.py(claude-code-sdk async stream),
    agents/prompts/junior_investor.py(주린이 톤)
  - **Backend**: domain/chatbot 신규, IpRateLimiter, AiServiceClient.streamChat
  - **Frontend**: ChatbotFab + Sheet 패널 + useChatbotStream + Zustand store
  - SSE event 4종 합의: chunk/source/done/error

### 🎯 SEO 색인 우회 + 마루부리 폰트 + 주린이 카피
- `826a8d5`
  - `sitemap-2026.xml` 신규 (5/6 fail 캐시 우회) — Search Console "성공 13페이지" ✅
  - 마루부리 OTF 4웨이트 (Light/Regular/SemiBold/Bold) → 본문/숫자 통일
  - index.html 메타 — 주린이/주식 입문 키워드 전면 변경
  - Index.tsx Hero "주식, 어렵지 않아요" + 학습/모의투자 카드 우선 노출

### 🐛 GitHub Issue Backfill 워크플로
- `2ef3c54` — `.github/workflows/issue-backfill.yml` (workflow_dispatch).
  지금까지 작업 11개 epic을 한 번에 issue로 자동 생성. PAT 불필요.

---

## 2026-05-06

### 📚 /learn 트랙 분리 + 45 토픽 대확장
- `980909d` — 23 → **45 토픽** (kid 14 + student 18 + pro 13)
- `490c11a` — 재사용 PaginationControl 컴포넌트 + 스크리너/커뮤니티 적용
- `db71c34` — audience 트랙 분리 (kid/student/pro) + 12 토픽 추가 (총 23)
- `c9db5cb` — 11 토픽 모두 ready (기존 3 + 준비중 3 + 신규 5)
- `7cc8931` — `/learn` 주식공부 페이지 신규 + 매수폼 최대수량/퀵버튼

---

## 2026-05-04

### 🎨 Toss 디자인 시스템 + 한국 금융 컨벤션
- `38fa91b` — RED 상승 / BLUE 하락, HSL 토큰, 16~24px rounded
- `8b26ddf` — Hero + 8 service showcase 카드 + 시장 + 출처 4섹션 home 리디자인
- `426ef7e` — EconomyPage 도넛 한국 컨벤션 (하락 녹색 → 파랑)

### 📊 Umami Analytics 자체 호스팅
- `f5b6e31` — `analytics.flowstock.info` k3s 배포 + Cloudflare Tunnel
- `2cda91d` — UMAMI_WEBSITE_ID 등록 + 프런트 트래커 활성

### 🔗 뉴스↔뉴스 관계 그래프 + 종목 매핑 정확도
- `e934e76` — @xyflow/react 네트워크 그래프 + 한자 별칭 보강

### ⚡ 성능 — Jaeger/OpenTelemetry + Web Vitals + 캐싱 + 배포 단축
- `13b0d2a` — AI service OpenTelemetry, RSS 병렬 + TTL 캐시(60s), Web Vitals
- `f46defb` — replica 2→1 + HPA 1~2 + probe 가속 + rollout 병렬
- `1f64b0f` — `docs/PERFORMANCE.md` Before/After 실측 백필
- `9115a9a` — daily-health.yml inline python heredoc 제거 (yaml indent 충돌)

---

## 2026-05-03

### 👤 OAuth 검수 자료 — /me, /privacy, /terms
- `95b0e4c` — 마이페이지 + 개인정보처리방침 + 이용약관
- `17e2108` — 푸터 (브랜드/서비스/데이터출처/링크/면책)
- `df46c77` — Node 20 → 22 (wrangler@latest 호환)
- `726d1b4` — DART real fetch + nav 그룹화 + URL probes + brand logo + telemetry skill

---

## 2026-04-29

### 📈 분석 도구 패키지
- `e678a5d` — 기술지표/백테스터/스크리너/비교/섹터/거시/실적 캘린더 + DART 재무 통합
- `d83f304` — community(article/comment/like) + Map<String,Any?> 타입 fix
- `594efec` — Docker single-stage build with pre-built jar
- `5914cb9` — permission allowlist + ci-status/ssh-mini skills + auto health check
- `5044a59` — sitemap 페이지 확장

---

## 2026-04-28

### 🎯 SEO 초기 정비
- `335c594` — sitemap.xml의 X-Robots-Tag noindex 제거 (Google이 sitemap 자체를 reject 했던 원인)

---

## 메모 / 회고

- **2026-05-07**: AI service 이미지 1.5GB는 미니PC + 가정용 인터넷으로는 첫 pull 30분+ 못 끝냄. 향후 ML 의존성 추가 시 `--extra-index-url` CPU-only / multi-stage / 외부 사이드카 필요.
- **2026-05-07**: 김도형 미스터리(members 안 보임) → `head -20` 출력 잘려서 못 봤던 것. id=20 정상 가입. 진단 정정.
- **2026-05-07**: 사용자 요청 — Co-Authored-By 트레일러 안 추가 (옵션 A). 이전 commit은 그대로, 앞으로만 적용.
- **2026-04-28**: sitemap.xml에 `X-Robots-Tag: noindex` 헤더가 붙어 Google이 sitemap 자체를 reject 했던 원인. Cloudflare Pages 자동 헤더였음.

---

> 🤖 매 commit 시 이 파일도 같이 업데이트. 큰 변경은 epic 단위 묶어서 정리.
