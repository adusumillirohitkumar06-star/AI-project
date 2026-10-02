"""Solver run model recording CSP execution benchmarks, metrics, and search tree statistics."""
import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, Enum, Float, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.assignment import GateAssignment


class SolverStrategy(str, enum.Enum):
    """CSP algorithmic strategies for solving gate allocation."""
    BACKTRACKING = "BACKTRACKING"
    BACKTRACKING_FORWARD_CHECKING = "BACKTRACKING_FORWARD_CHECKING"
    BACKTRACKING_CONSTRAINT_PROPAGATION = "BACKTRACKING_CONSTRAINT_PROPAGATION"


class SolverRun(Base):
    """Execution instance of the CSP gate allocation solver recording performance metrics."""
    __tablename__ = "solver_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    strategy: Mapped[SolverStrategy] = mapped_column(
        Enum(SolverStrategy, name="solver_strategy_enum"),
        nullable=False,
        index=True,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    execution_time_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    flights_considered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    assignments_produced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    nodes_explored: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    backtracks_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    conflicts_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_success: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    solver_configuration: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    assignments: Mapped[List["GateAssignment"]] = relationship(
        "GateAssignment",
        back_populates="solver_run",
    )

    def __repr__(self) -> str:
        return f"<SolverRun(id={self.id}, strategy='{self.strategy}', success={self.is_success}, time_ms={self.execution_time_ms})>"
