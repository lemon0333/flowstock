package com.flowstock.global.security

import com.flowstock.domain.member.entity.Member
import com.flowstock.domain.member.entity.Role
import org.springframework.stereotype.Component

/**
 * 관리자 권한 체크 — DB role(`Role.ADMIN`) 단일 출처.
 *
 * grant/revoke는 admin-only 엔드포인트나 Flyway migration으로.
 * application.yml/env 보조 채널 두지 말 것 (권한 출처가 둘이면 추적 어려움).
 */
@Component
class AdminChecker {
    fun isAdmin(member: Member): Boolean = member.role == Role.ADMIN
}
