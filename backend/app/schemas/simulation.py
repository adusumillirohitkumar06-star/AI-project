"""Simulation-aware gate allocation schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.ai.csp.solver import SolverStrategy
from app.schemas.scheduling import ScheduledAssignmentDto


class SimulationGateAllocationRequest(BaseModel):
    """Payload for requesting simulation-driven gate allocation for a flight."""
    flight_id: int = Field(gt=0, description="Flight ID approaching destination requiring gate allocation")
    simulation_time: Optional[datetime] = Field(default=None, description="Current simulation timestamp")
    inter_flight_buffer_minutes: int = Field(default=0, ge=0, le=120, description="Inter-flight buffer in minutes")
    strategy: SolverStrategy = Field(
        default=SolverStrategy.BACKTRACKING_WITH_CONSTRAINT_PROPAGATION,
        description="CSP search strategy to apply",
    )


class SimulationGateAllocationResponse(BaseModel):
    """Result of simulation gate allocation request."""
    success: bool
    status: str = Field(description="RETAINED, ALLOCATED, or NO_GATE_AVAILABLE")
    flight_id: int
    gate_id: Optional[int] = None
    gate_code: Optional[str] = None
    terminal_code: Optional[str] = None
    solver_run_id: Optional[int] = None
    message: str
    assignment: Optional[ScheduledAssignmentDto] = None
    conflicts: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)
