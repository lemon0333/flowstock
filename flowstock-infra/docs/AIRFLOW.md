# Airflow on k3s — 운영 가이드

FlowStock 데이터 파이프라인(Bronze → Silver → Gold → Serve) 오케스트레이션 plane.

## 아키텍처 한 장

```
ghcr.io/lemon0333/flowstock-airflow:<sha>
  │ (built from flowstock-airflow/Dockerfile)
  ▼
┌─────────── flowstock 네임스페이스 ───────────┐
│                                              │
│  airflow-postgres (StatefulSet, 10Gi PVC)    │  ← 메타DB 격리
│                                              │
│  airflow-init    (Job: db migrate + admin)   │  ← 최초/이미지 갱신 시 1회
│  airflow-scheduler   (Deployment, replicas=1)│  ← LocalExecutor
│  airflow-webserver   (Deployment, replicas=1)│  ← Cloudflare Tunnel 앞단
│  airflow-triggerer   (Deployment, replicas=1)│  ← async sensors
└──────────────────────────────────────────────┘
            │
            ▼ Cloudflare Tunnel
   https://airflow.flowstock.info
```

- **메타DB는 운영 Postgres와 분리** — Airflow가 매 task 인스턴스 단위로 쓰기 많아서 운영 PG에 부담 안 주기 위해.
- **Executor**: LocalExecutor (Celery 안 씀). 현재 DAG 5개 수준엔 충분. 100+개 또는 1분 미만 latency 필요해지면 Celery로.
- **DAG 배포 방식**: 이미지에 bake-in (Dockerfile `COPY dags`). 변경 시마다 새 tag 빌드 + `kubectl rollout restart`. git-sync sidecar는 STEP 7+에서.
- **데이터 적재 위치**: `/tmp/flowstock-data/...` — pod-local. Bronze/Silver/Gold는 같은 DAG run 안에서만 의미 있어서 pod 재시작 시 휘발돼도 무방. 영속 필요해지면 PVC 마운트로 교체.

## 최초 배포 절차

### 1. 시크릿 채우기

`flowstock-infra/.env`에 4개 항목 채우기:

```bash
AIRFLOW_POSTGRES_PASSWORD=$(openssl rand -hex 24)
AIRFLOW_FERNET_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
AIRFLOW_WEBSERVER_SECRET_KEY=$(openssl rand -hex 32)
AIRFLOW_ADMIN_PASSWORD=$(openssl rand -hex 16)   # 또는 외워둘 강한 패스워드
```

⚠️ **AIRFLOW_FERNET_KEY는 절대 분실하면 안 됨** — Airflow Connections/Variables 암호화 키. 한 번 박은 뒤 회전하려면 rotation 절차 필요.

### 2. Cloudflare DNS

Cloudflare 대시보드에서 `airflow.flowstock.info` CNAME → tunnel CNAME(`<TUNNEL_ID>.cfargotunnel.com`) 추가.

### 3. 이미지 빌드 + push

```bash
cd flowstock-airflow
docker build -t ghcr.io/lemon0333/flowstock-airflow:$(git rev-parse --short HEAD) .
docker tag  ghcr.io/lemon0333/flowstock-airflow:$(git rev-parse --short HEAD) \
            ghcr.io/lemon0333/flowstock-airflow:latest
docker push ghcr.io/lemon0333/flowstock-airflow:$(git rev-parse --short HEAD)
docker push ghcr.io/lemon0333/flowstock-airflow:latest
```

(향후 CI에서 자동화 — deploy.yml에 airflow 섹션 추가 시.)

### 4. k3s apply

```bash
cd flowstock-infra
./scripts/generate-secrets.sh                          # .env → secrets.yaml로 envsubst + apply
ssh flowstock-mini-lan "export KUBECONFIG=\$HOME/.kube/config && \
  k3s kubectl apply -f k8s/airflow/00-postgres.yaml && \
  k3s kubectl apply -f k8s/airflow/10-airflow.yaml && \
  k3s kubectl apply -f k8s/cloudflared/cloudflared.yaml && \
  k3s kubectl rollout restart deployment/cloudflared -n flowstock"
```

순서가 중요:
- secrets → postgres → init Job → scheduler/webserver/triggerer → cloudflared(rule 갱신)

### 5. 검증

```bash
# 초기화 Job 결과
ssh flowstock-mini-lan "export KUBECONFIG=\$HOME/.kube/config && \
  k3s kubectl logs -n flowstock job/airflow-init"
# 기대: "airflow init done"

# pod 상태
ssh flowstock-mini-lan "export KUBECONFIG=\$HOME/.kube/config && \
  k3s kubectl get pods -n flowstock -l 'app in (airflow-scheduler,airflow-webserver,airflow-triggerer,airflow-postgres)'"

# UI 접속
open https://airflow.flowstock.info
# admin / $AIRFLOW_ADMIN_PASSWORD 로 로그인
```

