# FlowStock

주식 뉴스와 종목 간의 관계를 AI(LangChain + Claude)로 분석하고, ReactFlow 기반 그래프로 시각화하는 서비스.

---

## Architecture Overview

```
                         Internet
                            |
                      Route53 DNS
                     (flowstock.info)
                            |
              +-------------+-------------+
              |                           |
        CloudFront CDN            Cloudflare Tunnel
         (us-east-1)            (api.flowstock.info)
              |                           |
     S3 Frontend Bucket         Mini PC (k3s Cluster)
     (Static SPA Assets)                  |
                                    Traefik Ingress
                                          |
                              +-----------+-----------+-----------+
                              |           |           |           |
                         Spring Boot  Python AI   PostgreSQL    Redis
                         (2~3 pods)  (FastAPI)   (16-alpine)  (7-alpine)
                              |           |
                              +-----------+
                              |     내부 HTTP 호출
                              |     (:8000)
                +-------------+
                |             |
           KIS API       DART API
          (주식 시세)    (공시 정보)
                              |
                         Claude API
                        (LangChain)
```

### 서비스 역할 분리
| 서비스 | 역할 | 포트 |
|--------|------|------|
| **Kotlin (Spring Boot)** | 인증(OAuth), CRUD, DB 접근, API Gateway | :8080 |
| **Python (FastAPI)** | AI 분석 (뉴스 감성, 차트 패턴, 그래프 생성) | :8000 |
| **React (Vite)** | 프론트엔드 SPA | :3000 (dev) |

### AWS (최소한으로 사용)
| 서비스 | 용도 |
|--------|------|
| S3 | 프론트엔드 정적 파일, DB 백업, 에셋 업로드 |
| CloudFront | CDN + SSL/TLS + SPA 라우팅 |
| Route53 | DNS 관리 |
| SES | 이메일 알림 발송 |
| Secrets Manager | API 키/비밀번호 중앙 관리 |
| ACM | SSL 인증서 (CloudFront용) |
| IAM | 백엔드 서비스 계정 (S3, SES, Secrets 접근) |

### On-Premise (Mini PC + k3s)
| 컴포넌트 | 스펙 |
|----------|------|
| Spring Boot Backend | 2~3 replicas, HPA 오토스케일 |
| Python AI Service | 1 replica, FastAPI + LangChain |
| PostgreSQL 16 | StatefulSet, 20Gi PVC |
| Redis 7 | StatefulSet, 5Gi PVC, AOF 영속성 |
| Traefik | k3s 기본 Ingress Controller |
| Prometheus | 메트릭 수집 (15s 간격, 15일 보관) |
| Grafana | 대시보드 (grafana.flowstock.info) |
| Jaeger | 분산 트레이싱 (jaeger.flowstock.info) |

---

## Backend Architecture (Kotlin)

```
com.flowstock/
├── domain/                          # 비즈니스 도메인
│   ├── member/                      # 회원 (OAuth Only: Google/Naver)
│   │   ├── controller/
│   │   ├── dto/
│   │   ├── entity/    Member, Role
│   │   ├── repository/
│   │   └── service/   MemberService, GoogleOAuthService, NaverOAuthService
│   ├── news/                        # 뉴스 & AI 분석 (Python 서비스 호출)
│   │   ├── dto/       NewsAnalysisResult, GraphNode, GraphEdge
│   │   ├── entity/    News, NewsStockRelation, Sentiment, RelationType
│   │   ├── repository/
│   │   └── service/   NewsService (AI 분석 요청 → Python)
│   └── stock/                       # 종목 데이터
│       ├── entity/    Stock, StockPrice
│       └── repository/
├── global/                          # 공통 인프라
│   ├── common/        BaseEntity (JPA Auditing)
│   ├── config/        SecurityConfig, JpaAuditingConfig
│   ├── exception/     ErrorCode, BusinessException, GlobalExceptionHandler
│   ├── response/      ApiResponse<T>
│   └── security/      JwtService, JwtAuthenticationFilter
└── infra/                           # 외부 연동
    └── ai/            AiServiceClient (Python FastAPI 호출)
```

### 핵심 기능
- **JWT 인증**: Access Token (1h) + Refresh Token (7d), Stateless
- **OAuth Only**: Google (JWK 검증) + Naver (토큰 기반), 이메일 가입/로그인 없음
- **뉴스 AI 분석**: Python AI 서비스로 분석 요청 → 결과 DB 저장
- **그래프 데이터**: News → Stock 관계를 ReactFlow 노드/엣지 형태로 제공
- **Flyway**: DB 마이그레이션 관리 (prod), ddl-auto (local)

