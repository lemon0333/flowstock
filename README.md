# FlowStock

주식 뉴스와 종목 간의 관계를 AI로 분석하고, ReactFlow 기반 그래프로 시각화하는 서비스.

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
                              +-----------+-----------+
                              |           |           |
                         Spring Boot  PostgreSQL    Redis
                         (2~3 pods)    (16-alpine) (7-alpine)
                              |
                +-------------+-------------+
                |             |             |
           Claude API     KIS API      DART API
           (AI 분석)     (주식 시세)    (공시 정보)
```

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
| PostgreSQL 16 | StatefulSet, 20Gi PVC |
| Redis 7 | StatefulSet, 5Gi PVC, AOF 영속성 |
| Traefik | k3s 기본 Ingress Controller |
| Prometheus | 메트릭 수집 (15s 간격, 15일 보관) |
| Grafana | 대시보드 (grafana.flowstock.info) |
| Jaeger | 분산 트레이싱 (jaeger.flowstock.info) |

---

## Backend Architecture

```
com.flowstock/
├── domain/                          # 비즈니스 도메인
│   ├── member/                      # 회원 (가입/로그인/OAuth)
│   │   ├── controller/
│   │   ├── dto/
│   │   ├── entity/    Member, Role
│   │   ├── repository/
│   │   └── service/   MemberService, GoogleOAuthService, NaverOAuthService
│   ├── news/                        # 뉴스 & AI 분석
│   │   ├── dto/       NewsAnalysisResult, GraphNode, GraphEdge
│   │   ├── entity/    News, NewsStockRelation, Sentiment, RelationType
│   │   ├── repository/
│   │   └── service/   NewsService (AI 분석 + ReactFlow 그래프 생성)
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
    └── claude/        ClaudeClient (뉴스 분석, 공시 요약)
```

### 핵심 기능
- **JWT 인증**: Access Token (1h) + Refresh Token (7d), Stateless
- **OAuth**: Google (JWK 검증) + Naver (토큰 기반), 계정 연동 지원
- **뉴스 AI 분석**: Claude API로 뉴스 감성/중요도 분석 → 관련 종목 매핑
- **그래프 데이터**: News → Stock 관계를 ReactFlow 노드/엣지 형태로 제공
- **Flyway**: DB 마이그레이션 관리 (prod), ddl-auto (local)

### 기술 스택
- Kotlin 1.9 + Spring Boot 3.2
- JPA/Hibernate + QueryDSL (Jakarta)
- PostgreSQL 16 + Redis 7
- WebClient (비동기 HTTP)
- JJWT (JWT 처리)

---

## AI Service: MSA 분리 검토

현재 Claude API 호출은 `ClaudeClient`에서 Spring WebClient로 직접 수행하고 있다.
Python으로 분리하는 것이 유리한 시점과 이유:

### 지금은 분리 불필요
- Claude API 호출이 단순 HTTP 요청 + JSON 파싱 수준
- `analyzeNews`, `summarizeDart` 두 개 엔드포인트만 존재
- Spring WebClient의 코루틴 지원으로 비동기 처리 충분

### 이런 경우 Python MSA 분리 권장
| 조건 | 이유 |
|------|------|
| RAG 파이프라인 도입 | LangChain, LlamaIndex 등 Python 생태계가 압도적 |
| 임베딩/벡터 검색 | sentence-transformers, FAISS, ChromaDB 등 |
| 뉴스 크롤링/스크래핑 | BeautifulSoup, Scrapy, newspaper3k |
| 데이터 분석/시각화 | pandas, numpy로 주가 패턴 분석 |
| LLM Fine-tuning | Hugging Face, PyTorch 생태계 |
| Prompt 복잡도 증가 | 멀티 턴 대화, Tool Use, Agent 패턴 |

### 분리 시 아키텍처
```
Spring Boot (API Gateway)
    |
    +---> Python AI Service (FastAPI)    # 새로 추가
    |         ├── news_analyzer.py       # 뉴스 분석
    |         ├── dart_summarizer.py     # 공시 요약
    |         ├── embedding_service.py   # 벡터 임베딩
    |         └── rag_pipeline.py        # RAG 검색
    |
    +---> PostgreSQL
    +---> Redis (캐시 + 메시지 큐)
```

- Spring Boot ↔ Python 통신: Redis Pub/Sub 또는 gRPC
- k8s에서 별도 Deployment로 배포, 독립 스케일링 가능

**결론: 현재 단계에서는 Kotlin 단일 서비스 유지. RAG나 크롤링이 필요해지면 Python 마이크로서비스로 분리.**

---

## Project Roadmap

### Phase 1 - Infrastructure Foundation (현재)
- [x] Terraform 코드 작성 (S3, CloudFront, Route53, SES, Secrets Manager)
- [x] k8s 매니페스트 작성 (PostgreSQL, Redis, Backend, Monitoring)
- [x] 백엔드 코어 구현 (Member, News, Stock 도메인)
- [x] 도메인 구매 (flowstock.info)
- [ ] `terraform apply` — AWS 리소스 생성
- [ ] Route53 Hosted Zone import (도메인 구매 시 자동 생성된 zone)
- [ ] ACM 인증서 DNS 검증 완료

### Phase 2 - CI/CD Pipeline
- [ ] GitHub Actions 워크플로우 구성
  - **Backend**: Push → Test → Docker Build → GHCR Push → k3s 배포
  - **Frontend**: Push → Build → S3 Sync → CloudFront Invalidation
  - **Infra**: PR → `terraform plan` → Merge → `terraform apply`
- [ ] Docker 멀티스테이지 빌드 (Kotlin + GraalVM or JDK 21)
- [ ] GitHub Environments로 prod/dev 분리
- [ ] Slack/Discord 배포 알림

### Phase 3 - k3s Cluster Setup
- [ ] 미니 PC에 k3s 설치 (`curl -sfL https://get.k3s.io | sh -`)
- [ ] Cloudflare Tunnel 설정 (api.flowstock.info → k3s Traefik)
- [ ] kubectl로 시크릿 등록 (terraform output → k8s secret)
- [ ] 네임스페이스 → PostgreSQL → Redis → Backend 순서로 배포
- [ ] 모니터링 스택 배포 (Prometheus + Grafana + Jaeger)
- [ ] Grafana 대시보드 구성 (JVM 메트릭, API 지연시간, DB 커넥션)

