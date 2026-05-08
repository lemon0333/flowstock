package com.flowstock.domain.review.controller

import com.flowstock.domain.review.dto.ReviewRequest
import com.flowstock.domain.review.dto.ReviewResponse
import com.flowstock.domain.review.service.ReviewProxyService
import com.flowstock.global.ratelimit.IpRateLimiter
import com.flowstock.global.response.ApiResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/review")
class ReviewController(
    private val proxyService: ReviewProxyService,
    private val rateLimiter: IpRateLimiter,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * POST /api/review/analyze — 거래 복기 AI 분석.
     * 모의투자가 frontend localStorage에 있으므로 인증 불필요. IP rate limit으로 보호.
     */
    @PostMapping("/analyze")
    suspend fun analyze(
        @Valid @RequestBody req: ReviewRequest,
        request: HttpServletRequest,
    ): ApiResponse<ReviewResponse> {
        val ip = IpRateLimiter.extractClientIp(request)
        if (!rateLimiter.tryConsume(ip)) {
            log.warn("review rate limit exceeded ip={}", ip)
            throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해주세요")
        }
        val result = proxyService.analyze(req)
        return ApiResponse.success(result)
    }
}
