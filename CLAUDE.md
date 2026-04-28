# FlowStock - AI 기반 주식 뉴스 분석 플랫폼

## 프로젝트 개요
주식 관련 뉴스를 AI(Claude API + LangChain)로 분석하여 종목과의 관계, 감성 분석, 영향도를 시각화하는 서비스.
도메인: `flowstock.info`

## 아키텍처
- **프론트엔드**: React 18 + Vite → **Cloudflare Pages** (S3+CloudFront 안 씀)
- **백엔드 (Kotlin)**: Spring Boot 3.2 — 인증, CRUD, DB 접근, ai-service proxy
- **AI 서비스 (Python)**: FastAPI — 뉴스 RSS/감성, 시장 데이터, 상관관계 (Naver Finance API 기반)
- **DB (Backend)**: PostgreSQL 16 (k3s StatefulSet, 20Gi)
- **DB (AI)**: MySQL 8 — 분석 결과 캐싱
- **캐시**: Redis 7 (k3s StatefulSet, 5Gi)
- **모니터링**: Prometheus + Grafana + kube-state-metrics + node-exporter (`flowstock-monitoring` ns)
- **분산추적**: Jaeger all-in-one (OTLP gRPC/HTTP, 메모리 storage)
- **API 문서**: Springdoc OpenAPI + Swagger UI (`/swagger-ui.html`)
- **인프라**: 온프레미스 k3s (mini PC) + Cloudflare Tunnel ingress, GitHub Actions CI/CD
- **CI/CD**: `.github/workflows/deploy.yml` — main 브랜치 push 시 자동 배포 (frontend Pages + backend/ai k3s)

### 서비스 간 통신
```
Frontend (React :3000)
  └→ Kotlin Backend (Spring Boot :8080)
       ├── /api/members/oauth/** (인증 - OAuth Only)
       ├── /api/stocks/** (종목 CRUD)
       ├── /api/news/** (뉴스 CRUD)
       ├── /api/market (시장지수)
       └── /api/portfolio/** (포트폴리오)
            └→ Python AI Service (FastAPI :8000)
                 ├── /api/ai/news/analyze (뉴스 감성분석)
                 ├── /api/ai/chart/analyze (차트 기술적 분석)
                 ├── /api/ai/graph/generate (네트워크 그래프)
                 └── /api/ai/stock/** (주식 데이터 조회)
```

## Frontend (`flowstock-front/`)

### 스택
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI)
- TanStack React Query (서버 상태) + Zustand (클라이언트 상태, localStorage 영속화)
- React Router v6 + ProtectedRoute (인증 필수)

### 주요 라이브러리
- `@xyflow/react` - 뉴스-종목 네트워크 그래프
- `lightweight-charts` - TradingView 캔들스틱 차트
- `recharts` - 포트폴리오 분석 차트

### 명령어
```bash
cd flowstock-front
npm run dev        # 개발 서버 (http://localhost:3000, /api → :8080 프록시)
npm run build      # 프로덕션 빌드
npm run lint       # ESLint
npm run test       # Vitest 단위 테스트
```

### 페이지 구조 (모두 비로그인 둘러보기 가능, 일부 기능만 인증 필요)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | Index | 시장 지수, 등락 종목, 뉴스 요약 |
| `/economy` | EconomyPage | Fear&Greed, 매매주체, 52주 모멘텀, 섹터 상관관계 |
| `/news` | NewsPage | RSS 뉴스 + relatedStocks NetworkGraph |
| `/stock/:id` | StockDetail | 캔들차트 |
| `/portfolio` | PortfolioPage | 모의투자 (가상 1,000만원, localStorage 영속) — 30s 시세 polling |
| `/portfolio/game` | InvestGamePage | 백테스트 게임 (시점별 뉴스 사이드패널) |
| `/alerts` | AlertsPage | 관심종목 알림 (브라우저 Notification API) |
| `/login` | LoginPage | Google id_token / Naver code OAuth — 첫 로그인 시 자동 가입 |

### 주요 파일
- `src/services/api.ts` — 중앙 API 클라이언트 (토큰 자동 첨부, 401 처리)
- `src/components/auth/ProtectedRoute.tsx` — 인증 라우트 가드
- `src/stores/useStore.ts` — Zustand 상태 (auth + portfolio, localStorage 영속화)

### 프론트 환경변수
- `VITE_API_URL` — 백엔드 API URL (기본: `/api`, 프록시 사용)
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth Client ID
- `VITE_NAVER_CLIENT_ID` — Naver OAuth Client ID
- `VITE_NAVER_CALLBACK_URL` — Naver OAuth 콜백 URL

