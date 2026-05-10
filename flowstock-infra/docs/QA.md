# QA — Production Readiness 점검

FlowStock의 production 운영을 위해 정기적으로 돌리는 frontend/backend QA 절차. 빈 화면·콘솔 에러·응답 지연·부하 한계·contract 불일치를 자동으로 검출.

## QA 3 Layer — 무엇을 검증하는가

| Layer | 검증 범위 | 도구 | 한계 |
|---|---|---|---|
| **Sanity** | 페이지가 mount되고 root에 컨텐츠 있나 | Playwright `qa:pages` | dropdown 비어있어도 통과 (인터랙션 결과 안 봄) |
| **Contract** | API 응답이 정상 + 비어있지 않은 data | `qa:contract` | 응답 형태만 검증, UI 노출 X |
| **Scenario** | 로그인→매수→매도 같은 user flow | (TODO) Playwright scenario | 작성 비용 큼, 핵심 flow만 |
| Unit | 컴포넌트 격리 동작 | vitest | mock fetch — 실제 API 안 거침 |
| Performance | LCP/TBT/CLS | Lighthouse | 한 시점만 |
| Load | 동시성/처리율 | Apache Bench | POST/Claude endpoint는 X |

각 layer는 다른 종류의 결함을 잡는다. **하나만 통과해서 안심하면 안 됨.**

## 회고 — 2026-05-11 모의투자 종목 검색 빈 dropdown

증상: 사용자가 모의투자 페이지에서 종목 검색 dropdown이 비어있다고 보고. backend `/api/stocks`가 `{"data":[]}` 반환.

원인: backend StockController가 ai-service에 `?market=ALL`로 호출했지만 ai-service router가 ALL을 거절(400). `stock_data_service.get_market_ohlcv`는 이미 ALL 지원했지만 router validation에서 막힘. backend는 7일 retry 후 빈 배열로 응답.

**왜 검출 못 했나**:

| QA 종류 | 통과 여부 | 이유 |
|---|---|---|
| vitest unit | 통과 | fetch mock — 실제 ai-service 호출 안 함 |
| Playwright `qa:pages` | 통과 | root innerText >= 50 만 검증. dropdown 옵션 0개여도 페이지 mount는 됨 |
| backend integration test | 부재 | backend → ai-service 호출하는 e2e 자체 없음 |
| contract test | 부재 (2026-05-11 추가) | 응답이 비어있는지 확인 안 함 |

**교훈**:
- "코드 컴파일 + 페이지 mount"는 sanity일 뿐, **기능 보장 X**.
- 두 서비스 사이 query parameter / response shape 변경은 **양쪽 다** 검증해야.
- vitest mock 테스트는 unit 보장만. 실제 contract는 별도 layer.

→ 이 회고로 contract test layer 신설(`qa:contract`). Scenario test는 다음 PR 예정.

## 도구 스택

| 영역 | 도구 | 용도 |
|---|---|---|
| Frontend 페이지 sanity | Playwright (chromium headless) | 모든 라우트 순회, 빈 화면/콘솔 에러 검출 |
| Frontend 성능 | Lighthouse | LCP/TBT/TTI/CLS 측정, 임계치 체크 |
| Backend 부하 | Apache Bench (`ab`) | read-only endpoint 동시성 테스트 |
| 분산 추적 | Jaeger | 느린 요청 root cause |
| 로그 검색 | Loki + LogQL | QA 실행 시점 에러/지연 추적 |

## 1. Backend Contract Test (`qa:contract`)

`flowstock-front/scripts/qa-contract.mjs`. 모든 public read-only endpoint가 (a) 200 status (b) `success: true` (c) data가 비어있지 않음을 검증.

```bash
cd flowstock-front
npm run qa:contract                                  # prod
QA_API_BASE=http://localhost:8080 npm run qa:contract  # local
```

**판정**: 각 endpoint가 `expect: array | object` + `minLen` 충족. 실패 시 "어느 endpoint가 어떤 이유"로 출력.

새 endpoint 추가 시 `ENDPOINTS` 배열에 한 줄 추가. backend↔ai-service contract 변경 PR마다 이 테스트 통과 확인 필수.

## 3. Frontend 페이지 sanity (Playwright)

`flowstock-front/scripts/qa-pages.mjs`. 21개 라우트를 N회 순회하며 root innerText 길이 + console.error/pageerror/navigation timeout 캡처.

```bash
cd flowstock-front

# prod (기본)
npm run qa:pages

# 페이지당 5회 (총 105 runs, 약 9분)
QA_REPEATS=5 npm run qa:pages

# local dev 서버 대상
QA_BASE=http://localhost:3000 npm run qa:pages
```

**판정 기준**:
- `rootLen >= 50` (root 컨텐츠 50자 이상)
- console.error / pageerror 0건 (IGNORE_PATTERNS 제외 — favicon 404, web-vitals log 등)
- navigation timeout 미발생 (20s)

**실패 시 우선 확인**:
- `BLANK rootLen=N` → ErrorBoundary 안내 또는 Suspense fallback 동작 점검
- `pageerror: ...` → Loki에서 backend 동시 에러 검색 (`{namespace="flowstock"} |= "<trace_id>"`)
- `navigation: timeout` → Cloudflare Tunnel/cloudflared pod 상태

