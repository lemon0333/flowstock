from fastapi import APIRouter, HTTPException

from app.agents.graph_agent import generate_graph
from app.models.schemas import GraphGenerateRequest, GraphGenerateResponse

router = APIRouter(prefix="/api/ai/graph", tags=["graph"])


@router.post("/generate", response_model=GraphGenerateResponse)
async def generate_graph_endpoint(request: GraphGenerateRequest):
    """Generate a news-stock network graph from a news article."""
    try:
        return await generate_graph(request=request)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Graph generation failed: {str(e)}"
        )
