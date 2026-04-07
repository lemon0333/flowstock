import logging

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.models.schemas import NewsAnalysisResponse

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Korean stock market news analyst.
Analyze the given news article and extract the following information:

1) Sentiment: Classify as POSITIVE, NEGATIVE, or NEUTRAL based on the overall market impact.
2) Summary: Write a concise summary in Korean (2-3 sentences).
3) Importance: Score from 0 to 100 indicating how significant this news is for the stock market.
4) Related Korean stocks: For each related stock, provide:
   - stock_code: The 6-digit Korean stock code (e.g., "005930" for Samsung Electronics)
   - stock_name: The Korean name of the stock (e.g., "삼성전자")
   - relation_type: DIRECT (directly mentioned/affected), INDIRECT (indirectly affected), or COMPETITOR (competitor affected)
   - impact_score: A score from -100 (very negative) to +100 (very positive) indicating the expected impact
   - impact_reason: A brief explanation in Korean of why this stock is affected

Be thorough in identifying related stocks. Consider supply chains, competitors, and sector effects."""

llm = ChatAnthropic(
    model="claude-sonnet-4-20250514",
    api_key=settings.CLAUDE_API_KEY,
    max_tokens=4096,
    temperature=0,
)

structured_llm = llm.with_structured_output(NewsAnalysisResponse)

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        (
            "human",
            "다음 뉴스 기사를 분석해주세요.\n\n제목: {title}\n\n본문:\n{content}",
        ),
    ]
)

chain = prompt | structured_llm


async def analyze_news(title: str, content: str) -> NewsAnalysisResponse:
    """Analyze a news article and return sentiment, summary, importance, and related stocks."""
    logger.info("Analyzing news: %s", title[:50])
    result = await chain.ainvoke({"title": title, "content": content})
    logger.info(
        "Analysis complete: sentiment=%s, importance=%d, stocks=%d",
        result.sentiment,
        result.importance,
        len(result.related_stocks),
    )
    return result
