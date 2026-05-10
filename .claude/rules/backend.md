# Backend 작업 규칙 — Spring Boot 3.2 + Kotlin

## 도메인 추가 패턴

새 도메인은 `domain/<name>/{controller,service,repository,entity,dto}` 구조. 기존 `news`, `member`, `trade`, `admin` 참고.

- entity: `BaseEntity` 상속 (`createdAt`/`updatedAt`/`createdBy`/`updatedBy` 자동)
- service: `@Service` + `@Transactional(readOnly = true)` 기본, 쓰기는 `@Transactional`
- controller: `ApiResponse<T>` 래퍼 사용. `BusinessException` + `ErrorCode` enum
- DB 변경: Flyway `V<N>__<name>.sql` 추가 (Vn 충돌 주의)
- 인증 필요 endpoint: SecurityConfig의 `anyRequest().authenticated()`로 자동 잡힘. 명시적 permitAll만 추가
- 비로그인 read-only 패턴: `/api/<resource>/public`, `/api/<resource>/leaderboard` 등 GET permitAll로 등록

## 권한 (Admin / Role)

**핵심 원칙**: Member.role 단일 출처. application.yml/env/migration SQL 어디에도 운영자 이메일 박지 말 것.

- AdminChecker: `member.role == Role.ADMIN` 한 줄
- 첫 admin 부트스트랩: 운영자가 SSH로 직접 1회 `UPDATE members SET role='ADMIN' WHERE email='<운영자>'`
- 이후 grant/revoke: `PATCH /api/admin/members/{id}/role` (admin-only)
- 본인 self-demote 락아웃 방지: requireAdmin이 callerId 반환, 본인 id에 USER 부여 차단

## 로깅

```kotlin
private val log = LoggerFactory.getLogger(javaClass)
log.info("...{}...{}", v1, v2)   // placeholder 패턴 (lazy eval)
log.warn(...)
log.error("msg", throwable)       // 마지막 인자 throwable이면 stack trace
```

`com.flowstock` 레벨은 prod=INFO/local=DEBUG. env `LOG_LEVEL`로 override.

## Flyway 정정

이미 적용된 V<N> SQL을 정정하면 checksum mismatch로 startup 깨질 수 있음.
`FlywayConfig`의 `FlywayMigrationStrategy`가 startup마다 `repair()` 호출 → 자동 reconcile.

## 외부 호출

- AI service 호출: `WebClient` (`infra/ai/AiServiceClient.kt`)
- 응답 비어있으면 backend가 최대 -7일까지 retry (휴일/주말 대응)

## 테스트 / 빌드

- JDK 17 (kapt 호환성)
- `./gradlew build` / `./gradlew test`
- ktlint hook이 자동 포맷
