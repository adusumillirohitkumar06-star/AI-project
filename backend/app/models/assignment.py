"""Gate assignment model connecting flights to gates across discrete time intervals."""
import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.flight import Flight
    from app.models.gate import Gate
    from app.models.solver import SolverRun


class AssignmentStatus(str, enum.Enum):
    """Lifecycle status of a gate allocation."""
    TENTATIVE = "TENTATIVE"
    CONFIRMED = "CONFIRMED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    REVOKED = "REVOKED"


class GateAssignment(Base, TimestampMixin):
    """Gate assignment linking a flight to a physical gate during an operational time window."""
    __tablename__ = "gate_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flight_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("flights.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    gate_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("gates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    solver_run_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("solver_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    assignment_start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    assignment_end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus, name="assignment_status_enum"),
        default=AssignmentStatus.CONFIRMED,
        nullable=False,
        index=True,
    )
    source: Mapped[str] = mapped_column(String(50), default="CSP_SOLVER", nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    flight: Mapped["Flight"] = relationship("Flight", back_populates="assignments")
    gate: Mapped["Gate"] = relationship("Gate", back_populates="assignments")
    solver_run: Mapped[Optional["SolverRun"]] = relationship("SolverRun", back_populates="assignments")

    __table_args__ = (
        Index("ix_gate_assignment_time_window", "gate_id", "assignment_start_time", "assignment_end_time"),
    )

    @property
    def flight_number(self) -> Optional[str]:
        return self.flight.flight_number if self.flight else None

    @property
    def airline(self) -> Optional[str]:
        return self.flight.airline if self.flight else None

    @property
    def gate_code(self) -> Optional[str]:
        return self.gate.gate_code if self.gate else None

    @property
    def terminal_code(self) -> Optional[str]:
        return self.gate.terminal.terminal_code if self.gate and self.gate.terminal else None

    def __repr__(self) -> str:
        return f"<GateAssignment(id={self.id}, flight_id={self.flight_id}, gate_id={self.gate_id}, status='{self.status}')>"