---

## AI Service Architecture (Python)

```
flowstock-ai/
├── app/
│   ├── main.py              # FastAPI 엔트리포인트
│   ├── config.py            # Settings (pydantic-settings)
│   ├── agents/
│   │   ├── news_analyzer.py # 뉴스 감성분석 + 종목 연관도 (LangChain)
│   │   ├── chart_agent.py   # OHLCV 기술적 분석 (LangChain)
│   │   └── graph_agent.py   # 네트워크 그래프 생성 (LangChain)
│   ├── models/
│   │   └── schemas.py       # Pydantic 요청/응답 모델
│   └── routers/
│       ├── news.py          # POST /api/ai/news/analyze
│       ├── chart.py         # POST /api/ai/chart/analyze
│       └── graph.py         # POST /api/ai/graph/generate
├── requirements.txt
└── Dockerfile
```

### AI 에이전트
| 에이전트 | 기능 | LLM |
|---------|------|-----|
| NewsAnalyzer | 감성분석, 요약, 중요도, 관련종목+영향도 | Claude Sonnet |
| ChartAgent | OHLCV 패턴, 추세, 지지/저항선 분석 | Claude Sonnet |
| GraphAgent | ReactFlow 호환 노드/엣지 그래프 생성 | Claude Sonnet |

**향후 확장**: LangGraph (에이전트 오케스트레이션), LangSmith (트레이싱/모니터링)

---

## Frontend Architecture (React)

### 인증 방식
- **OAuth Only**: Google/Naver 소셜 로그인만 지원
- **ProtectedRoute**: 미인증 시 `/login`으로 리다이렉트
- **토큰 영속화**: localStorage에 JWT + 사용자 정보 저장

### 페이지
| 경로 | 인증 | 설명 |
|------|------|------|
| `/login` | 공개 | Google/Naver OAuth 버튼 |
| `/` | 필수 | 시장 지수, 등락 종목, 뉴스 요약 |
| `/stock/:id` | 필수 | 캔들차트 + 뉴스 네트워크 그래프 |
| `/news` | 필수 | 뉴스 목록 + 네트워크 시각화 |
| `/portfolio` | 필수 | 포트폴리오 관리, 섹터 분포 |

### API 통신
- `src/services/api.ts` — 중앙 API 클라이언트 (Bearer 토큰 자동 첨부, 401 자동 로그아웃)
- Vite 개발 프록시: `/api` → `http://localhost:8080` (Kotlin 백엔드)

---

## Project Roadmap

### Phase 1 - Infrastructure Foundation (완료)
- [x] Terraform 코드 작성 (S3, CloudFront, Route53, SES, Secrets Manager)
- [x] k8s 매니페스트 작성 (PostgreSQL, Redis, Backend, AI Service, Monitoring)
- [x] 백엔드 코어 구현 (Member, News, Stock 도메인)
- [x] 도메인 구매 (flowstock.info)
- [x] Python AI 서비스 구축 (FastAPI + LangChain)
- [x] 프론트엔드 구현 (React + OAuth 로그인 + API 연동)
- [x] 시크릿 관리 체계 (.env + envsubst + 스크립트)
- [ ] `terraform apply` — AWS 리소스 생성
- [ ] ACM 인증서 DNS 검증 완료

### Phase 2 - CI/CD Pipeline
- [ ] GitHub Actions 워크플로우 구성
  - **Backend**: Push → Test → Docker Build → GHCR Push → k3s 배포
  - **AI Service**: Push → Docker Build → GHCR Push → k3s 배포
  - **Frontend**: Push → Build → S3 Sync → CloudFront Invalidation
  - **Infra**: PR → `terraform plan` → Merge → `terraform apply`
- [ ] Docker 멀티스테이지 빌드 (Kotlin JDK 21, Python 3.12)
- [ ] GitHub Environments로 prod/dev 분리

### Phase 3 - k3s Cluster Setup
- [ ] 미니 PC에 k3s 설치
- [ ] Cloudflare Tunnel 설정 (api.flowstock.info → k3s Traefik)
- [ ] `.env` 작성 → `scripts/generate-secrets.sh` 실행
- [ ] 네임스페이스 → PostgreSQL → Redis → AI Service → Backend 순서 배포
- [ ] 모니터링 스택 배포

### Phase 4 - Backend Completion
- [ ] Stock 도메인 완성 (KIS API 연동, 시세 수집 스케줄러)
- [ ] News 도메인 완성 (뉴스 수집 → AI 분석 → 관계 매핑 파이프라인)
- [ ] DART 공시 연동 (공시 수집 + AI 요약)
- [ ] Redis 캐싱 적용 (주가 데이터, 뉴스 목록)
- [ ] API 문서화 (Swagger/SpringDoc)

