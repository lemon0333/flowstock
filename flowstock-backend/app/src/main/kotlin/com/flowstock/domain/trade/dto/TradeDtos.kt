package com.flowstock.domain.trade.dto

import com.flowstock.domain.trade.entity.TradeAction
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import java.time.LocalDateTime

data class TradeCreateRequest(
    @field:NotBlank
    val stockCode: String,

    @field:NotBlank
    val stockName: String,

    val action: TradeAction,

    @field:Min(1)
    val price: Long,

    @field:Min(1)
    val quantity: Int,

    val realizedPnl: Long? = null,

    val memo: String? = null,

    val isPublic: Boolean = false,
)

data class TradeResponse(
    val id: Long,
    val memberId: Long,
    val nickname: String,
    val stockCode: String,
    val stockName: String,
    val action: TradeAction,
    val price: Long,
    val quantity: Int,
    val realizedPnl: Long?,
    val memo: String?,
    val isPublic: Boolean,
    val createdAt: LocalDateTime,
)

data class LeaderboardEntry(
    val rank: Int,
    val memberId: Long,
    val nickname: String,
    val totalPnl: Long,
    val tradeCount: Long,
)
