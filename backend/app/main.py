"""FastAPI entry point for AI Airport Operations & Gate Allocation Simulator."""
import logging
from typing import Any, Dict
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.core.config import settings
from app.schemas.health import HealthResponse, RootResponse

# Setup standard logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ai_airport")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend REST API and CSP Simulation Engine for Airport Operations & Gate Allocation",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Standard Error Handling Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Format HTTP exceptions into consistent JSON envelopes."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Format request validation errors cleanly into JSON-serializable payloads."""
    safe_errors = [
        {
            "loc": [str(l) for l in err.get("loc", [])],
            "msg": str(err.get("msg", "")),
            "type": str(err.get("type", "")),
        }
        for err in exc.errors()
    ]
    first_err = safe_errors[0] if safe_errors else {}
    msg = first_err.get("msg", "Validation error")
    loc = " -> ".join(first_err.get("loc", []))
    detail = f"{loc}: {msg}" if loc else msg
    return JSONResponse(
        status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
        content={"detail": detail, "errors": safe_errors},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all unhandled exception handler that hides raw stack traces from clients."""
    logger.error("Unhandled exception processing %s %s: %s", request.method, request.url.path, str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred"},
    )


# Root and Baseline Health Endpoints
@app.get("/", response_model=RootResponse, tags=["General"])
async def root() -> RootResponse:
    """Root entry point providing service identification."""
    return RootResponse(
        message="AI Airport Operations & Gate Allocation Simulator API",
        version=settings.VERSION,
        status="running",
    )


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """Basic health check endpoint for monitoring."""
    return HealthResponse(
        status="ok",
        service="ai-airport-backend",
        environment=settings.ENVIRONMENT,
    )


# Mount Versioned API Routes
app.include_router(api_router)
