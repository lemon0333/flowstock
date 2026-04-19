#!/bin/bash
set -euo pipefail

# =============================================================================
# FlowStock 전체 서비스 배포 스크립트
# =============================================================================
# 모든 k8s 리소스를 순서대로 배포합니다.
# 사전 조건: k3s 설치 완료, .env 파일 설정 완료
# 실행: bash deploy-all.sh [--skip-monitoring]
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$INFRA_DIR/k8s"

# kubectl 경로 설정 (k3s 환경)
KUBECTL="kubectl"
if command -v k3s &> /dev/null; then
    KUBECTL="k3s kubectl"
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
fi

SKIP_MONITORING=false
ROLLOUT_TIMEOUT="300s"

for arg in "$@"; do
    case $arg in
        --skip-monitoring) SKIP_MONITORING=true ;;
        *) echo "[WARN] 알 수 없는 옵션: $arg" ;;
    esac
done

echo "=============================================="
echo " FlowStock 전체 서비스 배포"
echo "=============================================="
echo ""

# --- Helper ---
step() {
    echo ""
    echo "----------------------------------------------"
    echo "[STEP] $1"
    echo "----------------------------------------------"
}

wait_for_rollout() {
    local resource="$1"
    local namespace="${2:-flowstock}"
    echo "[INFO] $resource 배포 대기 중..."
    $KUBECTL rollout status "$resource" -n "$namespace" --timeout="$ROLLOUT_TIMEOUT"
    echo "[OK] $resource 배포 완료"
}

# =============================================================================
# 1. .env 파일 존재 확인
# =============================================================================
step "1/13 - .env 파일 확인"
if [ ! -f "$INFRA_DIR/.env" ]; then
    echo "[ERROR] .env 파일이 없습니다: $INFRA_DIR/.env"
    echo ""
    echo "  cp $INFRA_DIR/.env.example $INFRA_DIR/.env"
    echo "  nano $INFRA_DIR/.env  # 값 채우기"
    exit 1
fi
echo "[OK] .env 파일 확인 완료"

# 비어있는 값 체크
while IFS='=' read -r key value; do
    # 주석과 빈 줄 무시
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    key=$(echo "$key" | xargs)
    value=$(echo "${value:-}" | xargs)
    if [ -z "$value" ]; then
        echo "[WARN] .env에서 '$key' 값이 비어있습니다."
    fi
done < "$INFRA_DIR/.env"

# =============================================================================
# 2. generate-secrets.sh 실행
# =============================================================================
step "2/13 - 시크릿 생성"
# namespace가 먼저 있어야 secrets를 적용할 수 있으므로, 먼저 namespace 생성
$KUBECTL apply -f "$K8S_DIR/namespace/namespaces.yaml"
echo "[OK] Namespace 생성/확인 완료"

bash "$SCRIPT_DIR/generate-secrets.sh"
echo "[OK] 시크릿 생성 완료"

# =============================================================================
# 3. k8s namespace 생성 (이미 위에서 완료)
# =============================================================================
step "3/13 - Namespace 확인"
$KUBECTL get namespace flowstock
echo "[OK] flowstock namespace 확인 완료"

# =============================================================================
# 4. PostgreSQL 배포
# =============================================================================
step "4/13 - PostgreSQL 배포"
$KUBECTL apply -f "$K8S_DIR/postgresql/postgresql.yaml"
wait_for_rollout "statefulset/postgresql" "flowstock"

# =============================================================================
# 5. MySQL 배포
# =============================================================================
step "5/13 - MySQL 배포"
$KUBECTL apply -f "$K8S_DIR/mysql/mysql.yaml"
wait_for_rollout "statefulset/mysql" "flowstock"

# =============================================================================
# 6. Redis 배포
# =============================================================================
step "6/13 - Redis 배포"
$KUBECTL apply -f "$K8S_DIR/redis/redis.yaml"
wait_for_rollout "statefulset/redis" "flowstock"

# =============================================================================
# 7. Cloudflared 배포
# =============================================================================
step "7/13 - Cloudflared 배포"
$KUBECTL apply -f "$K8S_DIR/cloudflared/cloudflared.yaml"
wait_for_rollout "deployment/cloudflared" "flowstock"