### 경로 alias
- `@/` → `src/`

## Backend (`flowstock-backend/`)

### 스택
- Spring Boot 3.2.0 + Kotlin 1.9.20
- Gradle (Kotlin DSL), **JDK 17** (kapt 호환성, JVM 21 아님)
- Spring Data JPA + QueryDSL + Flyway
- Spring Security + JWT (JJWT 0.12.3)
- WebClient + WebFlux (Python AI 서비스 호출)
- Springdoc OpenAPI 2.3.0 (Swagger UI)
- Micrometer Prometheus + tracing-bridge-otel (Jaeger OTLP HTTP)

### 명령어
```bash
cd flowstock-backend
./gradlew bootRun                          # 로컬 실행
./gradlew bootRun --args='--spring.profiles.active=local'  # local 프로파일
./gradlew build                            # 빌드
./gradlew test                             # 테스트
```

### 패키지 구조
```
com.flowstock
├── domain/
│   ├── member/    # 회원, OAuth(Google/Naver), JWT 인증 (이메일 가입/로그인 제거됨)
│   ├── news/      # 뉴스 CRUD, AI 분석 요청 (Python 서비스 호출)
│   ├── stock/     # 종목, 가격(OHLCV)
│   ├── dart/      # DART 공시 (미구현)
│   └── portfolio/ # 포트폴리오 (미구현)
├── global/
│   ├── security/  # JWT 필터, SecurityConfig (OAuth 전용)
│   ├── exception/ # BusinessException, ErrorCode
│   ├── response/  # ApiResponse<T> 래퍼
│   └── config/    # JPA Auditing, RestTemplate
└── infra/
    └── ai/        # AiServiceClient (Python FastAPI 호출)
```

### 주요 API
- `POST /api/members/oauth/{provider}` - 소셜 로그인 (Google/Naver) — 공개
- `POST /api/members/token/refresh` - 토큰 갱신 — 공개
- `GET /api/members/me` - 내 정보 — 인증 필수
- `GET /api/news/**` - 뉴스 조회 — 인증 필수
- `GET /api/stocks/**` - 종목 조회 — 인증 필수
- `GET /actuator/**` - 헬스체크 — 공개

### 인증 방식
- **OAuth Only**: Google/Naver 소셜 로그인만 지원 (이메일 가입/로그인 제거)
- 인증 안 된 요청은 OAuth, token refresh, actuator 외 전부 차단

### 프로파일
- `local`: H2/로컬 PostgreSQL, Flyway 비활성, ddl-auto=update
- `prod` (기본): PostgreSQL, Flyway 활성, ddl-auto=validate

### 외부 연동
- **Python AI Service**: RSS 뉴스, 시장/종목 데이터, 상관관계 (`ai-service.url` 설정)
- **주가 데이터**: **Naver Finance API** (m.stock.naver.com) — pykrx 안 씀 (KRX 403 + 시스템 날짜 미래 문제)
- **뉴스**: 한국경제/매일경제/연합뉴스/조선비즈 RSS + Google News RSS (검색)
- **DART**: 전자공시 (미구현)
- KIS API는 사용하지 않음 — `.env`에 KIS_* 남아있어도 무시 가능

### Backend 도메인별 컨트롤러
- **MemberController** (`/api/members/**`): Google id_token / Naver code OAuth, 자동 가입(socialLogin)
- **StockController** (`/api/stocks`): ai-service `/api/ai/stock/market` proxy
- **MarketController** (`/api/market`): ai-service `/api/ai/stock/index` proxy
- **NewsController** (`/api/news`): ai-service `/api/ai/news/latest` + `/search` proxy (relatedStocks 자동 매핑)
- **EconomyController** (`/api/economy`): F&G index, 매매주체, 52주, 섹터 상관관계
- **PortfolioController** (`/api/portfolio`): stub (모의투자는 frontend localStorage)
- 휴일/주말로 ai-service 응답이 비면 backend가 최대 -7일까지 retry

### 비로그인 정책
- `/api/stocks/**`, `/api/news/**`, `/api/market/**` GET은 비로그인 허용 (read-only 둘러보기용)
- `/api/portfolio/**` 등 개인 데이터는 인증 필수
- 회원가입 별도 페이지 없음 — OAuth 첫 로그인이 자동 가입 (`SocialLoginResponse.isNewMember`로 신규 구분)

## AI Service (`flowstock-ai/`)

