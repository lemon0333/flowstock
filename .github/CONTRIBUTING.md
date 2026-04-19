# Contributing to FlowStock

## Git 컨벤션

### 브랜치 전략
```
main              — 프로덕션 (항상 배포 가능)
feature/{이슈번호}-{설명}  — 새 기능 (예: feature/12-news-cache)
fix/{이슈번호}-{설명}      — 버그 수정 (예: fix/15-jwt-expire)
infra/{설명}              — 인프라 변경 (예: infra/mysql-setup)
```

### 커밋 메시지 규칙
```
add : 새로운 기능 추가
fix : 버그 수정
update : 기존 기능 개선/수정
remove : 코드/파일 삭제
refactor : 리팩토링 (기능 변화 없음)
docs : 문서 수정
test : 테스트 추가/수정
infra : 인프라/배포 관련
```

예시:
```
add : 뉴스 분석 결과 MySQL 캐싱
fix : JWT 토큰 만료 시 무한 리다이렉트
update : 포트폴리오 차트 성능 개선
infra : AI 서비스 k8s 리소스 조정
```

### PR 규칙
1. `main` 직접 push 금지 — 반드시 PR 통해 merge
2. PR 제목은 커밋 메시지 규칙과 동일
3. PR 템플릿의 체크리스트 완료 후 merge
4. 관련 이슈가 있으면 `closes #이슈번호` 로 연결

### 코드 리뷰
- `/review-code` — 변경사항 빠른 리뷰
- `/full-review` — 전체 코드베이스 리뷰 (4개 에이전트 병렬)

## 서비스별 개발 환경

| 서비스 | 포트 | 실행 방법 |
|--------|------|----------|
| Frontend | 3000 | `cd flowstock-front && npm run dev` |
| Backend | 8080 | `cd flowstock-backend && ./gradlew bootRun` |
| AI Service | 8000 | `cd flowstock-ai && uvicorn app.main:app --port 8000` |

## 배포

배포는 Claude Code 스킬로 자동화되어 있습니다:
- `/deploy-k3s` — 백엔드/AI 서비스 k3s 배포
- `/deploy-front` — 프론트엔드 S3 + CloudFront 배포
