---
name: deploy-k3s
description: FlowStock k3s 클러스터 배포 (시크릿 생성 → DB → Redis → AI → Backend → Ingress)
---

FlowStock을 k3s 클러스터에 배포합니다. $ARGUMENTS로 대상 지정 가능 (all, backend, ai, infra).

## 배포 순서 (반드시 준수)

1. **시크릿 생성**: `cd flowstock-infra && bash scripts/generate-secrets.sh`
2. **PostgreSQL**: `kubectl apply -f k8s/database/` → rollout 대기
3. **Redis**: `kubectl apply -f k8s/redis/` → rollout 대기
4. **AI Service**: `kubectl apply -f k8s/ai-service/` → rollout 대기
5. **Backend**: `kubectl apply -f k8s/backend/` → rollout 대기
6. **Ingress**: `kubectl apply -f k8s/ingress/`
7. **Monitoring** (선택): `kubectl apply -f k8s/monitoring/`

## 검증

각 단계마다:
- `kubectl rollout status` 로 성공 확인
- 실패 시 `kubectl describe pod` + `kubectl logs` 로 원인 파악
- 원인 보고 후 중단 (자동 롤백하지 않음)

최종 확인:
- `kubectl get pods -n flowstock` 전체 상태 출력
- Backend health: `kubectl exec` 으로 `curl localhost:8080/actuator/health` 확인

## 주의사항
- `.env` 파일이 `flowstock-infra/` 에 있어야 함
- Terraform 변경이 있으면 먼저 `terraform apply` 실행 여부를 사용자에게 확인
- **절대** `kubectl delete` 를 먼저 하지 않음 — apply로 업데이트