## 운영 명령

### DAG 코드 갱신 → 재배포

DAG 파일을 이미지에 굽기 때문에 코드 바뀌면 이미지 rebuild 후 rollout restart:

```bash
TAG=$(git rev-parse --short HEAD)
docker build -t ghcr.io/lemon0333/flowstock-airflow:$TAG flowstock-airflow/
docker push ghcr.io/lemon0333/flowstock-airflow:$TAG
ssh flowstock-mini-lan "export KUBECONFIG=\$HOME/.kube/config && \
  k3s kubectl set image deployment/airflow-scheduler scheduler=ghcr.io/lemon0333/flowstock-airflow:$TAG -n flowstock && \
  k3s kubectl set image deployment/airflow-webserver webserver=ghcr.io/lemon0333/flowstock-airflow:$TAG -n flowstock && \
  k3s kubectl set image deployment/airflow-triggerer triggerer=ghcr.io/lemon0333/flowstock-airflow:$TAG -n flowstock"
```

### DAG 강제 트리거 (CLI)

```bash
ssh flowstock-mini-lan "export KUBECONFIG=\$HOME/.kube/config && \
  k3s kubectl exec -n flowstock deployment/airflow-scheduler -- \
    airflow dags trigger market_bronze"
```

### 로그 보기

```bash
ssh flowstock-mini-lan "export KUBECONFIG=\$HOME/.kube/config && \
  k3s kubectl logs -n flowstock -l app=airflow-scheduler --tail=200 -f"
```

UI 쪽에서: DAG → Run → Task → Logs 탭에서 task별 로그.

## 디버깅 체크리스트

| 증상 | 점검 |
|---|---|
| Pod CrashLoopBackOff | `kubectl logs` — FERNET_KEY 비었거나 잘못된 형식일 가능성 |
| UI 502 / "DB unreachable" | `kubectl exec airflow-postgres-0 -- pg_isready` — Postgres 자체 죽었는지 |
| init Job 무한 fail | `kubectl describe job airflow-init` — 권한/연결 문제 보통. SQL_ALCHEMY_CONN 점검 |
| DAG가 UI에 안 보임 | 이미지 안에 dags/ 들어갔는지 — `kubectl exec scheduler -- ls /opt/airflow/dags` |
| Task 영원히 queued | scheduler heartbeat — `airflow jobs check --job-type SchedulerJob` |
| Webserver만 죽음 | OOM 가능성 — limits.memory 1Gi → 2Gi로 |

## 비용 / 리소스

| 컴포넌트 | RAM (request~limit) | CPU |
|---|---|---|
| airflow-postgres | 256Mi~512Mi | 100m~500m |
| airflow-scheduler | 512Mi~1Gi | 200m~1000m |
| airflow-webserver | 512Mi~1Gi | 200m~500m |
| airflow-triggerer | 256Mi~512Mi | 100m~300m |
| **총합 (request)** | **~1.5Gi** | **~600m** |

mini PC k3s에 무난히 들어감. 다른 워크로드 영향 거의 없음.

## STEP 7+ (확장)

- **CI 자동화**: `.github/workflows/deploy.yml`에 airflow 섹션 추가 (build + push + rollout)
- **git-sync sidecar**: DAGs 변경 시 이미지 rebuild 안 하고도 즉시 반영
- **Postgres → 별도 인스턴스 분리는 이미 완료** (airflow-postgres 격리)
- **Celery Executor + Redis**: 100+ DAG 또는 분산 task 필요해질 때
- **OTEL on**: Jaeger 통합. 현재 grpc fork 이슈로 off
- **Prometheus exporter**: statsd-exporter sidecar로 메트릭 → 기존 Grafana 대시보드 추가
- **DAG syntax CI**: PR마다 `airflow dags list-import-errors` 돌려서 깨진 import 사전 차단

## 시크릿 회전 (Fernet 제외)

비번/시크릿키는 회전 가능:

```bash
# 1. .env 갱신
# 2. 시크릿 재적용
cd flowstock-infra && ./scripts/generate-secrets.sh
# 3. pod 재시작 (env 다시 읽음)
ssh flowstock-mini-lan "export KUBECONFIG=\$HOME/.kube/config && \
  k3s kubectl rollout restart deployment/airflow-scheduler deployment/airflow-webserver deployment/airflow-triggerer -n flowstock"
```

⚠️ **Fernet key 회전은 위험** — 기존에 암호화된 Connection 풀어내는 절차 필요. 운영 중 회전이 필요해지면 [Airflow 공식 가이드](https://airflow.apache.org/docs/apache-airflow/stable/security/secrets/fernet.html#rotating-the-fernet-key) 참고.
