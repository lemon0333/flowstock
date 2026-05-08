package com.flowstock.domain.admin.dto

import com.flowstock.domain.member.entity.Role

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

data class RoleGrantRequest(val role: Role)

data class RoleGrantResponse(
    val memberId: Long,
    val email: String,
    val nickname: String,
    val role: Role,
)

data class MemberSummary(
    val memberId: Long,
    val email: String,
    val nickname: String,
    val role: Role,
    val provider: String?,
    val createdAt: String,
)
