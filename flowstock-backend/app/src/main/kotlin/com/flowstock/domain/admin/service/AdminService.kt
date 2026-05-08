package com.flowstock.domain.admin.service

import com.flowstock.domain.admin.dto.AdminStatsResponse
import com.flowstock.domain.admin.dto.CountStat
import com.flowstock.domain.admin.dto.MemberSummary
import com.flowstock.domain.admin.dto.RoleGrantResponse
import com.flowstock.domain.article.repository.ArticleRepository
import com.flowstock.domain.article.repository.CommentRepository
import com.flowstock.domain.member.entity.Member
import com.flowstock.domain.member.entity.Role
import com.flowstock.domain.member.repository.MemberRepository
import com.flowstock.domain.trade.repository.TradeRepository
import com.flowstock.global.exception.BusinessException
import com.flowstock.global.exception.ErrorCode
import java.time.LocalDateTime
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AdminService(
    private val memberRepository: MemberRepository,
    private val tradeRepository: TradeRepository,
    private val articleRepository: ArticleRepository,
    private val commentRepository: CommentRepository,
) {

    @Transactional
    fun grantRole(targetMemberId: Long, role: Role): RoleGrantResponse {
        val member = memberRepository.findById(targetMemberId).orElseThrow {
            BusinessException(ErrorCode.USER_NOT_FOUND)
        }
        member.role = role
        val saved = memberRepository.save(member)
        return RoleGrantResponse(
            memberId = saved.id,
            email = saved.email,
            nickname = saved.nickname,
            role = saved.role,
        )
    }

    @Transactional(readOnly = true)
    fun listMembers(page: Int, size: Int): List<MemberSummary> {
        val pageable = PageRequest.of(page, size.coerceIn(1, 100), Sort.by(Sort.Direction.DESC, "createdAt"))
        return memberRepository.findAll(pageable).content.map(::toSummary)
    }

    private fun toSummary(member: Member) = MemberSummary(
        memberId = member.id,
        email = member.email,
        nickname = member.nickname,
        role = member.role,
        provider = member.provider,
        createdAt = member.createdAt.toString(),
    )

    @Transactional(readOnly = true)
    fun getStats(): AdminStatsResponse {
        val now = LocalDateTime.now()
        val day = now.minusHours(24)

        val totalMembers = memberRepository.count()
        val totalTrades = tradeRepository.count()
        val totalArticles = articleRepository.count()
        val totalComments = commentRepository.count()

        val publicTrades = tradeRepository.findByIsPublicTrueOrderByCreatedAtDesc(
            org.springframework.data.domain.PageRequest.of(0, 1),
        ).totalElements

        // 실현손익 누적은 leaderboard 쿼리로 한꺼번에 SUM
        val totalRealizedPnl = tradeRepository.leaderboard(
            org.springframework.data.domain.PageRequest.of(0, 10000),
        ).sumOf { it.totalPnl }

        return AdminStatsResponse(
            members = CountStat(totalMembers, memberRepository.countByCreatedAtAfter(day)),
            trades = CountStat(totalTrades, tradeRepository.countByCreatedAtAfter(day)),
            articles = CountStat(totalArticles, articleRepository.countByCreatedAtAfter(day)),
            comments = CountStat(totalComments, commentRepository.countByCreatedAtAfter(day)),
            publicTrades = publicTrades,
            totalRealizedPnl = totalRealizedPnl,
            generatedAt = now.toString(),
        )
    }
}
