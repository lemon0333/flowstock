# FlowStock Backend

Spring Boot 3.2 + Kotlin 기반 백엔드. 인증, CRUD, DB 접근, Python AI 서비스 프록시.

## 스택
- Kotlin 1.9.20 + Spring Boot 3.2.0
- Gradle (Kotlin DSL), JVM 21
- Spring Data JPA + QueryDSL + Flyway
- Spring Security + JWT (JJWT 0.12.3)
- WebClient (Python AI 서비스 비동기 호출)

## 명령어

```bash
./gradlew bootRun                                           # 로컬 실행
./gradlew bootRun --args='--spring.profiles.active=local'   # local 프로파일
./gradlew build                                             # 빌드
./gradlew test                                              # 테스트
```

## 패키지 구조

```
com.flowstock
├── domain/
│   ├── member/    # 회원, OAuth Only (Google/Naver), JWT 인증
│   ├── news/      # 뉴스 CRUD, AI 분석 요청 (Python 서비스 호출)
│   ├── stock/     # 종목, 가격(OHLCV)
│   ├── dart/      # DART 공시 (미구현)
│   └── portfolio/ # 포트폴리오 (미구현)
├── global/
│   ├── security/  # JWT 필터, SecurityConfig (OAuth 전용)
│   ├── exception/ # BusinessException, ErrorCode
│   ├── response/  # ApiResponse<T> 래퍼
│   └── config/    # JPA Auditing, RestTemplate
└── infra/
    └── ai/        # AiServiceClient (Python FastAPI 호출)
```

## API 엔드포인트

### 공개 (인증 불필요)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/members/oauth/{provider}` | 소셜 로그인 (Google/Naver) |
| GET | `/api/members/oauth/naver/callback` | Naver OAuth 콜백 |
| POST | `/api/members/token/refresh` | 토큰 갱신 |
| GET | `/actuator/**` | 헬스체크 |

### 인증 필수
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/members/me` | 내 정보 |
| GET | `/api/news/**` | 뉴스 조회 |
| GET | `/api/stocks/**` | 종목 조회 |
| * | `/api/portfolio/**` | 포트폴리오 (미구현) |

## 인증
- **OAuth Only**: Google/Naver 소셜 로그인만 지원 (이메일 가입/로그인 제거됨)
- Access Token: 1시간, Refresh Token: 7일
- 인증 안 된 요청은 OAuth, token refresh, actuator 외 전부 401

## 프로파일
- `local`: H2/로컬 PostgreSQL, Flyway 비활성, ddl-auto=update
- `prod` (기본): PostgreSQL, Flyway 활성, ddl-auto=validate

## 환경변수

| 변수 | 설명 |
|------|------|
| `AI_SERVICE_URL` | Python AI 서비스 URL (기본: http://localhost:8000) |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | PostgreSQL 접속 |
| `DB_USERNAME`, `DB_PASSWORD` | DB 인증 |
| `JWT_SECRET` | JWT 서명 키 (256-bit) |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | Naver OAuth |

## 외부 연동
- **Python AI Service** (`ai-service.url`): 뉴스 감성분석, 차트 분석, 그래프 생성
- **KIS (한국투자증권)**: 주가 데이터
- **DART**: 전자공시 (미구현)
