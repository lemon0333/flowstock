package com.flowstock.domain.trade.controller

import com.flowstock.domain.trade.dto.LeaderboardEntry
import com.flowstock.domain.trade.dto.TradeCreateRequest
import com.flowstock.domain.trade.dto.TradeResponse
import com.flowstock.domain.trade.service.TradeService
import com.flowstock.global.exception.BusinessException
import com.flowstock.global.exception.ErrorCode
import com.flowstock.global.response.ApiResponse
import jakarta.validation.Valid
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/trades")
class TradeController(
    private val service: TradeService,
) {

    @PostMapping
    fun create(@Valid @RequestBody req: TradeCreateRequest): ApiResponse<TradeResponse> {
        return ApiResponse.success(service.create(currentMemberId(), req), "거래가 기록되었습니다.")
    }

    @GetMapping("/public")
    fun listPublic(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ApiResponse<List<TradeResponse>> =
        ApiResponse.success(service.listPublic(page, size.coerceIn(1, 50)))

    @GetMapping("/me")
    fun listMine(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int,
    ): ApiResponse<List<TradeResponse>> =
        ApiResponse.success(service.listMine(currentMemberId(), page, size.coerceIn(1, 100)))

    @GetMapping("/leaderboard")
    fun leaderboard(@RequestParam(defaultValue = "20") limit: Int): ApiResponse<List<LeaderboardEntry>> =
        ApiResponse.success(service.leaderboard(limit))

    private fun currentMemberId(): Long {
        val auth = SecurityContextHolder.getContext().authentication
            ?: throw BusinessException(ErrorCode.INVALID_TOKEN)
        return auth.principal as Long
    }
}
