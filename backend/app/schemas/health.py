"""Health check and root response schemas."""
from typing import Dict, Optional
from pydantic import BaseModel


class RootResponse(BaseModel):
    message: str
    version: str
    status: str


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str


class DetailedHealthResponse(BaseModel):
    """Detailed health check for API v1 reporting database status."""
    status: str
    service: str
    environment: str
    version: str
    database: Dict[str, str]
