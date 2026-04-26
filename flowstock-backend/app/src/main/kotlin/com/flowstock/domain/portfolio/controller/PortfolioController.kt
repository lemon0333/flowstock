package com.flowstock.domain.portfolio.controller

import com.flowstock.global.response.ApiResponse
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Portfolio stub: 도메인이 아직 구현 전이라 화면이 깨지지 않도록 빈 응답을 돌려준다.
 * 인증 사용자만 접근하므로 SecurityConfig에서 자동으로 보호됨.
 */
@RestController
@RequestMapping("/api/portfolio")
class PortfolioController {

    @GetMapping
    fun holdings(): ApiResponse<List<Any>> = ApiResponse.success(emptyList())

    @PostMapping
    fun add(@RequestBody body: Map<String, Any?>): ApiResponse<Map<String, Any?>> =
        ApiResponse.success(body)

    @DeleteMapping("/{stockId}")
    fun remove(@PathVariable stockId: String): ApiResponse<Map<String, Any?>> =
        ApiResponse.success(mapOf("stockId" to stockId))

    @GetMapping("/sectors")
    fun sectors(): ApiResponse<List<Any>> = ApiResponse.success(emptyList())
}
