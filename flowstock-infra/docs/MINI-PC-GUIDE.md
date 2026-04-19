# FlowStock Mini PC Server Setup Guide

FlowStock 서비스를 미니 PC(Ubuntu)에 배포하기 위한 가이드입니다.

## 환경 요구사항

- **OS**: Ubuntu 22.04 / 24.04 Server
- **RAM**: 최소 8GB (16GB 권장)
- **Storage**: 최소 50GB SSD
- **네트워크**: 인터넷 연결 (Cloudflare Tunnel 사용)
- **도메인**: flowstock.info, api.flowstock.info (Cloudflare DNS)

## 아키텍처 개요

```
인터넷 → Cloudflare Tunnel → k3s (미니 PC)
                                ├── Backend (Spring Boot :8080)
                                ├── AI Service (FastAPI :8000)
                                ├── PostgreSQL (:5432)
                                ├── MySQL (:3306)
                                ├── Redis (:6379)
                                └── Monitoring (Prometheus + Grafana + Jaeger)
```

---

## 1단계: 서버 초기 셋업

원클릭으로 필수 패키지, Docker, k3s, Node.js, Python, cloudflared를 설치합니다.

```bash
# 원격 스크립트 실행
curl -sSL https://raw.githubusercontent.com/lemon0333/flowstock/main/flowstock-infra/scripts/setup-server.sh | sudo bash
```

또는 로컬에서 직접 실행:

```bash
sudo bash /path/to/flowstock/flowstock-infra/scripts/setup-server.sh
```

설치되는 항목:
- 시스템 패키지 (curl, git, jq, build-essential 등)
- Docker CE
- k3s (single node, Traefik 비활성화)
- kubectl alias (`kubectl` = `k3s kubectl`)
- Node.js 20 LTS
- Claude Code CLI
- Python 3.12
- cloudflared

---

## 2단계: 프로젝트 클론 + 시크릿 설정

```bash
# 프로젝트 클론
git clone https://github.com/lemon0333/flowstock.git /opt/flowstock

# 시크릿 파일 생성
cp /opt/flowstock/flowstock-infra/.env.example /opt/flowstock/flowstock-infra/.env

# 시크릿 값 채우기
nano /opt/flowstock/flowstock-infra/.env
```

`.env` 파일에 채워야 할 값:

| 키 | 설명 |
|----|------|
| `DB_PASSWORD` | PostgreSQL 비밀번호 |
| `MYSQL_ROOT_PASSWORD` | MySQL root 비밀번호 |
| `MYSQL_PASSWORD` | MySQL 앱 비밀번호 |
| `REDIS_PASSWORD` | Redis 비밀번호 |
| `JWT_SECRET` | JWT 서명 키 (랜덤 문자열) |
| `KIS_APP_KEY` | 한국투자증권 API 키 |
| `KIS_APP_SECRET` | 한국투자증권 API 시크릿 |
| `DART_API_KEY` | DART 공시 API 키 |
| `AWS_ACCESS_KEY_ID` | AWS IAM 키 |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM 시크릿 |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `NAVER_CLIENT_ID` | Naver OAuth Client ID |
| `NAVER_CLIENT_SECRET` | Naver OAuth Client Secret |

---

## 3단계: Claude Code 설치

```bash
# Claude Code 셋업 스크립트 실행
bash /opt/flowstock/flowstock-infra/scripts/setup-claude.sh

# Claude Code 로그인 (인터랙티브 - 직접 실행)
claude login
```

로그인 시 브라우저가 열립니다. 서버에 브라우저가 없으면 출력되는 URL을 다른 기기에서 열어 인증하세요.

---

## 4단계: 전체 배포

```bash
# 전체 서비스 배포
bash /opt/flowstock/flowstock-infra/scripts/deploy-all.sh

# 모니터링 제외하고 배포
bash /opt/flowstock/flowstock-infra/scripts/deploy-all.sh --skip-monitoring
```

또는 Claude Code에게 시키기:

```bash
cd /opt/flowstock && claude "/deploy-k3s all"
```

배포 순서:
1. Namespace + Secrets 생성
2. PostgreSQL (StatefulSet)
3. MySQL (StatefulSet)
4. Redis (StatefulSet)
5. Cloudflared (Deployment)
6. AI Service (Deployment)
7. Backend (Deployment)
8. Ingress 설정
9. Monitoring (선택)
10. 헬스체크

---

## 5단계: 검증

