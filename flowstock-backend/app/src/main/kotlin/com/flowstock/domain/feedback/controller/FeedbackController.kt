package com.flowstock.domain.feedback.controller

import com.flowstock.domain.feedback.dto.FeedbackCreateRequest
import com.flowstock.domain.feedback.dto.FeedbackResponse
import com.flowstock.domain.feedback.dto.FeedbackStatusUpdateRequest
import com.flowstock.domain.feedback.entity.FeedbackStatus
import com.flowstock.domain.feedback.service.FeedbackService
import com.flowstock.global.response.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/feedback")
class FeedbackController(
    private val service: FeedbackService,
) {

    private fun currentMemberIdOrNull(): Long? {
        val principal = SecurityContextHolder.getContext().authentication?.principal ?: return null
        return when (principal) {
            is Long -> principal
            is Number -> principal.toLong()
            is String -> principal.toLongOrNull()
            else -> null
        }
    }

    private fun requireCurrentMemberId(): Long =
        currentMemberIdOrNull() ?: throw IllegalStateException("인증 정보가 없습니다.")

    @GetMapping
    fun list(
        @RequestParam(required = false) status: FeedbackStatus?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ApiResponse<Map<String, Any?>> {
        val pageResult = service.list(page, size, status, currentMemberIdOrNull())
        val payload: Map<String, Any?> = mapOf(
            "content" to pageResult.content,
            "page" to pageResult.number,
            "size" to pageResult.size,
            "totalPages" to pageResult.totalPages,
            "totalElements" to pageResult.totalElements,
        )
        return ApiResponse.success(payload)
    }

    @GetMapping("/{id}")
    fun detail(@PathVariable id: Long): ApiResponse<FeedbackResponse> =
        ApiResponse.success(service.getOne(id, currentMemberIdOrNull()))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody @Valid req: FeedbackCreateRequest): ApiResponse<FeedbackResponse> =
        ApiResponse.success(service.create(requireCurrentMemberId(), req))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ApiResponse<Map<String, Any?>> {
        service.delete(id, requireCurrentMemberId())
        return ApiResponse.success(mapOf<String, Any?>("deleted" to id))
    }

    @PostMapping("/{id}/like")
    fun toggleLike(@PathVariable id: Long): ApiResponse<FeedbackResponse> =
        ApiResponse.success(service.toggleLike(id, requireCurrentMemberId()))

    @PatchMapping("/{id}/status")
    fun updateStatus(
        @PathVariable id: Long,
        @RequestBody req: FeedbackStatusUpdateRequest,
    ): ApiResponse<FeedbackResponse> =
        ApiResponse.success(service.updateStatus(id, requireCurrentMemberId(), req.status))
}
