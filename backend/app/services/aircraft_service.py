"""Aircraft service handling CRUD and business logic."""
import math
from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.aircraft import Aircraft, AircraftCategory
from app.schemas.aircraft import AircraftCreate, AircraftUpdate


def get_aircraft(db: Session, aircraft_id: int) -> Optional[Aircraft]:
    """Retrieve aircraft by ID."""
    return db.get(Aircraft, aircraft_id)


def list_aircraft(
    db: Session,
    airline: Optional[str] = None,
    category: Optional[AircraftCategory] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[Aircraft], int, int]:
    """List aircraft with optional filters."""
    query = select(Aircraft)
    if airline is not None:
        query = query.where(Aircraft.airline.ilike(f"%{airline}%"))
    if category is not None:
        query = query.where(Aircraft.category == category)
    if is_active is not None:
        query = query.where(Aircraft.is_active == is_active)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    offset = (page - 1) * page_size
    items = list(db.scalars(query.order_by(Aircraft.registration).offset(offset).limit(page_size)).all())

    return items, total, total_pages


def create_aircraft(db: Session, data: AircraftCreate) -> Aircraft:
    """Create aircraft ensuring unique tail number registration."""
    reg = data.registration.upper()
    existing = db.scalar(select(Aircraft).where(Aircraft.registration == reg))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Aircraft with registration '{reg}' already exists",
        )

    aircraft = Aircraft(
        registration=reg,
        model=data.model,
        aircraft_type=data.aircraft_type.upper(),
        airline=data.airline,
        capacity=data.capacity,
        category=data.category,
        is_active=data.is_active,
    )
    db.add(aircraft)
    db.commit()
    db.refresh(aircraft)
    return aircraft


def update_aircraft(db: Session, aircraft_id: int, data: AircraftUpdate) -> Aircraft:
    """Update aircraft details."""
    aircraft = get_aircraft(db, aircraft_id)
    if not aircraft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aircraft with ID {aircraft_id} not found",
        )

    update_dict = data.model_dump(exclude_unset=True)
    if "registration" in update_dict:
        new_reg = update_dict["registration"].upper()
        update_dict["registration"] = new_reg
        existing = db.scalar(
            select(Aircraft).where(
                Aircraft.registration == new_reg,
                Aircraft.id != aircraft_id,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Aircraft with registration '{new_reg}' already exists",
            )
    if "aircraft_type" in update_dict:
        update_dict["aircraft_type"] = update_dict["aircraft_type"].upper()

    for field, value in update_dict.items():
        setattr(aircraft, field, value)

    db.commit()
    db.refresh(aircraft)
    return aircraft


def delete_aircraft(db: Session, aircraft_id: int) -> bool:
    """Delete aircraft by ID."""
    aircraft = get_aircraft(db, aircraft_id)
    if not aircraft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aircraft with ID {aircraft_id} not found",
        )

    db.delete(aircraft)
    db.commit()
    return True
