"""Database models package providing full domain entities for airport operations."""
from app.models.base import TimestampMixin
from app.models.user import User, UserRole
from app.models.airport import Airport
from app.models.terminal import Terminal
from app.models.gate import Gate, GateCapability
from app.models.aircraft import Aircraft, AircraftCategory
from app.models.flight import Flight, FlightPriority, FlightStatus, FlightType
from app.models.assignment import GateAssignment, AssignmentStatus
from app.models.simulation import SimulationEvent, SimulationEventType
from app.models.conflict import Conflict, ConflictSeverity, ConflictType
from app.models.solver import SolverRun, SolverStrategy

__all__ = [
    "TimestampMixin",
    "User",
    "UserRole",
    "Airport",
    "Terminal",
    "Gate",
    "GateCapability",
    "Aircraft",
    "AircraftCategory",
    "Flight",
    "FlightPriority",
    "FlightStatus",
    "FlightType",
    "GateAssignment",
    "AssignmentStatus",
    "SimulationEvent",
    "SimulationEventType",
    "Conflict",
    "ConflictSeverity",
    "ConflictType",
    "SolverRun",
    "SolverStrategy",
]
