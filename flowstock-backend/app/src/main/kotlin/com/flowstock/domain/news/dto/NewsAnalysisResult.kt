package com.flowstock.domain.news.dto

data class NewsAnalysisResult(
    val sentiment: String,
    val summary: String,
    val importance: Int,
    val relatedStocks: List<RelatedStock>,
)

data class RelatedStock(
    val code: String,
    val name: String,
    val relationType: String,
    val impactScore: Double,
    val impactReason: String,
)
