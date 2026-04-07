# FlowStock - AI 기반 주식 뉴스 분석 플랫폼

## 프로젝트 개요
주식 관련 뉴스를 AI(Claude API)로 분석하여 종목과의 관계, 감성 분석, 영향도를 시각화하는 서비스.
도메인: `flowstock.info`

## 아키텍처
- **프론트엔드**: AWS S3 + CloudFront CDN
- **백엔드**: 온프레미스 k3s 클러스터 (Cloudflare Tunnel로 연결)
- **DB**: PostgreSQL 16 (k3s StatefulSet, 20Gi)
- **캐시**: Redis 7 (k3s StatefulSet, 5Gi)
- **모니터링**: Prometheus + Grafana + Jaeger

## Frontend (`flowstock-front/`)

### 스택
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI)
- TanStack React Query (서버 상태) + Zustand (클라이언트 상태)
- React Router v6

### 주요 라이브러리
- `@xyflow/react` - 뉴스-종목 네트워크 그래프
- `lightweight-charts` - TradingView 캔들스틱 차트
- `recharts` - 포트폴리오 분석 차트
- `msw` - 개발용 API 모킹 (프로덕션에서 비활성화)

### 명령어
```bash
cd flowstock-front
npm run dev        # 개발 서버 (http://localhost:8080)
npm run build      # 프로덕션 빌드
npm run lint       # ESLint
npm run test       # Vitest 단위 테스트
```

### 페이지 구조
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | Index | 시장 지수, 등락 종목, 뉴스 요약 |
| `/stock/:id` | StockDetail | 캔들차트, 뉴스 네트워크 그래프 |
| `/news` | NewsPage | 뉴스 목록 + 네트워크 시각화 |
| `/portfolio` | PortfolioPage | 포트폴리오 관리, 섹터 분포 |
| `/login` | LoginPage | 로그인 |
| `/signup` | SignupPage | 회원가입 |

### 경로 alias
- `@/` → `src/`

## Backend (`flowstock-backend/`)

### 스택
- Spring Boot 3.2.0 + Kotlin 1.9.20
- Gradle (Kotlin DSL), JVM 21
- Spring Data JPA + QueryDSL + Flyway
- Spring Security + JWT (JJWT 0.12.3)

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
│   ├── member/    # 회원, OAuth(Google/Naver), JWT 인증
│   ├── news/      # 뉴스, AI 분석, 종목 연관관계
│   ├── stock/     # 종목, 가격(OHLCV)
│   ├── dart/      # DART 공시 (미구현)
│   └── portfolio/ # 포트폴리오 (미구현)
├── global/
│   ├── security/  # JWT 필터, SecurityConfig
│   ├── exception/ # BusinessException, ErrorCode
│   ├── response/  # ApiResponse<T> 래퍼
│   └── config/    # JPA Auditing, RestTemplate
└── infra/
    └── claude/    # Claude API 클라이언트
```

### 주요 API
- `POST /api/members/signup` - 회원가입
- `POST /api/members/login` - 로그인
- `POST /api/members/oauth/{provider}` - 소셜 로그인 (Google/Naver)
- `GET /api/members/me` - 내 정보
- `POST /api/members/token/refresh` - 토큰 갱신

### 프로파일
- `local`: H2/로컬 PostgreSQL, Flyway 비활성, ddl-auto=update
- `prod` (기본): PostgreSQL, Flyway 활성, ddl-auto=validate

### 외부 API
- **Claude (Anthropic)**: 뉴스 감성분석, 요약, 종목 연관도 추출
- **KIS (한국투자증권)**: 주가 데이터
- **DART**: 전자공시

## Infrastructure (`flowstock-infra/`)

### Terraform (`terraform/`)
- AWS Provider: ap-northeast-2 (서울)
- S3: frontend(정적파일), backup(DB백업, 30일), assets(업로드)
- CloudFront: S3 + API 오리진, SPA 라우팅, ACM SSL
- Route53: flowstock.info DNS
- SES: 이메일 발송
- Secrets Manager: API 키, DB 비밀번호 등
- IAM: 백엔드용 서비스 계정

### Kubernetes (`k8s/`)
- **네임스페이스**: flowstock, flowstock-monitoring
- **백엔드**: Deployment (2~3 replica, HPA), ClusterIP Service
- **PostgreSQL**: StatefulSet, 20Gi PVC
- **Redis**: StatefulSet, 5Gi, allkeys-lru 정책
- **Ingress**: Traefik + CORS 미들웨어
- **모니터링**: Prometheus(15s scrape) + Grafana + Jaeger

### 배포 플로우
1. Terraform apply (AWS 리소스)
2. k3s 클러스터에 namespace, secrets 생성
3. PostgreSQL → Redis → Backend → Ingress → Monitoring 순서 배포
4. 프론트엔드: S3 업로드 + CloudFront 캐시 무효화

## 환경 변수 (시크릿)
- `JWT_SECRET`, `DB_PASSWORD`, `REDIS_PASSWORD`
- `KIS_APP_KEY`, `KIS_APP_SECRET`
- `DART_API_KEY`, `CLAUDE_API_KEY`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- OAuth: `GOOGLE_CLIENT_ID`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`

## 컨벤션
- 커밋 메시지: `add : 설명` / `fix : 설명` 형식 (한국어)
- 백엔드 응답: `ApiResponse<T>` 래퍼 사용
- 예외 처리: `BusinessException` + `ErrorCode` enum
- 엔티티: `BaseEntity` 상속 (createdAt, updatedAt 자동 관리)
- 프론트 컴포넌트: shadcn/ui 기반, `cn()` 유틸로 클래스 병합

## 주의사항
- Terraform apply 시 기존 리소스가 있으면 반드시 `terraform import` 먼저 실행
- MSW는 개발 환경에서만 동작 (`import.meta.env.PROD`로 체크)
- 프론트 빌드 시 `@/` 경로 alias 확인
- k8s secrets는 yaml이 아닌 `kubectl create secret` 명령어로 생성 권장
