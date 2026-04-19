import json
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.graph_agent import generate_graph
from app.database import get_db
from app.models.entities import AnalysisRequestLog, GraphGenerationLog
from app.models.schemas import GraphGenerateRequest, GraphGenerateResponse

router = APIRouter(prefix="/api/ai/graph", tags=["graph"])


@router.post("/generate", response_model=GraphGenerateResponse)
async def generate_graph_endpoint(
    request: GraphGenerateRequest, db: Session = Depends(get_db)
):
    """Generate a news-stock network graph from a news article."""
    start = time.time()
    try:
        result = await generate_graph(request=request)
        duration_ms = int((time.time() - start) * 1000)

        # 그래프 생성 결과 저장
        log = GraphGenerationLog(
            news_title=request.news_title,
            node_count=len(result.nodes),
            edge_count=len(result.edges),
            graph_data_json=json.dumps(result.model_dump(), ensure_ascii=False),
        )
        db.add(log)

        # 요청 이력 저장
        req_log = AnalysisRequestLog(
            endpoint="/api/ai/graph/generate",
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
            endpoint="/api/ai/graph/generate",
            request_body=request.model_dump_json(),
            status="FAILED",
            error_message=str(e),
            duration_ms=duration_ms,
        )
        db.add(req_log)
        db.commit()
        raise HTTPException(
            status_code=500, detail=f"Graph generation failed: {str(e)}"
        )
