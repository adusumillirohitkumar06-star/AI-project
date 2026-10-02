"""Structured result containers for CSP gate allocation solutions."""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from app.ai.csp.events import ReasoningEvent
from app.ai.csp.metrics import SolverMetrics
from app.ai.csp.models import FlightInput


@dataclass
class Assignment:
    """Individual gate allocation for a flight."""
    flight_id: Union[int, str]
    flight_number: str
    gate_id: Union[int, str]
    gate_code: str
    terminal_code: str
    start_time: datetime
    end_time: datetime

    def to_dict(self) -> Dict[str, Any]:
        """Convert assignment to dictionary."""
        return {
            "flight_id": self.flight_id,
            "flight_number": self.flight_number,
            "gate_id": self.gate_id,
            "gate_code": self.gate_code,
            "terminal_code": self.terminal_code,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
        }


@dataclass
class ConflictReport:
    """Detailed report of a detected operational conflict or constraint violation."""
    conflict_type: str
    description: str
    severity: str = "HIGH"
    flight_id: Optional[Union[int, str]] = None
    gate_id: Optional[Union[int, str]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert conflict to dictionary."""
        return {
            "conflict_type": self.conflict_type,
            "description": self.description,
            "severity": self.severity,
            "flight_id": self.flight_id,
            "gate_id": self.gate_id,
        }


@dataclass
class SolverResult:
    """Comprehensive output produced by the CSP gate allocation engine."""
    success: bool
    strategy: str
    assignments: List[Assignment] = field(default_factory=list)
    unassigned_flights: List[FlightInput] = field(default_factory=list)
    conflicts: List[ConflictReport] = field(default_factory=list)
    metrics: SolverMetrics = field(default_factory=SolverMetrics)
    reasoning_events: List[ReasoningEvent] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert the entire solver result to JSON-serializable dictionary."""
        return {
            "success": self.success,
            "strategy": self.strategy,
            "assignments": [a.to_dict() for a in self.assignments],
            "unassigned_flights": [
                {
                    "flight_id": f.flight_id,
                    "flight_number": f.flight_number,
                    "arrival_time": f.arrival_time.isoformat(),
                    "departure_time": f.departure_time.isoformat(),
                    "priority": f.priority.value,
                    "flight_type": f.flight_type.value,
                }
                for f in self.unassigned_flights
            ],
            "conflicts": [c.to_dict() for c in self.conflicts],
            "metrics": self.metrics.to_dict(),
            "reasoning_events": [e.to_dict() for e in self.reasoning_events],
        }
