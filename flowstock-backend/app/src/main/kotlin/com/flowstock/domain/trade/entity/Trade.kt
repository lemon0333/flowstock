package com.flowstock.domain.trade.entity

import com.flowstock.global.common.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table

@Entity
@Table(
    name = "trades",
    indexes = [
        Index(name = "idx_trades_member_id", columnList = "member_id"),
        Index(name = "idx_trades_is_public_created_at", columnList = "is_public, created_at DESC"),
        Index(name = "idx_trades_stock_code", columnList = "stock_code"),
    ],
)
class Trade(

    @Column(name = "member_id", nullable = false)
    val memberId: Long,

    @Column(name = "stock_code", nullable = false, length = 20)
    var stockCode: String,

    @Column(name = "stock_name", nullable = false, length = 100)
    var stockName: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    var action: TradeAction,

    @Column(nullable = false)
    var price: Long,

    @Column(nullable = false)
    var quantity: Int,

    @Column(name = "realized_pnl")
    var realizedPnl: Long? = null,

    @Column(columnDefinition = "TEXT")
    var memo: String? = null,

    @Column(name = "is_public", nullable = false)
    var isPublic: Boolean = false,

) : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0
}

enum class TradeAction {
    BUY, SELL
}
