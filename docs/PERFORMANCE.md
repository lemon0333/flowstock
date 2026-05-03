# 성능 분석 & 개선 이력

> FlowStock 운영 환경의 응답 지연 진단과 그에 대응한 개선 작업 기록.
> 새 항목은 위(최신)에 추가한다. 추측 → 측정 → 가설 → 적용 → 재측정 사이클을 유지한다.

## 진단 도구

| 도구 | 용도 | 위치 |
|------|------|------|
| Jaeger (all-in-one) | 백엔드 분산 trace, span 단위 latency | `https://jaeger.flowstock.info` |
| Prometheus + Grafana | 시계열 metric (CPU/메모리/요청수) | `https://grafana.flowstock.info` |
| GitHub Actions Daily Health Check | URL probe + CI 실패 + npm audit 일일 점검 | `.github/workflows/daily-health.yml` |
| Web Vitals (web-vitals npm) | 프론트 LCP/INP/CLS/FCP/TTFB 측정 | DevTools 콘솔 + localStorage |
| Curl wall-clock | 사용자 체감 응답 시간 baseline | 임시 측정용 |

---

## 2026-05-04: AI service 트레이싱 + RSS 병렬화 + TTL 캐시 + Web Vitals

### 진단 (Before)

Jaeger trace 분석 결과 (24h, 14 traces):

```
trace                                   total    spans
http get /api/news                      2392ms   9 (Security 5ms / 나머지 ~2387ms 안 보임)
http get /api/dart/financials/{ticker}  2321ms   5
http get /api/economy/dashboard         2265ms   9 (Security 5ms / 나머지 ~2260ms 안 보임)
```

`curl` 실측:

| Endpoint | 시간 |
|------|------|
| /api/news?limit=5 | **2.75s** |
| /api/dart/financials/005930 | 2.59s (첫 호출) |
| /api/economy/dashboard | **2.46s** |
| /api/sectors | 0.50s |
| /api/macro/dashboard | 0.47s |
| /api/stocks | 0.28s |

### 핵심 발견: 트레이스가 ai-service 진입 시점에서 끊김

backend(Spring) 의 server span 만 보이고 그 안의 WebClient 호출 → ai-service 가
**자식 span 으로 안 잡힘**. 이유: **ai-service(Python FastAPI)에 OpenTelemetry SDK
미설치**. 즉 "backend 가 외부 호출을 2초 기다린다" 까지만 알고 그 안에서 RSS
크롤링 / 네이버 금융 호출 / DB 쿼리 등이 실제로 얼마나 걸리는지 측정 불가.

추가로 추정되는 문제:

- `news_feed.py` 의 `get_latest_news` 가 4개 RSS 채널을 **for 루프로 직렬 fetch**.
  채널 1개당 200~500ms × 4 = 1.5~2초.
- `/api/news` 와 `/api/economy/dashboard` 는 캐싱 없음 — 매 호출마다 외부 fetch 반복.

### 적용한 개선

| # | 변경 | 위치 |
|---|------|------|
| 1 | **OpenTelemetry SDK + auto-instrumentation** (FastAPI / httpx / requests / SQLAlchemy) | `app/observability.py`, `app/main.py` |
| 2 | requirements.txt — opentelemetry-* 6개 추가 | `requirements.txt` |
| 3 | RSS fetch — `feedparser.parse(url)` 직렬 → `httpx.AsyncClient` + `asyncio.gather` 병렬 | `services/news_feed.py` |
| 4 | `get_latest_news_async` + 60s TTL 캐시 (`cachetools.TTLCache`) | `services/news_feed.py` |
| 5 | `get_stock_news_async` + 검색 키 단위 60s 캐시 | `services/news_feed.py` |
| 6 | `get_economy_dashboard` 응답 전체 60s 캐시 (기존 URL 단위 캐시 위에 추가) | `services/stock_data.py` |
| 7 | news router — sync wrapper 대신 직접 async 호출로 전환 | `routers/news.py` |
| 8 | Frontend `web-vitals` 패키지 + `lib/web-vitals.ts` 리포터 | `flowstock-front/src/lib/web-vitals.ts` |
| 9 | LCP/INP/CLS/FCP/TTFB 측정 + localStorage 누적 + DevTools 콘솔 출력 | `main.tsx` |

### 예상 효과 (실측은 다음 사이클에)

| Endpoint | Before | After (예상) | 메커니즘 |
|------|------|------|------|
| /api/news (cold) | 2.4s | **0.5~0.8s** | RSS 4채널 병렬 |
| /api/news (warm) | 2.4s | **~50ms** | TTL 캐시 |
| /api/economy/dashboard (warm) | 2.5s | **~10ms** | TTL 캐시 |
| Jaeger trace span 수 | 5~9 (대부분 Security) | 20+ | ai-service 자체 span + 외부 호출 span 추가 |

다음 측정에서 ai-service trace 의 RSS / Naver Finance / DB 쿼리 span 시간이
드러날 것. 그 데이터로 다음 라운드 개선 (ex. RSS 에이전트 캐싱, Naver Finance
응답 압축 등) 을 결정한다.

### 측정 가이드 (다음 사이클용)

```bash
# AI service trace 가 보이는지 확인
curl -s "https://jaeger.flowstock.info/api/services" | jq

# 같은 endpoint 두 번 호출 — 두 번째는 캐시 히트로 빨라야 함
time curl -s -o /dev/null https://api.flowstock.info/api/news?limit=10
time curl -s -o /dev/null https://api.flowstock.info/api/news?limit=10

# 프론트 Web Vitals 누적 데이터 확인 (DevTools 콘솔에서)
flowstockWebVitals()
```

