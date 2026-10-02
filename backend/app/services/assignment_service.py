"""Gate assignment service handling listing, filtering, and assignment queries."""
from datetime import datetime
import math
from typing import List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.assignment import AssignmentStatus, GateAssignment
from app.models.flight import Flight
from app.models.gate import Gate
from app.models.terminal import Terminal
from app.schemas.assignment import GateAssignmentCreate, GateAssignmentUpdate


def get_assignment(db: Session, assignment_id: int) -> Optional[GateAssignment]:
    """Retrieve gate assignment by ID with joined flight and gate data."""
    return db.scalar(
        select(GateAssignment)
        .where(GateAssignment.id == assignment_id)
        .options(
            joinedload(GateAssignment.flight),
            joinedload(GateAssignment.gate).joinedload(Gate.terminal),
        )
    )



def list_assignments(
    db: Session,
    flight_id: Optional[int] = None,
    gate_id: Optional[int] = None,
    airport_id: Optional[int] = None,
    status_filter: Optional[AssignmentStatus] = None,
    solver_run_id: Optional[int] = None,
    start_time_after: Optional[datetime] = None,
    end_time_before: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[GateAssignment], int, int]:
    """List gate assignments with filters and pagination."""
    query = select(GateAssignment).options(
        joinedload(GateAssignment.flight),
        joinedload(GateAssignment.gate).joinedload(Gate.terminal),
    )

    if flight_id is not None:
        query = query.where(GateAssignment.flight_id == flight_id)
    if gate_id is not None:
        query = query.where(GateAssignment.gate_id == gate_id)
    if airport_id is not None:
        query = query.join(Gate, GateAssignment.gate_id == Gate.id).join(
            Terminal, Gate.terminal_id == Terminal.id
        ).where(Terminal.airport_id == airport_id)
    if status_filter is not None:
        query = query.where(GateAssignment.status == status_filter)
    if solver_run_id is not None:
        query = query.where(GateAssignment.solver_run_id == solver_run_id)
    if start_time_after is not None:
        query = query.where(GateAssignment.assignment_start_time >= start_time_after)
    if end_time_before is not None:
        query = query.where(GateAssignment.assignment_end_time <= end_time_before)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    offset = (page - 1) * page_size
    items = list(db.scalars(query.order_by(GateAssignment.assignment_start_time).offset(offset).limit(page_size)).all())

    return items, total, total_pages


def create_assignment(db: Session, data: GateAssignmentCreate) -> GateAssignment:
    """Create manual gate assignment with collision checking."""
    flight = db.get(Flight, data.flight_id)
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {data.flight_id} not found",
        )

    gate = db.get(Gate, data.gate_id)
    if not gate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gate with ID {data.gate_id} not found",
        )

    if data.assignment_end_time <= data.assignment_start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="assignment_end_time must be strictly after assignment_start_time",
        )

    # Collision check
    collision = db.scalar(
        select(GateAssignment).where(
            GateAssignment.gate_id == data.gate_id,
            GateAssignment.status != AssignmentStatus.REVOKED,
            GateAssignment.assignment_start_time < data.assignment_end_time,
            GateAssignment.assignment_end_time > data.assignment_start_time,
        )
    )
    if collision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Gate {gate.gate_code} is already assigned to flight ID {collision.flight_id} during this interval",
        )

    assignment = GateAssignment(
        flight_id=data.flight_id,
        gate_id=data.gate_id,
        solver_run_id=data.solver_run_id,
        assignment_start_time=data.assignment_start_time,
        assignment_end_time=data.assignment_end_time,
        status=data.status,
        source=data.source,
        reason=data.reason,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def update_assignment(db: Session, assignment_id: int, data: GateAssignmentUpdate) -> GateAssignment:
    """Update an assignment with collision validation."""
    assignment = get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with ID {assignment_id} not found",
        )

    update_dict = data.model_dump(exclude_unset=True)

    new_gate_id = update_dict.get("gate_id", assignment.gate_id)
    new_start = update_dict.get("assignment_start_time", assignment.assignment_start_time)
    new_end = update_dict.get("assignment_end_time", assignment.assignment_end_time)

    if new_end <= new_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="assignment_end_time must be strictly after assignment_start_time",
        )

    # Check collision if gate or times changed
    collision = db.scalar(
        select(GateAssignment).where(
            GateAssignment.id != assignment_id,
            GateAssignment.gate_id == new_gate_id,
            GateAssignment.status != AssignmentStatus.REVOKED,
            GateAssignment.assignment_start_time < new_end,
            GateAssignment.assignment_end_time > new_start,
        )
    )
    if collision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Gate {new_gate_id} has overlapping assignment during this time interval",
        )

    for field, value in update_dict.items():
        setattr(assignment, field, value)

    db.commit()
    db.refresh(assignment)
    return assignment


def delete_assignment(db: Session, assignment_id: int) -> bool:
    """Delete an assignment record."""
    assignment = get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with ID {assignment_id} not found",
        )

    db.delete(assignment)
    db.commit()
    return True
