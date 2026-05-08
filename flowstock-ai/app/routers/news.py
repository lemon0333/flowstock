import json
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.news_analyzer import analyze_news
from app.database import get_db
from app.models.entities import AnalysisRequestLog, NewsAnalysisLog
from app.models.schemas import NewsAnalysisRequest, NewsAnalysisResponse
from app.services.global_news import get_global_news
from app.services.news_feed import (
    get_latest_news_async,
    get_stock_news_async,
)

router = APIRouter(prefix="/api/ai/news", tags=["news"])


@router.get("/latest")
async def list_latest_news(limit: int = 30):
    """주요 한국 경제 뉴스 RSS 통합 응답 (4채널 병렬 + 60s 캐시)."""
    return {"data": await get_latest_news_async(limit=limit)}


@router.get("/global")
async def list_global_news(limit: int = 20):
    """Reuters/Bloomberg/FT 헤드라인 + 한국어 번역 (5분 캐시)."""
    return {"data": await get_global_news(limit=limit)}


@router.get("/search")
async def search_stock_news(
    keyword: str,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 10,
):
    """종목/키워드 + 기간으로 Google News 검색 (60s 캐시) — 모의투자 게임 백테스트용."""
    return {
        "data": await get_stock_news_async(
            keyword=keyword, date_from=date_from, date_to=date_to, limit=limit
        )
    }


@router.post("/analyze", response_model=NewsAnalysisResponse)
async def analyze_news_endpoint(
    request: NewsAnalysisRequest, db: Session = Depends(get_db)
):
    """Analyze a news article for sentiment, importance, and related stocks."""
    start = time.time()
    try:
        result = await analyze_news(title=request.title, content=request.content)
        duration_ms = int((time.time() - start) * 1000)

        # 분석 결과 저장
        log = NewsAnalysisLog(
            title=request.title,
            content=request.content,
            sentiment=result.sentiment.value,
            summary=result.summary,
            importance=result.importance,
            related_stocks_json=json.dumps(
                [s.model_dump() for s in result.related_stocks], ensure_ascii=False
            ),
        )
        db.add(log)

        # 요청 이력 저장
        req_log = AnalysisRequestLog(
            endpoint="/api/ai/news/analyze",
            request_body=request.model_dump_json(),
            status="SUCCESS",
            duration_ms=duration_ms,
        )
        db.add(req_log)
        db.commit()

        return result
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        req_log = AnalysisRequestLog(
            endpoint="/api/ai/news/analyze",
            request_body=request.model_dump_json(),
            status="FAILED",
            error_message=str(e),
            duration_ms=duration_ms,
        )
        db.add(req_log)
        db.commit()
        raise HTTPException(status_code=500, detail=f"News analysis failed: {str(e)}")
