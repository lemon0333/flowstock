package com.flowstock.global.security

import com.flowstock.domain.member.entity.Member
import com.flowstock.domain.member.entity.Role
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

/**
 * 관리자 권한 체크.
 *
 * - DB role이 ADMIN이면 true
 * - 또는 application.yml `app.admin.emails` 목록에 email 있으면 true (가입 시점 무관)
 *
 * 후자가 있으면 DB role 수동 변경 없이도 admin 권한 부여.
 */
@Component
class AdminChecker(
    @Value("\${app.admin.emails:}") emailsCsv: String,
) {
    private val emails: Set<String> = emailsCsv
        .split(",")
        .map { it.trim().lowercase() }
        .filter { it.isNotBlank() }
        .toSet()

    fun isAdmin(member: Member): Boolean {
        if (member.role == Role.ADMIN) return true
        return member.email.lowercase().trim() in emails
    }
}
