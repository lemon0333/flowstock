# Alerting — Grafana × AWS SES

FlowStock 운영 alert(에러율 급증, 응답시간 지연 등)는 **Grafana 내장 alerting**으로 정의하고 **AWS SES SMTP**로 이메일 발송한다.

## 결정 배경

| | SES (선택) | Gmail SMTP (탈락) |
|---|---|---|
| 발송 주소 | `no-reply@flowstock.info` (도메인 일치) | 운영자 개인 Gmail |
| 인프라 | Terraform에 이미 박혀있음 (`ses_secrets.tf` — DKIM/Route53/IAM 다 적용됨) | 신규 앱비번 발급 필요 |
| 평판/스팸 | DKIM + SPF 인증으로 inbox 도달률 ↑ | 개인 계정 평판에 의존 |
| 한도 | sandbox 일 200, prod 풀면 5만+ | 일 500 |
| 운영자 정보 노출 | IaC 변수로만 (코드 하드코딩 X) | Grafana env에 운영자 Gmail 박힘 |

→ 인프라 이미 박혀 있고 도메인 일치 + IaC 일관성 → **SES**.

## 운영자 이메일 노출 원칙

코드/마이그레이션/Helm values에 **운영자 이메일을 절대 박지 않는다.** [feedback memory](file:///Users/sonhyeonbin/.claude/projects/-Users-sonhyeonbin-Downloads-flowstock/memory/feedback_admin_role.md) 정신 그대로 — 권한/연락처 같은 운영자 정보는 IaC 변수(`TF_VAR_*`) 또는 K8s Secret으로만 주입.

## 셋업 절차

### 1. Terraform — alert 수신 이메일 등록 (1회)

`flowstock-infra/.env`에 추가 (gitignore됨):

```bash
TF_VAR_alert_recipient_emails=["andyhyunbin@gmail.com"]
```

apply:

```bash
cd flowstock-infra/terraform
set -a; source ../.env; set +a
terraform plan
terraform apply
```

이후 AWS가 각 주소로 **"AWS - Email Address Verification Request"** 메일 발송 → 받은 메일의 verification link 1회 클릭하면 verified.

### 2. AWS SES sandbox 상태 확인

운영자만 alert 받을 거면 sandbox 그대로 OK (verified identity로만 발송 가능, 일 200통 충분).

외부 사용자에게도 보낼 거면 AWS Console → SES → Account dashboard → "Request production access" 신청 (지원 티켓, 1~2일 소요). Terraform으로는 sandbox 풀 수 없음.

### 3. SMTP credentials 추출

`ses_secrets.tf`의 `aws_iam_access_key.flowstock_backend`에 SMTP 자격증명이 발급되어 있다.

```bash
cd flowstock-infra/terraform
terraform output -json | jq '.ses_smtp_username, .ses_smtp_password'
# (output 정의가 없으면 outputs.tf에 추가하거나 state에서 추출)
```

또는 state에서 직접:
```bash
terraform state show 'aws_iam_access_key.flowstock_backend' | grep -E 'ses_smtp_password_v4|^id'
```

### 4. K8s secret으로 Grafana에 주입

`flowstock-monitoring` 네임스페이스에 SMTP secret 생성 (TF state의 값을 K8s secret으로 한 번 옮김 — 자동화 미연결, 갱신 시 수동):

```bash
kubectl create secret generic grafana-smtp \
  --namespace flowstock-monitoring \
  --from-literal=user='<SES SMTP username>' \
  --from-literal=password='<SES SMTP password>'
```

### 5. Grafana deployment에 SMTP env 추가

`k8s/monitoring/grafana.yaml`의 env에 다음 추가:

```yaml
- name: GF_SMTP_ENABLED
  value: "true"
- name: GF_SMTP_HOST
  value: "email-smtp.ap-northeast-2.amazonaws.com:587"
- name: GF_SMTP_FROM_ADDRESS
  value: "no-reply@flowstock.info"
- name: GF_SMTP_FROM_NAME
  value: "FlowStock Alert"
- name: GF_SMTP_USER
  valueFrom:
    secretKeyRef:
      name: grafana-smtp
      key: user
- name: GF_SMTP_PASSWORD
  valueFrom:
    secretKeyRef:
      name: grafana-smtp
      key: password
```

`kubectl rollout restart deployment grafana -n flowstock-monitoring`.

### 6. Grafana에서 Contact Point + Alert Rule 생성

UI: **Alerting → Contact points → Add contact point**
- Name: `email-admin`
- Integration: `Email`
- Addresses: 위에서 verified한 이메일

**Alerting → Notification policies → Default policy → Edit** → Default contact point = `email-admin`.

**Alerting → Alert rules → New alert rule** — 초기 2개:

| 이름 | PromQL | for | 의미 |
|---|---|---|---|
| backend-5xx | `sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m])) > 0.017` | 5m | 분당 1건 이상 5분 지속 |
| backend-p95-slow | `histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le)) > 3` | 5m | p95 응답시간 3초 초과 5분 지속 |

`repeat_interval: 1h`로 같은 사고 1시간에 1번만 받게.

## 알림 추가 — 신규 운영자 추가 시

1. `flowstock-infra/.env`에 이메일 추가:
   ```
   TF_VAR_alert_recipient_emails=["andyhyunbin@gmail.com","newadmin@example.com"]
   ```
2. `terraform apply` → AWS verification 메일 자동 발송
3. 신규 운영자가 verification link 클릭
4. Grafana Contact point에 이메일 추가

## 임계치 튜닝

처음 위 임계치로 깔고 1주일 운영 → 알림 수 보고 조정. 너무 자주 오면 `for` 늘리거나 임계치 상향. 안 오면 반대로.

## 디버깅

- Grafana **Alerting → Contact points → Test** 버튼으로 SMTP 연결 자체 검증
- 발송 실패 시 grafana pod 로그: `kubectl logs -n flowstock-monitoring deployment/grafana | grep -i smtp`
- SES 측 거부면 AWS Console → SES → Sending statistics에서 bounce/complaint 확인
