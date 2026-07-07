# www.flowstock.info → root 301 리다이렉트

## 결정 (2026-07-05)

- `www.flowstock.info`가 522(오리진 연결 실패)로 죽어 있었음 — Cloudflare 프록시 뒤에 살아있는 오리진이 없었기 때문.
- 프론트는 Cloudflare Pages(root 도메인)에 있으므로 www는 **root로 301**만 해주면 됨.
- Cloudflare 대시보드 redirect rule 대신 **기존 터널 + k3s 초경량 nginx** 조합 선택
  (API 토큰이 로컬에 없고, 터널/클러스터는 이미 CI가 관리하는 경로라서).

## 구성

1. `k8s/www-redirect/www-redirect.yaml` — nginx 1.27-alpine, `return 301 https://flowstock.info$request_uri;`
   (ConfigMap + Deployment 1 replica + ClusterIP Service :80)
2. `k8s/cloudflared/cloudflared.yaml` ingress에 `www.flowstock.info → www-redirect.flowstock.svc:80` 룰 추가
3. deploy.yml step 5에서 `k8s/www-redirect/www-redirect.yaml` apply (cloudflared는 기존 envsubst 경로로 갱신 + 변경 감지 시 자동 rollout restart)

## DNS 라우팅 (1회성 수동 단계)

www DNS 레코드를 터널로 보내야 함. 미니 PC에 `~/.cloudflared/cert.pem`(로그인 인증서)이 있으므로:

```bash
ssh flowstock-mini-lan
export TUNNEL_ORIGIN_CERT=$HOME/.cloudflared/cert.pem.flowstock   # flowstock zone 인증서
cloudflared tunnel route dns --overwrite-dns 5e4f8588-eb64-4ca0-a7eb-ce4e713571fd www.flowstock.info
```

`--overwrite-dns`는 기존의 죽은 www 레코드를 터널 CNAME으로 교체한다.

## 검증

```bash
curl -sI https://www.flowstock.info/regret | grep -i "^HTTP\|^location"
# 기대: HTTP/2 301 + location: https://flowstock.info/regret
```

## 디버깅

- 301 대신 404 → cloudflared ingress 룰 누락 (configmap 갱신 + rollout restart 확인)
- 301 대신 522 → DNS가 아직 터널로 안 감 (route dns 단계 재확인)
- pod 상태: `k3s kubectl get pods -n flowstock -l app=www-redirect`
