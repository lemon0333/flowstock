package com.flowstock.domain.economy.controller

import com.flowstock.global.response.ApiResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.reactive.function.client.WebClient
import reactor.core.publisher.Mono
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.abs

/**
 * 섹터 등락률 — KOSPI 종목 시세를 종목명 키워드로 분류해서 평균 등락률 산출.
 * 향후: ai-service에서 KRX 업종 코드 직접 가져와서 정확하게.
 */
@RestController
@RequestMapping("/api/sectors")
class SectorController(
    @Value("\${ai-service.url}") private val aiUrl: String,
) {
    private val client: WebClient = WebClient.builder()
        .codecs { it.defaultCodecs().maxInMemorySize(16 * 1024 * 1024) }
        .build()
    private val seoulFmt = DateTimeFormatter.ofPattern("yyyyMMdd")

    private fun fetchMarket(date: LocalDate, market: String, depth: Int = 0): Mono<List<Map<String, Any?>>> {
        if (depth > 7) return Mono.just(emptyList())
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
    fun sectors(@RequestParam(defaultValue = "KOSPI") market: String): Mono<ApiResponse<List<Map<String, Any?>>>> {
        val today = LocalDate.now(ZoneId.of("Asia/Seoul"))
        return fetchMarket(today, market).map { rows ->
            val classified = rows.mapNotNull { r ->
                val name = (r["name"] as? String) ?: return@mapNotNull null
                val cr = (r["change_rate"] as? Number)?.toDouble() ?: return@mapNotNull null
                val ticker = (r["ticker"] as? String) ?: return@mapNotNull null
                val sector = classify(name)
                Triple(sector, ticker to name, cr)
            }
            val grouped = classified.groupBy { it.first }
            val out: List<Map<String, Any?>> = grouped.map { (sector, list) ->
                val avg = list.map { it.third }.average()
                val top: List<Map<String, Any?>> = list.sortedByDescending { abs(it.third) }
                    .take(5)
                    .map { (_, tn, cr) ->
                        mapOf<String, Any?>(
                            "ticker" to tn.first,
                            "name" to tn.second,
                            "changeRate" to cr,
                        )
                    }
                mapOf<String, Any?>(
                    "code" to sector,
                    "name" to sector,
                    "changeRate" to avg,
                    "count" to list.size,
                    "topStocks" to top,
                )
            }.sortedByDescending { (it["changeRate"] as Double) }
            ApiResponse.success(out)
        }.onErrorReturn(ApiResponse.success(emptyList<Map<String, Any?>>()))
    }

    /**
     * 종목명 키워드 기반 섹터 분류 (정확도는 떨어지지만 인프라 추가 없이 동작).
     * 매칭되지 않으면 "기타".
     */
    private fun classify(name: String): String {
        val keywords = mapOf(
            "반도체" to listOf("전자", "하이닉스", "DB하이텍", "한미반도체", "심텍", "원익"),
            "자동차" to listOf("현대차", "기아", "현대모비스", "한온시스템", "에스엘", "성우하이텍"),
            "2차전지" to listOf("LG에너지", "삼성SDI", "에코프로", "포스코퓨처엠", "엘앤에프"),
            "철강" to listOf("POSCO", "현대제철", "동국제강"),
            "화학" to listOf("LG화학", "롯데케미칼", "금호석유", "한화솔루션"),
            "정유" to listOf("SK이노베이션", "GS", "S-Oil", "현대오일뱅크"),
            "조선" to listOf("HD현대", "한화오션", "삼성중공업", "현대미포"),
            "건설" to listOf("현대건설", "GS건설", "DL이앤씨", "대우건설", "삼성물산"),
            "금융" to listOf("KB금융", "신한지주", "하나금융", "우리금융", "BNK", "JB", "DGB", "기업은행"),
            "보험" to listOf("삼성생명", "삼성화재", "DB손해보험", "현대해상", "메리츠"),
            "증권" to listOf("증권", "투자증권", "신영증권"),
            "통신" to listOf("SK텔레콤", "KT", "LG유플러스"),
            "인터넷" to listOf("NAVER", "카카오", "엔씨소프트", "넷마블", "크래프톤", "더블유게임즈"),
            "바이오/제약" to listOf("셀트리온", "삼성바이오", "한미약품", "유한양행", "녹십자", "대웅제약", "종근당", "SK바이오"),
            "유통/식품" to listOf("이마트", "신세계", "롯데", "현대백화점", "BGF", "GS리테일", "오뚜기", "농심", "동원", "CJ제일제당", "오리온"),
            "엔터" to listOf("하이브", "JYP", "SM", "YG", "에스엠"),
            "방산" to listOf("한국항공우주", "한화에어로", "LIG넥스원", "현대로템"),
            "전력/유틸" to listOf("한국전력", "한국가스공사", "한전KPS"),
        )
        keywords.forEach { (sector, kws) ->
            if (kws.any { name.contains(it) }) return sector
        }
        return "기타"
    }
}
