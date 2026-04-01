package com.flowstock.domain.stock.entity

import com.flowstock.global.common.BaseEntity
import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate

@Entity
@Table(
    name = "stock_prices",
    uniqueConstraints = [UniqueConstraint(columnNames = ["stock_id", "date"])]
)
class StockPrice(

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    val stock: Stock,

    @Column(nullable = false)
    val date: LocalDate,

    @Column(nullable = false, precision = 15, scale = 2)
    val openPrice: BigDecimal,

    @Column(nullable = false, precision = 15, scale = 2)
    val highPrice: BigDecimal,

    @Column(nullable = false, precision = 15, scale = 2)
    val lowPrice: BigDecimal,

    @Column(nullable = false, precision = 15, scale = 2)
    val closePrice: BigDecimal,

    @Column(nullable = false)
    val volume: Long,

    @Column(precision = 10, scale = 4)
    val changeRate: BigDecimal? = null,   // 전일 대비 등락률

) : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0
}