---
name: test-backend
description: Kotlin 백엔드 Gradle 테스트 실행
---

백엔드 테스트를 실행합니다.

## 실행

```bash
cd flowstock-backend && ./gradlew test
```

## 결과 처리
- 성공: 테스트 수 + 소요시간 요약
- 실패: 실패한 테스트 클래스/메서드, 에러 메시지, 스택트레이스 핵심부 보고
- 빌드 보고서 위치: `build/reports/tests/test/index.html`

## 실패 시
- 컴파일 에러: 해당 소스 파일을 읽고 수정
- 테스트 로직 실패: 테스트 코드와 프로덕션 코드 비교 후 원인 분석
- DB 관련: local 프로파일 사용 확인 (`--args='--spring.profiles.active=local'`)
