package com.flowstock.domain.member.service

import com.flowstock.domain.member.entity.Member

data class SignupResult(
    val member: Member,
    val accessToken: String,
    val refreshToken: String,
)

data class LoginResult(
    val accessToken: String,
    val refreshToken: String,
    val memberId: Long,
    val nickname: String,
)

data class SocialLoginResult(
    val accessToken: String,
    val refreshToken: String,
    val isNewMember: Boolean,
    val memberId: Long,
    val nickname: String,
    val isProfileCompleted: Boolean,
)

data class TokenPair(
    val accessToken: String,
    val refreshToken: String,
)

data class OAuthVerifyResult(
    val accessToken: String,
    val refreshToken: String,
    val memberId: Long,
)

data class OAuthLinkResult(
    val linkedProvider: String,
)
