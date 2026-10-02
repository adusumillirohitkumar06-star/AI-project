"""Aircraft management endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.aircraft import AircraftCategory
from app.schemas.aircraft import AircraftCreate, AircraftRead, AircraftUpdate
from app.schemas.common import PaginatedResponse
from app.services import aircraft_service

router = APIRouter(prefix="/aircraft", tags=["Aircraft"])


@router.get("", response_model=PaginatedResponse[AircraftRead], summary="List aircraft")
def list_aircraft(
    airline: Optional[str] = Query(default=None, description="Filter by airline name"),
    category: Optional[AircraftCategory] = Query(default=None, description="Filter by size category"),
    is_active: Optional[bool] = Query(default=None, description="Filter by active status"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[AircraftRead]:
    """Retrieve paginated list of aircraft."""
    items, total, total_pages = aircraft_service.list_aircraft(
        db, airline=airline, category=category, is_active=is_active, page=page, page_size=page_size
    )
    return PaginatedResponse[AircraftRead](
        items=[AircraftRead.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/{aircraft_id}", response_model=AircraftRead, summary="Get aircraft by ID")
def get_aircraft(aircraft_id: int, db: Session = Depends(get_db)) -> AircraftRead:
    """Retrieve an aircraft by ID."""
    aircraft = aircraft_service.get_aircraft(db, aircraft_id)
    if not aircraft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aircraft with ID {aircraft_id} not found",
        )
    return AircraftRead.model_validate(aircraft)


@router.post("", response_model=AircraftRead, status_code=status.HTTP_201_CREATED, summary="Create aircraft")
def create_aircraft(data: AircraftCreate, db: Session = Depends(get_db)) -> AircraftRead:
    """Create a new aircraft."""
    aircraft = aircraft_service.create_aircraft(db, data)
    return AircraftRead.model_validate(aircraft)


@router.put("/{aircraft_id}", response_model=AircraftRead, summary="Update aircraft")
@router.patch("/{aircraft_id}", response_model=AircraftRead, summary="Patch aircraft")
def update_aircraft(aircraft_id: int, data: AircraftUpdate, db: Session = Depends(get_db)) -> AircraftRead:
    """Update an existing aircraft."""
    aircraft = aircraft_service.update_aircraft(db, aircraft_id, data)
    return AircraftRead.model_validate(aircraft)


@router.delete("/{aircraft_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete aircraft")
def delete_aircraft(aircraft_id: int, db: Session = Depends(get_db)) -> None:
    """Delete an aircraft by ID."""
    aircraft_service.delete_aircraft(db, aircraft_id)
