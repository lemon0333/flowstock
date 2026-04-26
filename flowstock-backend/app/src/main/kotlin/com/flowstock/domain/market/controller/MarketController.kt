package com.flowstock.domain.market.controller

import com.flowstock.global.response.ApiResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/market")
class MarketController {

    @GetMapping
    fun indices(): ApiResponse<List<Any>> = ApiResponse.success(emptyList())
}
