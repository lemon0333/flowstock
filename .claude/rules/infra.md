# Infra 작업 규칙 — Terraform + k3s + Cloudflare Tunnel

## 운영자 정보 / Secret 흐름

**원칙**: 운영자 이메일·키·도메인 같은 환경 의존 값은 코드(yaml/SQL/tf)에 하드코딩 X.

- terraform var → `flowstock-infra/.env` (gitignore)
- k8s secret → `secrets.yaml` `stringData` + `${VAR}` placeholder + `scripts/generate-secrets.sh`로 envsubst
- Grafana SMTP, ECOS_API_KEY, OAuth credential 등 모두 .env에서

## Terraform

- 기존 리소스 있으면 **import 먼저** (duplicate 생성 방지)
- `aws_ses_email_identity` 추가 시 .env의 `TF_VAR_alert_recipient_emails`로 주입
- `terraform.tfvars` 사용 가능하지만 .env 패턴이 우선 (한 군데 secret)

## k3s

- 모든 manifest는 `flowstock-infra/k8s/<topic>/` 디렉토리
- monitoring stack은 `flowstock-monitoring` ns: prometheus/grafana/loki/promtail/jaeger/kube-state-metrics/node-exporter
- backend/ai/db는 `flowstock` ns
- ingress는 Cloudflare Tunnel — `cloudflared/cloudflared.yaml` ingress rules에 hostname → service 매핑

## SSH로 운영

`flowstock-mini` (Tailscale, 외부) / `flowstock-mini-lan` (LAN, 빠름). 사용자는 lemon, sudo 없이 k3s.

```bash
ssh flowstock-mini-lan "export KUBECONFIG=\$HOME/.kube/config && k3s kubectl <args>"
```

## 신규 k8s 컴포넌트 추가 시

1. `k8s/<topic>/<file>.yaml` 작성
2. `.github/workflows/deploy.yml`의 observability/app 섹션에 `kubectl apply` 한 줄 추가
3. `flowstock-infra/docs/<TOPIC>.md` 작성 (결정/구성/셋업/디버깅)
4. CLAUDE.md 모니터링 섹션 한 줄 갱신
5. CI 끝난 후 SSH로 pod 상태 확인

## docs 분리

- `flowstock-infra/docs/MINI-PC-GUIDE.md` — SSH/k3s 운영 명령
- `flowstock-infra/docs/ALERTING.md` — SES + Grafana alert
- `flowstock-infra/docs/LOGGING.md` — Loki + Promtail + LogQL
- (필요시 추가)
