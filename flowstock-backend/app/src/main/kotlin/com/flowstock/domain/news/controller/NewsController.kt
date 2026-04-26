package com.flowstock.domain.news.controller

import com.flowstock.global.response.ApiResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/news")
class NewsController {

    @GetMapping
    fun list(): ApiResponse<List<Any>> = ApiResponse.success(emptyList())

    @GetMapping("/{id}/graph")
    fun graph(@PathVariable id: String): ApiResponse<Map<String, List<Any>>> =
        ApiResponse.success(mapOf("nodes" to emptyList(), "edges" to emptyList()))
}
