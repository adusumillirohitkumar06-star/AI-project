"""Gate request and response Pydantic schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.gate import GateCapability


class GateBase(BaseModel):
    terminal_id: int = Field(gt=0, description="Parent terminal ID")
    gate_code: str = Field(min_length=1, max_length=20, description="Gate identifier (e.g., A1, B22)")
    gate_type: str = Field(default="JET_BRIDGE", max_length=50)
    capability: GateCapability = Field(default=GateCapability.BOTH)
    supported_aircraft_types: str = Field(default="REGIONAL,NARROW_BODY,WIDE_BODY", max_length=255)
    max_aircraft_size: str = Field(default="WIDE_BODY", max_length=50)
    is_active: bool = True
    is_closed: bool = False
    closure_reason: Optional[str] = None


class GateCreate(GateBase):
    pass


class GateUpdate(BaseModel):
    gate_code: Optional[str] = Field(default=None, min_length=1, max_length=20)
    gate_type: Optional[str] = Field(default=None, max_length=50)
    capability: Optional[GateCapability] = None
    supported_aircraft_types: Optional[str] = Field(default=None, max_length=255)
    max_aircraft_size: Optional[str] = Field(default=None, max_length=50)
    is_active: Optional[bool] = None
    is_closed: Optional[bool] = None
    closure_reason: Optional[str] = None


class GateRead(GateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
