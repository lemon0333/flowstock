package com.flowstock.global.response

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null,
    val errorCode: String? = null,
) {
    companion object {
        fun <T> success(data: T, message: String? = null) =
            ApiResponse(success = true, data = data, message = message)

        fun error(errorCode: String, message: String) =
            ApiResponse<Unit>(success = false, errorCode = errorCode, message = message)
    }
}
