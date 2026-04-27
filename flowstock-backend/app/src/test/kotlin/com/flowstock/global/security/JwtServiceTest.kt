package com.flowstock.global.security

import com.flowstock.domain.member.entity.Role
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class JwtServiceTest {

    private lateinit var service: JwtService

    @BeforeEach
    fun setUp() {
        // 테스트용 충분히 긴 시크릿 (HS256은 256bit 이상 권장)
        service = JwtService(
            secret = "test-secret-key-for-junit-must-be-long-enough-256bit",
            accessTokenExpiry = 60_000,
            refreshTokenExpiry = 600_000,
        )
    }

    @Test
    fun `generated access token is valid and contains memberId+role+type`() {
        val token = service.generateAccessToken(memberId = 42L, role = Role.USER)
        assertTrue(service.validateToken(token))
        assertEquals(42L, service.getMemberIdFromToken(token))
        assertEquals("USER", service.getRoleFromToken(token))
        assertEquals("access", service.getTokenTypeFromToken(token))
    }

    @Test
    fun `refresh token has type=refresh — distinguished from access`() {
        val refresh = service.generateRefreshToken(memberId = 1L, role = Role.USER)
        assertEquals("refresh", service.getTokenTypeFromToken(refresh))
    }

    @Test
    fun `validateToken rejects garbage strings without throwing`() {
        assertFalse(service.validateToken("not-a-jwt"))
        assertFalse(service.validateToken(""))
        assertFalse(service.validateToken("a.b.c"))
    }

    @Test
    fun `expired token fails validation`() {
        // 음수 만료 = 즉시 만료
        val expiredService = JwtService(
            secret = "test-secret-key-for-junit-must-be-long-enough-256bit",
            accessTokenExpiry = -1_000,
            refreshTokenExpiry = 600_000,
        )
        val token = expiredService.generateAccessToken(1L, Role.USER)
        assertFalse(expiredService.validateToken(token))
    }

    @Test
    fun `token signed with different secret is invalid`() {
        val token = service.generateAccessToken(1L, Role.USER)
        val otherService = JwtService(
            secret = "completely-different-secret-key-for-test-must-be-long",
            accessTokenExpiry = 60_000,
            refreshTokenExpiry = 600_000,
        )
        assertFalse(otherService.validateToken(token))
    }

    @Test
    fun `tokens for different members are distinct`() {
        val a = service.generateAccessToken(1L, Role.USER)
        val b = service.generateAccessToken(2L, Role.USER)
        assertNotEquals(a, b)
    }
}
