package com.flowstock.domain.trade.repository

import com.flowstock.domain.trade.entity.Trade
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface TradeRepository : JpaRepository<Trade, Long> {

    fun findByMemberIdOrderByCreatedAtDesc(memberId: Long, pageable: Pageable): Page<Trade>

    fun findByIsPublicTrueOrderByCreatedAtDesc(pageable: Pageable): Page<Trade>

    fun countByCreatedAtAfter(threshold: java.time.LocalDateTime): Long

    @Query(
        """
        SELECT t.memberId AS memberId,
               COALESCE(SUM(t.realizedPnl), 0) AS totalPnl,
               COUNT(t) AS tradeCount
        FROM Trade t
        WHERE t.isPublic = true
          AND t.action = com.flowstock.domain.trade.entity.TradeAction.SELL
          AND t.realizedPnl IS NOT NULL
        GROUP BY t.memberId
        ORDER BY COALESCE(SUM(t.realizedPnl), 0) DESC
        """,
    )
    fun leaderboard(pageable: Pageable): List<LeaderboardRow>
}

interface LeaderboardRow {
    val memberId: Long
    val totalPnl: Long
    val tradeCount: Long
}
