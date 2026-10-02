"""Gate assignment inspection and management endpoints."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.assignment import AssignmentStatus
from app.schemas.assignment import GateAssignmentCreate, GateAssignmentRead, GateAssignmentUpdate
from app.schemas.common import PaginatedResponse
from app.services import assignment_service

router = APIRouter(prefix="/assignments", tags=["Gate Assignments"])


@router.get("", response_model=PaginatedResponse[GateAssignmentRead], summary="List gate assignments")
def list_assignments(
    flight_id: Optional[int] = Query(default=None, description="Filter by flight ID"),
    gate_id: Optional[int] = Query(default=None, description="Filter by gate ID"),
    airport_id: Optional[int] = Query(default=None, description="Filter by airport ID"),
    status: Optional[AssignmentStatus] = Query(default=None, description="Filter by assignment status"),
    solver_run_id: Optional[int] = Query(default=None, description="Filter by solver run ID"),
    start_time_after: Optional[datetime] = Query(default=None, description="Filter start time >= timestamp"),
    end_time_before: Optional[datetime] = Query(default=None, description="Filter end time <= timestamp"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[GateAssignmentRead]:
    """Retrieve paginated list of gate assignments with operational filters."""
    items, total, total_pages = assignment_service.list_assignments(
        db,
        flight_id=flight_id,
        gate_id=gate_id,
        airport_id=airport_id,
        status_filter=status,
        solver_run_id=solver_run_id,
        start_time_after=start_time_after,
        end_time_before=end_time_before,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse[GateAssignmentRead](
        items=[GateAssignmentRead.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/{assignment_id}", response_model=GateAssignmentRead, summary="Get assignment by ID")
def get_assignment(assignment_id: int, db: Session = Depends(get_db)) -> GateAssignmentRead:
    """Retrieve an assignment by ID."""
    assignment = assignment_service.get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gate assignment with ID {assignment_id} not found",
        )
    return GateAssignmentRead.model_validate(assignment)


@router.post("", response_model=GateAssignmentRead, status_code=status.HTTP_201_CREATED, summary="Create manual assignment")
def create_assignment(data: GateAssignmentCreate, db: Session = Depends(get_db)) -> GateAssignmentRead:
    """Create a manual assignment with collision validation."""
    assignment = assignment_service.create_assignment(db, data)
    return GateAssignmentRead.model_validate(assignment)


@router.put("/{assignment_id}", response_model=GateAssignmentRead, summary="Update assignment")
@router.patch("/{assignment_id}", response_model=GateAssignmentRead, summary="Patch assignment")
def update_assignment(assignment_id: int, data: GateAssignmentUpdate, db: Session = Depends(get_db)) -> GateAssignmentRead:
    """Update an assignment with temporal interval collision validation."""
    assignment = assignment_service.update_assignment(db, assignment_id, data)
    return GateAssignmentRead.model_validate(assignment)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete assignment")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)) -> None:
    """Delete an assignment by ID."""
    assignment_service.delete_assignment(db, assignment_id)
