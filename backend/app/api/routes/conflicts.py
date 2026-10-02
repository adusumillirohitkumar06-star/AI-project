"""Conflict monitoring and resolution endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.conflict import ConflictSeverity, ConflictType
from app.schemas.common import PaginatedResponse
from app.schemas.conflict import ConflictRead, ConflictResolve
from app.services import conflict_service

router = APIRouter(prefix="/conflicts", tags=["Conflicts"])


@router.get("", response_model=PaginatedResponse[ConflictRead], summary="List conflicts")
def list_conflicts(
    airport_id: Optional[int] = Query(default=None, description="Filter by airport ID"),
    flight_id: Optional[int] = Query(default=None, description="Filter by flight ID"),
    gate_id: Optional[int] = Query(default=None, description="Filter by gate ID"),
    conflict_type: Optional[ConflictType] = Query(default=None, description="Filter by conflict category"),
    severity: Optional[ConflictSeverity] = Query(default=None, description="Filter by severity level"),
    is_resolved: Optional[bool] = Query(default=None, description="Filter by resolution status"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ConflictRead]:
    """Retrieve paginated list of operational and CSP constraint conflicts."""
    items, total, total_pages = conflict_service.list_conflicts(
        db,
        airport_id=airport_id,
        flight_id=flight_id,
        gate_id=gate_id,
        conflict_type=conflict_type,
        severity=severity,
        is_resolved=is_resolved,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse[ConflictRead](
        items=[ConflictRead.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/{conflict_id}", response_model=ConflictRead, summary="Get conflict by ID")
def get_conflict(conflict_id: int, db: Session = Depends(get_db)) -> ConflictRead:
    """Retrieve a conflict by ID."""
    conflict = conflict_service.get_conflict(db, conflict_id)
    if not conflict:
        raise HTTPException(
            status_code=404,
            detail=f"Conflict with ID {conflict_id} not found",
        )
    return ConflictRead.model_validate(conflict)


@router.patch("/{conflict_id}/resolve", response_model=ConflictRead, summary="Resolve conflict")
def resolve_conflict(conflict_id: int, data: ConflictResolve, db: Session = Depends(get_db)) -> ConflictRead:
    """Mark a detected conflict as resolved."""
    conflict = conflict_service.resolve_conflict(db, conflict_id, data)
    return ConflictRead.model_validate(conflict)
