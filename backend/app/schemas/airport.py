"""Airport request and response Pydantic schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AirportBase(BaseModel):
    iata_code: str = Field(min_length=3, max_length=3, description="3-letter IATA airport code")
    icao_code: str = Field(min_length=4, max_length=4, description="4-letter ICAO airport code")
    name: str = Field(min_length=1, max_length=150)
    city: str = Field(min_length=1, max_length=100)
    country: str = Field(min_length=1, max_length=100)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    timezone: str = Field(min_length=1, max_length=50)
    is_active: bool = True


class AirportCreate(AirportBase):
    pass


class AirportUpdate(BaseModel):
    iata_code: Optional[str] = Field(default=None, min_length=3, max_length=3)
    icao_code: Optional[str] = Field(default=None, min_length=4, max_length=4)
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    city: Optional[str] = Field(default=None, min_length=1, max_length=100)
    country: Optional[str] = Field(default=None, min_length=1, max_length=100)
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    timezone: Optional[str] = Field(default=None, min_length=1, max_length=50)
    is_active: Optional[bool] = None


class AirportRead(AirportBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
