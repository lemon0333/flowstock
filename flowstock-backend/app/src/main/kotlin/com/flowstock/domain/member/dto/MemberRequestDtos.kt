package com.flowstock.domain.member.dto

import com.flowstock.domain.member.entity.Role
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class SignupRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    @field:NotBlank
    @field:Size(min = 8, max = 50)
    val password: String,

    @field:NotBlank
    @field:Size(min = 2, max = 20)
    val nickname: String,

    val role: Role = Role.USER,
)

data class LoginRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    @field:NotBlank
    val password: String,
)

data class RefreshTokenRequest(
    @field:NotBlank
    val refreshToken: String,
)

data class SocialOAuthRequest(
    @field:NotBlank
    val token: String,
)

data class OAuthVerifyRequest(
    @field:NotBlank
    val provider: String,

    @field:NotBlank
    val token: String,
)

data class OAuthLinkRequest(
    @field:NotBlank
    val provider: String,

    @field:NotBlank
    val token: String,
)

data class ProfileSetupRequest(
    @field:NotBlank
    @field:Size(min = 2, max = 20)
    val nickname: String,

    val profileImageUrl: String? = null,
)

data class RoleUpdateRequest(
    val role: Role,
)
