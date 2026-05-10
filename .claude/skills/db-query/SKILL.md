---
name: db-query
description: k3s 내 PostgreSQL/MySQL 직접 psql 쿼리 — 매번 SSH+kubectl exec 명령 풀어쓰지 않고 빠르게
---

backend PostgreSQL은 `flowstock` ns의 `postgresql-0` StatefulSet, AI MySQL은 `mysql-0`.
운영 중 자주 하는 짧은 쿼리(members/trades/articles 조회, role grant 등)를 SSH 명령으로 한 번에.

## 자주 쓰는 명령

### PostgreSQL (backend — flowstock DB)

```bash
# 회원 목록
ssh flowstock-mini-lan "export KUBECONFIG=\$HOME/.kube/config && \
  k3s kubectl exec -n flowstock postgresql-0 -- \
  psql -U flowstock -d flowstock -c 'SELECT id, email, nickname, role, provider FROM members ORDER BY id;'"

# 특정 회원 ADMIN grant (정공: API로 했지만 부트스트랩 시)
ssh flowstock-mini-lan "... psql -U flowstock -d flowstock -c \"UPDATE members SET role='ADMIN' WHERE email='<email>';\""

# 거래 통계
... psql -U flowstock -d flowstock -c "SELECT COUNT(*) AS total, SUM(CASE WHEN is_public THEN 1 ELSE 0 END) AS public_count FROM trades;"

# 최근 24h 가입자
... psql -U flowstock -d flowstock -c "SELECT email, nickname, provider, created_at FROM members WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC;"

# Flyway 마이그레이션 이력
... psql -U flowstock -d flowstock -c "SELECT version, description, success, installed_on FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 10;"
```

### MySQL (AI service — flowstock_ai DB)

```bash
ssh flowstock-mini-lan "... k3s kubectl exec -n flowstock mysql-0 -- \
  mysql -u flowstock -pflowstock flowstock_ai -e 'SHOW TABLES;'"

# AI 분석 로그 통계
... mysql ... -e "SELECT status, COUNT(*) FROM analysis_request_logs WHERE created_at > NOW() - INTERVAL 24 HOUR GROUP BY status;"
```

## 사용 패턴

대화에서 "/db-query <자연어>" 받으면:

1. 의도 파악 → 적절한 SQL 매핑
2. 위 헬퍼 명령으로 변환해 실행
3. 결과 라인 그대로 보여주고, 필요하면 후속 질문 제안

**주의**:
- DELETE/TRUNCATE/DROP/UPDATE 등 destructive는 사용자 확인 후 실행
- 비밀번호 변경 같은 sensitive operation은 SSH 명령 보여주고 사용자 직접 실행 권장
