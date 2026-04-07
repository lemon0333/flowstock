from pydantic import BaseModel
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
