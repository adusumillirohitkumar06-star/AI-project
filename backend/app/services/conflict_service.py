"""Conflict service handling conflict inspection and resolution status."""
import math
from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.conflict import Conflict, ConflictSeverity, ConflictType
from app.models.flight import Flight
from app.models.gate import Gate
from app.models.terminal import Terminal
from app.schemas.conflict import ConflictResolve


def get_conflict(db: Session, conflict_id: int) -> Optional[Conflict]:
    """Retrieve conflict by ID."""
    return db.get(Conflict, conflict_id)


def list_conflicts(
    db: Session,
    airport_id: Optional[int] = None,
    flight_id: Optional[int] = None,
    gate_id: Optional[int] = None,
    conflict_type: Optional[ConflictType] = None,
    severity: Optional[ConflictSeverity] = None,
    is_resolved: Optional[bool] = None,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[Conflict], int, int]:
    """List conflicts with operational filters and pagination."""
    query = select(Conflict)

    if flight_id is not None:
        query = query.where(Conflict.flight_id == flight_id)
    if gate_id is not None:
        query = query.where(Conflict.gate_id == gate_id)
    if conflict_type is not None:
        query = query.where(Conflict.conflict_type == conflict_type)
    if severity is not None:
        query = query.where(Conflict.severity == severity)
    if is_resolved is not None:
        query = query.where(Conflict.is_resolved == is_resolved)
    if airport_id is not None:
        query = query.outerjoin(Gate, Conflict.gate_id == Gate.id).outerjoin(
            Terminal, Gate.terminal_id == Terminal.id
        ).where(Terminal.airport_id == airport_id)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    offset = (page - 1) * page_size
    items = list(db.scalars(query.order_by(Conflict.detected_at.desc()).offset(offset).limit(page_size)).all())

    return items, total, total_pages


def resolve_conflict(db: Session, conflict_id: int, data: ConflictResolve) -> Conflict:
    """Mark a conflict as resolved with resolution notes."""
    conflict = get_conflict(db, conflict_id)
    if not conflict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conflict with ID {conflict_id} not found",
        )

    conflict.is_resolved = data.is_resolved
    conflict.resolution_info = data.resolution_info
    db.commit()
    db.refresh(conflict)
    return conflict
