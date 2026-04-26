package com.flowstock.domain.stock.controller

import com.flowstock.global.response.ApiResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/stocks")
class StockController {

    @GetMapping
    fun list(): ApiResponse<List<Any>> = ApiResponse.success(emptyList())

    @GetMapping("/{id}")
    fun detail(@PathVariable id: String): ApiResponse<Map<String, Any?>> =
        ApiResponse.success(emptyMap())
}
