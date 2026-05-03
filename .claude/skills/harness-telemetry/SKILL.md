---
name: harness-telemetry
description: 최근 Claude Code 세션 transcripts 분석 → 자동화 후보/반복 패턴 리포트
---

이 프로젝트의 최근 Claude Code 세션 로그를 분석해서 **하네스 엔지니어링 개선 후보**를 도출한다.

## 분석 대상

`~/.claude/projects/-Users-sonhyeonbin-Downloads-flowstock/*.jsonl` 의 최근 N개 세션
(기본 10개. `$ARGUMENTS`로 갯수 지정 가능. 예: `/harness-telemetry 30`)

## 분석 항목

각 세션 jsonl을 라인 단위로 파싱하면서 다음을 카운트:

### 1) Bash 명령 빈도 (top 30)
- `(command, first_subcommand)` 단위로 집계
- 권한 prompt 거부된 케이스 (assistant turn 직후 `tool_use_id`에 대한 user `tool_result.is_error=true` 또는 user_message가 "그거 하지마"/"권한..." 같은 거부 신호)
- **자동 allowlist 후보**: 5회 이상 반복되며 read-only인 패턴

### 2) 반복 루프 감지
- 같은 read 도구 호출(같은 file_path)이 3회 이상 → 컨텍스트 비효율 (캐싱 안 된 이유 분석)
- 같은 검색어로 grep/find 3회 이상 → 인덱싱 후보

### 3) 워크플로 시간 측정
- "/deploy-k3s 시작 timestamp" → "rollout status 끝 timestamp" 의 분포
- "/test-front" 평균 실행 시간
- p50, p95 출력

### 4) 에러 → 수정 사이클
- assistant turn 안에서 같은 패턴의 `is_error: true` 가 두 번 이상 → 첫 번째 시도 분석 부족 시그널
- 가장 자주 등장하는 에러 메시지 top 10

### 5) MCP 도구 사용 패턴
- 어떤 MCP 서버/툴이 호출됐는지 (현재는 0건이지만 향후 도입 시 측정)

## 출력 형식

```markdown
# Harness Telemetry — YYYY-MM-DD

세션 N개, 도구 호출 X회 분석.

## 🔝 자동화 후보 (allowlist 또는 skill 후보)
| 패턴 | 횟수 | 제안 |
|------|------|------|
| `Bash(curl -sS https://api.flowstock.info/*)` | 23 | allowlist 추가 |
| `ssh flowstock-mini-lan ... k3s kubectl logs ...` | 8 | `/ssh-mini logs <pod>` 사용 권장 |

## 🔁 반복 루프
- `Read /Users/.../StockChart.tsx` 5회 — 캐싱이 깨졌거나 컨텍스트 손실
- `grep -rn "DART_API_KEY"` 4회 — `Bash(grep -rn DART_API_KEY)` 로 한 번에

## ⏱ 워크플로 시간
- /deploy-k3s: p50 4분 12초, p95 9분 30초 (목표 SLO 5분 → 위반 1건)
- /test-front: p50 8초

## 💥 자주 발생한 에러
- `Could not get resource ... 503 Service Unavailable` × 3 (Gradle plugin portal)
- `Type mismatch: inferred type is Mono<...>` × 2 (Kotlin Map<String, Any?> 패턴)

## 권장 조치
1. ...
2. ...
```

## 실행 절차

```bash
# 입력 파라미터 (선택)
N=${1:-10}

# 1) 최근 세션 추출
SESSIONS=$(find ~/.claude/projects/-Users-sonhyeonbin-Downloads-flowstock -name "*.jsonl" \
  -type f -mtime -30 | xargs ls -t 2>/dev/null | head -$N)

# 2) Python으로 분석
python3 <<'PY'
import json, re, os, sys, collections, datetime
from pathlib import Path

# ... (위 항목 1~5 카운트 로직)
# - bash_pairs: Counter[(cmd, sub)]
# - read_files: Counter[file_path]
# - error_msgs: Counter[normalized_message]
# - permission_denials: list of (turn_idx, command)
# - workflow_timings: dict[skill_name, list[duration_sec]]

# 출력 포맷팅: 위 markdown 양식대로
PY
```

## 권장 빈도

주 1회 (일요일 저녁) 수동 실행이 적절. 자동화하려면:
- macOS: `~/Library/LaunchAgents/com.flowstock.harness-telemetry.plist` 작성
- 또는 매주 일요일 자동 commit으로 `.harness-telemetry/YYYY-WW.md` 누적

## 주의

- `~/.claude/projects/` 안의 jsonl은 사용자 프롬프트/응답이 평문으로 들어있다 → 외부 전송 금지
- 분석 결과 자체는 commit 가능하지만 raw transcript는 절대 commit 금지
