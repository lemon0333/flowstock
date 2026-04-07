import logging

from fastapi import FastAPI

from app.config import settings
from app.routers import chart, graph, news

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="FlowStock AI Service",
    version="1.0.0",
    description="AI-powered news analysis, chart analysis, and graph generation for FlowStock",
)

app.include_router(news.router)
app.include_router(chart.router)
app.include_router(graph.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
