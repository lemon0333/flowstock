import json
import logging

from claude_code_sdk import ClaudeCodeOptions, query

from app.models.schemas import ChartAnalysisRequest, ChartAnalysisResponse

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a professional technical analyst specializing in the Korean stock market (KOSPI/KOSDAQ).
Analyze the given OHLCV (Open, High, Low, Close, Volume) price data and provide:

1) trend: Overall trend classification - must be exactly one of "BULLISH", "BEARISH", or "SIDEWAYS".
2) analysis: Detailed technical analysis in Korean (3-5 sentences). Include observations about price action, volume trends, and momentum.
3) support_level: Key support price level based on the data (a float, or null if unclear).
4) resistance_level: Key resistance price level based on the data (a float, or null if unclear).
5) key_patterns: List of identified technical patterns in Korean (e.g., "이중 바닥", "헤드앤숄더", "상승 삼각형", "골든 크로스").

Analyze the data carefully. Look for:
- Moving average crossovers
- Volume divergences
- Candlestick patterns (doji, hammer, engulfing, etc.)
- Support/resistance levels from recent highs/lows
- Trend strength and potential reversals

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) matching this exact schema:
{
  "trend": "BULLISH" | "BEARISH" | "SIDEWAYS",
  "analysis": "string",
  "support_level": number | null,
  "resistance_level": number | null,
  "key_patterns": ["string"]
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


async def analyze_chart(request: ChartAnalysisRequest) -> ChartAnalysisResponse:
    """Analyze OHLCV price data and return technical analysis."""
    logger.info(
        "Analyzing chart for %s (%s), %d data points",
        request.stock_name,
        request.stock_code,
        len(request.prices),
    )

    prices_json = json.dumps(request.prices, ensure_ascii=False, indent=2)
    user_prompt = (
        f"다음 종목의 가격 데이터를 기술적으로 분석해주세요.\n\n"
        f"종목코드: {request.stock_code}\n"
        f"종목명: {request.stock_name}\n\n"
        f"OHLCV 데이터:\n{prices_json}"
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
    result = ChartAnalysisResponse(**parsed)

    logger.info(
        "Chart analysis complete: trend=%s, patterns=%d",
        result.trend,
        len(result.key_patterns),
    )
    return result
