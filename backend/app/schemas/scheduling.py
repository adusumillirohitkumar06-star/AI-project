"""Scheduling execution request and response schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.ai.csp.solver import SolverStrategy


class ScheduleSolveRequest(BaseModel):
    """Configuration payload for triggering the CSP gate allocation solver."""
    airport_id: int = Field(gt=0, description="Target airport ID for gate allocation")
    flight_ids: Optional[List[int]] = Field(
        default=None,
        description="Optional explicit subset of flight IDs. If omitted, all unassigned or pending flights for this airport are scheduled.",
    )
    strategy: SolverStrategy = Field(
        default=SolverStrategy.BACKTRACKING_WITH_CONSTRAINT_PROPAGATION,
        description="CSP search strategy to apply",
    )
    inter_flight_buffer_minutes: int = Field(
        default=0,
        ge=0,
        le=120,
        description="Safety buffer minutes added between consecutive aircraft occupying the same gate",
    )
    trigger: str = Field(
        default="MANUAL",
        description="Trigger mechanism: MANUAL, SIMULATION, or DYNAMIC_RESCHEDULING",
    )
    fixed_assignments: Optional[Dict[int, int]] = Field(
        default=None,
        description="Pre-committed flight_id -> gate_id map to preserve unaffected assignments during dynamic rescheduling",
    )


class ScheduledAssignmentDto(BaseModel):
    flight_id: int
    flight_number: str
    gate_id: int
    gate_code: str
    terminal_code: str
    start_time: datetime
    end_time: datetime


class ScheduleSolveResponse(BaseModel):
    """Complete response from the CSP scheduling service."""
    success: bool
    solver_run_id: Optional[int] = None
    strategy: str
    assignments: List[ScheduledAssignmentDto] = Field(default_factory=list)
    unassigned_flights: List[Dict[str, Any]] = Field(default_factory=list)
    conflicts: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)
    reasoning_events: List[Dict[str, Any]] = Field(default_factory=list)
