package com.flowstock.domain.admin.dto

data class AdminStatsResponse(
    val members: CountStat,
    val trades: CountStat,
    val articles: CountStat,
    val comments: CountStat,
    val publicTrades: Long,
    val totalRealizedPnl: Long,
    val generatedAt: String,
)

data class CountStat(
    val total: Long,
    val last24h: Long,
)
