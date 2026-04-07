from fastapi import APIRouter, HTTPException

from app.agents.news_analyzer import analyze_news
from app.models.schemas import NewsAnalysisRequest, NewsAnalysisResponse

router = APIRouter(prefix="/api/ai/news", tags=["news"])


@router.post("/analyze", response_model=NewsAnalysisResponse)
async def analyze_news_endpoint(request: NewsAnalysisRequest):
    """Analyze a news article for sentiment, importance, and related stocks."""
    try:
        return await analyze_news(title=request.title, content=request.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"News analysis failed: {str(e)}")
