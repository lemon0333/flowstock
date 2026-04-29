package com.flowstock.domain.dart.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.client.WebClient
import java.time.LocalDate
import kotlin.math.abs

/**
 * DART(전자공시) Open API 클라이언트.
 *
 * - DART_API_KEY 환경변수가 비어있으면 mock 데이터로 폴백.
 * - 무료 키 발급: https://opendart.fss.or.kr/uss/umt/EgovMberInsertView.do
 *
 * 실제 DART API는 corp_code(법인고유번호)가 필요해서 ticker → corp_code 매핑이 별도로 필요.
 * 운영 단계에서 corp_code 매핑 파일(dart_corp_codes.json)을 받아서 캐싱하면 됨.
 * 키만 있고 매핑이 없을 때도 mock으로 폴백.
 */
@Service
class DartFinancialService(
    @Value("\${dart.api-key:}") private val apiKey: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val client: WebClient = WebClient.builder()
        .baseUrl("https://opendart.fss.or.kr/api")
        .codecs { it.defaultCodecs().maxInMemorySize(8 * 1024 * 1024) }
        .build()

    private val keyAvailable: Boolean
        get() = apiKey.isNotBlank()

    fun getFinancials(ticker: String): Map<String, Any?> {
        if (!keyAvailable) {
            log.debug("DART_API_KEY 미설정 — mock 응답")
            return mockFinancials(ticker)
        }
        return try {
            // 실제 키가 있어도 corp_code 매핑이 별도로 필요해서 일단 mock 폴백.
            // TODO: corp_code 매핑 캐싱 후 fnlttSinglAcntAll 호출로 교체
            mockFinancials(ticker)
        } catch (e: Exception) {
            log.warn("DART financials 실패: {}", e.message)
            mockFinancials(ticker)
        }
    }

    fun getEarningsCalendar(year: Int, quarter: Int): List<Map<String, Any?>> {
        val y = if (year <= 0) LocalDate.now().year else year
        if (!keyAvailable) return mockEarnings(y, quarter)
        // 실제로는 list.json + 사업보고서 검색 필요. 일단 mock.
        return mockEarnings(y, quarter)
    }

    // ────────────────────────────────────────────────────────
    // mock 데이터 (사용자 데모용 — 키 없거나 매핑 미완 시)
    // ────────────────────────────────────────────────────────

    private fun mockFinancials(ticker: String): Map<String, Any?> {
        // ticker 마지막 자리 기반으로 살짝 변주 — 의미는 없지만 페이지마다 다른 차트 보이게
        val seed = abs(ticker.hashCode()).toLong()
        val baseRevenue = 50_000L * 100_000_000L + (seed % 50) * 1_000L * 100_000_000L

        val statements: List<Map<String, Any?>> = (2020..2024).map { year ->
            val growth = 1.0 + (((year - 2020).toDouble() * 0.05) - ((seed % 10).toDouble() * 0.005))
            val revenue = (baseRevenue * Math.pow(growth, (year - 2020).toDouble())).toLong()
            val operatingProfit = (revenue * 0.12).toLong()
            val netIncome = (revenue * 0.08).toLong()
            mapOf<String, Any?>(
                "year" to year,
                "revenue" to revenue,
                "operatingProfit" to operatingProfit,
                "netIncome" to netIncome,
            )
        }

        val valuation: List<Map<String, Any?>> = (2020..2024).map { year ->
            val per = 8.0 + ((seed % 15) + (year - 2020) * 0.5)
            val pbr = 0.8 + ((seed % 8) * 0.1) + (year - 2020) * 0.05
            mapOf<String, Any?>("year" to year, "per" to per, "pbr" to pbr)
        }

        val segNames = listOf("주력 사업", "신사업", "해외 매출", "기타")
        val segments: List<Map<String, Any?>> = segNames.mapIndexed { i, name ->
            val pct = listOf(0.55, 0.20, 0.18, 0.07)[i]
            mapOf<String, Any?>(
                "name" to name,
                "revenue" to (statements.last()["revenue"] as Long * pct).toLong(),
            )
        }

        return mapOf<String, Any?>(
            "ticker" to ticker,
            "source" to "mock",
            "statements" to statements,
            "valuation" to valuation,
            "segments" to segments,
            "sharesOutstanding" to (5_000_000_000L + (seed % 1_000_000_000L)),
        )
    }

    private fun mockEarnings(year: Int, quarter: Int): List<Map<String, Any?>> {
        val tickers = listOf(
            Triple("005930", "삼성전자", "잠정실적"),
            Triple("000660", "SK하이닉스", "잠정실적"),
            Triple("035420", "NAVER", "확정실적"),
            Triple("035720", "카카오", "확정실적"),
            Triple("005380", "현대차", "예정"),
            Triple("051910", "LG화학", "예정"),
            Triple("068270", "셀트리온", "잠정실적"),
            Triple("207940", "삼성바이오로직스", "확정실적"),
            Triple("005490", "POSCO홀딩스", "잠정실적"),
            Triple("105560", "KB금융", "확정실적"),
        )
        val baseMonth = when (quarter) {
            1 -> 4; 2 -> 7; 3 -> 10; else -> 1 // 다음년도 1월에 4Q
        }
        return tickers.mapIndexed { i, (ticker, name, type) ->
            val day = ((i * 3 + 5) % 25) + 1
            val month = baseMonth + (i % 3)
            val realYear = if (quarter == 4 && month <= 3) year + 1 else year
            mapOf<String, Any?>(
                "ticker" to ticker,
                "name" to name,
                "date" to "%04d-%02d-%02d".format(realYear, month, day),
                "type" to type,
                "quarter" to "%dQ%d".format(year, quarter),
            )
        }
    }
}
