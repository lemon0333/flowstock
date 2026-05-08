package com.flowstock.domain.trade.service

import com.flowstock.domain.member.repository.MemberRepository
import com.flowstock.domain.trade.dto.LeaderboardEntry
import com.flowstock.domain.trade.dto.TradeCreateRequest
import com.flowstock.domain.trade.dto.TradeResponse
import com.flowstock.domain.trade.entity.Trade
import com.flowstock.domain.trade.repository.TradeRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TradeService(
    private val tradeRepository: TradeRepository,
    private val memberRepository: MemberRepository,
) {

    @Transactional
    fun create(memberId: Long, req: TradeCreateRequest): TradeResponse {
        val saved = tradeRepository.save(
            Trade(
                memberId = memberId,
                stockCode = req.stockCode,
                stockName = req.stockName,
                action = req.action,
                price = req.price,
                quantity = req.quantity,
                realizedPnl = req.realizedPnl,
                memo = req.memo,
                isPublic = req.isPublic,
            ),
        )
        return toResponses(listOf(saved)).first()
    }

    @Transactional(readOnly = true)
    fun listPublic(page: Int, size: Int): List<TradeResponse> {
        val pageable = PageRequest.of(page, size)
        return toResponses(tradeRepository.findByIsPublicTrueOrderByCreatedAtDesc(pageable).content)
    }

    @Transactional(readOnly = true)
    fun listMine(memberId: Long, page: Int, size: Int): List<TradeResponse> {
        val pageable = PageRequest.of(page, size)
        return toResponses(tradeRepository.findByMemberIdOrderByCreatedAtDesc(memberId, pageable).content)
    }

    @Transactional(readOnly = true)
    fun leaderboard(limit: Int): List<LeaderboardEntry> {
        val pageable = PageRequest.of(0, limit.coerceIn(1, 100))
        val rows = tradeRepository.leaderboard(pageable)
        if (rows.isEmpty()) return emptyList()
        val members = memberRepository.findAllById(rows.map { it.memberId })
            .associateBy { it.id }
        return rows.mapIndexed { idx, row ->
            LeaderboardEntry(
                rank = idx + 1,
                memberId = row.memberId,
                nickname = members[row.memberId]?.nickname ?: "탈퇴 사용자",
                totalPnl = row.totalPnl,
                tradeCount = row.tradeCount,
            )
        }
    }

    private fun toResponses(trades: List<Trade>): List<TradeResponse> {
        if (trades.isEmpty()) return emptyList()
        val members = memberRepository.findAllById(trades.map { it.memberId }.toSet())
            .associateBy { it.id }
        return trades.map { t ->
            TradeResponse(
                id = t.id,
                memberId = t.memberId,
                nickname = members[t.memberId]?.nickname ?: "익명",
                stockCode = t.stockCode,
                stockName = t.stockName,
                action = t.action,
                price = t.price,
                quantity = t.quantity,
                realizedPnl = t.realizedPnl,
                memo = t.memo,
                isPublic = t.isPublic,
                createdAt = t.createdAt,
            )
        }
    }
}
