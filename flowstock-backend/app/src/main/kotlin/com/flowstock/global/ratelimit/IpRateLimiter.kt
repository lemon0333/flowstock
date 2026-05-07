package com.flowstock.global.ratelimit

import io.github.bucket4j.Bandwidth
import io.github.bucket4j.Bucket
import io.github.bucket4j.Refill
import jakarta.servlet.http.HttpServletRequest
import org.springframework.stereotype.Component
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

/**
 * IP 기반 rate limiter — Bucket4j in-memory.
 *
 * 정책 (IP당, AND 조합):
 * - 분당 10
 * - 시간당 60
 * - 일 100
 *
 * 멀티 replica 환경에서는 한도가 replica 수만큼 느슨해짐.
 * 실효 한도가 빡빡해지면 Bucket4j-Lettuce(Redis)로 마이그레이션.
 */
@Component
class IpRateLimiter {

    private val buckets = ConcurrentHashMap<String, Bucket>()

    private fun newBucket(): Bucket {
        return Bucket.builder()
            .addLimit(Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1))))
            .addLimit(Bandwidth.classic(60, Refill.intervally(60, Duration.ofHours(1))))
            .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofDays(1))))
            .build()
    }

    /**
     * 1 토큰 소비 시도. true면 통과, false면 한도 초과.
     */
    fun tryConsume(ip: String): Boolean {
        val bucket = buckets.computeIfAbsent(ip) { newBucket() }
        return bucket.tryConsume(1)
    }

    /**
     * 디버깅/모니터링용 — 현재 추적 중인 IP 수.
     */
    fun trackedIpCount(): Int = buckets.size

    companion object {
        /**
         * X-Forwarded-For (Cloudflare/k8s) → 첫 번째 IP. fallback: remoteAddr.
         */
        fun extractClientIp(request: HttpServletRequest): String {
            val xff = request.getHeader("X-Forwarded-For")
            if (!xff.isNullOrBlank()) {
                return xff.split(",").first().trim()
            }
            val real = request.getHeader("X-Real-IP")
            if (!real.isNullOrBlank()) return real.trim()
            return request.remoteAddr ?: "unknown"
        }
    }
}