### 스택
- Python 3.12 + FastAPI
- claude-code-sdk (Claude 구독 토큰)
- Pydantic v2 (스키마 검증)
- SQLAlchemy 2.0 + PyMySQL (MySQL 연결)
- Alembic (DB 마이그레이션)
- 향후: LangGraph (에이전트 오케스트레이션), LangSmith (트레이싱)

### 명령어
```bash
cd flowstock-ai
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000  # 로컬 실행
```

### 디렉토리 구조 (실제)
```
flowstock-ai/
├── app/
│   ├── main.py              # FastAPI 엔트리포인트 + /health
│   ├── config.py
│   ├── services/            # 핵심 비즈니스 로직 (agents/ 아님)
│   │   ├── stock_data.py        # Naver Finance API + 60s TTL cache
│   │   ├── news_feed.py         # RSS 크롤링 + sentiment + relatedStocks
│   │   ├── news_stock_match.py  # 종목 사전 substring 매칭
│   │   └── correlation.py       # numpy Pearson 상관계수
│   ├── routers/
│   │   ├── news.py          # /api/ai/news/latest, /search
│   │   ├── stock.py         # /api/ai/stock/market, /index, /ohlcv
│   │   ├── economy.py       # /api/ai/economy/dashboard, /correlation
│   │   ├── chart.py
│   │   └── graph.py
│   └── models/
└── tests/                   # pytest (test_news_feed, test_correlation, test_news_stock_match, test_health)
```

### AI 환경변수 / 인증
- Claude Code SDK는 API 키 대신 Claude Code 구독 인증을 사용합니다.
- 서버에서 `claude login`을 실행하여 로그인 필요
- `APP_PORT` — 서버 포트 (기본: 8000)
- `LOG_LEVEL` — 로그 레벨 (기본: INFO)
- `MYSQL_HOST` — MySQL 호스트 (기본: localhost)
- `MYSQL_PORT` — MySQL 포트 (기본: 3306)
- `MYSQL_USER` — MySQL 사용자 (기본: flowstock)
- `MYSQL_PASSWORD` — MySQL 비밀번호 (기본: flowstock)
- `MYSQL_DATABASE` — MySQL DB명 (기본: flowstock_ai)

## Infrastructure (`flowstock-infra/`)

### Terraform (`terraform/`)
- AWS Provider: **ap-northeast-2** (서울) — CloudFront ACM만 us-east-1
- S3: frontend(정적파일), backup(DB백업, 30일), assets(업로드)
- CloudFront: S3 + API 오리진, SPA 라우팅, ACM SSL
- Route53: flowstock.info DNS
- SES: 이메일 발송
- Secrets Manager: API 키, DB 비밀번호 등
- IAM: 백엔드용 서비스 계정

### Kubernetes (`k8s/`)
- **네임스페이스**: `flowstock`, `flowstock-monitoring`
- **백엔드**: Deployment (2~3 replica, HPA), ClusterIP Service
- **AI 서비스**: Deployment (1 replica), ClusterIP Service (:8000)
- **PostgreSQL/MySQL/Redis**: StatefulSet
- **Ingress**: **Cloudflare Tunnel** (Traefik 비활성). 라우팅은 `cloudflared/cloudflared.yaml`의 ingress rules로
- **모니터링** (`monitoring/` 디렉토리, 분할 파일):
  - `prometheus.yaml` (RBAC + Deployment + 30s scrape)
  - `grafana.yaml` (PVC 2Gi, datasource provision)
  - `kube-state-metrics.yaml`, `node-exporter.yaml` (DaemonSet)
- **분산추적**: `jaeger/jaeger.yaml` — all-in-one, OTLP gRPC(4317)/HTTP(4318)
- 관리자 도메인 (Cloudflare DNS CNAME 필요):
  - `grafana.flowstock.info`, `jaeger.flowstock.info`, `prometheus.flowstock.info`

### 시크릿 관리
- `k8s/namespace/secrets.yaml` — `stringData` + `${VAR}` 플레이스홀더 (커밋 가능)
- `flowstock-infra/.env` — 실제 시크릿 값 (.gitignore됨)
- `flowstock-infra/.env.example` — 키 목록 템플릿 (커밋됨)
- `flowstock-infra/scripts/generate-secrets.sh` — .env 로드 → envsubst → kubectl apply

### 배포 플로우 (실제 운영)
- main 브랜치 push → GitHub Actions(`deploy.yml`) 자동 트리거
  1. backend/ai 도커 이미지 빌드 → GHCR push
  2. frontend npm build → Cloudflare Pages deploy (wrangler)
  3. SSH(appleboy/ssh-action, command_timeout 30m)로 mini PC 진입
  4. namespace → DBs → cloudflared(envsubst) → monitoring/jaeger → ai-service → backend rolling update
  5. `kubectl rollout status` 600s 대기

