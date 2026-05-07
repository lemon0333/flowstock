package com.flowstock.domain.chatbot.controller

import com.flowstock.domain.chatbot.dto.ChatRequest
import com.flowstock.domain.chatbot.service.ChatbotProxyService
import com.flowstock.global.ratelimit.IpRateLimiter
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.http.codec.ServerSentEvent
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import reactor.core.publisher.Flux

@RestController
@RequestMapping("/api/chatbot")
class ChatbotController(
    private val proxyService: ChatbotProxyService,
    private val rateLimiter: IpRateLimiter,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * POST /api/chatbot/ask — SSE 스트림.
     *
     * 비로그인 사용자도 사용 가능. IP rate limit 적용.
     * SSE 응답에 헤더는 produces로 지정. X-Accel-Buffering / Cache-Control은
     * application properties나 WebFilter로 별도 처리 (여기선 응답 객체 단순)
     */
    @PostMapping(
        path = ["/ask"],
        consumes = [MediaType.APPLICATION_JSON_VALUE],
        produces = [MediaType.TEXT_EVENT_STREAM_VALUE],
    )
    fun ask(
        @Valid @RequestBody req: ChatRequest,
        request: HttpServletRequest,
    ): Flux<ServerSentEvent<String>> {
        val ip = IpRateLimiter.extractClientIp(request)
        if (!rateLimiter.tryConsume(ip)) {
            log.warn("rate limit exceeded ip={}", ip)
            return Flux.just(
                ServerSentEvent.builder<String>()
                    .event("error")
                    .data("""{"code":"RATE_LIMIT","message":"잠시 후 다시 시도해주세요"}""")
                    .build()
            )
        }

        // 마지막 메시지가 user 인지 추가 검증 (DTO Pattern으론 부족)
        val last = req.messages.lastOrNull()
        if (last == null || last.role != "user") {
            return Flux.just(
                ServerSentEvent.builder<String>()
                    .event("error")
                    .data("""{"code":"INVALID","message":"마지막 메시지는 user여야 해요"}""")
                    .build()
            )
        }

        return proxyService.stream(req)
    }
}
