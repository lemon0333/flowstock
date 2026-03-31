package org.example.app.com.flowstock.domain.news.entity

import java.time.LocalDateTime


@Entity
@Table(name = "news")
class News(

    @Column(nullable = false, length = 500)
    var title: String,

    @Column(columnDefinition = "TEXT")
    var content: String? = null,

    @Column(columnDefinition = "TEXT")
    var summary: String? = null,      // AI 요약

    @Column(length = 100)
    var source: String? = null,       // 한국경제, 연합뉴스 등

    @Column(length = 1000)
    var originalUrl: String? = null,

    @Column(nullable = false)
    var publishedAt: LocalDateTime,

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    var sentiment: Sentiment? = null,  // AI 감성 분석

    @Column(nullable = false)
    var importance: Int = 0,           // 중요도 0~100

) : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @OneToMany(mappedBy = "news", cascade = [CascadeType.ALL], orphanRemoval = true)
    val stockRelations: MutableList<NewsStockRelation> = mutableListOf()
}

enum class Sentiment {
    POSITIVE, NEGATIVE, NEUTRAL
}

// ─────────────────────────────────────────
// 뉴스 ↔ 종목 연결관계 (ReactFlow 핵심 데이터)
// ─────────────────────────────────────────
@Entity
@Table(
    name = "news_stock_relations",
    uniqueConstraints = [UniqueConstraint(columnNames = ["news_id", "stock_id"])]
)
class NewsStockRelation(

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "news_id", nullable = false)
    val news: News,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    val stock: Stock,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    val relationType: RelationType,

    @Column(precision = 5, scale = 2)
    var impactScore: Double? = null,  // -100 ~ +100

    @Column(columnDefinition = "TEXT")
    var impactReason: String? = null, // AI 분석 이유

) : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0
}

enum class RelationType {
    DIRECT,      // 직접 언급
    INDIRECT,    // 간접 영향 (공급망 등)
    COMPETITOR   // 경쟁사 영향
}
