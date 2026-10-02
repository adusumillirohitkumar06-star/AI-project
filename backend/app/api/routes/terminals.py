"""Terminal management endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.terminal import TerminalCreate, TerminalRead, TerminalUpdate
from app.services import terminal_service

router = APIRouter(prefix="/terminals", tags=["Terminals"])


@router.get("", response_model=PaginatedResponse[TerminalRead], summary="List terminals")
def list_terminals(
    airport_id: Optional[int] = Query(default=None, description="Filter by airport ID"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[TerminalRead]:
    """Retrieve paginated list of terminals."""
    items, total, total_pages = terminal_service.list_terminals(
        db, airport_id=airport_id, page=page, page_size=page_size
    )
    return PaginatedResponse[TerminalRead](
        items=[TerminalRead.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/{terminal_id}", response_model=TerminalRead, summary="Get terminal by ID")
def get_terminal(terminal_id: int, db: Session = Depends(get_db)) -> TerminalRead:
    """Retrieve a terminal by ID."""
    terminal = terminal_service.get_terminal(db, terminal_id)
    if not terminal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Terminal with ID {terminal_id} not found",
        )
    return TerminalRead.model_validate(terminal)


@router.post("", response_model=TerminalRead, status_code=status.HTTP_201_CREATED, summary="Create terminal")
def create_terminal(data: TerminalCreate, db: Session = Depends(get_db)) -> TerminalRead:
    """Create a new terminal."""
    terminal = terminal_service.create_terminal(db, data)
    return TerminalRead.model_validate(terminal)


@router.put("/{terminal_id}", response_model=TerminalRead, summary="Update terminal")
@router.patch("/{terminal_id}", response_model=TerminalRead, summary="Patch terminal")
def update_terminal(terminal_id: int, data: TerminalUpdate, db: Session = Depends(get_db)) -> TerminalRead:
    """Update an existing terminal."""
    terminal = terminal_service.update_terminal(db, terminal_id, data)
    return TerminalRead.model_validate(terminal)


@router.delete("/{terminal_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete terminal")
def delete_terminal(terminal_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a terminal by ID."""
    terminal_service.delete_terminal(db, terminal_id)
