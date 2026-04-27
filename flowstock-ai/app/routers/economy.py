"""경제 대시보드 라우터.

맨큐 거시/미시 관점의 시장 지표를 한 번에 응답한다.
- 매매주체별 동향(개인/외국인/기관)
- 상승/하락 종목 수 (시장 폭)
- 52주 고저 대비 현재가
- KOSPI/KOSDAQ 일별 시계열
"""

import logging

from fastapi import APIRouter, HTTPException, Query

from app.services.correlation import get_correlation_matrix
from app.services.stock_data import stock_data_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/economy", tags=["economy"])


@router.get("/dashboard")
async def dashboard():
    try:
        return {"data": stock_data_service.get_economy_dashboard()}
    except Exception as e:
        logger.error("economy dashboard 실패: %s", e)
        raise HTTPException(status_code=500, detail=f"economy dashboard 실패: {e}")


@router.get("/correlation")
async def correlation(
    market: str = Query("KOSPI"),
    top: int = Query(10, ge=2, le=30),
    days: int = Query(60, ge=20, le=365),
):
    """시가총액 top 종목의 일별 수익률 상관계수 행렬."""
    try:
        return {"data": get_correlation_matrix(market=market, top=top, days=days)}
    except Exception as e:
        logger.error("correlation 실패: %s", e)
        return {"data": {"tickers": [], "names": [], "matrix": []}}