### 테스트
- 프론트: `cd flowstock-front && npm run test` (Vitest, 20개 통과)
- 백엔드: CI에서 `./gradlew :app:test` (JUnit5, JDK 17)
- AI: `cd flowstock-ai && pytest tests/ -q` (23 passed, 1 skipped)

## 환경 변수 (시크릿)
- `JWT_SECRET`, `DB_PASSWORD`, `REDIS_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`
- `DART_API_KEY` (CLAUDE_API_KEY는 제거됨 — Claude Code SDK 구독 인증 사용)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- OAuth: `GOOGLE_CLIENT_ID`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
- 백엔드: `AI_SERVICE_URL` (Python 서비스 주소)
- Cloudflare Tunnel: `CLOUDFLARE_ACCOUNT_TAG`, `CLOUDFLARE_TUNNEL_ID`, `CLOUDFLARE_TUNNEL_SECRET`
- KIS는 사용하지 않음 (pykrx로 대체) — `.env`에 KIS_APP_KEY/KIS_APP_SECRET이 남아있다면 무시 가능

## 컨벤션
- 커밋 메시지: `add : 설명` / `fix : 설명` 형식 (한국어)
- 백엔드 응답: `ApiResponse<T>` 래퍼 사용
- 예외 처리: `BusinessException` + `ErrorCode` enum
- 엔티티: `BaseEntity` 상속 (createdAt, updatedAt 자동 관리)
- 프론트 컴포넌트: shadcn/ui 기반, `cn()` 유틸로 클래스 병합
- 인증: OAuth Only (Google/Naver), 이메일 가입/로그인 없음

## 하네스 엔지니어링 (자동화 워크플로우)

### 사용 가능한 슬래시 커맨드
| 커맨드 | 설명 |
|--------|------|
| `/deploy-k3s [대상]` | k3s 배포 (all/backend/ai/infra) |
| `/deploy-front` | 프론트 빌드 → S3 → CloudFront 무효화 |
| `/test-front` | 타입체크 + ESLint + Vitest |
| `/test-backend` | Gradle 테스트 |
| `/test-ai` | pytest + 헬스체크 |
| `/review-code` | git diff 기반 보안/품질 리뷰 |
| `/full-review` | **4개 에이전트 병렬** 전체 코드베이스 리뷰 |

### 자동 실행 훅 (settings.json)
- **파일 수정 시**: TS/JS → Prettier 자동 포맷, Python → Black 자동 포맷
- **민감 파일 차단**: `.env`, `secrets.yaml`, `credentials` 파일 수정 시 자동 차단
- **알림**: Claude가 입력 대기 시 macOS 알림 발송

### 전문 에이전트 (병렬 리뷰용)
| 에이전트 | 담당 | 핵심 체크 |
|---------|------|----------|
| `frontend-auditor` | React/TS | XSS, 접근성, 타입안전성, 성능 |
| `backend-reviewer` | Kotlin/Spring | Security, JPA N+1, 트랜잭션, API 일관성 |
| `ai-reviewer` | Python/FastAPI | API키 노출, 프롬프트 인젝션, LangChain 품질 |
| `infra-validator` | Terraform/k8s | 시크릿 하드코딩, RBAC, 리소스 사이징 |
| `critical-reviewer` | 전체 스택 | 다른 reviewer 사각지대 — 런타임 폭탄, 시간폭탄, 무중단 함정 |

### 일반적인 작업 흐름
```
1. 코드 작성 → 자동 포맷팅 (훅)
2. /review-code → 변경사항 리뷰
3. /test-front 또는 /test-backend → 테스트
4. /deploy-k3s 또는 /deploy-front → 배포
5. 큰 변경 시 /full-review → 4개 에이전트 동시 리뷰
```

## 주의사항
- 프론트 빌드 시 `@/` 경로 alias 확인
- k8s secrets는 `scripts/generate-secrets.sh` 스크립트로 생성 (.env 필요)
- 프론트 개발 서버 포트 3000, 백엔드 8080, AI 서비스 8000 (포트 충돌 주의)
- AI 서비스는 k8s 내부에서 `http://ai-service.flowstock.svc.cluster.local:8000`으로 호출
- **CLAUDE.md 즉시 갱신 원칙** — 프로젝트 결정 변경 시 같은 턴에 갱신, 작업 시작 전 먼저 읽기
- 코드 작업 시 `flowstock-infra/k8s/` 안에 있는 기존 매니페스트 먼저 확인 (중복 방지)
