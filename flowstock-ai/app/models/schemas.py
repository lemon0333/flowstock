from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional


class Sentiment(str, Enum):
    POSITIVE = "POSITIVE"
    NEGATIVE = "NEGATIVE"
    NEUTRAL = "NEUTRAL"


class RelationType(str, Enum):
    DIRECT = "DIRECT"
    INDIRECT = "INDIRECT"
    COMPETITOR = "COMPETITOR"


class NewsAnalysisRequest(BaseModel):
    title: str
    content: str


class StockRelation(BaseModel):
    stock_code: str
    stock_name: str
    relation_type: RelationType
    impact_score: float  # -100 to +100
    impact_reason: str


class NewsAnalysisResponse(BaseModel):
    sentiment: Sentiment
    summary: str
    importance: int  # 0-100
    related_stocks: list[StockRelation]


class ChartAnalysisRequest(BaseModel):
    stock_code: str
    stock_name: str
    prices: list[dict]  # List of OHLCV data


class ChartAnalysisResponse(BaseModel):
    trend: str  # "BULLISH", "BEARISH", "SIDEWAYS"
    analysis: str
    support_level: Optional[float] = None
    resistance_level: Optional[float] = None
    key_patterns: list[str]


class GraphGenerateRequest(BaseModel):
    news_title: str
    news_content: str
    news_sentiment: Optional[Sentiment] = None


class GraphNode(BaseModel):
    id: str
    type: str  # "news" or "stock"
    label: str
    data: dict


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    data: dict


class GraphGenerateResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


# ── 주식 데이터 (pykrx) ─────────────────────────────────────


class OHLCVData(BaseModel):
    date: str = Field(..., description="날짜 (yyyy-mm-dd)")
    open: int = Field(..., description="시가")
    high: int = Field(..., description="고가")
    low: int = Field(..., description="저가")
    close: int = Field(..., description="종가")
    volume: int = Field(..., description="거래량")


class OHLCVResponse(BaseModel):
    ticker: str
    data: list[OHLCVData]
    count: int


class MarketOHLCVItem(BaseModel):
    ticker: str
    name: str
    open: int
    high: int
    low: int
    close: int
    volume: int
    change_rate: float = Field(..., description="등락률 (%)")


class MarketOHLCVResponse(BaseModel):
    date: str
    market: str
    data: list[MarketOHLCVItem]
    count: int


class StockInfo(BaseModel):
    ticker: str = Field(..., description="종목 코드")
    name: str = Field(..., description="종목명")
    market: str = Field(..., description="시장 (KOSPI/KOSDAQ)")


class StockListResponse(BaseModel):
    data: list[StockInfo]
    count: int


class MarketIndexItem(BaseModel):
    index_code: str = Field(..., description="지수 코드")
    name: str = Field(..., description="지수명")
    close: float = Field(..., description="종가")
    change: float = Field(..., description="전일 대비 변동")
    change_rate: float = Field(..., description="등락률 (%)")
    volume: int = Field(..., description="거래량")


class MarketIndexResponse(BaseModel):
    date: str
    data: list[MarketIndexItem]
