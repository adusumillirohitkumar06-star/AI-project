"""Flight request and response Pydantic schemas with timing validation."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.flight import FlightPriority, FlightStatus, FlightType


class FlightBase(BaseModel):
    flight_number: str = Field(min_length=1, max_length=20, description="Flight number code (e.g., AA100)")
    airline: str = Field(min_length=1, max_length=100)
    origin_airport_id: int = Field(gt=0)
    destination_airport_id: int = Field(gt=0)
    aircraft_id: Optional[int] = Field(default=None, gt=0)
    scheduled_arrival: datetime
    scheduled_departure: datetime
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    flight_type: FlightType = Field(default=FlightType.DOMESTIC)
    passenger_count: int = Field(default=0, ge=0)
    priority: FlightPriority = Field(default=FlightPriority.NORMAL)
    turnaround_duration_minutes: int = Field(default=45, ge=0)
    delay_duration_minutes: int = Field(default=0, ge=0)
    delay_reason: Optional[str] = None
    status: FlightStatus = Field(default=FlightStatus.SCHEDULED)


class FlightCreate(FlightBase):
    @model_validator(mode="after")
    def validate_schedule_times(self) -> "FlightCreate":
        if self.scheduled_departure < self.scheduled_arrival:
            raise ValueError("scheduled_departure cannot be earlier than scheduled_arrival")
        if self.origin_airport_id == self.destination_airport_id:
            raise ValueError("origin_airport_id and destination_airport_id must be distinct")
        return self


class FlightUpdate(BaseModel):
    flight_number: Optional[str] = Field(default=None, min_length=1, max_length=20)
    airline: Optional[str] = Field(default=None, min_length=1, max_length=100)
    origin_airport_id: Optional[int] = Field(default=None, gt=0)
    destination_airport_id: Optional[int] = Field(default=None, gt=0)
    aircraft_id: Optional[int] = Field(default=None, gt=0)
    scheduled_arrival: Optional[datetime] = None
    scheduled_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    flight_type: Optional[FlightType] = None
    passenger_count: Optional[int] = Field(default=None, ge=0)
    priority: Optional[FlightPriority] = None
    turnaround_duration_minutes: Optional[int] = Field(default=None, ge=0)
    delay_duration_minutes: Optional[int] = Field(default=None, ge=0)
    delay_reason: Optional[str] = None
    status: Optional[FlightStatus] = None

    @model_validator(mode="after")
    def validate_times(self) -> "FlightUpdate":
        if self.scheduled_arrival and self.scheduled_departure:
            if self.scheduled_departure < self.scheduled_arrival:
                raise ValueError("scheduled_departure cannot be earlier than scheduled_arrival")
        if self.origin_airport_id and self.destination_airport_id:
            if self.origin_airport_id == self.destination_airport_id:
                raise ValueError("origin_airport_id and destination_airport_id must be distinct")
        return self


class FlightRead(FlightBase):
    id: int
    created_at: datetime
    updated_at: datetime
    operational_arrival: Optional[datetime] = None
    operational_departure: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
