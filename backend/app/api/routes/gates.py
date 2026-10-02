"""Gate management endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.gate import GateCreate, GateRead, GateUpdate
from app.services import gate_service

router = APIRouter(prefix="/gates", tags=["Gates"])


@router.get("", response_model=PaginatedResponse[GateRead], summary="List gates")
def list_gates(
    terminal_id: Optional[int] = Query(default=None, description="Filter by terminal ID"),
    airport_id: Optional[int] = Query(default=None, description="Filter by airport ID"),
    is_active: Optional[bool] = Query(default=None, description="Filter by active status"),
    is_closed: Optional[bool] = Query(default=None, description="Filter by closed status"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[GateRead]:
    """Retrieve paginated list of gates with optional filters."""
    items, total, total_pages = gate_service.list_gates(
        db,
        terminal_id=terminal_id,
        airport_id=airport_id,
        is_active=is_active,
        is_closed=is_closed,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse[GateRead](
        items=[GateRead.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/{gate_id}", response_model=GateRead, summary="Get gate by ID")
def get_gate(gate_id: int, db: Session = Depends(get_db)) -> GateRead:
    """Retrieve a gate by ID."""
    gate = gate_service.get_gate(db, gate_id)
    if not gate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gate with ID {gate_id} not found",
        )
    return GateRead.model_validate(gate)


@router.post("", response_model=GateRead, status_code=status.HTTP_201_CREATED, summary="Create gate")
def create_gate(data: GateCreate, db: Session = Depends(get_db)) -> GateRead:
    """Create a new gate."""
    gate = gate_service.create_gate(db, data)
    return GateRead.model_validate(gate)


@router.put("/{gate_id}", response_model=GateRead, summary="Update gate")
@router.patch("/{gate_id}", response_model=GateRead, summary="Patch gate")
def update_gate(gate_id: int, data: GateUpdate, db: Session = Depends(get_db)) -> GateRead:
    """Update an existing gate."""
    gate = gate_service.update_gate(db, gate_id, data)
    return GateRead.model_validate(gate)


@router.delete("/{gate_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete gate")
def delete_gate(gate_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a gate by ID."""
    gate_service.delete_gate(db, gate_id)
