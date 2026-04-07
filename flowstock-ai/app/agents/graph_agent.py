import logging
import uuid

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from app.config import settings
from app.models.schemas import (
    GraphEdge,
    GraphGenerateRequest,
    GraphGenerateResponse,
    GraphNode,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Korean financial news analyst. Given a news article, identify all related Korean stocks and generate a network graph structure.

For each related stock, determine:
- The stock code (6-digit Korean stock code)
- The stock name in Korean
- The relationship type: DIRECT, INDIRECT, or COMPETITOR
- The impact score from -100 to +100
- A brief reason for the relationship in Korean

Also determine the news sentiment: POSITIVE, NEGATIVE, or NEUTRAL.

Return the data as a structured list of related stocks. I will convert this into graph nodes and edges."""


class _StockItem(BaseModel):
    stock_code: str
    stock_name: str
    relation_type: str  # DIRECT, INDIRECT, COMPETITOR
    impact_score: float
    reason: str


class _GraphExtractionResult(BaseModel):
    sentiment: str  # POSITIVE, NEGATIVE, NEUTRAL
    related_stocks: list[_StockItem]


llm = ChatAnthropic(
    model="claude-sonnet-4-20250514",
    api_key=settings.CLAUDE_API_KEY,
    max_tokens=4096,
    temperature=0,
)

structured_llm = llm.with_structured_output(_GraphExtractionResult)

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        (
            "human",
            "다음 뉴스 기사에서 관련 종목을 추출하고 네트워크 그래프를 생성해주세요.\n\n"
            "제목: {title}\n\n"
            "본문:\n{content}",
        ),
    ]
)

chain = prompt | structured_llm


def _build_graph(
    request: GraphGenerateRequest,
    extraction: _GraphExtractionResult,
) -> GraphGenerateResponse:
    """Convert the extraction result into ReactFlow-compatible nodes and edges."""
    news_node_id = f"news-{uuid.uuid4().hex[:8]}"
    sentiment = request.news_sentiment or extraction.sentiment

    nodes: list[GraphNode] = [
        GraphNode(
            id=news_node_id,
            type="news",
            label=request.news_title,
            data={
                "title": request.news_title,
                "sentiment": sentiment,
            },
        )
    ]

    edges: list[GraphEdge] = []

    for stock in extraction.related_stocks:
        stock_node_id = f"stock-{stock.stock_code}"

        nodes.append(
            GraphNode(
                id=stock_node_id,
                type="stock",
                label=stock.stock_name,
                data={
                    "stock_code": stock.stock_code,
                    "stock_name": stock.stock_name,
                    "impact_score": stock.impact_score,
                },
            )
        )

        edges.append(
            GraphEdge(
                id=f"edge-{news_node_id}-{stock_node_id}",
                source=news_node_id,
                target=stock_node_id,
                label=stock.relation_type,
                data={
                    "relation_type": stock.relation_type,
                    "impact_score": stock.impact_score,
                    "reason": stock.reason,
                },
            )
        )

    return GraphGenerateResponse(nodes=nodes, edges=edges)


async def generate_graph(
    request: GraphGenerateRequest,
) -> GraphGenerateResponse:
    """Generate a news-stock network graph from a news article."""
    logger.info("Generating graph for news: %s", request.news_title[:50])
    extraction = await chain.ainvoke(
        {
            "title": request.news_title,
            "content": request.news_content,
        }
    )
    result = _build_graph(request, extraction)
    logger.info(
        "Graph generated: %d nodes, %d edges",
        len(result.nodes),
        len(result.edges),
    )
    return result
