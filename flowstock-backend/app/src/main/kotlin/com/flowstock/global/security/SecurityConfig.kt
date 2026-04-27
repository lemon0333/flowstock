package com.flowstock.global.security

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter,
) {

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors { it.configurationSource(corsConfigurationSource()) }
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    // 인증 없이 접근 가능: OAuth 로그인 / 토큰 갱신
                    .requestMatchers(HttpMethod.POST, "/api/members/oauth/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/members/oauth/naver/callback").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/members/token/refresh").permitAll()
                    // Actuator (k3s health check)
                    .requestMatchers("/actuator/**").permitAll()
                    // 비로그인 사용자도 둘러볼 수 있는 read-only 데이터
                    .requestMatchers(HttpMethod.GET, "/api/stocks/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/news/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/news/search").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/market/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/economy/**").permitAll()
                    // 개인 기능(포트폴리오, /me, 로그아웃 등)은 인증 필요
                    .anyRequest().authenticated()
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration().apply {
            allowedOriginPatterns = listOf("*")
            allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            allowedHeaders = listOf("*")
            allowCredentials = true
            maxAge = 3600
        }
        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", config)
        }
    }
}
