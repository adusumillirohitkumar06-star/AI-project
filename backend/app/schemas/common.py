"""Common schemas including pagination and standard API responses."""
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated envelope for list endpoints."""
    items: List[T]
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, le=100, description="Items per page")
    total: int = Field(ge=0, description="Total matching items")
    total_pages: int = Field(ge=0, description="Total pages available")


class ErrorResponse(BaseModel):
    """Standardized error envelope."""
    detail: str
    code: Optional[str] = None
