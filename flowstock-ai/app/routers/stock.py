import logging

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    MarketIndexResponse,
    MarketOHLCVResponse,
    OHLCVResponse,
    StockListResponse,
)
from app.services.stock_data import stock_data_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/stock", tags=["stock"])


@router.get("/ohlcv", response_model=OHLCVResponse)
async def get_ohlcv(
    ticker: str = Query(..., description="종목 코드 (예: 005930)", min_length=6, max_length=6),
    start: str = Query(..., description="시작일 (yyyymmdd)", min_length=8, max_length=8),
    end: str = Query(..., description="종료일 (yyyymmdd)", min_length=8, max_length=8),
):
    """종목 일봉 OHLCV 데이터를 조회한다."""
    try:
        data = stock_data_service.get_ohlcv(ticker, start, end)
        return OHLCVResponse(ticker=ticker, data=data, count=len(data))
    except Exception as e:
        logger.error(f"OHLCV 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"OHLCV 조회 실패: {str(e)}")


@router.get("/market", response_model=MarketOHLCVResponse)
async def get_market_ohlcv(
    date: str = Query(..., description="조회 날짜 (yyyymmdd)", min_length=8, max_length=8),
    market: str = Query("KOSPI", description="시장 구분 (KOSPI/KOSDAQ)"),
):
    """특정 날짜의 전체 시장 시세를 조회한다."""
    if market not in ("KOSPI", "KOSDAQ"):
        raise HTTPException(status_code=400, detail="market은 KOSPI 또는 KOSDAQ만 허용됩니다.")
    try:
        data = stock_data_service.get_market_ohlcv(date, market=market)
        return MarketOHLCVResponse(date=date, market=market, data=data, count=len(data))
    except Exception as e:
        logger.error(f"시장 시세 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"시장 시세 조회 실패: {str(e)}")


@router.get("/list", response_model=StockListResponse)
async def get_stock_list(
    market: str = Query("ALL", description="시장 구분 (KOSPI/KOSDAQ/ALL)"),
    date: str | None = Query(None, description="기준일 (yyyymmdd). 미지정 시 오늘."),
):
    """종목 코드 및 이름 리스트를 조회한다."""
    if market not in ("KOSPI", "KOSDAQ", "ALL"):
        raise HTTPException(status_code=400, detail="market은 KOSPI, KOSDAQ, ALL만 허용됩니다.")
    try:
        data = stock_data_service.get_stock_list(market=market, date=date)
        return StockListResponse(data=data, count=len(data))
    except Exception as e:
        logger.error(f"종목 리스트 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"종목 리스트 조회 실패: {str(e)}")


@router.get("/index", response_model=MarketIndexResponse)
async def get_market_index(
    date: str = Query(..., description="조회 날짜 (yyyymmdd)", min_length=8, max_length=8),
):
    """코스피/코스닥 시장 지수를 조회한다."""
    try:
        data = stock_data_service.get_market_index(date)
        return MarketIndexResponse(date=date, data=data)
    except Exception as e:
        logger.error(f"시장 지수 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"시장 지수 조회 실패: {str(e)}")
