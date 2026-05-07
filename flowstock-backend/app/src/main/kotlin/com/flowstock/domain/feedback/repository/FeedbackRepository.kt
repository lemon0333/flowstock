package com.flowstock.domain.feedback.repository

import com.flowstock.domain.feedback.entity.Feedback
import com.flowstock.domain.feedback.entity.FeedbackLike
import com.flowstock.domain.feedback.entity.FeedbackStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface FeedbackRepository : JpaRepository<Feedback, Long> {

    @Query(
        value = "SELECT f FROM Feedback f JOIN FETCH f.member ORDER BY f.createdAt DESC",
        countQuery = "SELECT COUNT(f) FROM Feedback f"
    )
    fun findAllWithMember(pageable: Pageable): Page<Feedback>

    @Query(
        value = "SELECT f FROM Feedback f JOIN FETCH f.member WHERE f.status = :status ORDER BY f.createdAt DESC",
        countQuery = "SELECT COUNT(f) FROM Feedback f WHERE f.status = :status"
    )
    fun findByStatusWithMember(status: FeedbackStatus, pageable: Pageable): Page<Feedback>

    @Query("SELECT f FROM Feedback f JOIN FETCH f.member WHERE f.id = :id")
    fun findByIdWithMember(id: Long): Feedback?
}

interface FeedbackLikeRepository : JpaRepository<FeedbackLike, Long> {
    fun findByFeedbackIdAndMemberId(feedbackId: Long, memberId: Long): FeedbackLike?
    fun existsByFeedbackIdAndMemberId(feedbackId: Long, memberId: Long): Boolean

    @Query("SELECT fl.feedback.id FROM FeedbackLike fl WHERE fl.member.id = :memberId AND fl.feedback.id IN :feedbackIds")
    fun findLikedFeedbackIdsByMember(memberId: Long, feedbackIds: List<Long>): List<Long>
}
