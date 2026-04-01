package com.flowstock.domain.stock.repository

import com.flowstock.domain.stock.entity.Stock
import org.springframework.data.jpa.repository.JpaRepository

interface StockRepository : JpaRepository<Stock, Long> {

    fun findByCode(code: String): Stock?
}
