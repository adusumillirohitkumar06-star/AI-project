"""Conflict model recording operational and scheduling constraint violations."""
import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.flight import Flight
    from app.models.gate import Gate


class ConflictType(str, enum.Enum):
    """Categories of operational and CSP constraint conflicts."""
    GATE_OVERLAP = "GATE_OVERLAP"
    INCOMPATIBLE_GATE = "INCOMPATIBLE_GATE"
    TERMINAL_RESTRICTION = "TERMINAL_RESTRICTION"
    GATE_CLOSED = "GATE_CLOSED"
    TURNAROUND_VIOLATION = "TURNAROUND_VIOLATION"
    TIMING_CONFLICT = "TIMING_CONFLICT"
    UNASSIGNED_FLIGHT = "UNASSIGNED_FLIGHT"


class ConflictSeverity(str, enum.Enum):
    """Operational severity of a detected conflict."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Conflict(Base, TimestampMixin):
    """Recorded operational conflict or scheduling violation."""
    __tablename__ = "conflicts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flight_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("flights.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    gate_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("gates.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    conflict_type: Mapped[ConflictType] = mapped_column(
        Enum(ConflictType, name="conflict_type_enum"),
        nullable=False,
        index=True,
    )
    severity: Mapped[ConflictSeverity] = mapped_column(
        Enum(ConflictSeverity, name="conflict_severity_enum"),
        default=ConflictSeverity.MEDIUM,
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    resolution_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    flight: Mapped[Optional["Flight"]] = relationship("Flight", back_populates="conflicts")
    gate: Mapped[Optional["Gate"]] = relationship("Gate", back_populates="conflicts")

    def __repr__(self) -> str:
        return f"<Conflict(id={self.id}, type='{self.conflict_type}', resolved={self.is_resolved})>"
