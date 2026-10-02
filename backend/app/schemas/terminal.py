"""Terminal request and response Pydantic schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TerminalBase(BaseModel):
    airport_id: int = Field(gt=0, description="Parent airport ID")
    terminal_code: str = Field(min_length=1, max_length=20, description="Terminal code (e.g., T1, T2)")
    name: str = Field(min_length=1, max_length=100)
    is_active: bool = True


class TerminalCreate(TerminalBase):
    pass


class TerminalUpdate(BaseModel):
    terminal_code: Optional[str] = Field(default=None, min_length=1, max_length=20)
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    is_active: Optional[bool] = None


class TerminalRead(TerminalBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
