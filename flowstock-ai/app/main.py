import logging

from fastapi import FastAPI

from app.config import settings
from app.database import Base, engine
from app.routers import chart, graph, news

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="FlowStock AI Service",
    version="1.0.0",
    description="AI-powered news analysis, chart analysis, and graph generation for FlowStock",
)

app.include_router(news.router)
app.include_router(chart.router)
app.include_router(graph.router)


@app.on_event("startup")
async def startup():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("MySQL tables created/verified successfully")
    except Exception as e:
        logger.warning(f"MySQL connection failed: {e} — running without DB logging")


@app.get("/health")
async def health():
    db_status = "unknown"
    try:
        from sqlalchemy import text

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {"status": "ok", "database": db_status}
