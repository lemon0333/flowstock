package com.flowstock.global.ratelimit

import jakarta.servlet.http.HttpServletRequest
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

/**
 * IP 기반 rate limiter — 단순 sliding window (in-memory).
 *
 * 정책: IP당 분당 10회.
 * 이상 어뷰징 차단 + 챗봇 정상 사용은 허용 수준.
 *
 * 구현: ip → 최근 1분 내 요청 timestamp 리스트.
 * - 메모리: IP 수만큼 작은 list. inactive IP는 cleanup 안 함 (MVP).
 *   운영 중 메모리 모니터링 후 필요하면 @Scheduled cleanup 추가.
 * - 멀티 replica: 한도 ×replica 만큼 느슨해짐 (MVP 수용).
 *   필요시 Redis 기반(Bucket4j-Lettuce 또는 Redisson)로 마이그레이션.
 */
@Component
class IpRateLimiter {

    private val buckets = ConcurrentHashMap<String, MutableList<Long>>()

    /**
     * 1 토큰 소비 시도. true면 통과, false면 한도 초과.
     */
    fun tryConsume(ip: String): Boolean {
        val now = System.currentTimeMillis()
        val cutoff = now - WINDOW_MS
        val list = buckets.computeIfAbsent(ip) { mutableListOf() }
        return synchronized(list) {
            // 윈도우 밖 timestamp 제거
            list.removeAll { it < cutoff }
            if (list.size >= CAPACITY) {
                false
            } else {
                list.add(now)
                true
            }
        }
    }

    fun trackedIpCount(): Int = buckets.size

    companion object {
        private const val CAPACITY = 10
        private const val WINDOW_MS: Long = 60_000

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
