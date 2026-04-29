---
name: ssh-mini
description: 미니 PC k3s에 SSH로 진입해 pod 상태/로그/이벤트 조회
---

운영 중인 미니 PC k3s 클러스터를 빠르게 들여다본다.

## 호스트 선택 전략

`~/.ssh/config`에 두 호스트 등록되어 있다 (CLAUDE.md 참조):

- `flowstock-mini` — Tailscale IP `100.83.152.23` (외부에서 접속, **보통 이거 사용**)
- `flowstock-mini-lan` — LAN IP `192.168.219.115` (집 내부 네트워크일 때만)

기본 동작은 LAN을 먼저 시도(빠름)하고 timeout이면 Tailscale로 폴백:

```bash
HOST=flowstock-mini-lan
ssh -o ConnectTimeout=5 -o BatchMode=yes "$HOST" true 2>/dev/null || HOST=flowstock-mini
```

## 인자별 동작

### 인자 없음 — 전체 상태 요약
```bash
ssh "$HOST" "export KUBECONFIG=\$HOME/.kube/config && \
  echo '=== flowstock pods ===' && k3s kubectl get pods -n flowstock && \
  echo && echo '=== monitoring pods ===' && k3s kubectl get pods -n flowstock-monitoring && \
  echo && echo '=== recent events (flowstock) ===' && k3s kubectl get events -n flowstock --sort-by=.lastTimestamp | tail -10"
```

### `logs <pod-prefix>` — 해당 pod 마지막 100줄 로그
```bash
ssh "$HOST" "export KUBECONFIG=\$HOME/.kube/config && \
  POD=\$(k3s kubectl get pods -n flowstock --no-headers | awk '/<pod-prefix>/ {print \$1; exit}') && \
  k3s kubectl logs -n flowstock \"\$POD\" --tail=100"
```

### `restart <deployment>` — rolling restart
```bash
ssh "$HOST" "export KUBECONFIG=\$HOME/.kube/config && \
  k3s kubectl rollout restart deployment/<deployment> -n flowstock && \
  k3s kubectl rollout status deployment/<deployment> -n flowstock --timeout=300s"
```

### `describe <pod-prefix>` — pod 디테일 (이벤트 포함)
```bash
ssh "$HOST" "export KUBECONFIG=\$HOME/.kube/config && \
  POD=\$(k3s kubectl get pods -n flowstock --no-headers | awk '/<pod-prefix>/ {print \$1; exit}') && \
  k3s kubectl describe pod -n flowstock \"\$POD\""
```

### 그 외 임의 명령
사용자가 다른 인자를 주면 SSH 세션 안에서 그대로 실행 (단 KUBECONFIG은 자동 export):
```bash
ssh "$HOST" "export KUBECONFIG=\$HOME/.kube/config && $ARGUMENTS"
```

## 주의
- **sudo 안 됨** — 비밀번호 sudo가 막혀있다. 모든 명령을 사용자 권한 + `k3s kubectl`로 실행 (CLAUDE.md 명시)
- Tailscale이 꺼져있으면 `flowstock-mini` 가 timeout. LAN-first 전략이 그 대비책
- 로그 양이 많으면 `--tail=N` 또는 `| head -N` 으로 잘라라
