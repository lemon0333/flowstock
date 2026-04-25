import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    // 전역 플러그인 버전 관리
    id("org.springframework.boot") version "3.2.0" apply false
    id("io.spring.dependency-management") version "1.1.4" apply false
    kotlin("jvm") version "1.9.20" apply false
    kotlin("plugin.spring") version "1.9.20" apply false
    kotlin("plugin.jpa") version "1.9.20" apply false
    kotlin("kapt") version "1.9.20" apply false
    application
}

allprojects {
    group = "com.flowstock"
    version = "0.0.1-SNAPSHOT"

    repositories {
        mavenCentral()
    }
}

// 핵심: 'app' 모듈 설정
project(":app") {
    apply(plugin = "org.springframework.boot")
    apply(plugin = "io.spring.dependency-management")
    apply(plugin = "org.jetbrains.kotlin.jvm")
    apply(plugin = "org.jetbrains.kotlin.plugin.spring")
    apply(plugin = "org.jetbrains.kotlin.plugin.jpa")
    apply(plugin = "org.jetbrains.kotlin.kapt")
    apply(plugin = "application")

    dependencies {
        // Spring Boot
        "implementation"("org.springframework.boot:spring-boot-starter-web")
        "implementation"("org.springframework.boot:spring-boot-starter-data-jpa")
        "implementation"("org.springframework.boot:spring-boot-starter-security")
        "implementation"("org.springframework.boot:spring-boot-starter-validation")

        // WebFlux (WebClient)
        "implementation"("org.springframework.boot:spring-boot-starter-webflux")

        // Kotlin
        "implementation"("com.fasterxml.jackson.module:jackson-module-kotlin")
        "implementation"("org.jetbrains.kotlin:kotlin-reflect")
        "implementation"("org.jetbrains.kotlinx:kotlinx-coroutines-core")
        "implementation"("org.jetbrains.kotlinx:kotlinx-coroutines-reactor")

        // QueryDSL & KAPT (Jakarta)
        "implementation"("com.querydsl:querydsl-jpa:5.0.0:jakarta")
        "kapt"("com.querydsl:querydsl-apt:5.0.0:jakarta")
        "kapt"("jakarta.annotation:jakarta.annotation-api")
        "kapt"("jakarta.persistence:jakarta.persistence-api")

        // DB & ETC
        "runtimeOnly"("org.postgresql:postgresql")
        "implementation"("org.flywaydb:flyway-core")
        "implementation"("io.jsonwebtoken:jjwt-api:0.12.3")
        "runtimeOnly"("io.jsonwebtoken:jjwt-impl:0.12.3")
        "runtimeOnly"("io.jsonwebtoken:jjwt-jackson:0.12.3")

        // AWS SDK
        "implementation"("software.amazon.awssdk:s3:2.21.0")

        // Test
        "testImplementation"("org.springframework.boot:spring-boot-starter-test")
        "testImplementation"("io.mockk:mockk:1.13.8")
    }

    tasks.withType<KotlinCompile> {
        kotlinOptions {
            freeCompilerArgs = listOf("-Xjsr305=strict")
            jvmTarget = "17"
        }
    }

    tasks.withType<Test> {
        useJUnitPlatform()
    }

    configure<org.gradle.api.plugins.JavaApplication> {
        // 이미지에서 확인한 com.flowstock 패키지의 FlowStockApplicationKt
        mainClass.set("com.flowstock.FlowStockApplicationKt")
    }
}