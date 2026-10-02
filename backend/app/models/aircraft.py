"""Aircraft model representing fleet assets."""
import enum
from typing import TYPE_CHECKING, List
from sqlalchemy import Boolean, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.flight import Flight


class AircraftCategory(str, enum.Enum):
    """Aircraft size categorization for gate compatibility."""
    REGIONAL = "REGIONAL"
    NARROW_BODY = "NARROW_BODY"
    WIDE_BODY = "WIDE_BODY"
    HEAVY = "HEAVY"


class Aircraft(Base, TimestampMixin):
    """Aircraft fleet asset entity."""
    __tablename__ = "aircraft"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    registration: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    aircraft_type: Mapped[str] = mapped_column(String(20), nullable=False)
    airline: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=180, nullable=False)
    category: Mapped[AircraftCategory] = mapped_column(
        Enum(AircraftCategory, name="aircraft_category_enum"),
        default=AircraftCategory.NARROW_BODY,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    flights: Mapped[List["Flight"]] = relationship(
        "Flight",
        back_populates="aircraft",
    )

    def __repr__(self) -> str:
        return f"<Aircraft(id={self.id}, reg='{self.registration}', model='{self.model}')>"