# =============================================================================
# 8. AI Service 배포
# =============================================================================
step "8/13 - AI Service 배포"
$KUBECTL apply -f "$K8S_DIR/ai-service/deployment.yaml"
wait_for_rollout "deployment/ai-service" "flowstock"

# =============================================================================
# 9. Backend 배포
# =============================================================================
step "9/13 - Backend 배포"
$KUBECTL apply -f "$K8S_DIR/backend/deployment.yaml"
wait_for_rollout "deployment/backend" "flowstock"

# =============================================================================
# 10. Ingress 설정
# =============================================================================
step "10/13 - Ingress 설정"
$KUBECTL apply -f "$K8S_DIR/backend/ingress.yaml"
echo "[OK] Ingress 설정 완료"

# =============================================================================
# 11. Monitoring 배포 (선택)
# =============================================================================
step "11/13 - Monitoring 배포"
if [ "$SKIP_MONITORING" = true ]; then
    echo "[SKIP] --skip-monitoring 옵션으로 건너뜁니다."
else
    $KUBECTL apply -f "$K8S_DIR/monitoring/monitoring.yaml"
    echo "[OK] Monitoring 배포 완료"
    echo "[INFO] Grafana, Prometheus, Jaeger가 배포되었습니다."
fi

# =============================================================================
# 12. 전체 Pod 상태 출력
# =============================================================================
step "12/13 - 전체 Pod 상태"
echo ""
echo "[flowstock namespace]"
$KUBECTL get pods -n flowstock -o wide
echo ""
if [ "$SKIP_MONITORING" = false ]; then
    echo "[flowstock-monitoring namespace]"
    $KUBECTL get pods -n flowstock-monitoring -o wide 2>/dev/null || echo "(monitoring namespace 없음)"
fi
echo ""
echo "[서비스 목록]"
$KUBECTL get svc -n flowstock

# =============================================================================
# 13. 헬스체크
# =============================================================================
step "13/13 - 헬스체크"

echo "[INFO] 서비스가 완전히 시작될 때까지 20초 대기..."
sleep 20

HEALTH_OK=true

# Backend 헬스체크
echo -n "[CHECK] Backend (actuator/health): "
BACKEND_HEALTH=$($KUBECTL exec -n flowstock deploy/backend -- \
    curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/actuator/health 2>/dev/null || echo "000")
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo "OK (200)"
else
    echo "FAIL ($BACKEND_HEALTH)"
    HEALTH_OK=false
fi

# AI Service 헬스체크
echo -n "[CHECK] AI Service (/health): "
AI_HEALTH=$($KUBECTL exec -n flowstock deploy/ai-service -- \
    curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
if [ "$AI_HEALTH" = "200" ]; then
    echo "OK (200)"
else
    echo "FAIL ($AI_HEALTH)"
    HEALTH_OK=false
fi

# PostgreSQL 체크
echo -n "[CHECK] PostgreSQL: "
PG_STATUS=$($KUBECTL get pod -n flowstock -l app=postgresql -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "Unknown")
echo "$PG_STATUS"

# Redis 체크
echo -n "[CHECK] Redis: "
REDIS_STATUS=$($KUBECTL get pod -n flowstock -l app=redis -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "Unknown")
echo "$REDIS_STATUS"

# =============================================================================
# 결과
# =============================================================================
echo ""
echo "=============================================="
if [ "$HEALTH_OK" = true ]; then
    echo " FlowStock 전체 배포 완료! 모든 서비스 정상"
else
    echo " FlowStock 배포 완료 (일부 서비스 헬스체크 실패)"
    echo " 'kubectl logs -n flowstock <pod>' 로 로그를 확인하세요."
fi
echo "=============================================="
echo ""
echo " 접속 정보:"
echo "  - Backend API: https://api.flowstock.info"
echo "  - Frontend:    https://flowstock.info"
echo ""
echo " 유용한 명령어:"
echo "  kubectl get pods -n flowstock"
echo "  kubectl logs -n flowstock deploy/backend --tail=50"
echo "  kubectl logs -n flowstock deploy/ai-service --tail=50"
echo "=============================================="
