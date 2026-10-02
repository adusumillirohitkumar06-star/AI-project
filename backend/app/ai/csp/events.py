"""Explainable AI (XAI) reasoning events emitted during actual CSP solver execution."""
from dataclasses import dataclass, field
from datetime import datetime, timezone
import enum
from typing import Any, Dict, List, Optional, Union


class SolverEventType(str, enum.Enum):
    """Categorization of solver reasoning and execution milestones."""
    DOMAIN_CREATED = "DOMAIN_CREATED"
    VARIABLE_SELECTED = "VARIABLE_SELECTED"
    VALUE_CONSIDERED = "VALUE_CONSIDERED"
    CONSTRAINT_CHECK = "CONSTRAINT_CHECK"
    ASSIGNMENT_MADE = "ASSIGNMENT_MADE"
    DOMAIN_REDUCED = "DOMAIN_REDUCED"
    PROPAGATION_STARTED = "PROPAGATION_STARTED"
    PROPAGATION_COMPLETED = "PROPAGATION_COMPLETED"
    CONFLICT_DETECTED = "CONFLICT_DETECTED"
    BACKTRACK_STARTED = "BACKTRACK_STARTED"
    BACKTRACK_COMPLETED = "BACKTRACK_COMPLETED"
    SOLUTION_FOUND = "SOLUTION_FOUND"
    NO_SOLUTION = "NO_SOLUTION"


@dataclass
class ReasoningEvent:
    """Individual structured reasoning event capturing solver decision rationales."""
    step_index: int
    event_type: SolverEventType
    message: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    flight_id: Optional[Union[int, str]] = None
    gate_id: Optional[Union[int, str]] = None
    constraint: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to serializable dictionary."""
        return {
            "step_index": self.step_index,
            "event_type": self.event_type.value,
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
            "flight_id": self.flight_id,
            "gate_id": self.gate_id,
            "constraint": self.constraint,
            "details": self.details,
        }


class EventEmitter:
    """Thread-safe event collector capturing real-time solver steps."""

    def __init__(self) -> None:
        self.events: List[ReasoningEvent] = []
        self._step_counter: int = 0

    def emit(
        self,
        event_type: SolverEventType,
        message: str,
        flight_id: Optional[Union[int, str]] = None,
        gate_id: Optional[Union[int, str]] = None,
        constraint: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> ReasoningEvent:
        """Record a reasoning event."""
        self._step_counter += 1
        event = ReasoningEvent(
            step_index=self._step_counter,
            event_type=event_type,
            message=message,
            flight_id=flight_id,
            gate_id=gate_id,
            constraint=constraint,
            details=details or {},
        )
        self.events.append(event)
        return event

    def get_events(self) -> List[ReasoningEvent]:
        """Retrieve all recorded reasoning events."""
        return list(self.events)

    def clear(self) -> None:
        """Reset the event log."""
        self.events.clear()
        self._step_counter = 0
