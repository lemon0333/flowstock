package com.flowstock.domain.feedback.dto

import com.flowstock.domain.feedback.entity.Feedback
import com.flowstock.domain.feedback.entity.FeedbackStatus
import com.flowstock.global.util.EmailMasker
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

data class FeedbackCreateRequest(
    @field:NotBlank
    @field:Size(min = 1, max = 200, message = "제목은 1~200자")
    val title: String,

    @field:NotBlank
    @field:Size(min = 1, max = 5000, message = "내용은 1~5000자")
    val content: String,
)

data class FeedbackStatusUpdateRequest(
    val status: FeedbackStatus,
)

data class FeedbackUpdateRequest(
    @field:NotBlank
    @field:Size(min = 1, max = 200, message = "제목은 1~200자")
    val title: String,

    @field:NotBlank
    @field:Size(min = 1, max = 5000, message = "내용은 1~5000자")
    val content: String,
)

data class FeedbackResponse(
    val id: Long,
    val title: String,
    val content: String,
    val status: FeedbackStatus,
    val likeCount: Int,
    val likedByMe: Boolean,
    val authorMasked: String,
    val isMine: Boolean,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime,
) {
    companion object {
        fun from(
            f: Feedback,
            currentMemberId: Long?,
            likedByMe: Boolean,
        ): FeedbackResponse {
            val nickname = runCatching { f.member.nickname }.getOrNull()
            val email = runCatching { f.member.email }.getOrNull()
            val isDefault = runCatching { !f.member.isProfileCompleted }.getOrDefault(true)
            return FeedbackResponse(
                id = f.id,
                title = f.title,
                content = f.content,
                status = f.status,
                likeCount = f.likeCount,
                likedByMe = likedByMe,
                authorMasked = EmailMasker.authorLabel(nickname, email, isDefault),
                isMine = currentMemberId != null && currentMemberId == f.member.id,
                createdAt = f.createdAt,
                updatedAt = f.updatedAt,
            )
        }
    }
}
