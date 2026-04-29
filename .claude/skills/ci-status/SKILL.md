---
name: ci-status
description: GitHub Actions 최근 빌드/배포 상태 조회 (실패 시 어느 잡인지까지)
---

GitHub Actions의 최근 워크플로 run 상태를 조회한다.

## 기본 동작

최근 5개 run을 한 줄씩 출력:

```bash
curl -s "https://api.github.com/repos/lemon0333/flowstock/actions/runs?per_page=5" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d.get('workflow_runs',[]):
    sha=r['head_sha'][:7]
    status=r['status']
    conclusion=r['conclusion'] or '-'
    title=(r['display_title'] or '')[:60]
    print(f'{sha} | {status:11} | {conclusion:10} | {title}')
"
```

## 최신 run이 실패했으면

자동으로 그 run의 잡별 결과까지 보여준다:

```bash
RUN_ID=$(curl -s "https://api.github.com/repos/lemon0333/flowstock/actions/runs?per_page=1" | python3 -c "import json,sys; print(json.load(sys.stdin)['workflow_runs'][0]['id'])")
curl -s "https://api.github.com/repos/lemon0333/flowstock/actions/runs/$RUN_ID/jobs" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for j in d.get('jobs',[]):
    print(f\"  {j['name']:20} {j['conclusion']}\")
    for s in j.get('steps',[]):
        if s.get('conclusion') == 'failure':
            print(f\"    FAIL step: {s['name']}\")
"
```

## 인자 (옵션)
- `$ARGUMENTS`가 비어있으면 위 기본 동작
- 숫자가 주어지면 해당 run ID의 디테일을 조회
- "logs"가 주어지면 최신 실패 run의 로그 URL을 출력

## 출력 예시
```
335c594 | completed   | success    | feat: foo
e678a5d | completed   | failure    | fix: bar
```

## 주의
- GitHub API는 인증 없이도 60 req/h 허용 — 정보 조회 정도는 충분
- 인증 필요 시 `gh` CLI를 사용하라고 안내
