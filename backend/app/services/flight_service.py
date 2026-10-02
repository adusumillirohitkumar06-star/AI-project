"""Flight service handling CRUD, foreign-key validations, and search filtering."""
from datetime import date, datetime
import math
from typing import List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.aircraft import Aircraft
from app.models.airport import Airport
from app.models.flight import Flight, FlightPriority, FlightStatus, FlightType
from app.schemas.flight import FlightCreate, FlightUpdate


def get_flight(db: Session, flight_id: int) -> Optional[Flight]:
    """Retrieve flight by ID."""
    return db.get(Flight, flight_id)


def list_flights(
    db: Session,
    airport_id: Optional[int] = None,
    origin_airport_id: Optional[int] = None,
    destination_airport_id: Optional[int] = None,
    status_filter: Optional[FlightStatus] = None,
    priority: Optional[FlightPriority] = None,
    flight_type: Optional[FlightType] = None,
    airline: Optional[str] = None,
    flight_number: Optional[str] = None,
    filter_date: Optional[date] = None,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[Flight], int, int]:
    """List flights with optional operational filters and pagination."""
    query = select(Flight)

    if airport_id is not None:
        query = query.where(
            or_(
                Flight.origin_airport_id == airport_id,
                Flight.destination_airport_id == airport_id,
            )
        )
    if origin_airport_id is not None:
        query = query.where(Flight.origin_airport_id == origin_airport_id)
    if destination_airport_id is not None:
        query = query.where(Flight.destination_airport_id == destination_airport_id)
    if status_filter is not None:
        query = query.where(Flight.status == status_filter)
    if priority is not None:
        query = query.where(Flight.priority == priority)
    if flight_type is not None:
        query = query.where(Flight.flight_type == flight_type)
    if airline is not None:
        query = query.where(Flight.airline.ilike(f"%{airline}%"))
    if flight_number is not None:
        query = query.where(Flight.flight_number.ilike(f"%{flight_number}%"))
    if filter_date is not None:
        # Match either arrival or departure on filter_date
        start_of_day = datetime.combine(filter_date, datetime.min.time())
        end_of_day = datetime.combine(filter_date, datetime.max.time())
        query = query.where(
            or_(
                Flight.scheduled_arrival.between(start_of_day, end_of_day),
                Flight.scheduled_departure.between(start_of_day, end_of_day),
            )
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    offset = (page - 1) * page_size
    items = list(db.scalars(query.order_by(Flight.scheduled_arrival).offset(offset).limit(page_size)).all())

    return items, total, total_pages


def create_flight(db: Session, data: FlightCreate) -> Flight:
    """Create a new flight with complete referential and schedule validation."""
    # 1. Validate Origin Airport
    origin = db.get(Airport, data.origin_airport_id)
    if not origin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Origin airport with ID {data.origin_airport_id} does not exist",
        )

    # 2. Validate Destination Airport
    dest = db.get(Airport, data.destination_airport_id)
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination airport with ID {data.destination_airport_id} does not exist",
        )

    # 3. Validate Distinct Origin and Destination
    if data.origin_airport_id == data.destination_airport_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Origin and destination airport cannot be identical",
        )

    # 4. Validate Aircraft if specified
    if data.aircraft_id is not None:
        aircraft = db.get(Aircraft, data.aircraft_id)
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft with ID {data.aircraft_id} does not exist",
            )

    # 5. Validate Schedule Times
    if data.scheduled_departure < data.scheduled_arrival:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scheduled_departure cannot be earlier than scheduled_arrival",
        )

    flight = Flight(
        flight_number=data.flight_number.upper(),
        airline=data.airline,
        origin_airport_id=data.origin_airport_id,
        destination_airport_id=data.destination_airport_id,
        aircraft_id=data.aircraft_id,
        scheduled_arrival=data.scheduled_arrival,
        scheduled_departure=data.scheduled_departure,
        actual_arrival=data.actual_arrival,
        actual_departure=data.actual_departure,
        flight_type=data.flight_type,
        passenger_count=data.passenger_count,
        priority=data.priority,
        turnaround_duration_minutes=data.turnaround_duration_minutes,
        delay_duration_minutes=data.delay_duration_minutes,
        status=data.status,
    )
    db.add(flight)
    db.commit()
    db.refresh(flight)
    return flight


def update_flight(db: Session, flight_id: int, data: FlightUpdate) -> Flight:
    """Update a flight with referential and timing validation."""
    flight = get_flight(db, flight_id)
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found",
        )

    update_dict = data.model_dump(exclude_unset=True)

    # Check origin airport if updated
    if "origin_airport_id" in update_dict:
        origin = db.get(Airport, update_dict["origin_airport_id"])
        if not origin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Origin airport with ID {update_dict['origin_airport_id']} does not exist",
            )

    # Check destination airport if updated
    if "destination_airport_id" in update_dict:
        dest = db.get(Airport, update_dict["destination_airport_id"])
        if not dest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Destination airport with ID {update_dict['destination_airport_id']} does not exist",
            )

    # Check aircraft if updated
    if "aircraft_id" in update_dict and update_dict["aircraft_id"] is not None:
        aircraft = db.get(Aircraft, update_dict["aircraft_id"])
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft with ID {update_dict['aircraft_id']} does not exist",
            )

    # Check timing
    new_arr = update_dict.get("scheduled_arrival", flight.scheduled_arrival)
    new_dep = update_dict.get("scheduled_departure", flight.scheduled_departure)
    if new_dep < new_arr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scheduled_departure cannot be earlier than scheduled_arrival",
        )

    # Check distinct route
    new_origin = update_dict.get("origin_airport_id", flight.origin_airport_id)
    new_dest = update_dict.get("destination_airport_id", flight.destination_airport_id)
    if new_origin == new_dest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Origin and destination airport cannot be identical",
        )

    if "flight_number" in update_dict:
        update_dict["flight_number"] = update_dict["flight_number"].upper()

    for field, value in update_dict.items():
        setattr(flight, field, value)

    db.commit()
    db.refresh(flight)
    return flight


def delete_flight(db: Session, flight_id: int) -> bool:
    """Delete a flight by ID."""
    flight = get_flight(db, flight_id)
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found",
        )

    db.delete(flight)
    db.commit()
    return True
