package com.flowstock

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class FlowStockApplication

fun main(args: Array<String>) {
    runApplication<FlowStockApplication>(*args)
}
