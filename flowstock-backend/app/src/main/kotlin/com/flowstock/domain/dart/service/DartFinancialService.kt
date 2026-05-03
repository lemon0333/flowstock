package com.flowstock.domain.dart.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.client.WebClient
import java.time.Duration
import java.time.LocalDate
import kotlin.math.abs

/**
 * DART(전자공시) Open API 클라이언트.
 *
 * 동작 우선순위:
 *   1) DART_API_KEY 미설정 → mock
 *   2) corp_code 매핑 못 찾음 (비상장 / 우선주 / DART 미등록) → mock
 *   3) fnlttSinglAcntAll 호출 모두 실패 / 데이터 0건 → mock
 *   4) 위 모두 통과 → source="dart" 로 실제 데이터 반환
 *
 * fnlttSinglAcntAll 응답:
 *   - status="000" 정상, "013" 데이터 없음, "020" 사용량 초과 등
 *   - list[].sj_div: BS / IS / CIS / CF / SCE
 *   - list[].account_nm: K-IFRS 표준 계정과목명
 *   - list[].thstrm_amount: 당기 금액 (콤마 포함 문자열)
 */
@Service
class DartFinancialService(
    @Value("\${dart.api-key:}") private val apiKey: String,
    private val corpCodeService: DartCorpCodeService,
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
        val corpCode = corpCodeService.lookup(ticker) ?: run {
            log.debug("DART corp_code not found for ticker {} — mock 폴백", ticker)
            return mockFinancials(ticker)
        }
        return try {
            fetchReal(ticker, corpCode) ?: mockFinancials(ticker)
        } catch (e: Exception) {
            log.warn("DART real fetch 실패 ticker={}: {}", ticker, e.message)
            mockFinancials(ticker)
        }
    }

    fun getEarningsCalendar(year: Int, quarter: Int): List<Map<String, Any?>> {
        val y = if (year <= 0) LocalDate.now().year else year
        // 분기별 사업보고서 발표 일정은 list.json + 공시검색 조합 필요 — 별도 작업으로 추후
        return mockEarnings(y, quarter)
    }

    private fun fetchReal(ticker: String, corpCode: String): Map<String, Any?>? {
        val currentYear = LocalDate.now().year
        // 가장 최근 사업보고서는 그 다음 해 3-4월에 공시 → (현재년-1)까지 5년치
        val years = ((currentYear - 5)..(currentYear - 1)).toList()

        val statements = mutableListOf<Map<String, Any?>>()
        for (year in years) {
            val one = fetchAnnual(corpCode, year, fsDiv = "CFS")
                ?: fetchAnnual(corpCode, year, fsDiv = "OFS")
            if (one != null) statements.add(one)
        }

        if (statements.isEmpty()) {
            log.info("DART returned no usable annual data for ticker={} corp={}", ticker, corpCode)
            return null
        }

        return mapOf<String, Any?>(
            "ticker" to ticker,
            "source" to "dart",
            "corpCode" to corpCode,
            "statements" to statements,
            // PER/PBR 시계열은 stockTotqyStatus + 시세 결합 필요. 별도 작업으로 추후
            "valuation" to emptyList<Map<String, Any?>>(),
            // 사업부별 매출은 사업의 내용 텍스트 파싱 필요. 별도 작업으로 추후
            "segments" to emptyList<Map<String, Any?>>(),
            "sharesOutstanding" to null,
        )
    }

    private fun fetchAnnual(corpCode: String, year: Int, fsDiv: String): Map<String, Any?>? {
        val resp = client.get()
            .uri { uri ->
                uri.path("/fnlttSinglAcntAll.json")
                    .queryParam("crtfc_key", apiKey)
                    .queryParam("corp_code", corpCode)
                    .queryParam("bsns_year", year.toString())
                    .queryParam("reprt_code", "11011") // 사업보고서 (annual)
                    .queryParam("fs_div", fsDiv)
                    .build()
            }
            .retrieve()
            .bodyToMono(Map::class.java)
            .timeout(Duration.ofSeconds(15))
            .onErrorReturn(emptyMap<String, Any>())
            .block() ?: return null

        if (resp.isEmpty()) return null
        val status = resp["status"] as? String
        if (status != "000") {
            if (status != "013") log.debug("DART status={} for year={} fs={}", status, year, fsDiv)
            return null
        }

        @Suppress("UNCHECKED_CAST")
        val list = resp["list"] as? List<Map<String, Any?>> ?: return null

        var revenue: Long? = null
        var opProfit: Long? = null
        var netIncome: Long? = null

        for (row in list) {
            val accountNm = (row["account_nm"] as? String)?.trim() ?: continue
            val sjDiv = row["sj_div"] as? String
            val amount = parseAmount(row["thstrm_amount"]) ?: continue

            if (sjDiv == "IS" || sjDiv == "CIS") {
                when (accountNm) {
                    "매출액", "영업수익", "수익(매출액)" -> if (revenue == null) revenue = amount
                    "영업이익", "영업이익(손실)" -> if (opProfit == null) opProfit = amount
                    "당기순이익", "당기순이익(손실)" -> if (netIncome == null) netIncome = amount
                }
            }
        }

        if (revenue == null || opProfit == null) return null

        return mapOf<String, Any?>(
            "year" to year,
            "revenue" to revenue,
            "operatingProfit" to opProfit,
            "netIncome" to (netIncome ?: 0L),
        )
    }

    private fun parseAmount(raw: Any?): Long? = when (raw) {
        is String -> raw.replace(",", "").trim().toLongOrNull()
        is Number -> raw.toLong()
        else -> null
    }

    // ────────────────────────────────────────────────────────
    // mock 데이터 (키 없거나 corp_code 미매칭 시 폴백)
    // ────────────────────────────────────────────────────────

    private fun mockFinancials(ticker: String): Map<String, Any?> {
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
            1 -> 4; 2 -> 7; 3 -> 10; else -> 1
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
