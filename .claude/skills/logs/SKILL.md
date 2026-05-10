---
name: logs
description: Loki LogQL 빠른 검색 — backend/ai/특정 endpoint/에러/trace_id별 자주 쓰는 쿼리 묶음
---

운영 로그 검색은 Grafana Explore에 매번 들어가지 말고 SSH + curl로 Loki API 직접 호출이 빠르다.
LogQL은 PromQL과 거의 동일 — 라벨 selector + line filter.

## 가장 자주 쓰는 패턴

```bash
# Loki API URL (cluster 내부)
LOKI=http://loki.flowstock-monitoring.svc.cluster.local:3100

# helper — 시간 범위(최근 1h) + LogQL 쿼리 → 텍스트 라인 출력
ssh flowstock-mini-lan "export KUBECONFIG=\$HOME/.kube/config && \
  k3s kubectl exec -n flowstock-monitoring loki-0 -- \
  wget -qO- 'http://localhost:3100/loki/api/v1/query_range?query=<URL_ENCODED>&limit=200&start=$(date -u -v-1H +%s)000000000&end=$(date -u +%s)000000000'" | jq -r '.data.result[].values[][1]'
```

## 자주 쓰는 LogQL 쿼리

| 상황 | LogQL |
|---|---|
| backend 모든 ERROR | `{namespace="flowstock", app="flowstock-backend"} \|= "ERROR"` |
| AI service claude 호출 실패/timeout | `{namespace="flowstock", container="ai-service"} \|~ "claude.*(timeout\|error\|fail)"` |
| 특정 endpoint 호출 흐름 | `{namespace="flowstock"} \|= "/api/news"` |
| 5xx 응답 | `{app="flowstock-backend"} \|= "5xx"` |
| trace_id 추적 (Jaeger에서 받아옴) | `{namespace="flowstock"} \|= "<trace_id>"` |
| OAuth 실패 흔적 | `{app="flowstock-backend"} \|~ "OAuth\|google\|naver" \|~ "fail\|error"` |
| 분당 ERROR 건수 | `sum(rate({namespace="flowstock"} \|= "ERROR" [1m]))` |
| 컨테이너별 분당 로그량 | `sum by (container) (rate({namespace="flowstock"}[1m]))` |

## 빠른 진입

대화에서 "/logs <키워드>" 또는 "/logs <pod>" 식으로 의도 받으면:

1. 해당 키워드 → 적절한 LogQL 매핑
2. SSH로 `kubectl logs --tail=500 deployment/<name>`로 우선 빠른 조회 (Loki 경유보다 빠름)
3. 시간 범위가 길거나 라벨 cross-cut이면 Loki API
4. 결과는 사용자가 읽을 수 있게 라인 단위로 보여줌

## 관련 docs

- 전체 가이드: `flowstock-infra/docs/LOGGING.md`
- alert과 연결: `flowstock-infra/docs/ALERTING.md`