```bash
# Pod 상태 확인
kubectl get pods -n flowstock

# 서비스 상태 확인
kubectl get svc -n flowstock

# Backend 헬스체크
kubectl exec -n flowstock deploy/backend -- curl -s http://localhost:8080/actuator/health

# AI Service 헬스체크
kubectl exec -n flowstock deploy/ai-service -- curl -s http://localhost:8000/health

# 로그 확인
kubectl logs -n flowstock deploy/backend --tail=50
kubectl logs -n flowstock deploy/ai-service --tail=50
```

---

## Claude Code로 서버 관리하기

Claude Code를 사용하면 자연어로 서버를 관리할 수 있습니다.

```bash
# 헬스체크
claude "모든 서비스 상태 확인해줘"

# 로그 확인
claude "최근 에러 로그 확인해줘"

# 배포
claude "/deploy-k3s all"

# 코드 리뷰
claude "/full-review"

# 문제 해결
claude "backend pod가 CrashLoopBackOff인데 원인 찾아줘"

# DB 확인
claude "PostgreSQL에 접속해서 테이블 목록 보여줘"

# 리소스 모니터링
claude "현재 CPU, 메모리 사용량 확인해줘"

# 스케일링
claude "backend replica를 3개로 늘려줘"
```

> 모든 claude 명령은 `/opt/flowstock` 디렉토리에서 실행하세요.

---

## 트러블슈팅

### Pod가 Pending 상태

```bash
# 원인 확인
kubectl describe pod <pod-name> -n flowstock

# PVC 확인 (스토리지 부족일 수 있음)
kubectl get pvc -n flowstock
```

### Pod가 CrashLoopBackOff 상태

```bash
# 로그 확인
kubectl logs <pod-name> -n flowstock --previous

# 환경변수/시크릿 확인
kubectl get secret -n flowstock
kubectl describe secret flowstock-secrets -n flowstock
```

### Cloudflare Tunnel 연결 안 됨

```bash
# cloudflared 로그 확인
kubectl logs -n flowstock deploy/cloudflared --tail=100

# Cloudflare 대시보드에서 터널 상태 확인
# https://one.dash.cloudflare.com → Zero Trust → Tunnels
```

### DB 연결 실패

```bash
# PostgreSQL Pod 상태 확인
kubectl get pod -n flowstock -l app=postgresql

# PostgreSQL 로그
kubectl logs -n flowstock statefulset/postgresql --tail=50

# DB 접속 테스트
kubectl exec -it -n flowstock statefulset/postgresql -- psql -U flowstock
```

### 메모리 부족 (OOMKilled)

```bash
# 리소스 사용량 확인
kubectl top pods -n flowstock

# resource limits 조정
kubectl edit deployment/<deployment-name> -n flowstock
```

### 이미지 Pull 실패

```bash
# GHCR 인증 확인
kubectl get secret -n flowstock | grep registry

# imagePullSecret 설정
kubectl create secret docker-registry ghcr-secret \
  -n flowstock \
  --docker-server=ghcr.io \
  --docker-username=<GITHUB_USERNAME> \
  --docker-password=<GITHUB_TOKEN>
```

### k3s가 시작되지 않음

```bash
# k3s 서비스 상태
sudo systemctl status k3s

# k3s 로그
sudo journalctl -u k3s -f --no-pager --lines=50

# k3s 재시작
sudo systemctl restart k3s
```

---

## 유용한 명령어 모음

```bash
# 전체 상태 한눈에 보기
kubectl get all -n flowstock

# 특정 Pod 쉘 접속
kubectl exec -it -n flowstock deploy/backend -- /bin/sh

# Pod 재시작 (rolling restart)
kubectl rollout restart deployment/backend -n flowstock

# 시크릿 재적용
bash /opt/flowstock/flowstock-infra/scripts/generate-secrets.sh

# 전체 재배포
bash /opt/flowstock/flowstock-infra/scripts/deploy-all.sh

# 리소스 정리 (주의!)
kubectl delete namespace flowstock
```

---

## 포트 참조

| 서비스 | 포트 | 비고 |
|--------|------|------|
| Backend (Spring Boot) | 8080 | API Gateway |
| AI Service (FastAPI) | 8000 | 내부 전용 |
| PostgreSQL | 5432 | 내부 전용 |
| MySQL | 3306 | 내부 전용 |
| Redis | 6379 | 내부 전용 |
| Grafana | 3000 | 모니터링 |
| Prometheus | 9090 | 모니터링 |
| Jaeger | 16686 | 트레이싱 |
