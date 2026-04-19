import json
import logging
import uuid

from claude_code_sdk import ClaudeCodeOptions, query
from pydantic import BaseModel

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

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) matching this exact schema:
{
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "related_stocks": [
    {
      "stock_code": "string",
      "stock_name": "string",
      "relation_type": "DIRECT" | "INDIRECT" | "COMPETITOR",
      "impact_score": number,
      "reason": "string"
    }
  ]
}"""


class _StockItem(BaseModel):
    stock_code: str
    stock_name: str
    relation_type: str  # DIRECT, INDIRECT, COMPETITOR
    impact_score: float
    reason: str


class _GraphExtractionResult(BaseModel):
    sentiment: str  # POSITIVE, NEGATIVE, NEUTRAL
    related_stocks: list[_StockItem]


def _extract_json_text(messages: list) -> str:
    """Extract text content from Claude Code SDK messages."""
    result_parts = []
    for msg in messages:
        if msg.type == "result":
            if hasattr(msg, "subtype") and msg.subtype == "result":
                result_parts.append(msg.result if hasattr(msg, "result") else "")
            elif hasattr(msg, "result"):
                result_parts.append(msg.result)
    if result_parts:
        return "\n".join(str(p) for p in result_parts)
    for msg in messages:
        if hasattr(msg, "content") and isinstance(msg.content, str):
            result_parts.append(msg.content)
    return "\n".join(result_parts)


def _parse_json_response(text: str) -> dict:
    """Parse JSON from response text, stripping markdown fences if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()
    return json.loads(text)


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

    user_prompt = (
        "다음 뉴스 기사에서 관련 종목을 추출하고 네트워크 그래프를 생성해주세요.\n\n"
        f"제목: {request.news_title}\n\n"
        f"본문:\n{request.news_content}"
    )

    messages = []
    async for message in query(
        prompt=user_prompt,
        options=ClaudeCodeOptions(
            system_prompt=SYSTEM_PROMPT,
            max_turns=1,
        ),
    ):
        messages.append(message)

    response_text = _extract_json_text(messages)
    parsed = _parse_json_response(response_text)
    extraction = _GraphExtractionResult(**parsed)

    result = _build_graph(request, extraction)
    logger.info(
        "Graph generated: %d nodes, %d edges",
        len(result.nodes),
        len(result.edges),
    )
    return result
