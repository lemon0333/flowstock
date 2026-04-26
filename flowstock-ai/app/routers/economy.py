"""경제 대시보드 라우터.

맨큐 거시/미시 관점의 시장 지표를 한 번에 응답한다.
- 매매주체별 동향(개인/외국인/기관)
- 상승/하락 종목 수 (시장 폭)
- 52주 고저 대비 현재가
- KOSPI/KOSDAQ 일별 시계열
"""

import logging

from fastapi import APIRouter, HTTPException

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
