package com.flowstock.global.security

import com.flowstock.domain.member.entity.Role
import io.jsonwebtoken.Claims
import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.Date
import javax.crypto.SecretKey

@Service
class JwtService(
    @Value("\${jwt.secret}") private val secret: String,
    @Value("\${jwt.access-token-expiry}") private val accessTokenExpiry: Long,
    @Value("\${jwt.refresh-token-expiry}") private val refreshTokenExpiry: Long,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val key: SecretKey by lazy { Keys.hmacShaKeyFor(secret.toByteArray()) }

    fun generateAccessToken(memberId: Long, role: Role): String =
        generateToken(memberId, role, "access", accessTokenExpiry)

    fun generateRefreshToken(memberId: Long, role: Role): String =
        generateToken(memberId, role, "refresh", refreshTokenExpiry)

    private fun generateToken(memberId: Long, role: Role, type: String, expiry: Long): String {
        val now = Date()
        return Jwts.builder()
            .subject(memberId.toString())
            .claim("role", role.name)
            .claim("type", type)
            .issuedAt(now)
            .expiration(Date(now.time + expiry))
            .signWith(key)
            .compact()
    }

    fun validateToken(token: String): Boolean {
        return try {
            parseClaims(token)
            true
        } catch (e: ExpiredJwtException) {
            log.debug("Expired token")
            false
        } catch (e: Exception) {
            log.debug("Invalid token: {}", e.message)
            false
        }
    }

    fun getMemberIdFromToken(token: String): Long =
        parseClaims(token).subject.toLong()

    fun getRoleFromToken(token: String): String =
        parseClaims(token)["role"] as String

    fun getTokenTypeFromToken(token: String): String =
        parseClaims(token)["type"] as String

    private fun parseClaims(token: String): Claims =
        Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload
}
