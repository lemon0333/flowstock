import json
import logging

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
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
- Trend strength and potential reversals"""

llm = ChatAnthropic(
    model="claude-sonnet-4-20250514",
    api_key=settings.CLAUDE_API_KEY,
    max_tokens=4096,
    temperature=0,
)

structured_llm = llm.with_structured_output(ChartAnalysisResponse)

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        (
            "human",
            "다음 종목의 가격 데이터를 기술적으로 분석해주세요.\n\n"
            "종목코드: {stock_code}\n"
            "종목명: {stock_name}\n\n"
            "OHLCV 데이터:\n{prices_json}",
        ),
    ]
)

chain = prompt | structured_llm


async def analyze_chart(request: ChartAnalysisRequest) -> ChartAnalysisResponse:
    """Analyze OHLCV price data and return technical analysis."""
    logger.info(
        "Analyzing chart for %s (%s), %d data points",
        request.stock_name,
        request.stock_code,
        len(request.prices),
    )
    prices_json = json.dumps(request.prices, ensure_ascii=False, indent=2)
    result = await chain.ainvoke(
        {
            "stock_code": request.stock_code,
            "stock_name": request.stock_name,
            "prices_json": prices_json,
        }
    )
    logger.info(
        "Chart analysis complete: trend=%s, patterns=%d",
        result.trend,
        len(result.key_patterns),
    )
    return result
