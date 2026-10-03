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

from contextlib import asynccontextmanager
from app.core.database import Base, engine
from app.core.init_db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed data if not running tests
    if settings.ENVIRONMENT != "testing":
        try:
            Base.metadata.create_all(bind=engine)
            init_db()
        except Exception as e:
            logger.warning("Lifespan database initialization warning: %s", str(e))
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend REST API and CSP Simulation Engine for Airport Operations & Gate Allocation",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_and_performance_headers(request: Request, call_next):
    """Enforce production security headers and request performance telemetry."""
    import time
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time_ms = (time.perf_counter() - start_time) * 1000.0
    
    # Performance telemetry
    response.headers["X-Process-Time-Ms"] = f"{process_time_ms:.2f}"
    
    # Production security headers
    if settings.ENABLE_SECURITY_HEADERS:
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    return response


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
