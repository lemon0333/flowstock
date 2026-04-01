package com.flowstock.domain.member.controller

import com.flowstock.domain.member.dto.*
import com.flowstock.domain.member.service.MemberService
import com.flowstock.domain.member.service.NaverOAuthService
import com.flowstock.global.exception.BusinessException
import com.flowstock.global.exception.ErrorCode
import com.flowstock.global.response.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/members")
class MemberController(
    private val memberService: MemberService,
    private val naverOAuthService: NaverOAuthService,
) {

    // ── 일반 회원가입 / 로그인 ──

    @PostMapping("/signup")
    fun signup(@Valid @RequestBody request: SignupRequest): ResponseEntity<ApiResponse<SignupResponse>> {
        val result = memberService.signup(request)
        val response = SignupResponse(
            memberId = result.member.id,
            email = result.member.email,
            nickname = result.member.nickname,
            role = result.member.role,
            accessToken = result.accessToken,
            refreshToken = result.refreshToken,
            createdAt = result.member.createdAt,
        )
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response, "회원 가입이 완료되었습니다."))
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<ApiResponse<LoginResponse>> {
        val result = memberService.login(request)
        val response = LoginResponse(
            accessToken = result.accessToken,
            refreshToken = result.refreshToken,
            memberId = result.memberId,
            nickname = result.nickname,
        )
        return ResponseEntity.ok(ApiResponse.success(response, "로그인 되었습니다."))
    }

    @PostMapping("/logout")
    fun logout(): ResponseEntity<ApiResponse<Unit>> {
        return ResponseEntity.ok(ApiResponse.success(Unit, "로그아웃되었습니다."))
    }

    @PostMapping("/token/refresh")
    fun refreshToken(@Valid @RequestBody request: RefreshTokenRequest): ResponseEntity<ApiResponse<RefreshTokenResponse>> {
        val tokenPair = memberService.refreshToken(request.refreshToken)
        val response = RefreshTokenResponse(
            accessToken = tokenPair.accessToken,
            refreshToken = tokenPair.refreshToken,
        )
        return ResponseEntity.ok(ApiResponse.success(response, "토큰이 재발급되었습니다."))
    }

    // ── 소셜 로그인 ──

    @PostMapping("/oauth/{provider}")
    fun socialLogin(
        @PathVariable provider: String,
        @Valid @RequestBody request: SocialOAuthRequest,
    ): ResponseEntity<ApiResponse<SocialLoginResponse>> {
        val result = memberService.socialLogin(provider, request.token)
        val response = SocialLoginResponse(
            accessToken = result.accessToken,
            refreshToken = result.refreshToken,
            isNewMember = result.isNewMember,
            memberId = result.memberId,
            nickname = result.nickname,
        )
        val message = if (result.isNewMember) "회원 가입이 완료되었습니다." else "${provider.uppercase()} 로그인에 성공했습니다."
        return ResponseEntity.ok(ApiResponse.success(response, message))
    }

    @GetMapping("/oauth/naver/callback")
    fun naverCallback(
        @RequestParam code: String,
        @RequestParam state: String,
    ): ResponseEntity<ApiResponse<SocialLoginResponse>> {
        val accessToken = naverOAuthService.getAccessToken(code, state)
        val result = memberService.socialLogin("NAVER", accessToken)
        val response = SocialLoginResponse(
            accessToken = result.accessToken,
            refreshToken = result.refreshToken,
            isNewMember = result.isNewMember,
            memberId = result.memberId,
            nickname = result.nickname,
        )
        return ResponseEntity.ok(ApiResponse.success(response, "네이버 로그인 성공"))
    }

    @PostMapping("/oauth/verify")
    fun verifyOAuth(@Valid @RequestBody request: OAuthVerifyRequest): ResponseEntity<ApiResponse<OAuthVerifyResponse>> {
        val result = memberService.verifyOAuth(request.provider, request.token)
        val response = OAuthVerifyResponse(
            accessToken = result.accessToken,
            refreshToken = result.refreshToken,
            memberId = result.memberId,
        )
        return ResponseEntity.ok(ApiResponse.success(response, "소셜 인증 검증에 성공했습니다."))
    }

    // ── 인증 필요 API ──

    @PostMapping("/me/oauth/link")
    fun linkOAuth(@Valid @RequestBody request: OAuthLinkRequest): ResponseEntity<ApiResponse<OAuthLinkResponse>> {
        val memberId = currentMemberId()
        val result = memberService.linkOAuth(memberId, request.provider, request.token)
        return ResponseEntity.ok(ApiResponse.success(OAuthLinkResponse(result.linkedProvider), "소셜 계정이 연결되었습니다."))
    }

    @GetMapping("/me")
    fun getMemberInfo(): ResponseEntity<ApiResponse<MemberInfoResponse>> {
        val memberId = currentMemberId()
        val member = memberService.getMemberInfo(memberId)
        val response = MemberInfoResponse(
            memberId = member.id,
            email = member.email,
            nickname = member.nickname,
            role = member.role,
            profileImageUrl = member.profileImageUrl,
        )
        return ResponseEntity.ok(ApiResponse.success(response, "사용자 정보 조회에 성공했습니다."))
    }

    @DeleteMapping("/me")
    fun deleteMember(): ResponseEntity<ApiResponse<Unit>> {
        memberService.deleteMember(currentMemberId())
        return ResponseEntity.ok(ApiResponse.success(Unit, "회원 탈퇴가 완료되었습니다."))
    }

    @PatchMapping("/me/profile/setup")
    fun setupProfile(@Valid @RequestBody request: ProfileSetupRequest): ResponseEntity<ApiResponse<ProfileSetupResponse>> {
        val member = memberService.setupProfile(currentMemberId(), request.nickname, request.profileImageUrl)
        val response = ProfileSetupResponse(
            memberId = member.id,
            nickname = member.nickname,
            profileImageUrl = member.profileImageUrl,
        )
        return ResponseEntity.ok(ApiResponse.success(response, "프로필 설정이 완료되었습니다."))
    }

    @PatchMapping("/me/role")
    fun updateRole(@Valid @RequestBody request: RoleUpdateRequest): ResponseEntity<ApiResponse<RoleUpdateResponse>> {
        val member = memberService.updateRole(currentMemberId(), request.role)
        val response = RoleUpdateResponse(memberId = member.id, role = member.role)
        return ResponseEntity.ok(ApiResponse.success(response, "역할이 업데이트되었습니다."))
    }

    // ── Helper ──

    private fun currentMemberId(): Long {
        val auth = SecurityContextHolder.getContext().authentication
            ?: throw BusinessException(ErrorCode.INVALID_TOKEN)
        return auth.principal as Long
    }
}
