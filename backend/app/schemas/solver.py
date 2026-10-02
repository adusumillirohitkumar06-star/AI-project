"""SolverRun and execution telemetry Pydantic schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict

from app.models.solver import SolverStrategy


class SolverRunRead(BaseModel):
    id: int
    strategy: SolverStrategy
    started_at: datetime
    completed_at: Optional[datetime] = None
    execution_time_ms: Optional[float] = None
    flights_considered: int
    assignments_produced: int
    nodes_explored: int
    backtracks_count: int
    conflicts_count: int
    is_success: bool
    solver_configuration: Optional[Dict[str, Any]] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
