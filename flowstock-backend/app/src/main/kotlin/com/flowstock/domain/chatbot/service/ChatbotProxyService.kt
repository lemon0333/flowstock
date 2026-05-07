package com.flowstock.domain.chatbot.service

import com.flowstock.domain.chatbot.dto.ChatRequest
import com.flowstock.infra.ai.AiServiceClient
import org.slf4j.LoggerFactory
import org.springframework.http.codec.ServerSentEvent
import org.springframework.stereotype.Service
import reactor.core.publisher.Flux

@Service
class ChatbotProxyService(
    private val aiServiceClient: AiServiceClient,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * AI service에 요청 전달하고 SSE 스트림을 그대로 릴레이.
     * 에러 발생 시 SSE error 이벤트 emit 후 정상 종료.
     */
    fun stream(req: ChatRequest): Flux<ServerSentEvent<String>> {
        val body = mapOf(
            "sessionId" to req.sessionId,
            "messages" to req.messages.map { mapOf("role" to it.role, "content" to it.content) },
            "currentPath" to req.currentPath,
        )
        log.info(
            "chatbot stream start sessionId={} messages={} path={}",
            req.sessionId, req.messages.size, req.currentPath,
        )
        return aiServiceClient.streamChat(body)
            .onErrorResume { e ->
                log.error("AI service stream error sessionId={}", req.sessionId, e)
                Flux.just(
                    ServerSentEvent.builder<String>()
                        .event("error")
                        .data("""{"code":"UPSTREAM","message":"AI 응답 실패: ${e::class.simpleName}"}""")
                        .build()
                )
            }
            .doOnComplete { log.info("chatbot stream end sessionId={}", req.sessionId) }
    }
}
