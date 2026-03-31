package org.example.app.com.flowstock.domain.stock.entity




@Entity
@Table(name = "stocks")
class Stock(

    @Column(nullable = false, unique = true, length = 20)
    val code: String,         // 종목코드 ex) 005930

    @Column(nullable = false, length = 100)
    var name: String,         // 삼성전자

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    var market: Market,       // KOSPI, KOSDAQ

    @Column(length = 100)
    var sector: String? = null,    // 반도체

    @Column(length = 100)
    var industry: String? = null,  // 메모리반도체

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Column(nullable = false)
    var isActive: Boolean = true,

    ) : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    // 연관관계
    @OneToMany(mappedBy = "stock", fetch = FetchType.LAZY)
    val prices: MutableList<StockPrice> = mutableListOf()
}

enum class Market {
    KOSPI, KOSDAQ
}
