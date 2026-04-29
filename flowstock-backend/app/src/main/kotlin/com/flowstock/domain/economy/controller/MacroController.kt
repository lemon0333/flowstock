package com.flowstock.domain.economy.controller

import com.flowstock.global.response.ApiResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

/**
 * 거시 경제 지표 (한국은행 ECOS API 기반).
 *
 * ECOS_API_KEY 환경변수 없으면 mock 데이터 반환.
 * 무료 키 발급: https://ecos.bok.or.kr/api/
 *
 * 실제 코드 호출은 향후 corp_code 매핑처럼 시리즈 ID 매핑 필요.
 * 일단 키 유무에 따라 source 표시만 다르게.
 */
@RestController
@RequestMapping("/api/macro")
class MacroController(
    @Value("\${ecos.api-key:}") private val apiKey: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @GetMapping("/dashboard")
    fun dashboard(): ApiResponse<Map<String, Any?>> {
        val source = if (apiKey.isBlank()) "mock" else "ecos"
        if (apiKey.isBlank()) {
            log.debug("ECOS_API_KEY 미설정 — mock 응답")
        }
        return ApiResponse.success(
            mapOf(
                "source" to source,
                "series" to listOf(
                    buildSeries("base_rate", "기준금리", "%", 2.5, 3.5, monthlySteps = 36),
                    buildSeries("cpi", "소비자물가지수 (CPI)", "지수", 100.0, 115.0, monthlySteps = 36),
                    buildSeries("m2", "M2 통화량", "조원", 3700.0, 4200.0, monthlySteps = 36),
                    buildSeries("usdkrw", "원/달러 환율", "원", 1180.0, 1380.0, monthlySteps = 36, smooth = false),
                    buildSeries("leading", "경기선행지수", "지수", 99.0, 105.0, monthlySteps = 36, smooth = false),
                ),
            ),
        )
    }

    private fun buildSeries(
        code: String,
        name: String,
        unit: String,
        from: Double,
        to: Double,
        monthlySteps: Int,
        smooth: Boolean = true,
    ): Map<String, Any?> {
        val seed = code.hashCode().toLong()
        val rng = java.util.Random(seed)
        val today = LocalDate.now()
        val data = (0 until monthlySteps).map { i ->
            val date = today.minusMonths((monthlySteps - 1 - i).toLong())
            val t = i.toDouble() / (monthlySteps - 1)
            val base = from + (to - from) * t
            val noise = (rng.nextGaussian()) * (if (smooth) (to - from) * 0.01 else (to - from) * 0.04)
            val v = base + noise
            mapOf(
                "date" to "%04d-%02d".format(date.year, date.monthValue),
                "value" to "%.2f".format(v).toDouble(),
            )
        }
        return mapOf(
            "code" to code,
            "name" to name,
            "unit" to unit,
            "series" to data,
        )
    }
}
