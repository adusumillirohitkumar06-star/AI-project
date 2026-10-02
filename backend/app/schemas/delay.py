"""Operational flight delay and dynamic CSP rescheduling schemas."""
from datetime import datetime
import enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.scheduling import ScheduledAssignmentDto


class DelayReason(str, enum.Enum):
    """Operational delay root cause classifications."""
    WEATHER = "WEATHER"
    AIR_TRAFFIC = "AIR_TRAFFIC"
    AIRCRAFT = "AIRCRAFT"
    GATE = "GATE"
    CREW = "CREW"
    OPERATIONAL = "OPERATIONAL"
    UNKNOWN = "UNKNOWN"


class FlightDelayRequest(BaseModel):
    """Payload for applying an operational delay to a flight."""
    delay_minutes: int = Field(gt=0, description="Delay duration in minutes (must be > 0)")
    reason: DelayReason = Field(default=DelayReason.OPERATIONAL, description="Operational delay root cause")
    reschedule_if_conflict: bool = Field(
        default=True,
        description="Automatically trigger the CSP AI solver if a gate collision is detected",
    )


class FlightDelayResponse(BaseModel):
    """Telemetry response following delay application and dynamic CSP gate evaluation."""
    success: bool
    flight_id: int
    flight_number: str
    airline: str
    delay_minutes: int
    delay_reason: str
    original_arrival: datetime
    original_departure: datetime
    operational_arrival: datetime
    operational_departure: datetime
    has_conflict: bool
    conflict_detected: Optional[Dict[str, Any]] = None
    rescheduled: bool
    status: str = Field(description="RETAINED, RESCHEDULED, NO_GATE_AVAILABLE, or UNASSIGNED")
    previous_gate_code: Optional[str] = None
    current_gate_code: Optional[str] = None
    current_terminal_code: Optional[str] = None
    solver_run_id: Optional[int] = None
    assignment: Optional[ScheduledAssignmentDto] = None
    message: str
    events: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)
