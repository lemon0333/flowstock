from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NewsAnalysisLog(Base):
    """뉴스 분석 결과 저장 + 캐싱"""

    __tablename__ = "news_analysis_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment: Mapped[str] = mapped_column(
        Enum("POSITIVE", "NEGATIVE", "NEUTRAL", name="sentiment_enum"), nullable=False
    )
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    importance: Mapped[int] = mapped_column(Integer, nullable=False)
    related_stocks_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class ChartAnalysisLog(Base):
    """차트 분석 이력"""

    __tablename__ = "chart_analysis_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    stock_name: Mapped[str] = mapped_column(String(100), nullable=False)
    trend: Mapped[str] = mapped_column(String(20), nullable=False)
    analysis: Mapped[str] = mapped_column(Text, nullable=False)
    support_level: Mapped[float | None] = mapped_column(Float, nullable=True)
    resistance_level: Mapped[float | None] = mapped_column(Float, nullable=True)
    key_patterns_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class GraphGenerationLog(Base):
    """그래프 생성 이력"""

    __tablename__ = "graph_generation_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    news_title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    node_count: Mapped[int] = mapped_column(Integer, nullable=False)
    edge_count: Mapped[int] = mapped_column(Integer, nullable=False)
    graph_data_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class AnalysisRequestLog(Base):
    """전체 API 요청 이력 (성공/실패 모두)"""

    __tablename__ = "analysis_request_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    endpoint: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    request_body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("SUCCESS", "FAILED", name="status_enum"), nullable=False
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
