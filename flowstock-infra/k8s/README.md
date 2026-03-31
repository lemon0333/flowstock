# FlowStock k8s 매니페스트

## 폴더 구조
```
k8s/
├── namespace/
│   ├── namespaces.yaml     # 네임스페이스 + Secret
│   └── secrets.yaml
├── postgresql/
│   └── postgresql.yaml     # StatefulSet + PVC + Service
├── redis/
│   └── redis.yaml          # StatefulSet + PVC + Service
├── backend/
│   ├── deployment.yaml     # Deployment + HPA
│   └── ingress.yaml        # Traefik Ingress + CORS
└── monitoring/
    └── monitoring.yaml     # Prometheus + Grafana + Jaeger
```

## 배포 순서

### 1. k3s 설치 (미니PC)
```bash
curl -sfL https://get.k3s.io | sh -
```

### 2. Cloudflare Tunnel 설치
```bash
# cloudflared 설치 후
cloudflared tunnel create flowstock
cloudflared tunnel route dns flowstock api.flowstock.kr
```

### 3. Secret 먼저 생성
```bash
kubectl apply -f namespace/namespaces.yaml

kubectl create secret generic flowstock-secrets \
  --from-literal=KIS_APP_KEY=xxx \
  --from-literal=KIS_APP_SECRET=xxx \
  --from-literal=DART_API_KEY=xxx \
  --from-literal=CLAUDE_API_KEY=xxx \
  --from-literal=JWT_SECRET=xxx \
  --from-literal=DB_PASSWORD=xxx \
  --from-literal=REDIS_PASSWORD=xxx \
  --from-literal=AWS_ACCESS_KEY_ID=xxx \
  --from-literal=AWS_SECRET_ACCESS_KEY=xxx \
  -n flowstock
```

### 4. DB 먼저 올리기
```bash
kubectl apply -f postgresql/postgresql.yaml
kubectl apply -f redis/redis.yaml

# 준비될 때까지 대기
kubectl wait --for=condition=ready pod -l app=postgresql -n flowstock --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n flowstock --timeout=120s
```

### 5. 백엔드 배포
```bash
# deployment.yaml에서 image 경로 수정 후
kubectl apply -f backend/deployment.yaml
kubectl apply -f backend/ingress.yaml
```

### 6. 모니터링 배포
```bash
kubectl apply -f monitoring/monitoring.yaml
```

## 유용한 명령어
```bash
# 전체 상태 확인
kubectl get all -n flowstock

# 백엔드 로그
kubectl logs -f deployment/flowstock-backend -n flowstock

# DB 접속
kubectl exec -it statefulset/postgresql -n flowstock -- psql -U flowstock

# Redis 접속
kubectl exec -it statefulset/redis -n flowstock -- redis-cli

# 롤링 재시작
kubectl rollout restart deployment/flowstock-backend -n flowstock
```
