"""Conflict request and response Pydantic schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.conflict import ConflictSeverity, ConflictType


class ConflictBase(BaseModel):
    flight_id: Optional[int] = None
    gate_id: Optional[int] = None
    conflict_type: ConflictType
    severity: ConflictSeverity = Field(default=ConflictSeverity.MEDIUM)
    description: str
    is_resolved: bool = False
    resolution_info: Optional[str] = None


class ConflictCreate(ConflictBase):
    pass


class ConflictResolve(BaseModel):
    is_resolved: bool = True
    resolution_info: str = Field(min_length=1, description="Explanation of how conflict was mitigated")


class ConflictRead(ConflictBase):
    id: int
    detected_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
