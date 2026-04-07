# FlowStock k8s 매니페스트

## 폴더 구조
```
k8s/
├── namespace/
│   ├── namespaces.yaml     # 네임스페이스 (flowstock, flowstock-monitoring)
│   └── secrets.yaml        # Secret (stringData + ${VAR} 플레이스홀더)
├── postgresql/
│   └── postgresql.yaml     # StatefulSet + PVC + Service
├── redis/
│   └── redis.yaml          # StatefulSet + PVC + Service
├── ai-service/
│   └── deployment.yaml     # Python AI Service (FastAPI) + ClusterIP Service
├── backend/
│   ├── deployment.yaml     # Kotlin Backend + HPA
│   └── ingress.yaml        # Traefik Ingress + CORS
└── monitoring/
    └── monitoring.yaml     # Prometheus + Grafana + Jaeger
```

## 시크릿 관리

이전 방식 (base64 직접 입력) 대신, 환경변수 플레이스홀더 + `.env` 파일 방식 사용:

```bash
# 1. .env 파일 작성
cd flowstock-infra
cp .env.example .env
# .env 파일에 실제 시크릿 값 입력

# 2. 스크립트로 시크릿 생성
./scripts/generate-secrets.sh
```

스크립트가 `.env`를 로드하고 `envsubst`로 `secrets.yaml`의 `${VAR}` 플레이스홀더를 치환하여 `kubectl apply` 실행.

**필요한 시크릿:**
- `DB_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`
- `CLAUDE_API_KEY`, `KIS_APP_KEY`, `KIS_APP_SECRET`, `DART_API_KEY`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `GOOGLE_CLIENT_ID`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`

## 배포 순서

### 1. k3s 설치 (미니PC)
```bash
curl -sfL https://get.k3s.io | sh -
```

### 2. Cloudflare Tunnel 설치
```bash
cloudflared tunnel create flowstock
cloudflared tunnel route dns flowstock api.flowstock.info
```

### 3. 네임스페이스 + 시크릿
```bash
kubectl apply -f namespace/namespaces.yaml

# .env 기반 시크릿 생성
cd flowstock-infra
./scripts/generate-secrets.sh
```

### 4. DB 먼저 올리기
```bash
kubectl apply -f postgresql/postgresql.yaml
kubectl apply -f redis/redis.yaml

# 준비될 때까지 대기
kubectl wait --for=condition=ready pod -l app=postgresql -n flowstock --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n flowstock --timeout=120s
```

### 5. AI 서비스 배포
```bash
kubectl apply -f ai-service/deployment.yaml

kubectl wait --for=condition=ready pod -l app=ai-service -n flowstock --timeout=120s
```

### 6. 백엔드 배포
```bash
# deployment.yaml에서 image 경로 수정 후
kubectl apply -f backend/deployment.yaml
kubectl apply -f backend/ingress.yaml
```

### 7. 모니터링 배포
```bash
kubectl apply -f monitoring/monitoring.yaml
```

## 유용한 명령어
```bash
# 전체 상태 확인
kubectl get all -n flowstock

# 백엔드 로그
kubectl logs -f deployment/flowstock-backend -n flowstock

# AI 서비스 로그
kubectl logs -f deployment/ai-service -n flowstock

# DB 접속
kubectl exec -it statefulset/postgresql -n flowstock -- psql -U flowstock

# Redis 접속
kubectl exec -it statefulset/redis -n flowstock -- redis-cli

# 롤링 재시작
kubectl rollout restart deployment/flowstock-backend -n flowstock
kubectl rollout restart deployment/ai-service -n flowstock
```
