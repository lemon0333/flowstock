package com.flowstock.global.filter

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * 요청 1건당 한 줄짜리 access 로그를 stdout 으로 흘린다.
 *
 * - HIGHEST_PRECEDENCE 로 SecurityFilterChain 앞단에서 시작/종료 시점을 잡음.
 *   user 정보는 chain.doFilter() 이후에 읽어야 JwtAuthenticationFilter 가 채운 값을 볼 수 있다.
 * - logback 패턴이 trace_id/span_id 를 자동으로 박아주므로, Loki 에서 trace_id 로 → Jaeger 점프
 *   흐름이 이 한 줄에 의해 모든 요청에 보장된다.
 * - actuator/swagger 같이 무한 호출되는 헬스/문서 path 는 skip 해서 Loki 노이즈 차단.
 * - body 는 읽지 않음 (셋 B). 따라서 InputStream 캐싱 wrapper 불필요.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class RequestLoggingFilter : OncePerRequestFilter() {
    private val log = LoggerFactory.getLogger(javaClass)

    private val skipPrefixes =
        listOf("/actuator", "/swagger-ui", "/v3/api-docs", "/favicon.ico")

    override fun shouldNotFilter(request: HttpServletRequest): Boolean =
        skipPrefixes.any { request.requestURI.startsWith(it) }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val start = System.currentTimeMillis()
        try {
            filterChain.doFilter(request, response)
        } finally {
            val elapsed = System.currentTimeMillis() - start
            val user = SecurityContextHolder.getContext().authentication?.name ?: "-"
            val ip = clientIp(request)
            val ua = request.getHeader("User-Agent")?.take(120) ?: "-"
            val qs = request.queryString?.let { "?$it" } ?: ""
            val status = response.status

            val msg =
                "${request.method} ${request.requestURI}$qs $status ${elapsed}ms " +
                    "user=$user ip=$ip ua=\"$ua\""
            when (status) {
                in 500..599 -> log.error(msg)
                in 400..499 -> log.warn(msg)
                else -> log.info(msg)
            }
        }
    }

    // Cloudflare Tunnel 뒤에 있으므로 X-Forwarded-For 가 실제 client IP.
    private fun clientIp(request: HttpServletRequest): String {
        val xff = request.getHeader("X-Forwarded-For")
        if (!xff.isNullOrBlank()) {
            return xff.substringBefore(",").trim()
        }
        return request.remoteAddr ?: "-"
    }
}
