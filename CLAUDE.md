# FlowStock - AI 기반 주식 뉴스 분석 플랫폼

## 프로젝트 개요
주식 관련 뉴스를 AI(Claude API + LangChain)로 분석하여 종목과의 관계, 감성 분석, 영향도를 시각화하는 서비스.
도메인: `flowstock.info`

## 아키텍처
- **프론트엔드**: React 18 + Vite → AWS S3 + CloudFront CDN
- **백엔드 (Kotlin)**: Spring Boot 3.2 — 인증, CRUD, DB 접근, API Gateway
- **AI 서비스 (Python)**: FastAPI + LangChain — 뉴스 분석, 차트 분석, 그래프 생성
- **DB (Backend)**: PostgreSQL 16 (k3s StatefulSet, 20Gi) — Kotlin 백엔드용
- **DB (AI)**: MySQL 8 — Python AI 서비스용 (분석 결과 캐싱, 요청 이력)
- **캐시**: Redis 7 (k3s StatefulSet, 5Gi)
- **모니터링**: Prometheus + Grafana + Jaeger
- **인프라**: 온프레미스 k3s + Cloudflare Tunnel, AWS (S3/CloudFront/Route53)

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

### 페이지 구조
| 경로 | 페이지 | 인증 | 설명 |
|------|--------|------|------|
| `/` | Index | 필수 | 시장 지수, 등락 종목, 뉴스 요약 |
| `/stock/:id` | StockDetail | 필수 | 캔들차트, 뉴스 네트워크 그래프 |
| `/news` | NewsPage | 필수 | 뉴스 목록 + 네트워크 시각화 |
| `/portfolio` | PortfolioPage | 필수 | 포트폴리오 관리, 섹터 분포 |
| `/login` | LoginPage | 공개 | Google/Naver OAuth 로그인 |

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
- Gradle (Kotlin DSL), JVM 21
- Spring Data JPA + QueryDSL + Flyway
- Spring Security + JWT (JJWT 0.12.3)
- WebClient (Python AI 서비스 호출)

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
- **Python AI Service**: 뉴스 감성분석, 차트 분석, 그래프 생성 (`ai-service.url` 설정)
- **주가 데이터**: pykrx 라이브러리 (KRX/네이버 공개 데이터, API 키 불필요) — KIS는 사용하지 않음
- **DART**: 전자공시 (미구현)

### Backend 도메인별 컨트롤러
- **MemberController** (`/api/members/**`): OAuth 로그인(Google/Naver), 토큰 갱신, /me — 자체 로직
- **StockController** (`/api/stocks`): ai-service `/api/ai/stock/market` proxy → 거래량 top 100 반환
- **MarketController** (`/api/market`): ai-service `/api/ai/stock/index` proxy → 코스피/코스닥 지수
- **NewsController** (`/api/news`): 현재는 빈 list 반환. DART 공시/뉴스 크롤러 연동은 추후
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

### 에이전트 구조
```
flowstock-ai/
├── app/
│   ├── main.py              # FastAPI 엔트리포인트 + /health
│   ├── config.py            # Settings (Claude Code SDK 인증, DB 등)
│   ├── agents/
│   │   ├── news_analyzer.py # 뉴스 감성분석 + 종목 연관도 추출
│   │   ├── chart_agent.py   # OHLCV 기술적 분석
│   │   ├── graph_agent.py   # 뉴스-종목 네트워크 그래프 생성
│   │   └── stock_data.py    # pykrx 주식 데이터 수집
│   ├── models/
│   │   └── schemas.py       # Pydantic 요청/응답 모델
│   └── routers/
│       ├── news.py          # POST /api/ai/news/analyze
│       ├── chart.py         # POST /api/ai/chart/analyze
│       ├── graph.py         # POST /api/ai/graph/generate
│       └── stock.py         # /api/ai/stock/** (주식 데이터 조회)
├── requirements.txt
└── Dockerfile
```

### AI 에이전트별 역할
| 에이전트 | API | 설명 |
|---------|-----|------|
| NewsAnalyzer | `POST /api/ai/news/analyze` | 뉴스 감성(POS/NEG/NEU), 요약, 중요도, 관련종목+영향도 |
| ChartAgent | `POST /api/ai/chart/analyze` | OHLCV 패턴 분석, 추세, 지지/저항선 |
| GraphAgent | `POST /api/ai/graph/generate` | ReactFlow 호환 노드/엣지 그래프 데이터 생성 |

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
- **네임스페이스**: flowstock, flowstock-monitoring
- **백엔드**: Deployment (2~3 replica, HPA), ClusterIP Service
- **AI 서비스**: Deployment (1 replica), ClusterIP Service (:8000)
- **PostgreSQL**: StatefulSet, 20Gi PVC
- **Redis**: StatefulSet, 5Gi, allkeys-lru 정책
- **Ingress**: Traefik + CORS 미들웨어
- **모니터링**: Prometheus(15s scrape) + Grafana + Jaeger

### 시크릿 관리
- `k8s/namespace/secrets.yaml` — `stringData` + `${VAR}` 플레이스홀더 (커밋 가능)
- `flowstock-infra/.env` — 실제 시크릿 값 (.gitignore됨)
- `flowstock-infra/.env.example` — 키 목록 템플릿 (커밋됨)
- `flowstock-infra/scripts/generate-secrets.sh` — .env 로드 → envsubst → kubectl apply

### 배포 플로우
1. Terraform apply (AWS 리소스)
2. `.env` 파일 작성 후 `scripts/generate-secrets.sh` 실행
3. PostgreSQL → Redis → AI Service → Backend → Ingress → Monitoring 순서 배포
4. 프론트엔드: S3 업로드 + CloudFront 캐시 무효화

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

### 일반적인 작업 흐름
```
1. 코드 작성 → 자동 포맷팅 (훅)
2. /review-code → 변경사항 리뷰
3. /test-front 또는 /test-backend → 테스트
4. /deploy-k3s 또는 /deploy-front → 배포
5. 큰 변경 시 /full-review → 4개 에이전트 동시 리뷰
```

## 주의사항
- Terraform apply 시 기존 리소스가 있으면 반드시 `terraform import` 먼저 실행
- 프론트 빌드 시 `@/` 경로 alias 확인
- k8s secrets는 `scripts/generate-secrets.sh` 스크립트로 생성 (.env 필요)
- 프론트 개발 서버 포트 3000, 백엔드 8080, AI 서비스 8000 (포트 충돌 주의)
- AI 서비스는 k8s 내부에서 `http://ai-service.flowstock.svc.cluster.local:8000`으로 호출
