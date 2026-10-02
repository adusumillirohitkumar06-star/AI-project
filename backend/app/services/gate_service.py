"""Gate service handling CRUD and business logic."""
import math
from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.gate import Gate
from app.models.terminal import Terminal
from app.schemas.gate import GateCreate, GateUpdate


def get_gate(db: Session, gate_id: int) -> Optional[Gate]:
    """Retrieve gate by ID."""
    return db.get(Gate, gate_id)


def list_gates(
    db: Session,
    terminal_id: Optional[int] = None,
    airport_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    is_closed: Optional[bool] = None,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[Gate], int, int]:
    """List gates with optional filters."""
    query = select(Gate)
    if terminal_id is not None:
        query = query.where(Gate.terminal_id == terminal_id)
    if airport_id is not None:
        query = query.join(Terminal, Gate.terminal_id == Terminal.id).where(Terminal.airport_id == airport_id)
    if is_active is not None:
        query = query.where(Gate.is_active == is_active)
    if is_closed is not None:
        query = query.where(Gate.is_closed == is_closed)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    offset = (page - 1) * page_size
    items = list(db.scalars(query.order_by(Gate.gate_code).offset(offset).limit(page_size)).all())

    return items, total, total_pages


def create_gate(db: Session, data: GateCreate) -> Gate:
    """Create a gate ensuring valid parent terminal and unique gate_code per terminal."""
    terminal = db.get(Terminal, data.terminal_id)
    if not terminal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent terminal with ID {data.terminal_id} does not exist",
        )

    code = data.gate_code.upper()
    existing = db.scalar(
        select(Gate).where(
            Gate.terminal_id == data.terminal_id,
            Gate.gate_code == code,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Gate code '{code}' already exists in terminal ID {data.terminal_id}",
        )

    gate = Gate(
        terminal_id=data.terminal_id,
        gate_code=code,
        gate_type=data.gate_type,
        capability=data.capability,
        supported_aircraft_types=data.supported_aircraft_types,
        max_aircraft_size=data.max_aircraft_size,
        is_active=data.is_active,
        is_closed=data.is_closed,
        closure_reason=data.closure_reason,
    )
    db.add(gate)
    db.commit()
    db.refresh(gate)
    return gate


def update_gate(db: Session, gate_id: int, data: GateUpdate) -> Gate:
    """Update gate details."""
    gate = get_gate(db, gate_id)
    if not gate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gate with ID {gate_id} not found",
        )

    update_dict = data.model_dump(exclude_unset=True)
    if "gate_code" in update_dict:
        new_code = update_dict["gate_code"].upper()
        update_dict["gate_code"] = new_code
        existing = db.scalar(
            select(Gate).where(
                Gate.terminal_id == gate.terminal_id,
                Gate.gate_code == new_code,
                Gate.id != gate_id,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Gate code '{new_code}' already exists in terminal ID {gate.terminal_id}",
            )

    for field, value in update_dict.items():
        setattr(gate, field, value)

    db.commit()
    db.refresh(gate)
    return gate


def delete_gate(db: Session, gate_id: int) -> bool:
    """Delete a gate by ID."""
    gate = get_gate(db, gate_id)
    if not gate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gate with ID {gate_id} not found",
        )

    db.delete(gate)
    db.commit()
    return True
