package com.flowstock.domain.review.service

import com.flowstock.domain.review.dto.ReviewRequest
import com.flowstock.domain.review.dto.ReviewResponse
import com.flowstock.infra.ai.AiServiceClient
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class ReviewProxyService(
    private val aiServiceClient: AiServiceClient,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    suspend fun analyze(req: ReviewRequest): ReviewResponse {
        log.info("review analyze stock={} action={} memo_len={}", req.stockName, req.action, req.memo?.length ?: 0)
        return aiServiceClient.analyzeReview(req)
    }
}
