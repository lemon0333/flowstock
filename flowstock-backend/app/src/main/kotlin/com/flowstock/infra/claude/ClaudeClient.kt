package org.example.app.com.flowstock.infra.claude



@Component
class ClaudeClient(
    private val objectMapper: ObjectMapper,
    @Value("\${claude.api-key}") private val apiKey: String,
) {

    private val webClient = WebClient.builder()
        .baseUrl("https://api.anthropic.com")
        .defaultHeader("x-api-key", apiKey)
        .defaultHeader("anthropic-version", "2023-06-01")
        .defaultHeader("content-type", "application/json")
        .build()

    // 뉴스 분석 — 감성분석 + 관련종목 + 영향도
    suspend fun analyzeNews(title: String, content: String): NewsAnalysisResult {
        val prompt = buildAnalysisPrompt(title, content)

        val response = webClient.post()
            .uri("/v1/messages")
            .bodyValue(mapOf(
                "model"      to "claude-sonnet-4-20250514",
                "max_tokens" to 1000,
                "messages"   to listOf(mapOf(
                    "role"    to "user",
                    "content" to prompt,
                )),
            ))
            .retrieve()
            .awaitBody<Map<String, Any>>()

        val text = extractText(response)
        return parseAnalysisResult(text)
    }

    // DART 공시 요약
    suspend fun summarizeDart(title: String, content: String): DartSummaryResult {
        val prompt = """
            다음 DART 공시를 분석해주세요.
            
            제목: $title
            내용: ${content.take(3000)}
            
            아래 JSON 형식으로만 응답해주세요:
            {
              "summary": "3줄 핵심 요약",
              "keyPoints": ["핵심포인트1", "핵심포인트2"],
              "impactScore": 예상 주가 영향 점수 (-100~+100, 양수=긍정),
              "impactAnalysis": "주가 영향 분석 2~3줄"
            }
        """.trimIndent()

        val response = webClient.post()
            .uri("/v1/messages")
            .bodyValue(mapOf(
                "model"      to "claude-sonnet-4-20250514",
                "max_tokens" to 800,
                "messages"   to listOf(mapOf(
                    "role"    to "user",
                    "content" to prompt,
                )),
            ))
            .retrieve()
            .awaitBody<Map<String, Any>>()

        val text = extractText(response)
        return objectMapper.readValue(text, DartSummaryResult::class.java)
    }

    private fun buildAnalysisPrompt(title: String, content: String) = """
        다음 주식 뉴스를 분석해주세요.
        
        제목: $title
        내용: ${content.take(2000)}
        
        아래 JSON 형식으로만 응답해주세요. 다른 텍스트 없이 JSON만 출력:
        {
          "sentiment": "POSITIVE 또는 NEGATIVE 또는 NEUTRAL",
          "summary": "2~3줄 핵심 요약",
          "importance": 중요도 점수 (0~100),
          "relatedStocks": [
            {
              "code": "종목코드 (6자리)",
              "name": "종목명",
              "relationType": "DIRECT 또는 INDIRECT 또는 COMPETITOR",
              "impactScore": 영향도 점수 (-100~+100),
              "impactReason": "영향 이유 1줄"
            }
          ]
        }
    """.trimIndent()

    @Suppress("UNCHECKED_CAST")
    private fun extractText(response: Map<String, Any>): String {
        val content = response["content"] as List<Map<String, Any>>
        return content.first()["text"] as String
    }

    private fun parseAnalysisResult(text: String): NewsAnalysisResult {
        val clean = text.replace("```json", "").replace("```", "").trim()
        return objectMapper.readValue(clean, NewsAnalysisResult::class.java)
    }
}

data class DartSummaryResult(
    val summary        : String,
    val keyPoints      : List<String>,
    val impactScore    : Double,
    val impactAnalysis : String,
)