### Phase 4 - Backend Completion
- [ ] Flyway 마이그레이션 스크립트 작성 (V1__init.sql)
- [ ] Stock 도메인 완성 (KIS API 연동, 시세 수집 스케줄러)
- [ ] News 도메인 완성 (뉴스 수집 → AI 분석 → 관계 매핑 파이프라인)
- [ ] DART 공시 연동 (공시 수집 + Claude 요약)
- [ ] Redis 캐싱 적용 (주가 데이터, 뉴스 목록)
- [ ] API 문서화 (Swagger/SpringDoc)

### Phase 5 - Frontend Development
- [ ] React + TypeScript 프로젝트 초기화
- [ ] ReactFlow 기반 뉴스-종목 관계 그래프 UI
- [ ] 뉴스 피드 + 감성 분석 결과 표시
- [ ] 종목 상세 페이지 (차트, 관련 뉴스)
- [ ] 회원 기능 (가입/로그인/OAuth/프로필)
- [ ] S3 배포 파이프라인 연결

### Phase 6 - Production Hardening
- [ ] Let's Encrypt / Traefik 자동 TLS (k3s 내부)
- [ ] PostgreSQL 백업 CronJob → S3 업로드
- [ ] Grafana 알림 규칙 (CPU/Memory/에러율 임계값)
- [ ] Rate Limiting (Traefik 미들웨어)
- [ ] 로그 수집 (Loki or EFK)
- [ ] 부하 테스트 (k6 or Locust)

### Phase 7 - AI Enhancement (Python MSA 분리 시점)
- [ ] Python FastAPI 서비스 구축
- [ ] 뉴스 크롤러 (BeautifulSoup/Scrapy)
- [ ] RAG 파이프라인 (뉴스 임베딩 → 벡터 검색 → 맥락 기반 분석)
- [ ] 주가 패턴 분석 (pandas + 기술적 지표)
- [ ] k8s 별도 Deployment로 배포

---

## Quick Start

### Prerequisites
- AWS CLI configured (`aws configure`)
- Terraform >= 1.6
- kubectl + k3s
- JDK 21 + Gradle

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
# 시크릿 등록 (terraform output 값 사용)
kubectl apply -f k8s/namespace/namespaces.yaml

kubectl create secret generic flowstock-secrets \
  --from-literal=DB_PASSWORD=$(openssl rand -base64 16) \
  --from-literal=REDIS_PASSWORD=$(openssl rand -base64 16) \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --from-literal=KIS_APP_KEY=<your-key> \
  --from-literal=KIS_APP_SECRET=<your-secret> \
  --from-literal=DART_API_KEY=<your-key> \
  --from-literal=CLAUDE_API_KEY=<your-key> \
  --from-literal=AWS_ACCESS_KEY_ID=$(terraform -chdir=../terraform output -raw iam_access_key_id) \
  --from-literal=AWS_SECRET_ACCESS_KEY=$(terraform -chdir=../terraform output -raw iam_secret_access_key) \
  -n flowstock

# 순서대로 배포
kubectl apply -f k8s/postgresql/
kubectl apply -f k8s/redis/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/monitoring/
```

### 3. Local Development
```bash
cd flowstock-backend
./gradlew :app:bootRun --args='--spring.profiles.active=local'
```

---

## CI/CD Pipeline (To Be Implemented)

### Backend Deploy Flow
```
git push main
  → GitHub Actions trigger
    → ./gradlew test
    → docker build -t ghcr.io/<org>/flowstock-backend:$SHA
    → docker push ghcr.io/<org>/flowstock-backend:$SHA
    → kubectl set image deployment/flowstock-backend \
        flowstock-backend=ghcr.io/<org>/flowstock-backend:$SHA \
        -n flowstock
```

### Frontend Deploy Flow
```
git push main
  → GitHub Actions trigger
    → npm run build
    → aws s3 sync dist/ s3://flowstock-frontend-prod --delete
    → aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"
```

### Infrastructure Change Flow
```
git push (PR)
  → terraform plan (comment on PR)
git merge
  → terraform apply (auto)
```

---

## Directory Structure
```
flowstock/
├── flowstock-backend/        # Spring Boot (Kotlin)
│   ├── app/
│   │   └── src/main/
│   │       ├── kotlin/com/flowstock/
│   │       │   ├── domain/   # member, news, stock
│   │       │   ├── global/   # config, security, exception
│   │       │   └── infra/    # claude client
│   │       └── resources/
│   │           ├── application.yml
│   │           ├── application-local.yml
│   │           └── db/migration/
│   └── build.gradle.kts
├── flowstock-infra/          # Infrastructure as Code
│   ├── terraform/            # AWS (S3, CloudFront, Route53, SES, IAM)
│   └── k8s/                  # k3s manifests
│       ├── namespace/
│       ├── postgresql/
│       ├── redis/
│       ├── backend/
│       └── monitoring/
└── README.md
```
