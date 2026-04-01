package com.flowstock.global.exception

import org.springframework.http.HttpStatus

enum class ErrorCode(
    val status: HttpStatus,
    val code: String,
    val message: String,
) {
    // ── Auth ──
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_001", "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_002", "만료된 토큰입니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_003", "유효하지 않은 리프레시 토큰입니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "AUTH_004", "접근 권한이 없습니다."),

    // ── Member ──
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "MEMBER_001", "회원을 찾을 수 없습니다."),
    USER_EMAIL_DUPLICATED(HttpStatus.CONFLICT, "MEMBER_002", "이미 사용 중인 이메일입니다."),
    USER_INVALID_CREDENTIAL(HttpStatus.UNAUTHORIZED, "MEMBER_003", "이메일 또는 비밀번호가 올바르지 않습니다."),

    // ── OAuth ──
    OAUTH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "OAUTH_001", "소셜 인증 토큰이 유효하지 않습니다."),
    OAUTH_ALREADY_LINKED(HttpStatus.CONFLICT, "OAUTH_002", "이미 다른 계정에 연결된 소셜 계정입니다."),
    GOOGLE_AUTH_INVALID(HttpStatus.UNAUTHORIZED, "OAUTH_003", "Google 인증에 실패했습니다."),
    NAVER_AUTH_INVALID(HttpStatus.UNAUTHORIZED, "OAUTH_004", "Naver 인증에 실패했습니다."),

    // ── Common ──
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "COMMON_001", "입력값이 올바르지 않습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_002", "서버 내부 오류가 발생했습니다."),
}
