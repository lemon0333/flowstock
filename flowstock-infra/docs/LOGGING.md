# Logging — Loki + Promtail × Grafana LogQL

FlowStock의 모든 컨테이너 로그는 **Loki**에 7일 보존되고 **Grafana Explore**의 LogQL 쿼리로 조회한다. 별도 ELK/Datadog 안 쓰고 mini PC 1대 환경에 가성비 맞춰 monolithic mode.

## 결정 배경

| | Loki (선택) | ELK | Datadog/Logtail |
|---|---|---|---|
| 인프라 재활용 | Grafana/Cloudflare Tunnel 그대로 | 별도 Kibana 필요 | SaaS — 외부 의존 |
| 학습 곡선 | LogQL = PromQL 거의 동일 | KQL 별도 학습 | UI 종속 |
| 리소스 | 단일 Pod, 256~512Mi | 무거움 (ES + Logstash + Kibana) | 0 (외부) |
| 비용 | 0 | 0 (자체 호스팅) | 무료 한도 작음 |
| 장기 보존 | filesystem 7일, 늘리려면 PVC ↑ 또는 S3 | 자체 디스크 | 유료 |

→ **Loki monolithic + Promtail DaemonSet**.

## 구성 요소

| 리소스 | 파일 | 역할 |
|---|---|---|
| Loki StatefulSet | `k8s/monitoring/loki.yaml` | 단일 binary, schema v13/tsdb, filesystem chunks |
| Loki PVC | (loki.yaml 안) | 10Gi local-path. 늘릴 땐 expand 가능 |
| Promtail DaemonSet | `k8s/monitoring/promtail.yaml` | 노드의 `/var/log/pods` 마운트, CRI parser, Loki push |
| Promtail RBAC | (promtail.yaml 안) | pods/nodes/services list/watch |
| Grafana datasource | `k8s/monitoring/grafana.yaml` | Loki provisioning (URL: `loki.flowstock-monitoring.svc:3100`) |

## 셋업 (CI에서 자동, 신규 환경 셋업 시 참고)

```bash
# deploy.yml의 'observability stack' 단계가 자동 처리
kubectl apply -f k8s/monitoring/loki.yaml
kubectl apply -f k8s/monitoring/promtail.yaml
kubectl apply -f k8s/monitoring/grafana.yaml
kubectl rollout restart deployment/grafana -n flowstock-monitoring
```

검증:

```bash
ssh flowstock-mini-lan "export KUBECONFIG=\$HOME/.kube/config && \
  k3s kubectl get pods -n flowstock-monitoring | grep -E 'loki|promtail'"
# loki-0  Running, promtail-xxxxx  Running 확인
```

Loki health:

```bash
... k3s kubectl exec -n flowstock-monitoring loki-0 -- wget -qO- localhost:3100/ready
# 200 ready
```

## LogQL 사용법

Grafana → **Explore** → datasource = `Loki`.

### 기본 문법

```logql
{label="value"}                       # label selector (필수)
{label="v"} |= "ERROR"                # 포함
{label="v"} != "DEBUG"                # 미포함
{label="v"} |~ "claude.*timeout"      # regex 포함
{label="v"} !~ "/health"              # regex 미포함
{label="v"} | json                    # JSON 파싱 → 필드 추출
{label="v"} | json | level="ERROR"   # 파싱 후 필드 필터
```

### 자주 쓰는 라벨

`namespace`, `app`, `pod`, `container`, `node`.
Promtail이 k8s pod metadata에서 자동 채움.

### 운영 패턴

```logql
# backend 모든 로그
{namespace="flowstock", app="flowstock-backend"}

# backend 에러만
{namespace="flowstock", app="flowstock-backend"} |= "ERROR"

# AI service의 claude 호출 timeout 흔적
{namespace="flowstock", container="ai-service"} |~ "claude.*(timeout|TimeoutError)"

# 특정 endpoint 호출 흐름
{namespace="flowstock", app="flowstock-backend"} |= "/api/news"

# trace_id 로 분산 추적과 연결 (Jaeger trace 받아 검색)
{namespace="flowstock"} |= "<trace_id>"

# 분당 ERROR 발생 카운트 (metric화)
sum(rate({namespace="flowstock"} |= "ERROR" [1m]))

# 컨테이너별 분당 로그량
sum by (container) (rate({namespace="flowstock"}[1m]))

# 5xx 응답 카운트
sum(count_over_time({namespace="flowstock", app="flowstock-backend"} |= "5xx" [5m]))
```

## 운영 시나리오

| 상황 | 첫 쿼리 |
|---|---|
| "사이트가 느려요" | `{namespace="flowstock"} |= "WARN" |= "slow"` 또는 `histogram_quantile(...)`(Prometheus) 후 해당 시각 로그 |
| "503/504 발생" | `{app="flowstock-backend"} |= "5xx"` |
| "AI 응답 비정상" | `{container="ai-service"} |~ "claude\\|timeout\\|error"` |
| "OAuth 로그인 실패" | `{app="flowstock-backend"} |= "OAuth"` |
| "특정 사용자 추적" | `{app="flowstock-backend"} |= "memberId=42"` (slf4j placeholder 출력 그대로 검색) |

## 한계 + 향후 개선

- **장기 보존**: filesystem 7일. 더 길게 가려면 (a) PVC 확대 + retention_period 조정, (b) S3 backend로 전환
- **인덱스**: 라벨이 너무 cardinality 높으면 Loki 성능 저하 (현재 namespace/app/pod/container 정도라 OK)
- **로그 기반 alert**: Loki ruler가 alertmanager(prometheus 9093)에 연결됨 → LogQL alert rule 추가 가능. ALERTING.md에 통합 예정
- **JSON 로그 통일**: 현재 backend(slf4j default), ai-service(`%(asctime)s - ...`) 형식 다름. JSON으로 통일하면 `| json` 파싱 후 필드별 alert 가능

## 디버깅

| 증상 | 확인 |
|---|---|
| Loki에 데이터가 없음 | promtail pod 로그: `k3s kubectl logs -n flowstock-monitoring ds/promtail` — `level=warn msg="error pushing to client"` 등 |
| Promtail이 컨테이너 로그 못 읽음 | `/var/log/pods` 마운트 권한, hostPath 경로 확인 |
| LogQL "too many series" | 라벨 cardinality — 라벨에 trace_id/userId 같은 거 박지 말 것 |
| Grafana datasource Loki 연결 실패 | `kubectl rollout restart deployment/grafana -n flowstock-monitoring` (ConfigMap 갱신 후 pod 재시작 필요) |

## 라벨 추가하고 싶을 때

Promtail config의 `relabel_configs`에 추가. 예시: `app_kubernetes_io_component` 라벨도 가져오기.

```yaml
- source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_component]
  target_label: component
```

수정 후 `kubectl rollout restart ds/promtail -n flowstock-monitoring`.
