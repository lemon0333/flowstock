package com.flowstock.global.response

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ApiResponseTest {

    private val mapper = jacksonObjectMapper()

    @Test
    fun `success factory creates success=true with data`() {
        val resp = ApiResponse.success(listOf(1, 2, 3))
        assertEquals(true, resp.success)
        assertEquals(listOf(1, 2, 3), resp.data)
    }

    @Test
    fun `error factory creates success=false with errorCode`() {
        val resp = ApiResponse.error("OAUTH_001", "잘못된 토큰")
        assertEquals(false, resp.success)
        assertEquals("OAUTH_001", resp.errorCode)
        assertEquals("잘못된 토큰", resp.message)
    }

    @Test
    fun `serialization omits null fields`() {
        // success(data, message=null) — message가 null이면 직렬화에서 빠져야 함
        val resp = ApiResponse.success("hi")
        val json = mapper.writeValueAsString(resp)
        assertTrue(json.contains("\"data\":\"hi\""))
        // NON_NULL 정책 → message/errorCode 키 자체가 없어야 함
        assertTrue(!json.contains("\"message\""))
        assertTrue(!json.contains("\"errorCode\""))
    }

    @Test
    fun `roundtrip — JSON → Kotlin object`() {
        val json = """{"success":true,"data":42}"""
        val parsed: ApiResponse<Int> = mapper.readValue(
            json,
            mapper.typeFactory.constructParametricType(ApiResponse::class.java, Integer::class.java),
        )
        assertNotNull(parsed)
        assertEquals(true, parsed.success)
        assertEquals(42, parsed.data)
    }
}
