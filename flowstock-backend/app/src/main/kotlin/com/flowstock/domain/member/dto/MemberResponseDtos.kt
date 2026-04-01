package com.flowstock.domain.member.dto

import com.flowstock.domain.member.entity.Role
import java.time.LocalDateTime

data class SignupResponse(
    val memberId: Long,
    val email: String,
    val nickname: String,
    val role: Role,
    val accessToken: String,
    val refreshToken: String,
    val createdAt: LocalDateTime,
)

data class LoginResponse(
    val accessToken: String,
    val refreshToken: String,
    val memberId: Long,
    val nickname: String,
)

data class RefreshTokenResponse(
    val accessToken: String,
    val refreshToken: String,
)

data class SocialLoginResponse(
    val accessToken: String,
    val refreshToken: String,
    val isNewMember: Boolean,
    val memberId: Long,
    val nickname: String,
)

data class OAuthVerifyResponse(
    val accessToken: String,
    val refreshToken: String,
    val memberId: Long,
)

data class OAuthLinkResponse(
    val linkedProvider: String,
)

data class MemberInfoResponse(
    val memberId: Long,
    val email: String,
    val nickname: String,
    val role: Role,
    val profileImageUrl: String?,
)

data class ProfileSetupResponse(
    val memberId: Long,
    val nickname: String,
    val profileImageUrl: String?,
)

data class RoleUpdateResponse(
    val memberId: Long,
    val role: Role,
)

// Naver OAuth 유저 정보
data class NaverUserInfo(
    val naverId: String,
    val email: String,
    val nickname: String?,
    val profileImage: String?,
)
