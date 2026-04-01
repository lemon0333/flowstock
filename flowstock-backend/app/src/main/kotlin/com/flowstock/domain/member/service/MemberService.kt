package com.flowstock.domain.member.service

import com.flowstock.domain.member.dto.LoginRequest
import com.flowstock.domain.member.dto.SignupRequest
import com.flowstock.domain.member.entity.Member
import com.flowstock.domain.member.entity.Role
import com.flowstock.domain.member.repository.MemberRepository
import com.flowstock.global.exception.BusinessException
import com.flowstock.global.exception.ErrorCode
import com.flowstock.global.security.JwtService
import org.slf4j.LoggerFactory
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class MemberService(
    private val memberRepository: MemberRepository,
    private val jwtService: JwtService,
    private val googleOAuthService: GoogleOAuthService,
    private val naverOAuthService: NaverOAuthService,
    private val passwordEncoder: PasswordEncoder,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun signup(request: SignupRequest): SignupResult {
        if (memberRepository.existsByEmail(request.email)) {
            throw BusinessException(ErrorCode.USER_EMAIL_DUPLICATED)
        }

        val hashedPassword = passwordEncoder.encode(request.password)
        val member = Member.createForSignup(
            email = request.email,
            password = hashedPassword,
            nickname = request.nickname,
            role = request.role,
        )

        val saved = memberRepository.save(member)
        val accessToken = jwtService.generateAccessToken(saved.id, saved.role)
        val refreshToken = jwtService.generateRefreshToken(saved.id, saved.role)

        return SignupResult(member = saved, accessToken = accessToken, refreshToken = refreshToken)
    }

    fun login(request: LoginRequest): LoginResult {
        val member = memberRepository.findByEmail(request.email)
            ?: throw BusinessException(ErrorCode.USER_INVALID_CREDENTIAL)

        member.verifyPassword(request.password, passwordEncoder)

        val accessToken = jwtService.generateAccessToken(member.id, member.role)
        val refreshToken = jwtService.generateRefreshToken(member.id, member.role)

        return LoginResult(
            accessToken = accessToken,
            refreshToken = refreshToken,
            memberId = member.id,
            nickname = member.nickname,
        )
    }

    fun refreshToken(refreshToken: String): TokenPair {
        if (!jwtService.validateToken(refreshToken)) {
            throw BusinessException(ErrorCode.INVALID_REFRESH_TOKEN)
        }

        val tokenType = try {
            jwtService.getTokenTypeFromToken(refreshToken)
        } catch (e: Exception) {
            throw BusinessException(ErrorCode.INVALID_REFRESH_TOKEN)
        }

        if (tokenType != "refresh") {
            throw BusinessException(ErrorCode.INVALID_REFRESH_TOKEN)
        }

        val memberId = try {
            jwtService.getMemberIdFromToken(refreshToken)
        } catch (e: Exception) {
            throw BusinessException(ErrorCode.INVALID_REFRESH_TOKEN)
        }

        val member = memberRepository.findById(memberId).orElseThrow {
            BusinessException(ErrorCode.INVALID_REFRESH_TOKEN)
        }

        return TokenPair(
            accessToken = jwtService.generateAccessToken(memberId, member.role),
            refreshToken = jwtService.generateRefreshToken(memberId, member.role),
        )
    }

    fun socialLogin(provider: String, token: String): SocialLoginResult {
        val userInfo = when (provider.uppercase()) {
            "GOOGLE" -> googleOAuthService.verifyIdToken(token).let {
                Triple(it.email, it.name, it.googleId)
            }
            "NAVER" -> naverOAuthService.verifyToken(token).let {
                Triple(it.email, it.nickname ?: "NaverUser", it.naverId)
            }
            else -> throw BusinessException(ErrorCode.OAUTH_TOKEN_INVALID)
        }

        val email = userInfo.first
        val nickname = userInfo.second
        val socialId = userInfo.third

        val existingMember = memberRepository.findByEmail(email)
        val isNewMember = existingMember == null

        val member = existingMember ?: run {
            val newMember = Member.createForOAuth(
                email = email,
                nickname = nickname,
                googleId = if (provider.uppercase() == "GOOGLE") socialId else null,
                naverId = if (provider.uppercase() == "NAVER") socialId else null,
                provider = provider.uppercase(),
            )
            memberRepository.save(newMember)
        }

        val accessToken = jwtService.generateAccessToken(member.id, member.role)
        val refreshToken = jwtService.generateRefreshToken(member.id, member.role)

        return SocialLoginResult(
            accessToken = accessToken,
            refreshToken = refreshToken,
            isNewMember = isNewMember,
            memberId = member.id,
            nickname = member.nickname,
            isProfileCompleted = member.isProfileCompleted,
        )
    }

    fun verifyOAuth(provider: String, token: String): OAuthVerifyResult {
        val userInfo = when (provider.uppercase()) {
            "GOOGLE" -> googleOAuthService.verifyIdToken(token)
            else -> throw BusinessException(ErrorCode.OAUTH_TOKEN_INVALID)
        }

        val member = memberRepository.findByEmail(userInfo.email)
            ?: throw BusinessException(ErrorCode.OAUTH_TOKEN_INVALID)

        val accessToken = jwtService.generateAccessToken(member.id, member.role)
        val refreshToken = jwtService.generateRefreshToken(member.id, member.role)

        return OAuthVerifyResult(accessToken = accessToken, refreshToken = refreshToken, memberId = member.id)
    }

    fun linkOAuth(memberId: Long, provider: String, token: String): OAuthLinkResult {
        val member = memberRepository.findById(memberId).orElseThrow {
            BusinessException(ErrorCode.USER_NOT_FOUND)
        }

        when (provider.uppercase()) {
            "GOOGLE" -> {
                val userInfo = googleOAuthService.verifyIdToken(token)
                val existing = memberRepository.findByGoogleId(userInfo.googleId)
                if (existing != null && existing.id != memberId) {
                    throw BusinessException(ErrorCode.OAUTH_ALREADY_LINKED)
                }
                member.googleId = userInfo.googleId
            }
            "NAVER" -> {
                val userInfo = naverOAuthService.verifyToken(token)
                val existing = memberRepository.findByNaverId(userInfo.naverId)
                if (existing != null && existing.id != memberId) {
                    throw BusinessException(ErrorCode.OAUTH_ALREADY_LINKED)
                }
                member.naverId = userInfo.naverId
            }
            else -> throw BusinessException(ErrorCode.OAUTH_TOKEN_INVALID)
        }

        return OAuthLinkResult(linkedProvider = provider.uppercase())
    }

    @Transactional(readOnly = true)
    fun getMemberInfo(memberId: Long): Member {
        return memberRepository.findById(memberId).orElseThrow {
            BusinessException(ErrorCode.USER_NOT_FOUND)
        }
    }

    fun setupProfile(memberId: Long, nickname: String, profileImageUrl: String?): Member {
        val member = memberRepository.findById(memberId).orElseThrow {
            BusinessException(ErrorCode.USER_NOT_FOUND)
        }
        member.nickname = nickname
        member.profileImageUrl = profileImageUrl
        member.isProfileCompleted = true
        return member
    }

    fun updateRole(memberId: Long, role: Role): Member {
        val member = memberRepository.findById(memberId).orElseThrow {
            BusinessException(ErrorCode.USER_NOT_FOUND)
        }
        member.role = role
        return member
    }

    fun deleteMember(memberId: Long) {
        if (!memberRepository.existsById(memberId)) {
            log.info("Member already deleted. MemberId: {}", memberId)
            return
        }
        memberRepository.deleteById(memberId)
    }
}
