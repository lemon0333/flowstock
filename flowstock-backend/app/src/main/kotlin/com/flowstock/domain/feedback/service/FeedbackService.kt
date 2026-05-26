package com.flowstock.domain.feedback.service

import com.flowstock.domain.feedback.dto.FeedbackCreateRequest
import com.flowstock.domain.feedback.dto.FeedbackResponse
import com.flowstock.domain.feedback.entity.Feedback
import com.flowstock.domain.feedback.entity.FeedbackLike
import com.flowstock.domain.feedback.entity.FeedbackStatus
import com.flowstock.domain.feedback.repository.FeedbackLikeRepository
import com.flowstock.domain.feedback.repository.FeedbackRepository
import com.flowstock.domain.member.entity.Member
import com.flowstock.domain.member.repository.MemberRepository
import com.flowstock.global.exception.BusinessException
import com.flowstock.global.exception.ErrorCode
import com.flowstock.global.security.AdminChecker
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class FeedbackService(
    private val feedbackRepository: FeedbackRepository,
    private val feedbackLikeRepository: FeedbackLikeRepository,
    private val memberRepository: MemberRepository,
    private val adminChecker: AdminChecker,
) {

    @Transactional(readOnly = true)
    fun list(
        page: Int,
        size: Int,
        status: FeedbackStatus?,
        currentMemberId: Long?,
    ): Page<FeedbackResponse> {
        val pageable = PageRequest.of(page.coerceAtLeast(0), size.coerceIn(1, 50))
        val feedbacks = if (status != null) {
            feedbackRepository.findByStatusWithMember(status, pageable)
        } else {
            feedbackRepository.findAllWithMember(pageable)
        }

        val likedSet: Set<Long> = if (currentMemberId != null && feedbacks.content.isNotEmpty()) {
            feedbackLikeRepository
                .findLikedFeedbackIdsByMember(currentMemberId, feedbacks.content.map { it.id })
                .toSet()
        } else {
            emptySet()
        }

        return feedbacks.map { f ->
            FeedbackResponse.from(f, currentMemberId, likedByMe = f.id in likedSet)
        }
    }

    @Transactional(readOnly = true)
    fun getOne(id: Long, currentMemberId: Long?): FeedbackResponse {
        val f = feedbackRepository.findByIdWithMember(id)
            ?: throw BusinessException(ErrorCode.RESOURCE_NOT_FOUND)
        val liked = currentMemberId != null &&
            feedbackLikeRepository.existsByFeedbackIdAndMemberId(id, currentMemberId)
        return FeedbackResponse.from(f, currentMemberId, likedByMe = liked)
    }

    @Transactional
    fun create(memberId: Long, req: FeedbackCreateRequest): FeedbackResponse {
        val member = loadMember(memberId)
        val saved = feedbackRepository.save(
            Feedback(
                member = member,
                title = req.title.trim(),
                content = req.content.trim(),
            )
        )
        return FeedbackResponse.from(saved, memberId, likedByMe = false)
    }

    @Transactional
    fun delete(id: Long, memberId: Long) {
        val f = feedbackRepository.findByIdWithMember(id)
            ?: throw BusinessException(ErrorCode.RESOURCE_NOT_FOUND)
        val member = loadMember(memberId)
        if (f.member.id != memberId && !adminChecker.isAdmin(member)) {
            throw BusinessException(ErrorCode.ACCESS_DENIED)
        }
        feedbackRepository.delete(f)
    }

    @Transactional
    fun update(id: Long, memberId: Long, title: String, content: String): FeedbackResponse {
        val f = feedbackRepository.findByIdWithMember(id)
            ?: throw BusinessException(ErrorCode.RESOURCE_NOT_FOUND)
        if (f.member.id != memberId) {
            throw BusinessException(ErrorCode.ACCESS_DENIED)
        }
        f.title = title.trim()
        f.content = content.trim()
        val liked = feedbackLikeRepository.existsByFeedbackIdAndMemberId(id, memberId)
        return FeedbackResponse.from(f, memberId, likedByMe = liked)
    }

    @Transactional
    fun updateStatus(id: Long, memberId: Long, status: FeedbackStatus): FeedbackResponse {
        val f = feedbackRepository.findByIdWithMember(id)
            ?: throw BusinessException(ErrorCode.RESOURCE_NOT_FOUND)
        val member = loadMember(memberId)
        if (!adminChecker.isAdmin(member)) {
            throw BusinessException(ErrorCode.ACCESS_DENIED)
        }
        f.status = status
        return FeedbackResponse.from(f, memberId, likedByMe = false)
    }

    @Transactional
    fun toggleLike(id: Long, memberId: Long): FeedbackResponse {
        val f = feedbackRepository.findByIdWithMember(id)
            ?: throw BusinessException(ErrorCode.RESOURCE_NOT_FOUND)
        val member = loadMember(memberId)
        val existing = feedbackLikeRepository.findByFeedbackIdAndMemberId(id, memberId)
        val nowLiked: Boolean
        if (existing != null) {
            feedbackLikeRepository.delete(existing)
            f.likeCount = (f.likeCount - 1).coerceAtLeast(0)
            nowLiked = false
        } else {
            feedbackLikeRepository.save(FeedbackLike(feedback = f, member = member))
            f.likeCount += 1
            nowLiked = true
        }
        return FeedbackResponse.from(f, memberId, likedByMe = nowLiked)
    }

    private fun loadMember(memberId: Long): Member =
        memberRepository.findById(memberId).orElseThrow {
            BusinessException(ErrorCode.USER_NOT_FOUND)
        }
}
