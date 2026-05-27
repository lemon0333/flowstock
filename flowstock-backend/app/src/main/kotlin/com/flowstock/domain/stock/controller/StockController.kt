package com.flowstock.domain.stock.controller

import com.flowstock.global.response.ApiResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.reactive.function.client.WebClient
import reactor.core.publisher.Mono
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/api/stocks")
class StockController(
    @Value("\${ai-service.url}") private val aiUrl: String,
) {
    private val client: WebClient = WebClient.builder()
        .codecs { it.defaultCodecs().maxInMemorySize(16 * 1024 * 1024) }
        .build()

    private val seoulFmt = DateTimeFormatter.ofPattern("yyyyMMdd")

    private fun fetchMarket(date: LocalDate, market: String, depth: Int = 0): Mono<List<Map<String, Any?>>> {
        // US는 date 파티션이 아니라 현재 quote라 retry 1회면 충분 (빈 결과면 키 미설정 등)
        val maxDepth = if (market == "US") 1 else 7
        if (depth > maxDepth) return Mono.just(emptyList())
        val d = date.format(seoulFmt)
        return client.get()
            .uri("$aiUrl/api/ai/stock/market?date=$d&market=$market")
            .retrieve()
            .bodyToMono(Map::class.java)
            .flatMap { resp ->
                @Suppress("UNCHECKED_CAST")
                val data = (resp["data"] as? List<Map<String, Any?>>) ?: emptyList()
                if (data.isEmpty()) fetchMarket(date.minusDays(1), market, depth + 1)
                else Mono.just(data)
            }
            .onErrorResume { fetchMarket(date.minusDays(1), market, depth + 1) }
    }

    @GetMapping
    fun list(
        @RequestParam(defaultValue = "ALL") market: String,
    ): Mono<ApiResponse<List<Map<String, Any?>>>> {
        val mkt = if (market.uppercase() in setOf("ALL", "KOSPI", "KOSDAQ", "US")) market.uppercase() else "ALL"
        val today = LocalDate.now(ZoneId.of("Asia/Seoul"))
        return fetchMarket(today, mkt).map { data ->
            val mapped = data.map {
                mapOf(
                    "id" to (it["ticker"] ?: ""),
                    "ticker" to (it["ticker"] ?: ""),
                    "name" to (it["name"] ?: ""),
                    "open" to it["open"],
                    "high" to it["high"],
                    "low" to it["low"],
                    "close" to it["close"],
                    "price" to it["close"],
                    "volume" to it["volume"],
                    "changePercent" to it["change_rate"],
                )
            }
            // 거래량 desc top 100
            val top = mapped
                .filter { ((it["volume"] as? Number)?.toLong() ?: 0L) > 0 }
                .sortedByDescending { (it["volume"] as? Number)?.toLong() ?: 0L }
                .take(100)
            ApiResponse.success(top)
        }
    }

    @GetMapping("/{id}")
    fun detail(@PathVariable id: String): ApiResponse<Map<String, Any?>> =
        ApiResponse.success(mapOf("id" to id, "ticker" to id))

    @GetMapping("/{id}/ohlcv")
    fun ohlcv(
        @PathVariable id: String,
        @RequestParam(defaultValue = "180") days: Int,
    ): Mono<ApiResponse<List<Map<String, Any?>>>> {
        val end = LocalDate.now(ZoneId.of("Asia/Seoul")).format(seoulFmt)
        val start = LocalDate.now(ZoneId.of("Asia/Seoul")).minusDays(days.toLong()).format(seoulFmt)
        return client.get()
            .uri("$aiUrl/api/ai/stock/ohlcv?ticker=$id&start=$start&end=$end")
            .retrieve()
            .bodyToMono(Map::class.java)
            .map { resp ->
                @Suppress("UNCHECKED_CAST")
                val data = (resp["data"] as? List<Map<String, Any?>>) ?: emptyList()
                ApiResponse.success(data)
            }
            .onErrorReturn(ApiResponse.success(emptyList()))
    }
}
