package com.flowstock.domain.admin.controller

import com.flowstock.domain.admin.dto.AdminStatsResponse
import com.flowstock.domain.admin.dto.MemberSummary
import com.flowstock.domain.admin.dto.RoleGrantRequest
import com.flowstock.domain.admin.dto.RoleGrantResponse
import com.flowstock.domain.admin.service.AdminService
import com.flowstock.domain.member.entity.Role
import com.flowstock.domain.member.repository.MemberRepository
import com.flowstock.global.exception.BusinessException
import com.flowstock.global.exception.ErrorCode
import com.flowstock.global.response.ApiResponse
import com.flowstock.global.security.AdminChecker
import jakarta.validation.Valid
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/admin")
class AdminController(
    private val adminService: AdminService,
    private val memberRepository: MemberRepository,
    private val adminChecker: AdminChecker,
) {

    @GetMapping("/stats")
    fun stats(): ApiResponse<AdminStatsResponse> {
        requireAdmin()
        return ApiResponse.success(adminService.getStats())
    }

    @GetMapping("/me")
    fun amIAdmin(): ApiResponse<Map<String, Boolean>> {
        val isAdmin = try {
            requireAdmin()
            true
        } catch (_: BusinessException) {
            false
        }
        return ApiResponse.success(mapOf("isAdmin" to isAdmin))
    }

    @GetMapping("/members")
    fun listMembers(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "30") size: Int,
    ): ApiResponse<List<MemberSummary>> {
        requireAdmin()
        return ApiResponse.success(adminService.listMembers(page, size))
    }

    @PatchMapping("/members/{memberId}/role")
    fun grantRole(
        @PathVariable memberId: Long,
        @Valid @RequestBody req: RoleGrantRequest,
    ): ApiResponse<RoleGrantResponse> {
        val callerId = requireAdmin()
        // 본인 self-demote lock-out 방지: 마지막 admin이 USER로 떨어지면 복구 불가능.
        if (callerId == memberId && req.role != Role.ADMIN) {
            throw BusinessException(ErrorCode.INVALID_INPUT)
        }
        return ApiResponse.success(adminService.grantRole(memberId, req.role), "권한이 변경되었습니다.")
    }

    private fun requireAdmin(): Long {
        val auth = SecurityContextHolder.getContext().authentication
            ?: throw BusinessException(ErrorCode.INVALID_TOKEN)
        val memberId = auth.principal as? Long ?: throw BusinessException(ErrorCode.INVALID_TOKEN)
        val member = memberRepository.findById(memberId).orElseThrow {
            BusinessException(ErrorCode.USER_NOT_FOUND)
        }
        if (!adminChecker.isAdmin(member)) {
            throw BusinessException(ErrorCode.ACCESS_DENIED)
        }
        return memberId
    }
}
