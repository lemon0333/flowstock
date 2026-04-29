package com.flowstock.domain.dart.controller

import com.flowstock.domain.dart.service.DartFinancialService
import com.flowstock.global.response.ApiResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/dart")
class DartController(
    private val dartService: DartFinancialService,
) {
    @GetMapping("/financials/{ticker}")
    fun financials(@PathVariable ticker: String): ApiResponse<Map<String, Any?>> =
        ApiResponse.success(dartService.getFinancials(ticker))

    @GetMapping("/earnings")
    fun earnings(
        @RequestParam(defaultValue = "0") year: Int,
        @RequestParam(defaultValue = "1") quarter: Int,
    ): ApiResponse<List<Map<String, Any?>>> =
        ApiResponse.success(dartService.getEarningsCalendar(year, quarter))
}
