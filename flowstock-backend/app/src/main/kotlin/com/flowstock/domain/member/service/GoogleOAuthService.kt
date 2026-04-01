package com.flowstock.domain.member.service

import com.flowstock.global.exception.BusinessException
import com.flowstock.global.exception.ErrorCode
import com.fasterxml.jackson.databind.ObjectMapper
import io.jsonwebtoken.Jwts
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.math.BigInteger
import java.security.KeyFactory
import java.security.PublicKey
import java.security.spec.RSAPublicKeySpec
import java.util.Base64
import java.util.Date

@Service
class GoogleOAuthService(
    @Value("\${oauth.google.client-id}") private val googleClientId: String,
    @Value("\${oauth.google.jwk-set-uri}") private val jwkSetUri: String,
    private val objectMapper: ObjectMapper,
    private val restTemplate: RestTemplate,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun verifyIdToken(idToken: String): GoogleUserInfo {
        val parts = parseJwtParts(idToken)
        val claims = verifySignatureAndParseClaims(parts)
        validateClaims(claims)
        return extractUserInfo(claims)
    }

    private fun parseJwtParts(idToken: String): List<String> {
        if (idToken.isBlank()) throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)
        val parts = idToken.split(".")
        if (parts.size != 3) throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)
        return parts
    }

    @Suppress("UNCHECKED_CAST")
    private fun verifySignatureAndParseClaims(parts: List<String>): io.jsonwebtoken.Claims {
        try {
            val decodedHeader = Base64.getUrlDecoder().decode(parts[0])
            val headerMap = objectMapper.readValue(decodedHeader, Map::class.java) as Map<String, Any>
            val kid = headerMap["kid"] as? String ?: throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)

            val publicKey = getPublicKeyFromJwkSet(kid)
            val fullToken = "${parts[0]}.${parts[1]}.${parts[2]}"

            return Jwts.parser()
                .verifyWith(publicKey)
                .build()
                .parseSignedClaims(fullToken)
                .payload
        } catch (e: BusinessException) {
            throw e
        } catch (e: Exception) {
            log.error("Failed to verify Google JWT", e)
            throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun getPublicKeyFromJwkSet(kid: String): PublicKey {
        try {
            val response = restTemplate.getForObject(jwkSetUri, Map::class.java)
            val keys = (response?.get("keys") as? List<Map<String, Any>>)
                ?: throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)

            val jwk = keys.firstOrNull { it["kid"] == kid }
                ?: throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)

            val modulusBytes = Base64.getUrlDecoder().decode(jwk["n"] as String)
            val exponentBytes = Base64.getUrlDecoder().decode(jwk["e"] as String)

            val keySpec = RSAPublicKeySpec(BigInteger(1, modulusBytes), BigInteger(1, exponentBytes))
            return KeyFactory.getInstance("RSA").generatePublic(keySpec)
        } catch (e: BusinessException) {
            throw e
        } catch (e: Exception) {
            log.error("Failed to get Google public key (kid: $kid)", e)
            throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)
        }
    }

    private fun validateClaims(claims: io.jsonwebtoken.Claims) {
        val issuer = claims["iss"] as? String
        if (issuer == null || !issuer.contains("accounts.google.com")) {
            throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)
        }

        val audience = when (val aud = claims["aud"]) {
            is String -> aud
            is Collection<*> -> aud.firstOrNull() as? String
            else -> null
        }
        if (audience != googleClientId) {
            throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)
        }

        val expiration = claims.expiration
        if (expiration == null || expiration.before(Date())) {
            throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)
        }
    }

    private fun extractUserInfo(claims: io.jsonwebtoken.Claims): GoogleUserInfo {
        val googleId = claims.subject ?: throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)
        val email = claims["email"] as? String ?: throw BusinessException(ErrorCode.GOOGLE_AUTH_INVALID)
        val name = claims["name"] as? String ?: ""
        val picture = claims["picture"] as? String

        return GoogleUserInfo(
            googleId = googleId,
            email = email,
            name = name,
            picture = picture,
        )
    }
}

data class GoogleUserInfo(
    val googleId: String,
    val email: String,
    val name: String,
    val picture: String?,
)
