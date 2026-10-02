"""API request and response schemas package."""
from app.schemas.common import ErrorResponse, PaginatedResponse
from app.schemas.health import DetailedHealthResponse, HealthResponse, RootResponse
from app.schemas.airport import AirportCreate, AirportRead, AirportUpdate
from app.schemas.terminal import TerminalCreate, TerminalRead, TerminalUpdate
from app.schemas.gate import GateCreate, GateRead, GateUpdate
from app.schemas.aircraft import AircraftCreate, AircraftRead, AircraftUpdate
from app.schemas.flight import FlightCreate, FlightRead, FlightUpdate
from app.schemas.assignment import GateAssignmentCreate, GateAssignmentRead, GateAssignmentUpdate
from app.schemas.conflict import ConflictCreate, ConflictRead, ConflictResolve
from app.schemas.solver import SolverRunRead
from app.schemas.scheduling import ScheduleSolveRequest, ScheduleSolveResponse, ScheduledAssignmentDto

__all__ = [
    "ErrorResponse",
    "PaginatedResponse",
    "RootResponse",
    "HealthResponse",
    "DetailedHealthResponse",
    "AirportCreate",
    "AirportRead",
    "AirportUpdate",
    "TerminalCreate",
    "TerminalRead",
    "TerminalUpdate",
    "GateCreate",
    "GateRead",
    "GateUpdate",
    "AircraftCreate",
    "AircraftRead",
    "AircraftUpdate",
    "FlightCreate",
    "FlightRead",
    "FlightUpdate",
    "GateAssignmentCreate",
    "GateAssignmentRead",
    "GateAssignmentUpdate",
    "ConflictCreate",
    "ConflictRead",
    "ConflictResolve",
    "SolverRunRead",
    "ScheduleSolveRequest",
    "ScheduleSolveResponse",
    "ScheduledAssignmentDto",
]
