"""Domain data transfer objects (DTOs) for the CSP gate scheduling engine.

These classes are completely decoupled from SQLAlchemy ORM, web frameworks, and persistence.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import enum
from typing import Any, Dict, List, Optional, Set, Union


class GateCapability(str, enum.Enum):
    """Gate operational capabilities."""
    DOMESTIC = "DOMESTIC"
    INTERNATIONAL = "INTERNATIONAL"
    BOTH = "BOTH"


class AircraftCategory(str, enum.Enum):
    """Aircraft size categorization in ascending physical scale."""
    REGIONAL = "REGIONAL"
    NARROW_BODY = "NARROW_BODY"
    WIDE_BODY = "WIDE_BODY"
    HEAVY = "HEAVY"


# Hierarchy: Gate supporting a size category supports that category and all smaller categories
AIRCRAFT_SIZE_ORDER: Dict[AircraftCategory, int] = {
    AircraftCategory.REGIONAL: 1,
    AircraftCategory.NARROW_BODY: 2,
    AircraftCategory.WIDE_BODY: 3,
    AircraftCategory.HEAVY: 4,
}


class FlightType(str, enum.Enum):
    """Flight itinerary classification."""
    DOMESTIC = "DOMESTIC"
    INTERNATIONAL = "INTERNATIONAL"


class FlightPriority(str, enum.Enum):
    """Flight operational priorities."""
    NORMAL = "NORMAL"
    VIP = "VIP"
    MEDICAL = "MEDICAL"
    EMERGENCY = "EMERGENCY"


PRIORITY_WEIGHTS: Dict[FlightPriority, int] = {
    FlightPriority.EMERGENCY: 400,
    FlightPriority.MEDICAL: 300,
    FlightPriority.VIP: 200,
    FlightPriority.NORMAL: 100,
}


@dataclass(frozen=True)
class TimeInterval:
    """Discrete time interval with temporal overlap and buffer logic."""
    start: datetime
    end: datetime

    def overlaps_with(self, other: "TimeInterval") -> bool:
        """Return True if two open intervals overlap: (start1 < end2) and (start2 < end1)."""
        return self.start < other.end and other.start < self.end

    def duration_minutes(self) -> float:
        """Calculate total interval span in minutes."""
        return (self.end - self.start).total_seconds() / 60.0

    def contains(self, dt: datetime) -> bool:
        """Check if a timestamp falls within this interval."""
        return self.start <= dt <= self.end


@dataclass
class FlightInput:
    """Clean input DTO representing a flight requiring gate assignment."""
    flight_id: Union[int, str]
    flight_number: str
    arrival_time: datetime
    departure_time: datetime
    aircraft_type: str = "B738"
    aircraft_category: AircraftCategory = AircraftCategory.NARROW_BODY
    flight_type: FlightType = FlightType.DOMESTIC
    priority: FlightPriority = FlightPriority.NORMAL
    turnaround_minutes: int = 45
    required_terminal: Optional[str] = None
    required_gate_id: Optional[Union[int, str]] = None
    airline: str = ""

    def __post_init__(self) -> None:
        # Normalize enums if passed as strings
        if isinstance(self.aircraft_category, str):
            self.aircraft_category = AircraftCategory(self.aircraft_category)
        if isinstance(self.flight_type, str):
            self.flight_type = FlightType(self.flight_type)
        if isinstance(self.priority, str):
            self.priority = FlightPriority(self.priority)

    def get_occupancy_interval(self, inter_flight_buffer_minutes: int = 0) -> TimeInterval:
        """Calculate gate occupancy interval incorporating turnaround and inter-flight clearing buffer."""
        # Minimum required departure based on turnaround duration
        min_departure = self.arrival_time + timedelta(minutes=self.turnaround_minutes)
        effective_end = max(self.departure_time, min_departure)
        if inter_flight_buffer_minutes > 0:
            effective_end += timedelta(minutes=inter_flight_buffer_minutes)
        return TimeInterval(start=self.arrival_time, end=effective_end)


@dataclass
class GateInput:
    """Clean input DTO representing an airport gate."""
    gate_id: Union[int, str]
    gate_code: str
    terminal_code: str
    capability: GateCapability = GateCapability.BOTH
    supported_aircraft_categories: Set[AircraftCategory] = field(
        default_factory=lambda: {
            AircraftCategory.REGIONAL,
            AircraftCategory.NARROW_BODY,
            AircraftCategory.WIDE_BODY,
        }
    )
    max_aircraft_size: AircraftCategory = AircraftCategory.WIDE_BODY
    is_active: bool = True
    is_closed: bool = False
    closure_reason: Optional[str] = None
    available_from: Optional[datetime] = None
    available_to: Optional[datetime] = None

    def __post_init__(self) -> None:
        if isinstance(self.capability, str):
            self.capability = GateCapability(self.capability)
        if isinstance(self.max_aircraft_size, str):
            self.max_aircraft_size = AircraftCategory(self.max_aircraft_size)

        # Normalize supported categories
        normalized_cats: Set[AircraftCategory] = set()
        for cat in self.supported_aircraft_categories:
            if isinstance(cat, str):
                normalized_cats.add(AircraftCategory(cat))
            else:
                normalized_cats.add(cat)
        self.supported_aircraft_categories = normalized_cats

    def is_aircraft_compatible(self, category: AircraftCategory) -> bool:
        """Check if gate supports the aircraft size category."""
        if category in self.supported_aircraft_categories:
            return True
        # Check size hierarchy
        gate_max_rank = AIRCRAFT_SIZE_ORDER.get(self.max_aircraft_size, 0)
        aircraft_rank = AIRCRAFT_SIZE_ORDER.get(category, 99)
        return aircraft_rank <= gate_max_rank

    def is_flight_type_compatible(self, flight_type: FlightType) -> bool:
        """Check if domestic/international requirements match."""
        if self.capability == GateCapability.BOTH:
            return True
        if flight_type == FlightType.DOMESTIC and self.capability == GateCapability.DOMESTIC:
            return True
        if flight_type == FlightType.INTERNATIONAL and self.capability == GateCapability.INTERNATIONAL:
            return True
        return False
