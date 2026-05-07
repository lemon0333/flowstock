package com.flowstock.infra.ai

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.ParameterizedTypeReference
import org.springframework.http.MediaType
import org.springframework.http.codec.ServerSentEvent
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.awaitBody
import reactor.core.publisher.Flux
import java.time.Duration

@Component
class AiServiceClient(
    private val objectMapper: ObjectMapper,
    @Value("\${ai-service.url:http://localhost:8000}") private val aiServiceUrl: String
) {
    private val webClient = WebClient.builder()
        .baseUrl(aiServiceUrl)
        .build()

    data class NewsAnalysisRequest(val title: String, val content: String)

    data class StockRelation(
        val stockCode: String,
        val stockName: String,
        val relationType: String,
        val impactScore: Double,
        val impactReason: String
    )

    data class NewsAnalysisResult(
        val sentiment: String,
        val summary: String,
        val importance: Int,
        val relatedStocks: List<StockRelation>
    )

    data class ChartAnalysisRequest(
        val stockCode: String,
        val stockName: String,
        val prices: List<Map<String, Any>>
    )

    data class ChartAnalysisResult(
        val trend: String,
        val analysis: String,
        val supportLevel: Double?,
        val resistanceLevel: Double?,
        val keyPatterns: List<String>
    )

    data class GraphGenerateRequest(
        val newsTitle: String,
        val newsContent: String,
        val newsSentiment: String? = null
    )

    data class GraphNode(
        val id: String,
        val type: String,
        val label: String,
        val data: Map<String, Any>
    )

    data class GraphEdge(
        val id: String,
        val source: String,
        val target: String,
        val label: String,
        val data: Map<String, Any>
    )

    data class GraphGenerateResult(
        val nodes: List<GraphNode>,
        val edges: List<GraphEdge>
    )

    suspend fun analyzeNews(title: String, content: String): NewsAnalysisResult {
        return webClient.post()
            .uri("/api/ai/news/analyze")
            .bodyValue(NewsAnalysisRequest(title, content))
            .retrieve()
            .awaitBody()
    }

    suspend fun analyzeChart(request: ChartAnalysisRequest): ChartAnalysisResult {
        return webClient.post()
            .uri("/api/ai/chart/analyze")
            .bodyValue(request)
            .retrieve()
            .awaitBody()
    }

    suspend fun generateGraph(request: GraphGenerateRequest): GraphGenerateResult {
        return webClient.post()
            .uri("/api/ai/graph/generate")
            .bodyValue(request)
            .retrieve()
            .awaitBody()
    }

    /**
     * 챗봇 SSE 스트리밍 — AI service `/api/ai/chatbot/stream` 응답을 그대로 릴레이.
     * 반환 Flux는 ServerSentEvent<String> (data는 JSON string).
     */
    fun streamChat(body: Map<String, Any?>): Flux<ServerSentEvent<String>> {
        val sseType = object : ParameterizedTypeReference<ServerSentEvent<String>>() {}
        return webClient.post()
            .uri("/api/ai/chatbot/stream")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .bodyValue(body)
            .retrieve()
            .bodyToFlux(sseType)
            .timeout(Duration.ofSeconds(60))
    }
}
