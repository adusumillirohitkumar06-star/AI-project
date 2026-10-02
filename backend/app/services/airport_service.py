"""Airport service handling CRUD and business logic."""
import math
from typing import List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.airport import Airport
from app.schemas.airport import AirportCreate, AirportUpdate


def get_airport(db: Session, airport_id: int) -> Optional[Airport]:
    """Retrieve an airport by its primary key ID."""
    return db.get(Airport, airport_id)


def get_airport_by_codes(db: Session, iata_code: str, icao_code: str, exclude_id: Optional[int] = None) -> Optional[Airport]:
    """Check for existing airport matching IATA or ICAO code."""
    query = select(Airport).where(
        or_(
            Airport.iata_code == iata_code.upper(),
            Airport.icao_code == icao_code.upper(),
        )
    )
    if exclude_id is not None:
        query = query.where(Airport.id != exclude_id)
    return db.scalar(query)


def list_airports(
    db: Session,
    page: int = 1,
    page_size: int = 50,
    is_active: Optional[bool] = None,
) -> Tuple[List[Airport], int, int]:
    """List airports with pagination."""
    query = select(Airport)
    if is_active is not None:
        query = query.where(Airport.is_active == is_active)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    offset = (page - 1) * page_size
    items = list(db.scalars(query.order_by(Airport.iata_code).offset(offset).limit(page_size)).all())

    return items, total, total_pages


def create_airport(db: Session, data: AirportCreate) -> Airport:
    """Create a new airport ensuring unique IATA and ICAO codes."""
    iata = data.iata_code.upper()
    icao = data.icao_code.upper()

    existing = get_airport_by_codes(db, iata, icao)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Airport with IATA code '{iata}' or ICAO code '{icao}' already exists",
        )

    airport = Airport(
        iata_code=iata,
        icao_code=icao,
        name=data.name,
        city=data.city,
        country=data.country,
        latitude=data.latitude,
        longitude=data.longitude,
        timezone=data.timezone,
        is_active=data.is_active,
    )
    db.add(airport)
    db.commit()
    db.refresh(airport)
    return airport


def update_airport(db: Session, airport_id: int, data: AirportUpdate) -> Airport:
    """Update an airport, verifying code uniqueness if updated."""
    airport = get_airport(db, airport_id)
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airport with ID {airport_id} not found",
        )

    update_dict = data.model_dump(exclude_unset=True)

    if "iata_code" in update_dict:
        update_dict["iata_code"] = update_dict["iata_code"].upper()
    if "icao_code" in update_dict:
        update_dict["icao_code"] = update_dict["icao_code"].upper()

    new_iata = update_dict.get("iata_code", airport.iata_code)
    new_icao = update_dict.get("icao_code", airport.icao_code)

    if "iata_code" in update_dict or "icao_code" in update_dict:
        existing = get_airport_by_codes(db, new_iata, new_icao, exclude_id=airport_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Airport with IATA code '{new_iata}' or ICAO code '{new_icao}' already exists",
            )

    for field, value in update_dict.items():
        setattr(airport, field, value)

    db.commit()
    db.refresh(airport)
    return airport


def delete_airport(db: Session, airport_id: int) -> bool:
    """Delete an airport by ID."""
    airport = get_airport(db, airport_id)
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airport with ID {airport_id} not found",
        )

    db.delete(airport)
    db.commit()
    return True
