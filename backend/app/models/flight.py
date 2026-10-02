"""Flight model representing flight schedules, arrivals, departures, and status.

Design Note (Flight Identity vs. Scheduling Instance):
The Flight entity encapsulates both identity (flight_number, airline, route) and operational
scheduling instance data (scheduled/actual arrival/departure, turnaround buffer, delay duration,
and lifecycle status). This avoids an unnecessary, redundant 1-to-1 FlightSchedule table while
maintaining full indexing across temporal columns.
"""
import enum
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.airport import Airport
    from app.models.aircraft import Aircraft
    from app.models.assignment import GateAssignment
    from app.models.simulation import SimulationEvent
    from app.models.conflict import Conflict


class FlightType(str, enum.Enum):
    """Domestic vs. international flight classification."""
    DOMESTIC = "DOMESTIC"
    INTERNATIONAL = "INTERNATIONAL"


class FlightPriority(str, enum.Enum):
    """Operational priority levels evaluated by the CSP scheduler."""
    NORMAL = "NORMAL"
    VIP = "VIP"
    MEDICAL = "MEDICAL"
    EMERGENCY = "EMERGENCY"


class FlightStatus(str, enum.Enum):
    """Operational lifecycle status of a flight."""
    SCHEDULED = "SCHEDULED"
    BOARDING = "BOARDING"
    DEPARTED = "DEPARTED"
    IN_AIR = "IN_AIR"
    APPROACHING = "APPROACHING"
    LANDED = "LANDED"
    AT_GATE = "AT_GATE"
    DELAYED = "DELAYED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class Flight(Base, TimestampMixin):
    """Flight entity with routing, scheduling, aircraft, and operational priority."""
    __tablename__ = "flights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flight_number: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    airline: Mapped[str] = mapped_column(String(100), nullable=False)

    origin_airport_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("airports.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    destination_airport_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("airports.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    aircraft_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("aircraft.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    scheduled_arrival: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    scheduled_departure: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    actual_arrival: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    actual_departure: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    flight_type: Mapped[FlightType] = mapped_column(
        Enum(FlightType, name="flight_type_enum"),
        default=FlightType.DOMESTIC,
        nullable=False,
    )
    passenger_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    priority: Mapped[FlightPriority] = mapped_column(
        Enum(FlightPriority, name="flight_priority_enum"),
        default=FlightPriority.NORMAL,
        nullable=False,
        index=True,
    )
    turnaround_duration_minutes: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    delay_duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delay_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[FlightStatus] = mapped_column(
        Enum(FlightStatus, name="flight_status_enum"),
        default=FlightStatus.SCHEDULED,
        nullable=False,
        index=True,
    )

    # Relationships
    origin_airport: Mapped["Airport"] = relationship(
        "Airport",
        foreign_keys=[origin_airport_id],
        back_populates="origin_flights",
    )
    destination_airport: Mapped["Airport"] = relationship(
        "Airport",
        foreign_keys=[destination_airport_id],
        back_populates="destination_flights",
    )
    aircraft: Mapped[Optional["Aircraft"]] = relationship(
        "Aircraft",
        back_populates="flights",
    )
    assignments: Mapped[List["GateAssignment"]] = relationship(
        "GateAssignment",
        back_populates="flight",
        cascade="all, delete-orphan",
    )
    simulation_events: Mapped[List["SimulationEvent"]] = relationship(
        "SimulationEvent",
        back_populates="flight",
        cascade="all, delete-orphan",
    )
    conflicts: Mapped[List["Conflict"]] = relationship(
        "Conflict",
        back_populates="flight",
        cascade="all, delete-orphan",
    )

    @property
    def operational_arrival(self) -> datetime:
        """Operational arrival time accounting for simulated or actual delays while preserving original schedule."""
        if self.actual_arrival is not None:
            return self.actual_arrival
        if self.delay_duration_minutes > 0:
            return self.scheduled_arrival + timedelta(minutes=self.delay_duration_minutes)
        return self.scheduled_arrival

    @property
    def operational_departure(self) -> datetime:
        """Operational departure time accounting for simulated or actual delays while preserving original schedule."""
        if self.actual_departure is not None:
            return self.actual_departure
        if self.delay_duration_minutes > 0:
            return self.scheduled_departure + timedelta(minutes=self.delay_duration_minutes)
        return self.scheduled_departure

    def __repr__(self) -> str:
        return f"<Flight(id={self.id}, number='{self.flight_number}', priority='{self.priority}', status='{self.status}')>"
