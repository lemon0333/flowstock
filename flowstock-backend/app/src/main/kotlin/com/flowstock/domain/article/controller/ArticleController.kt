package com.flowstock.domain.article.controller

import com.flowstock.domain.article.dto.ArticleCreateRequest
import com.flowstock.domain.article.dto.ArticleDetail
import com.flowstock.domain.article.dto.ArticleSummary
import com.flowstock.domain.article.dto.ArticleUpdateRequest
import com.flowstock.domain.article.dto.CommentCreateRequest
import com.flowstock.domain.article.dto.CommentDto
import com.flowstock.domain.article.entity.ArticleCategory
import com.flowstock.domain.article.service.ArticleService
import com.flowstock.global.response.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/articles")
class ArticleController(
    private val service: ArticleService,
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
        @RequestParam(required = false) category: ArticleCategory?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ApiResponse<Map<String, Any?>> {
        val pageResult = service.list(category, page, size)
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
    fun detail(@PathVariable id: Long): ApiResponse<ArticleDetail> =
        ApiResponse.success(service.get(id, currentMemberIdOrNull()))

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody @Valid req: ArticleCreateRequest): ApiResponse<Map<String, Any?>> {
        val id = service.create(requireCurrentMemberId(), req)
        return ApiResponse.success(mapOf<String, Any?>("id" to id))
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: Long,
        @RequestBody @Valid req: ArticleUpdateRequest,
    ): ApiResponse<ArticleDetail> = ApiResponse.success(service.update(requireCurrentMemberId(), id, req))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ApiResponse<Map<String, Any?>> {
        service.delete(requireCurrentMemberId(), id)
        return ApiResponse.success(mapOf<String, Any?>("deleted" to true))
    }

    @PostMapping("/{id}/comments")
    fun addComment(
        @PathVariable id: Long,
        @RequestBody @Valid req: CommentCreateRequest,
    ): ApiResponse<CommentDto> = ApiResponse.success(service.addComment(requireCurrentMemberId(), id, req))

    @DeleteMapping("/comments/{commentId}")
    fun deleteComment(@PathVariable commentId: Long): ApiResponse<Map<String, Any?>> {
        service.deleteComment(requireCurrentMemberId(), commentId)
        return ApiResponse.success(mapOf<String, Any?>("deleted" to true))
    }

    @PostMapping("/{id}/like")
    fun toggleLike(@PathVariable id: Long): ApiResponse<Map<String, Any?>> {
        val liked = service.toggleLike(requireCurrentMemberId(), id)
        return ApiResponse.success(mapOf<String, Any?>("liked" to liked))
    }
}
