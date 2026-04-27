package com.flowstock.domain.economy.controller

import com.flowstock.global.response.ApiResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.reactive.function.client.WebClient
import reactor.core.publisher.Mono

@RestController
@RequestMapping("/api/economy")
class EconomyController(
    @Value("\${ai-service.url}") private val aiUrl: String,
) {
    private val client: WebClient = WebClient.builder()
        .codecs { it.defaultCodecs().maxInMemorySize(16 * 1024 * 1024) }
        .build()

    @GetMapping("/dashboard")
    fun dashboard(): Mono<ApiResponse<Map<String, Any?>>> {
        return client.get()
            .uri("$aiUrl/api/ai/economy/dashboard")
            .retrieve()
            .bodyToMono(Map::class.java)
            .map { resp ->
                @Suppress("UNCHECKED_CAST")
                val data = resp["data"] as? Map<String, Any?> ?: emptyMap()
                ApiResponse.success(data)
            }
            .onErrorReturn(ApiResponse.success(emptyMap()))
    }

    @GetMapping("/correlation")
    fun correlation(
        @RequestParam(defaultValue = "KOSPI") market: String,
        @RequestParam(defaultValue = "10") top: Int,
        @RequestParam(defaultValue = "60") days: Int,
    ): Mono<ApiResponse<Map<String, Any?>>> {
        return client.get()
            .uri("$aiUrl/api/ai/economy/correlation?market=$market&top=$top&days=$days")
            .retrieve()
            .bodyToMono(Map::class.java)
            .map { resp ->
                @Suppress("UNCHECKED_CAST")
                val data = resp["data"] as? Map<String, Any?> ?: emptyMap()
                ApiResponse.success(data)
            }
            .onErrorReturn(ApiResponse.success(emptyMap()))
    }
}
