"""Aircraft request and response Pydantic schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.aircraft import AircraftCategory


class AircraftBase(BaseModel):
    registration: str = Field(min_length=1, max_length=20, description="Unique tail number / registration")
    model: str = Field(min_length=1, max_length=100, description="Full model name (e.g., Boeing 777-300ER)")
    aircraft_type: str = Field(min_length=1, max_length=20, description="ICAO aircraft type code (e.g., B77W)")
    airline: str = Field(min_length=1, max_length=100)
    capacity: int = Field(default=180, ge=1, le=1000)
    category: AircraftCategory = Field(default=AircraftCategory.NARROW_BODY)
    is_active: bool = True


class AircraftCreate(AircraftBase):
    pass


class AircraftUpdate(BaseModel):
    model: Optional[str] = Field(default=None, min_length=1, max_length=100)
    aircraft_type: Optional[str] = Field(default=None, min_length=1, max_length=20)
    airline: Optional[str] = Field(default=None, min_length=1, max_length=100)
    capacity: Optional[int] = Field(default=None, ge=1, le=1000)
    category: Optional[AircraftCategory] = None
    is_active: Optional[bool] = None


class AircraftRead(AircraftBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
