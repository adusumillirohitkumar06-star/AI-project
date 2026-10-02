"""Simulation event model tracking airport and flight state transitions."""
import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.flight import Flight
    from app.models.airport import Airport


class SimulationEventType(str, enum.Enum):
    """Operational simulation event categories."""
    FLIGHT_CREATED = "FLIGHT_CREATED"
    DEPARTURE = "DEPARTURE"
    TAKEOFF = "TAKEOFF"
    IN_AIR = "IN_AIR"
    APPROACHING = "APPROACHING"
    LANDING = "LANDING"
    GATE_ASSIGNED = "GATE_ASSIGNED"
    GATE_OCCUPIED = "GATE_OCCUPIED"
    TURNAROUND_STARTED = "TURNAROUND_STARTED"
    TURNAROUND_COMPLETED = "TURNAROUND_COMPLETED"
    GATE_RELEASED = "GATE_RELEASED"
    DELAY = "DELAY"
    CANCELLATION = "CANCELLATION"
    DELAY_APPLIED = "DELAY_APPLIED"
    GATE_CONFLICT_DETECTED = "GATE_CONFLICT_DETECTED"
    RESCHEDULING_REQUESTED = "RESCHEDULING_REQUESTED"
    GATE_REASSIGNED = "GATE_REASSIGNED"
    RESCHEDULING_FAILED = "RESCHEDULING_FAILED"
    CONFLICT_RESOLVED = "CONFLICT_RESOLVED"


class SimulationEvent(Base):
    """Simulation audit trail event capturing flight state changes and clock milestones."""
    __tablename__ = "simulation_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flight_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("flights.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    airport_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("airports.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    event_type: Mapped[SimulationEventType] = mapped_column(
        Enum(SimulationEventType, name="simulation_event_type_enum"),
        nullable=False,
        index=True,
    )
    simulation_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    actual_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    flight: Mapped[Optional["Flight"]] = relationship("Flight", back_populates="simulation_events")
    airport: Mapped[Optional["Airport"]] = relationship("Airport", back_populates="simulation_events")

    def __repr__(self) -> str:
        return f"<SimulationEvent(id={self.id}, type='{self.event_type}', sim_time='{self.simulation_timestamp}')>"