## 4. Frontend 성능 (Lighthouse)

```bash
npx lighthouse https://flowstock.info \
  --output json --output-path ./lh.json \
  --only-categories=performance \
  --chrome-flags="--headless"
```

**임계치**:

| 메트릭 | Target | Critical |
|---|---|---|
| Performance score | ≥ 80 | < 60 |
| LCP (Largest Contentful Paint) | < 2.5s | > 4.0s |
| TBT (Total Blocking Time) | < 200ms | > 600ms |
| CLS (Cumulative Layout Shift) | < 0.1 | > 0.25 |
| TTI (Time to Interactive) | < 3.8s | > 7.3s |

Critical 이상이면 release 보류. Target 이상이면 정상.

**개선 후보**:
- vite chunk 분리 — `vite.config.ts`의 `build.rollupOptions.output.manualChunks`
- 이미지 lazy loading + `loading="lazy"` attribute
- preconnect hint to backend domain
- Cloudflare Pages cache TTL 점검

## 5. Backend 부하 (Apache Bench)

read-only endpoint에 동시 요청 100건씩.

```bash
ab -n 100 -c 10 https://flowstock.info/api/news/latest
ab -n 100 -c 10 https://flowstock.info/api/stocks
ab -n 100 -c 10 https://flowstock.info/api/market
```

**임계치**:

| 메트릭 | Target | Critical |
|---|---|---|
| Failed requests | 0 | > 1% |
| 평균 응답 시간 | < 500ms | > 2000ms |
| p95 응답 시간 | < 1500ms | > 5000ms |
| 처리율 (req/sec) | > 10 | < 2 |

**주의**:
- POST `/api/chatbot`, `/api/review/analyze` 등은 Claude API 호출이라 **부하 테스트 금지** (구독 한도 소진)
- 외부 RSS/Naver Finance 호출하는 endpoint는 60s cache 활용 — 첫 요청 1번만 외부, 이후 캐시
- 부하 중 backend pod restart 발생하면 HPA/리소스 제한 점검

## 6. 정기 QA 권장 사이클

| 시점 | 항목 | 임계치 초과 시 |
|---|---|---|
| 매 PR 머지 직후 (CI) | `npm run test` (vitest), backend gradle test, **`qa:contract`** | merge 차단 |
| Release 전 | 1·2·3·4·5 모두 | release 보류 |
| 주 1회 (월요일 오전) | 2·3·4 | 결과 issue로 박음 |
| 사용자 빈 화면/지연 보고 시 | 3 (REPEATS=5) + Loki 로그 | 즉시 fix |
| 사용자 기능 깨짐 보고 시 | 1 (`qa:contract`) → 2 (sanity) → backend 로그 | 즉시 fix |

## 7. CI 통합 후보

`.github/workflows/qa.yml` 스케줄(cron) 또는 schedule_dispatch:

```yaml
schedule:
  - cron: "0 0 * * 1"   # 매주 월요일 09:00 KST
jobs:
  qa-pages:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - working-directory: flowstock-front
        run: |
          npm ci
          npx playwright install --with-deps chromium
          QA_REPEATS=3 npm run qa:pages
```

실패 시 GitHub Issue 자동 생성 (`daily-health.yml` 패턴 참고).

## 8. 실패 케이스별 디버깅 매트릭스

| 증상 | 1단계 | 2단계 | 3단계 |
|---|---|---|---|
| 빈 화면 (rootLen<50) | Playwright 결과의 errors 배열 | Loki: `{app="flowstock-backend"} \|~ "ERROR\|5xx"` (해당 시각) | Jaeger trace 조회 |
| dropdown/리스트 비어있음 | `qa:contract` 결과의 minLen 위반 | ai-service 로그(`k3s kubectl logs deployment/ai-service`) — 400/500 분포 | backend↔ai-service router signature 일치 확인 |
| console error | error 메시지로 해당 컴포넌트 grep | git blame으로 최근 변경자 | rollback 또는 hotfix |
| 응답 지연 (p95 > 5s) | ab 결과의 connect/processing 분리 | Grafana JVM dashboard (heap/GC) | DB 쿼리 분석(`org.hibernate.SQL` DEBUG) |
| 부하 시 5xx | backend pod 로그 | HPA replica 수 / memory limit | k3s describe pod (OOMKilled?) |
| Lighthouse LCP 느림 | dist/assets/*.js 크기 분포 | network waterfall (Chrome DevTools) | Cloudflare Pages cache 통계 |

## 9. 도구 설치 (1회)

```bash
# Playwright + Chromium
cd flowstock-front
npm install --save-dev playwright
npx playwright install chromium

# Apache Bench (macOS)
# 기본 설치됨. 없으면: brew install httpd

# Lighthouse — npx로 1회용 호출 (별도 install 불필요)
```

## 관련 docs

- `LOGGING.md` — Loki LogQL 쿼리 패턴
- `ALERTING.md` — QA 임계치 알림 자동화
- `MINI-PC-GUIDE.md` — k3s pod 디버깅 명령
