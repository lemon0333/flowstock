import json
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.chart_agent import analyze_chart
from app.database import get_db
from app.models.entities import AnalysisRequestLog, ChartAnalysisLog
from app.models.schemas import ChartAnalysisRequest, ChartAnalysisResponse

router = APIRouter(prefix="/api/ai/chart", tags=["chart"])


@router.post("/analyze", response_model=ChartAnalysisResponse)
async def analyze_chart_endpoint(
    request: ChartAnalysisRequest, db: Session = Depends(get_db)
):
    """Analyze stock OHLCV data for technical patterns and trends."""
    start = time.time()
    try:
        result = await analyze_chart(request=request)
        duration_ms = int((time.time() - start) * 1000)

        # 차트 분석 결과 저장
        log = ChartAnalysisLog(
            stock_code=request.stock_code,
            stock_name=request.stock_name,
            trend=result.trend,
            analysis=result.analysis,
            support_level=result.support_level,
            resistance_level=result.resistance_level,
            key_patterns_json=json.dumps(result.key_patterns, ensure_ascii=False),
        )
        db.add(log)

        # 요청 이력 저장
        req_log = AnalysisRequestLog(
            endpoint="/api/ai/chart/analyze",
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
            endpoint="/api/ai/chart/analyze",
            request_body=request.model_dump_json(),
            status="FAILED",
            error_message=str(e),
            duration_ms=duration_ms,
        )
        db.add(req_log)
        db.commit()
        raise HTTPException(
            status_code=500, detail=f"Chart analysis failed: {str(e)}"
        )