### Phase 5 - AI Enhancement
- [ ] LangGraph 도입 (에이전트 간 오케스트레이션)
- [ ] LangSmith 연동 (프롬프트 트레이싱, 성능 모니터링)
- [ ] 뉴스 크롤러 (BeautifulSoup/Scrapy)
- [ ] RAG 파이프라인 (뉴스 임베딩 → 벡터 검색)
- [ ] 주가 패턴 분석 (pandas + 기술적 지표)

### Phase 6 - Production Hardening
- [ ] PostgreSQL 백업 CronJob → S3 업로드
- [ ] Grafana 알림 규칙 (CPU/Memory/에러율 임계값)
- [ ] Rate Limiting (Traefik 미들웨어)
- [ ] 로그 수집 (Loki or EFK)
- [ ] 부하 테스트 (k6 or Locust)

---

## Quick Start

### Prerequisites
- AWS CLI configured (`aws configure`)
- Terraform >= 1.6
- kubectl + k3s
- JDK 21 + Gradle
- Python 3.12+
- Node.js 18+

### 1. AWS Infrastructure
```bash
cd flowstock-infra/terraform

# 도메인 구매 후 자동 생성된 Hosted Zone import
aws route53 list-hosted-zones
terraform import aws_route53_zone.flowstock <ZONE_ID>

# tfvars 설정
cat > terraform.tfvars <<EOF
ses_email    = "no-reply@flowstock.info"
environment  = "prod"
EOF

terraform init
terraform plan
terraform apply
```

### 2. k3s Cluster
```bash
# .env 작성
cd flowstock-infra
cp .env.example .env
# .env 파일에 실제 값 입력

# 시크릿 생성
kubectl apply -f k8s/namespace/namespaces.yaml
./scripts/generate-secrets.sh

# 순서대로 배포
kubectl apply -f k8s/postgresql/
kubectl apply -f k8s/redis/
kubectl apply -f k8s/ai-service/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/monitoring/
```

### 3. Local Development
```bash
# AI Service (터미널 1)
cd flowstock-ai
export CLAUDE_API_KEY=your-key
pip install -r requirements.txt
uvicorn app.main:app --port 8000

# Backend (터미널 2)
cd flowstock-backend
./gradlew :app:bootRun --args='--spring.profiles.active=local'

# Frontend (터미널 3)
cd flowstock-front
npm install
npm run dev   # http://localhost:3000 → /api는 :8080으로 프록시
```

---

## Directory Structure
```
flowstock/
├── flowstock-front/          # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── pages/            # Index, StockDetail, NewsPage, PortfolioPage, LoginPage
│   │   ├── components/       # UI (shadcn) + auth (ProtectedRoute) + stock + home + layout
│   │   ├── services/         # api.ts (중앙 API 클라이언트)
│   │   ├── stores/           # useStore.ts (Zustand + localStorage)
│   │   └── hooks/
│   └── vite.config.ts
├── flowstock-backend/        # Spring Boot 3.2 (Kotlin)
│   ├── app/src/main/
│   │   ├── kotlin/com/flowstock/
│   │   │   ├── domain/       # member, news, stock
│   │   │   ├── global/       # security (OAuth only), exception, response
│   │   │   └── infra/ai/     # AiServiceClient (Python 호출)
│   │   └── resources/
│   │       ├── application.yml
│   │       └── db/migration/
│   └── build.gradle.kts
├── flowstock-ai/             # FastAPI + LangChain (Python)
│   ├── app/
│   │   ├── agents/           # news_analyzer, chart_agent, graph_agent
│   │   ├── routers/          # news, chart, graph
│   │   └── models/           # schemas (Pydantic)
│   ├── requirements.txt
│   └── Dockerfile
├── flowstock-infra/          # Infrastructure as Code
│   ├── terraform/            # AWS (S3, CloudFront, Route53, SES, IAM)
│   ├── k8s/                  # k3s manifests
│   │   ├── namespace/        # namespaces + secrets (플레이스홀더)
│   │   ├── postgresql/
│   │   ├── redis/
│   │   ├── ai-service/       # Python AI Deployment + Service
│   │   ├── backend/
│   │   └── monitoring/
│   ├── scripts/              # generate-secrets.sh
│   ├── .env.example          # 시크릿 키 템플릿
│   └── .env                  # 실제 시크릿 값 (gitignored)
├── CLAUDE.md
└── README.md
```
