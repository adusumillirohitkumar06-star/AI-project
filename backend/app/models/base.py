"""Base model mixin and timestamp utilities.

Timestamp Strategy:
All temporal data in this system uses `DateTime(timezone=True)`.
In PostgreSQL, this maps to `TIMESTAMPTZ`, which stores UTC timestamps and converts
from/to time zones with absolute precision. This eliminates ambiguous naive timestamps
across airport ground operations, flight departures, and arrival scheduling.
"""
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TimestampMixin:
    """Reusable mixin providing timezone-aware created_at and updated_at fields."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
