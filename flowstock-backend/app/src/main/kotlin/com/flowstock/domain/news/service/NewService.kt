package org.example.app.com.flowstock.domain.news.service



@Service
@Transactional(readOnly = true)
class NewsService(
    private val newsRepository: NewsRepository,
    private val stockRepository: StockRepository,
    private val claudeClient: ClaudeClient,
) {

    // 최신 뉴스 목록
    fun getLatestNews(page: Int, size: Int) =
        newsRepository.findLatestNews(page, size)

    // 뉴스 상세 + 연결관계 그래프 데이터
    fun getNewsGraph(newsId: Long): NewsGraphResponse {
        val news = newsRepository.findByIdWithRelations(newsId)
            ?: throw NoSuchElementException("뉴스를 찾을 수 없습니다.")

        // ReactFlow 형태로 변환
        val nodes = buildNodes(news)
        val edges = buildEdges(news)

        return NewsGraphResponse(
            news  = news,
            nodes = nodes,
            edges = edges,
        )
    }

    // ReactFlow 노드 생성
    private fun buildNodes(news: News): List<GraphNode> {
        val nodes = mutableListOf<GraphNode>()

        // 뉴스 노드 (중앙)
        nodes.add(GraphNode(
            id   = "news-${news.id}",
            type = "news",
            data = GraphNodeData(label = news.title, sentiment = news.sentiment?.name),
        ))

        // 종목 노드들
        news.stockRelations.forEach { relation ->
            nodes.add(GraphNode(
                id   = "stock-${relation.stock.id}",
                type = "stock",
                data = GraphNodeData(
                    label       = relation.stock.name,
                    code        = relation.stock.code,
                    impactScore = relation.impactScore,
                ),
            ))
        }

        return nodes
    }

    // ReactFlow 엣지 생성
    private fun buildEdges(news: News): List<GraphEdge> =
        news.stockRelations.map { relation ->
            GraphEdge(
                id     = "edge-${news.id}-${relation.stock.id}",
                source = "news-${news.id}",
                target = "stock-${relation.stock.id}",
                label  = relation.relationType.name,
                data   = GraphEdgeData(
                    impactScore  = relation.impactScore,
                    impactReason = relation.impactReason,
                ),
            )
        }

    // Claude API로 뉴스 분석 + 종목 연결관계 추출
    @Transactional
    suspend fun analyzeNewsWithAI(newsId: Long): News = coroutineScope {
        val news = newsRepository.findById(newsId).orElseThrow()

        // Claude API 호출 — 감성분석 + 관련종목 + 영향도 한번에
        val analysisDeferred = async {
            claudeClient.analyzeNews(
                title   = news.title,
                content = news.content ?: "",
            )
        }

        val analysis: NewsAnalysisResult = analysisDeferred.await()

        // 감성 분석 결과 저장
        news.sentiment = Sentiment.valueOf(analysis.sentiment)
        news.summary   = analysis.summary
        news.importance = analysis.importance

        // 관련 종목 연결관계 저장
        analysis.relatedStocks.forEach { related ->
            val stock = stockRepository.findByCode(related.code) ?: return@forEach

            val relation = NewsStockRelation(
                news         = news,
                stock        = stock,
                relationType = RelationType.valueOf(related.relationType),
                impactScore  = related.impactScore,
                impactReason = related.impactReason,
            )
            news.stockRelations.add(relation)
        }

        newsRepository.save(news)
    }
}

// ─── ReactFlow DTO ───────────────────────
data class NewsGraphResponse(
    val news  : News,
    val nodes : List<GraphNode>,
    val edges : List<GraphEdge>,
)

data class GraphNode(
    val id   : String,
    val type : String,
    val data : GraphNodeData,
)

data class GraphNodeData(
    val label       : String,
    val code        : String?  = null,
    val sentiment   : String?  = null,
    val impactScore : Double?  = null,
)

data class GraphEdge(
    val id     : String,
    val source : String,
    val target : String,
    val label  : String,
    val data   : GraphEdgeData,
)

data class GraphEdgeData(
    val impactScore  : Double? = null,
    val impactReason : String? = null,
)
