---
name: review-code
description: 최근 변경사항 보안/품질 리뷰 (git diff 기반)
---

최근 코드 변경사항을 리뷰합니다.

## 리뷰 절차

1. **변경 확인**:
   ```bash
   git diff main --stat
   git diff main
   ```

2. **보안 체크** (Critical):
   - 하드코딩된 시크릿 (API 키, 비밀번호, 토큰)
   - SQL injection 가능성 (raw query 사용)
   - XSS 취약점 (dangerouslySetInnerHTML, 미이스케이프 출력)
   - 인증/인가 우회 가능성

3. **품질 체크** (Warning):
   - 에러 핸들링 누락 (catch 없는 async, 빈 catch 블록)
   - N+1 쿼리 패턴
   - 미사용 import/변수
   - 타입 안전성 (any 타입 남용)

4. **아키텍처 체크** (Info):
   - 서비스 간 경계 위반 (프론트에서 AI 서비스 직접 호출 등)
   - 컨벤션 위반 (ApiResponse 미사용, BusinessException 미사용)

## 출력 형식
각 이슈를 `[CRITICAL/WARNING/INFO] 파일:라인 — 설명` 형태로 보고.
수정 가능한 것은 수정 제안 포함.
