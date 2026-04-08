---
name: full-review
description: 전체 코드베이스 병렬 리뷰 (프론트+백엔드+AI+인프라 동시 검사)
---

FlowStock 전체 코드베이스를 **병렬 에이전트**로 동시에 리뷰합니다.

## 실행 방법

**반드시 4개의 Agent를 동시에 spawn** 하세요:

### Agent 1: 프론트엔드 감사
```
flowstock-front/ 디렉토리의 React/TypeScript 코드를 리뷰하라.
체크 항목: 타입 안전성, 컴포넌트 구조, 접근성(a11y), 성능(불필요한 리렌더링),
shadcn/ui 컨벤션 준수, API 에러 핸들링, 인증 가드 누락.
결과를 severity별로 정리해서 보고.
```

### Agent 2: 백엔드 리뷰
```
flowstock-backend/ 디렉토리의 Kotlin/Spring Boot 코드를 리뷰하라.
체크 항목: Security 설정, JWT 처리, JPA 엔티티 설계, N+1 쿼리,
BusinessException 활용, API 응답 일관성(ApiResponse), 트랜잭션 관리.
결과를 severity별로 정리해서 보고.
```

### Agent 3: AI 서비스 리뷰
```
flowstock-ai/ 디렉토리의 Python/FastAPI 코드를 리뷰하라.
체크 항목: Pydantic 스키마 검증, LangChain 프롬프트 품질, 에러 핸들링,
API 키 노출 위험, 응답 시간 최적화, 타입 힌트 완전성.
결과를 severity별로 정리해서 보고.
```

### Agent 4: 인프라 검증
```
flowstock-infra/ 디렉토리의 Terraform + k8s YAML을 리뷰하라.
체크 항목: 리소스 사이징, 시크릿 관리, RBAC, 네트워크 정책,
PVC 설정, HPA 임계값, Ingress TLS 설정.
결과를 severity별로 정리해서 보고.
```

## 결과 종합
4개 에이전트의 결과를 받은 후, **하나의 통합 보고서**로 정리:
- Critical 이슈 먼저
- 서비스별 요약
- 우선순위 정렬된 액션 아이템
