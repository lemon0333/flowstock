package com.flowstock.domain.chatbot.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class ChatMessageDto(
    @field:NotBlank
    @field:Pattern(regexp = "^(user|assistant)$", message = "role은 user 또는 assistant")
    val role: String,

    @field:NotBlank
    @field:Size(min = 1, max = 500, message = "content는 1~500자")
    val content: String,
)

data class ChatRequest(
    @field:NotBlank
    @field:Size(max = 128)
    val sessionId: String,

    @field:Valid
    @field:Size(min = 1, max = 12, message = "messages는 1~12개")
    val messages: List<ChatMessageDto>,

    @field:Size(max = 200)
    val currentPath: String? = null,
)
