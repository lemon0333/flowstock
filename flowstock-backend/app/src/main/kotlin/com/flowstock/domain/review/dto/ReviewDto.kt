package com.flowstock.domain.review.dto

import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size

/**
 * 모의투자 거래 복기 분석 요청.
 * 모의투자는 frontend localStorage에 저장되므로 backend에서는 단순 proxy.
 */
data class ReviewRequest(
    @field:Size(min = 1, max = 80) val stockName: String,
    @field:Pattern(regexp = "^(buy|sell)$") val action: String,
    @field:Positive val price: Double,
    @field:Positive val quantity: Int,
    @field:Positive val total: Double,
    @field:Size(min = 1, max = 64) val at: String,
    @field:Size(max = 500) val memo: String? = null,
    val avgBuyPrice: Double? = null,
    val returnPct: Double? = null,
)

data class ReviewResponse(
    val good: String,
    val concern: String,
    val lesson: String,
)
