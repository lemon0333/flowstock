package com.flowstock.global.config

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Contact
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityRequirement
import io.swagger.v3.oas.models.security.SecurityScheme
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {

    @Bean
    fun flowStockOpenApi(): OpenAPI {
        val bearerScheme = SecurityScheme()
            .type(SecurityScheme.Type.HTTP)
            .scheme("bearer")
            .bearerFormat("JWT")
            .name("Authorization")

        return OpenAPI()
            .info(
                Info()
                    .title("FlowStock API")
                    .version("0.1")
                    .description("AI 기반 한국 주식 분석 플랫폼 — REST API 문서")
                    .contact(Contact().name("FlowStock").url("https://flowstock.info"))
            )
            .components(Components().addSecuritySchemes("bearer-jwt", bearerScheme))
            .addSecurityItem(SecurityRequirement().addList("bearer-jwt"))
    }
}
