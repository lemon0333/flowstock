package com.flowstock.domain.market.controller

import com.flowstock.global.response.ApiResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.reactive.function.client.WebClient
import reactor.core.publisher.Mono
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/api/market")
class MarketController(
    @Value("\${ai-service.url}") private val aiUrl: String,
) {
    private val client: WebClient = WebClient.builder().build()
    private val fmt = DateTimeFormatter.ofPattern("yyyyMMdd")

    private fun fetchIndex(date: LocalDate, depth: Int = 0): Mono<List<Map<String, Any?>>> {
        if (depth > 7) return Mono.just(emptyList())
        val d = date.format(fmt)
        return client.get()
            .uri("$aiUrl/api/ai/stock/index?date=$d")
            .retrieve()
            .bodyToMono(Map::class.java)
            .flatMap { resp ->
                @Suppress("UNCHECKED_CAST")
                val data = (resp["data"] as? List<Map<String, Any?>>) ?: emptyList()
                if (data.isEmpty()) fetchIndex(date.minusDays(1), depth + 1)
                else Mono.just(data)
            }
            .onErrorResume { fetchIndex(date.minusDays(1), depth + 1) }
    }

    @GetMapping
    fun indices(): Mono<ApiResponse<List<Map<String, Any?>>>> {
        val today = LocalDate.now(ZoneId.of("Asia/Seoul"))
        return fetchIndex(today).map { data ->
            val mapped = data.map {
                mapOf(
                    "name" to it["name"],
                    "value" to it["close"],
                    "close" to it["close"],
                    "change" to it["change"],
                    "changePercent" to it["change_rate"],
                    "volume" to it["volume"],
                )
            }
            ApiResponse.success(mapped)
        }
    }
}
