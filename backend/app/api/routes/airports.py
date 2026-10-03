"""Airport management endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.schemas.airport import AirportCreate, AirportRead, AirportUpdate
from app.schemas.common import PaginatedResponse
from app.services import airport_service

router = APIRouter(prefix="/airports", tags=["Airports"])


@router.get("", response_model=PaginatedResponse[AirportRead], summary="List airports")
def list_airports(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    is_active: Optional[bool] = Query(default=None, description="Filter by active status"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[AirportRead]:
    """Retrieve paginated list of airports."""
    items, total, total_pages = airport_service.list_airports(
        db, page=page, page_size=page_size, is_active=is_active
    )
    return PaginatedResponse[AirportRead](
        items=[AirportRead.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/{airport_id}", response_model=AirportRead, summary="Get airport by ID")
def get_airport(airport_id: int, db: Session = Depends(get_db)) -> AirportRead:
    """Retrieve an airport by ID."""
    airport = airport_service.get_airport(db, airport_id)
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airport with ID {airport_id} not found",
        )
    return AirportRead.model_validate(airport)


@router.post("", response_model=AirportRead, status_code=status.HTTP_201_CREATED, summary="Create airport")
def create_airport(
    data: AirportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> AirportRead:
    """Create a new airport."""
    airport = airport_service.create_airport(db, data)
    return AirportRead.model_validate(airport)


@router.put("/{airport_id}", response_model=AirportRead, summary="Update airport")
@router.patch("/{airport_id}", response_model=AirportRead, summary="Patch airport")
def update_airport(
    airport_id: int,
    data: AirportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> AirportRead:
    """Update an existing airport."""
    airport = airport_service.update_airport(db, airport_id, data)
    return AirportRead.model_validate(airport)


@router.delete("/{airport_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete airport")
def delete_airport(
    airport_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> None:
    """Delete an airport by ID."""
    airport_service.delete_airport(db, airport_id)
