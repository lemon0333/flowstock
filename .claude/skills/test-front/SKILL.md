---
name: test-front
description: 프론트엔드 린트 + 타입체크 + 테스트 실행
---

프론트엔드 코드 품질을 검증합니다.

## 실행 순서

1. **타입 체크**:
   ```bash
   cd flowstock-front && npx tsc --noEmit
   ```

2. **ESLint**:
   ```bash
   npm run lint
   ```

3. **Vitest 단위 테스트**:
   ```bash
   npm run test -- --run
   ```

4. 결과 요약 출력 (통과/실패 수, 실패한 테스트 목록)

## 실패 시
- 타입 에러: 해당 파일을 읽고 수정 제안
- 린트 에러: `--fix` 로 자동 수정 가능한 것은 수정, 나머지는 보고
- 테스트 실패: 실패 원인 분석 후 수정 제안
