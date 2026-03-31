package org.example.app

import org.example.utils.Printer

//TIP To <b>Run</b> code, press <shortcut actionId="Run"/> or
// click the <icon src="AllIcons.Actions.Execute"/> icon in the gutter.

@SpringBootApplication
@EnableScheduling
class FlowStockApplication

fun main(args: Array<String>) {
    runApplication<FlowStockApplication>(*args)
}
