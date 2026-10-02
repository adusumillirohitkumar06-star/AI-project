"""API v1 Health check route."""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.health import DetailedHealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=DetailedHealthResponse, summary="Detailed API v1 Health Check")
def get_v1_health(db: Session = Depends(get_db)) -> DetailedHealthResponse:
    """Inspect application and database connectivity status."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"disconnected ({type(e).__name__})"

    return DetailedHealthResponse(
        status="ok",
        service="ai-airport-api-v1",
        environment=settings.ENVIRONMENT,
        version=settings.VERSION,
        database={
            "status": db_status,
            "engine": "PostgreSQL" if "postgresql" in settings.DATABASE_URL else "SQLite",
        },
    )
