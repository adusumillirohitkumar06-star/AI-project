"""Terminal service handling CRUD and business logic."""
import math
from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.airport import Airport
from app.models.terminal import Terminal
from app.schemas.terminal import TerminalCreate, TerminalUpdate


def get_terminal(db: Session, terminal_id: int) -> Optional[Terminal]:
    """Retrieve terminal by ID."""
    return db.get(Terminal, terminal_id)


def list_terminals(
    db: Session,
    airport_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[Terminal], int, int]:
    """List terminals with optional airport filter."""
    query = select(Terminal)
    if airport_id is not None:
        query = query.where(Terminal.airport_id == airport_id)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    offset = (page - 1) * page_size
    items = list(db.scalars(query.order_by(Terminal.terminal_code).offset(offset).limit(page_size)).all())

    return items, total, total_pages


def create_terminal(db: Session, data: TerminalCreate) -> Terminal:
    """Create terminal ensuring valid parent airport and unique code per airport."""
    airport = db.get(Airport, data.airport_id)
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent airport with ID {data.airport_id} does not exist",
        )

    code = data.terminal_code.upper()
    existing = db.scalar(
        select(Terminal).where(
            Terminal.airport_id == data.airport_id,
            Terminal.terminal_code == code,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Terminal code '{code}' already exists for airport ID {data.airport_id}",
        )

    terminal = Terminal(
        airport_id=data.airport_id,
        terminal_code=code,
        name=data.name,
        is_active=data.is_active,
    )
    db.add(terminal)
    db.commit()
    db.refresh(terminal)
    return terminal


def update_terminal(db: Session, terminal_id: int, data: TerminalUpdate) -> Terminal:
    """Update terminal details."""
    terminal = get_terminal(db, terminal_id)
    if not terminal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Terminal with ID {terminal_id} not found",
        )

    update_dict = data.model_dump(exclude_unset=True)
    if "terminal_code" in update_dict:
        new_code = update_dict["terminal_code"].upper()
        update_dict["terminal_code"] = new_code
        existing = db.scalar(
            select(Terminal).where(
                Terminal.airport_id == terminal.airport_id,
                Terminal.terminal_code == new_code,
                Terminal.id != terminal_id,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Terminal code '{new_code}' already exists for airport ID {terminal.airport_id}",
            )

    for field, value in update_dict.items():
        setattr(terminal, field, value)

    db.commit()
    db.refresh(terminal)
    return terminal


def delete_terminal(db: Session, terminal_id: int) -> bool:
    """Delete a terminal by ID."""
    terminal = get_terminal(db, terminal_id)
    if not terminal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Terminal with ID {terminal_id} not found",
        )

    db.delete(terminal)
    db.commit()
    return True
