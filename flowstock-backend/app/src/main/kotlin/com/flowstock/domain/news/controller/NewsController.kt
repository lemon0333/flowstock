package com.flowstock.domain.news.controller

import com.flowstock.global.response.ApiResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.reactive.function.client.WebClient
import reactor.core.publisher.Mono

@RestController
@RequestMapping("/api/news")
class NewsController(
    @Value("\${ai-service.url}") private val aiUrl: String,
) {
    private val client: WebClient = WebClient.builder()
        .codecs { it.defaultCodecs().maxInMemorySize(8 * 1024 * 1024) }
        .build()

    @GetMapping
    fun list(@RequestParam(defaultValue = "30") limit: Int): Mono<ApiResponse<List<Map<String, Any?>>>> {
        return client.get()
            .uri("$aiUrl/api/ai/news/latest?limit=$limit")
            .retrieve()
            .bodyToMono(Map::class.java)
            .map { resp ->
                @Suppress("UNCHECKED_CAST")
                val data = (resp["data"] as? List<Map<String, Any?>>) ?: emptyList()
                ApiResponse.success(data)
            }
            .onErrorReturn(ApiResponse.success(emptyList()))
    }

    @GetMapping("/{id}/graph")
    fun graph(@PathVariable id: String): ApiResponse<Map<String, List<Any>>> =
        ApiResponse.success(mapOf("nodes" to emptyList(), "edges" to emptyList()))
}
