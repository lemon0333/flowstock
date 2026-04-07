from fastapi import APIRouter, HTTPException

from app.agents.chart_agent import analyze_chart
from app.models.schemas import ChartAnalysisRequest, ChartAnalysisResponse

router = APIRouter(prefix="/api/ai/chart", tags=["chart"])


@router.post("/analyze", response_model=ChartAnalysisResponse)
async def analyze_chart_endpoint(request: ChartAnalysisRequest):
    """Analyze stock OHLCV data for technical patterns and trends."""
    try:
        return await analyze_chart(request=request)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Chart analysis failed: {str(e)}"
        )
