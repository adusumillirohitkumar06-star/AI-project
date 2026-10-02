"""Gate assignment request and response Pydantic schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.assignment import AssignmentStatus


class GateAssignmentBase(BaseModel):
    flight_id: int = Field(gt=0)
    gate_id: int = Field(gt=0)
    solver_run_id: Optional[int] = None
    assignment_start_time: datetime
    assignment_end_time: datetime
    status: AssignmentStatus = Field(default=AssignmentStatus.CONFIRMED)
    source: str = Field(default="CSP_SOLVER", max_length=50)
    reason: Optional[str] = None


class GateAssignmentCreate(GateAssignmentBase):
    pass


class GateAssignmentUpdate(BaseModel):
    gate_id: Optional[int] = Field(default=None, gt=0)
    assignment_start_time: Optional[datetime] = None
    assignment_end_time: Optional[datetime] = None
    status: Optional[AssignmentStatus] = None
    reason: Optional[str] = None


class GateAssignmentRead(GateAssignmentBase):
    id: int
    assigned_at: datetime
    created_at: datetime
    updated_at: datetime
    flight_number: Optional[str] = None
    airline: Optional[str] = None
    gate_code: Optional[str] = None
    terminal_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

