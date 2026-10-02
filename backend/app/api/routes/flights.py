"""Flight management endpoints."""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.flight import FlightPriority, FlightStatus, FlightType
from app.schemas.common import PaginatedResponse
from app.schemas.delay import FlightDelayRequest, FlightDelayResponse
from app.schemas.flight import FlightCreate, FlightRead, FlightUpdate
from app.services import delay_service, flight_service

router = APIRouter(prefix="/flights", tags=["Flights"])


@router.get("", response_model=PaginatedResponse[FlightRead], summary="List flights")
def list_flights(
    airport_id: Optional[int] = Query(default=None, description="Match either origin or destination airport"),
    origin_airport_id: Optional[int] = Query(default=None, description="Filter by origin airport ID"),
    destination_airport_id: Optional[int] = Query(default=None, description="Filter by destination airport ID"),
    status: Optional[FlightStatus] = Query(default=None, description="Filter by flight status"),
    priority: Optional[FlightPriority] = Query(default=None, description="Filter by priority level"),
    flight_type: Optional[FlightType] = Query(default=None, description="Filter by flight type"),
    airline: Optional[str] = Query(default=None, description="Filter by airline name"),
    flight_number: Optional[str] = Query(default=None, description="Filter by flight number code"),
    filter_date: Optional[date] = Query(default=None, description="Filter by schedule date (YYYY-MM-DD)"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[FlightRead]:
    """Retrieve paginated list of flights with operational filters."""
    items, total, total_pages = flight_service.list_flights(
        db,
        airport_id=airport_id,
        origin_airport_id=origin_airport_id,
        destination_airport_id=destination_airport_id,
        status_filter=status,
        priority=priority,
        flight_type=flight_type,
        airline=airline,
        flight_number=flight_number,
        filter_date=filter_date,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse[FlightRead](
        items=[FlightRead.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/{flight_id}", response_model=FlightRead, summary="Get flight by ID")
def get_flight(flight_id: int, db: Session = Depends(get_db)) -> FlightRead:
    """Retrieve a flight by ID."""
    flight = flight_service.get_flight(db, flight_id)
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found",
        )
    return FlightRead.model_validate(flight)


@router.post("", response_model=FlightRead, status_code=status.HTTP_201_CREATED, summary="Create flight")
def create_flight(data: FlightCreate, db: Session = Depends(get_db)) -> FlightRead:
    """Create a new flight with schedule and airport verification."""
    flight = flight_service.create_flight(db, data)
    return FlightRead.model_validate(flight)


@router.put("/{flight_id}", response_model=FlightRead, summary="Update flight")
@router.patch("/{flight_id}", response_model=FlightRead, summary="Patch flight")
def update_flight(flight_id: int, data: FlightUpdate, db: Session = Depends(get_db)) -> FlightRead:
    """Update an existing flight."""
    flight = flight_service.update_flight(db, flight_id, data)
    return FlightRead.model_validate(flight)


@router.delete("/{flight_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete flight")
def delete_flight(flight_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a flight by ID."""
    flight_service.delete_flight(db, flight_id)


@router.post(
    "/{flight_id}/delay",
    response_model=FlightDelayResponse,
    summary="Apply operational delay and dynamically evaluate/reschedule gate allocation",
)
def apply_flight_delay(
    flight_id: int,
    request: FlightDelayRequest,
    db: Session = Depends(get_db),
) -> FlightDelayResponse:
    """Apply an operational delay, detect gate collisions, and trigger CSP rescheduling if necessary."""
    return delay_service.apply_flight_delay(db, flight_id, request)
