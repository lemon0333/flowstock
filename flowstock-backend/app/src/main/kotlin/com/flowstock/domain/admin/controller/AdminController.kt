package com.flowstock.domain.admin.controller

import com.flowstock.domain.admin.dto.AdminStatsResponse
import com.flowstock.domain.admin.service.AdminService
import com.flowstock.domain.member.repository.MemberRepository
import com.flowstock.global.exception.BusinessException
import com.flowstock.global.exception.ErrorCode
import com.flowstock.global.response.ApiResponse
import com.flowstock.global.security.AdminChecker
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
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

    private fun requireAdmin() {
        val auth = SecurityContextHolder.getContext().authentication
            ?: throw BusinessException(ErrorCode.INVALID_TOKEN)
        val memberId = auth.principal as? Long ?: throw BusinessException(ErrorCode.INVALID_TOKEN)
        val member = memberRepository.findById(memberId).orElseThrow {
            BusinessException(ErrorCode.USER_NOT_FOUND)
        }
        if (!adminChecker.isAdmin(member)) {
            throw BusinessException(ErrorCode.ACCESS_DENIED)
        }
    }
}