---

## 2026-05-03: 배포 시간 단축 (CI/CD)

### 진단 (Before)

GitHub Actions deploy 평균 9분 12초 (552초). 잡별 분포:

| 잡 | 시간 | 비중 |
|------|------|------|
| **deploy-k8s** | **491s** | **89%** |
| build-backend | 78s | (병렬) |
| build-ai | 78s | (병렬) |
| deploy-frontend | 40s | (병렬) |

`Deploy to k3s via SSH` 단일 step 안에서 472초 발생. 분해해보니:

- `flowstock-backend` replica **3개** 운영 중 (HPA `max=3` 가 max 까지 올림)
- mini PC 1대 환경에 backend pod 3개는 과스펙 (실측 CPU 8% / 메모리 50%)
- RollingUpdate `maxSurge=1, maxUnavailable=0` → Spring Boot 90s × 3 직렬 부팅
- backend rollout 끝나야 ai-service rollout 체크 (직렬)

### 적용한 개선

| 항목 | Before | After |
|------|------|------|
| `replicas` | 2 | **1** |
| HPA `min/max` | 2 / 3 | 1 / **2** |
| HPA CPU 임계값 | 70% | 80% |
| `startupProbe periodSeconds` | 10s | **5s** |
| `startupProbe failureThreshold` | 30 | 60 (총 5분 timeout 동일) |
| `readinessProbe periodSeconds` | 10s | **5s** |
| backend + ai-service rollout 대기 | 직렬 | **& wait 병렬** |
| rollout `--timeout` | 600s | 480s |
| SSH script timing log | 없음 | 단계별 `[hh:mm:ss] +N초` |
| 실패 시 자동 describe pods | 없음 | 추가 |

### 효과 (예상)

| 시나리오 | Before | After |
|------|------|------|
| backend 부팅 (직렬 90s × 3) | ~270s+ | ~90~120s (1 replica) |
| ready 감지 latency | ~30s | ~10s |
| ai-service 대기 (병렬화) | backend 끝난 뒤 | 동시 |
| **deploy-k8s 잡** | **491s** | **~150~200s** |
| **전체 wall-clock** | **9분 12초** | **4~5분** |

---

## 2026-05-03 (이전): Cloudflare Pages 배포 실패

### 진단

```
Invalid commit message, it must be a valid UTF-8 string. [code: 8000111]
```

`npx wrangler@latest pages deploy` 가 git log 의 한글/특수기호(`→` `∞` 등) 포함된
커밋 메시지를 그대로 Cloudflare API 로 전송하면서 거부당함.

### 개선

- `deploy.yml` 에 `--commit-hash` + `--commit-message` 명시
- 커밋 메시지를 `tr -cd '[:alnum:][:space:]_.,:;()/-'` 로 ASCII 만 통과시켜 sanitize

### 후속 이슈: Node 버전

`wrangler@latest` 가 4.x 로 업그레이드되며 Node 22+ 요구. `node-version: '20'` 으로
고정되어 있어서 또 죽음.

### 개선

- `deploy.yml` + `daily-health.yml` 의 `setup-node` action node-version 20 → 22

---

## 2026-05-02: Docker 빌드 — Gradle plugin portal 503

### 진단

```
Could not get resource org.jetbrains.kotlin.kapt.gradle.plugin-1.9.20.jar
> Received status code 503 from server: Service Unavailable
```

Gradle Plugin Portal 일시 장애. Dockerfile 이 multi-stage 로 컨테이너 안에서
`./gradlew bootJar` 를 매번 새로 실행하는 구조. host 의 `~/.gradle` 캐시를
사용 못 해서 plugin/dep 를 매 빌드마다 새로 다운로드.

### 개선

- Dockerfile 단일 stage 로 단순화
- 호스트의 `Build with Gradle` 단계에서 만들어진 jar 를 그대로 `COPY`
- `.dockerignore` 에서 `app/build/libs/*.jar` 만 화이트리스트로 통과
- 결과: Docker build 안에서 gradle 호출 0회

---

## 자동 감지 (Daily Health Check)

매일 09:00 KST `daily-health.yml` 이 다음을 체크:

1. 최근 24h CI 실패 run 추출
2. Frontend `npm audit` (high/critical 만)
3. **Synthetic URL probes** — 핵심 URL 10개 status code + body 검증
   - `/sitemap.xml`, `/robots.txt`, `/`, `api/actuator/health`,
     `api/news`, `api/economy/dashboard`, `api/dart/financials/005930`,
     `api/sectors`, `api/macro/dashboard`, `api/articles`
4. 리다이렉트 체인 3 hop 초과 시 경고 (Search Console "리다이렉션 포함" 사전 탐지)

발견 시 `health-report` 라벨로 **GitHub Issue 자동 생성/업데이트**. Anthropic API
호출 0회, GitHub Actions 만으로 운영 (비용 무료).

---

## 다음 라운드 후보

- AI service trace 데이터 누적 후 재분석 (이번 작업의 측정 효과 검증)
- 프론트 web-vitals 누적 데이터 분석 — LCP/INP 가 어디서 어떻게 나오는지
- Redis 활용해 ai-service `_NAVER_CACHE` / `_DASHBOARD_CACHE` 를 분산 캐시로
  (현재 in-memory 라 ai-service pod 재시작 시 cold)
- Spring Boot AOT (Native Image) 검토 — 부팅 90s → 1s 가능
- self-hosted GitHub Actions runner 를 mini PC 에 — image push/pull 단계 제거
