package com.flowstock.global.config

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * 이미 적용된 마이그레이션의 SQL을 정정(주석/리팩토링)했을 때 checksum mismatch
 * 로 startup이 깨지는 걸 방지. 매번 startup 시 `repair()` → schema_history의
 * checksum을 현재 파일과 일치시킨 뒤 정상 `migrate()`.
 *
 * 새 migration의 의미를 바꾸는 게 아니라, 기존 SQL을 placeholder/comment로
 * 청소할 때 안전하게 사용.
 */
@Configuration
class FlywayConfig {

    @Bean
    fun flywayMigrationStrategy(): FlywayMigrationStrategy = FlywayMigrationStrategy { flyway ->
        flyway.repair()
        flyway.migrate()
    }
}
