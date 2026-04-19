import json
import logging

from claude_code_sdk import ClaudeCodeOptions, query

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

Be thorough in identifying related stocks. Consider supply chains, competitors, and sector effects.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) matching this exact schema:
{
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "summary": "string",
  "importance": number,
  "related_stocks": [
    {
      "stock_code": "string",
      "stock_name": "string",
      "relation_type": "DIRECT" | "INDIRECT" | "COMPETITOR",
      "impact_score": number,
      "impact_reason": "string"
    }
  ]
}"""


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
    # Fallback: collect all text messages
    for msg in messages:
        if hasattr(msg, "content") and isinstance(msg.content, str):
            result_parts.append(msg.content)
    return "\n".join(result_parts)


def _parse_json_response(text: str) -> dict:
    """Parse JSON from response text, stripping markdown fences if present."""
    text = text.strip()
    if text.startswith("```"):
        # Remove markdown code fences
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()
    return json.loads(text)


async def analyze_news(title: str, content: str) -> NewsAnalysisResponse:
    """Analyze a news article and return sentiment, summary, importance, and related stocks."""
    logger.info("Analyzing news: %s", title[:50])

    user_prompt = f"다음 뉴스 기사를 분석해주세요.\n\n제목: {title}\n\n본문:\n{content}"

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
    result = NewsAnalysisResponse(**parsed)

    logger.info(
        "Analysis complete: sentiment=%s, importance=%d, stocks=%d",
        result.sentiment,
        result.importance,
        len(result.related_stocks),
    )
    return result
