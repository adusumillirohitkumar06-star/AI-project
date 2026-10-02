"""Airport model representing airport infrastructure."""
from typing import TYPE_CHECKING, List
from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.terminal import Terminal
    from app.models.flight import Flight
    from app.models.simulation import SimulationEvent


class Airport(Base, TimestampMixin):
    """Airport entity with geospatial coordinates, IATA/ICAO codes, and terminals."""
    __tablename__ = "airports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    iata_code: Mapped[str] = mapped_column(String(3), unique=True, index=True, nullable=False)
    icao_code: Mapped[str] = mapped_column(String(4), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    terminals: Mapped[List["Terminal"]] = relationship(
        "Terminal",
        back_populates="airport",
        cascade="all, delete-orphan",
    )
    origin_flights: Mapped[List["Flight"]] = relationship(
        "Flight",
        foreign_keys="Flight.origin_airport_id",
        back_populates="origin_airport",
    )
    destination_flights: Mapped[List["Flight"]] = relationship(
        "Flight",
        foreign_keys="Flight.destination_airport_id",
        back_populates="destination_airport",
    )
    simulation_events: Mapped[List["SimulationEvent"]] = relationship(
        "SimulationEvent",
        back_populates="airport",
    )

    def __repr__(self) -> str:
        return f"<Airport(id={self.id}, iata='{self.iata_code}', name='{self.name}')>"
