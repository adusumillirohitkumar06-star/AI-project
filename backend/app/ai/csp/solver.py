"""High-level CSP Solver coordinating domain generation, search strategies, and metrics."""
import enum
from typing import Dict, List, Optional, Set, Union

from app.ai.csp.backtracking import backtrack_search
from app.ai.csp.domains import generate_initial_domains
from app.ai.csp.events import EventEmitter, SolverEventType
from app.ai.csp.metrics import MetricsTracker
from app.ai.csp.models import FlightInput, GateInput
from app.ai.csp.result import Assignment, ConflictReport, SolverResult


class SolverStrategy(str, enum.Enum):
    """Supported algorithmic strategies."""
    BACKTRACKING = "BACKTRACKING"
    BACKTRACKING_WITH_CONSTRAINT_PROPAGATION = "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION"


class CSPSolver:
    """Enterprise Constraint Satisfaction Problem scheduler for airport gate allocation."""

    def __init__(self) -> None:
        self.event_emitter = EventEmitter()
        self.metrics_tracker = MetricsTracker()

    def solve(
        self,
        flights: List[FlightInput],
        gates: List[GateInput],
        strategy: SolverStrategy = SolverStrategy.BACKTRACKING_WITH_CONSTRAINT_PROPAGATION,
        inter_flight_buffer_minutes: int = 0,
    ) -> SolverResult:
        """Execute CSP gate allocation algorithm for the provided flights and gates.

        Args:
            flights: List of flights requiring gate allocation.
            gates: List of available airport gates.
            strategy: Solving algorithm (Basic Backtracking vs Backtracking + Forward Checking).
            inter_flight_buffer_minutes: Safety time buffer between consecutive flights at the same gate.

        Returns:
            Structured SolverResult containing assignments, metrics, and XAI reasoning events.
        """
        # Reset tracker and emitter
        self.event_emitter.clear()
        self.metrics_tracker = MetricsTracker()
        self.metrics_tracker.metrics.flights_total = len(flights)
        self.metrics_tracker.start_timer()

        # Handle trivial empty input
        if not flights:
            self.metrics_tracker.stop_timer()
            self.metrics_tracker.metrics.success = True
            return SolverResult(
                success=True,
                strategy=strategy.value,
                assignments=[],
                unassigned_flights=[],
                conflicts=[],
                metrics=self.metrics_tracker.metrics,
                reasoning_events=self.event_emitter.get_events(),
            )

        # 1. Generate Deterministic Initial Domains
        domains = generate_initial_domains(
            flights=flights,
            gates=gates,
            event_emitter=self.event_emitter,
            metrics=self.metrics_tracker,
        )

        flight_lookup: Dict[Union[int, str], FlightInput] = {f.flight_id: f for f in flights}

        # 2. Check for Initial Domain Wipeout (Early no-solution detection)
        empty_domain_flights = [f for f in flights if not domains[f.flight_id]]
        if empty_domain_flights:
            self.metrics_tracker.stop_timer()
            conflicts: List[ConflictReport] = []
            for f in empty_domain_flights:
                self.metrics_tracker.record_conflict()
                conf = ConflictReport(
                    conflict_type="UNASSIGNED_FLIGHT",
                    description=f"Flight {f.flight_number} has 0 compatible gates in airport after unary constraint filtering",
                    severity="CRITICAL",
                    flight_id=f.flight_id,
                )
                conflicts.append(conf)

            self.event_emitter.emit(
                event_type=SolverEventType.NO_SOLUTION,
                message=f"Solving aborted: {len(empty_domain_flights)} flights have no compatible gates available",
                details={"unassignable_flight_count": len(empty_domain_flights)},
            )

            return SolverResult(
                success=False,
                strategy=strategy.value,
                assignments=[],
                unassigned_flights=flights,
                conflicts=conflicts,
                metrics=self.metrics_tracker.metrics,
                reasoning_events=self.event_emitter.get_events(),
            )

        # 3. Configure Strategy Parameters
        use_propagation = (
            strategy == SolverStrategy.BACKTRACKING_WITH_CONSTRAINT_PROPAGATION
        )

        assignments_map: Dict[Union[int, str], GateInput] = {}

        # 4. Execute Backtracking Search
        solved = backtrack_search(
            assignments=assignments_map,
            unassigned_flights=list(flights),
            domains=domains,
            flight_lookup=flight_lookup,
            event_emitter=self.event_emitter,
            metrics=self.metrics_tracker,
            use_propagation=use_propagation,
            inter_flight_buffer_minutes=inter_flight_buffer_minutes,
            depth=0,
        )

        self.metrics_tracker.stop_timer()
        self.metrics_tracker.metrics.success = solved
        self.metrics_tracker.metrics.flights_assigned = len(assignments_map)

        if solved:
            # Build structured assignments
            assignments_list: List[Assignment] = []
            for flight_id, gate in assignments_map.items():
                fl = flight_lookup[flight_id]
                interval = fl.get_occupancy_interval(inter_flight_buffer_minutes=0)
                assignments_list.append(
                    Assignment(
                        flight_id=flight_id,
                        flight_number=fl.flight_number,
                        gate_id=gate.gate_id,
                        gate_code=gate.gate_code,
                        terminal_code=gate.terminal_code,
                        start_time=interval.start,
                        end_time=interval.end,
                    )
                )

            # Sort assignments deterministically by start time then gate code
            assignments_list.sort(key=lambda a: (a.start_time, a.gate_code))

            self.event_emitter.emit(
                event_type=SolverEventType.SOLUTION_FOUND,
                message=f"Optimal gate allocation solution found for all {len(flights)} flights ({self.metrics_tracker.metrics.nodes_explored} nodes explored)",
                details={
                    "assigned_count": len(assignments_list),
                    "execution_time_ms": self.metrics_tracker.metrics.execution_time_ms,
                    "backtracks": self.metrics_tracker.metrics.backtracks,
                },
            )

            return SolverResult(
                success=True,
                strategy=strategy.value,
                assignments=assignments_list,
                unassigned_flights=[],
                conflicts=[],
                metrics=self.metrics_tracker.metrics,
                reasoning_events=self.event_emitter.get_events(),
            )
        else:
            # No solution found
            unassigned_list = [f for f in flights if f.flight_id not in assignments_map]
            conflicts: List[ConflictReport] = [
                ConflictReport(
                    conflict_type="GATE_OVERLAP",
                    description=f"Could not find non-overlapping gate assignment satisfying all hard constraints",
                    severity="CRITICAL",
                )
            ]

            self.event_emitter.emit(
                event_type=SolverEventType.NO_SOLUTION,
                message=f"No valid gate allocation exists for the given flight schedules and operational constraints",
                details={
                    "unassigned_count": len(unassigned_list),
                    "nodes_explored": self.metrics_tracker.metrics.nodes_explored,
                    "backtracks": self.metrics_tracker.metrics.backtracks,
                },
            )

            return SolverResult(
                success=False,
                strategy=strategy.value,
                assignments=[],
                unassigned_flights=unassigned_list,
                conflicts=conflicts,
                metrics=self.metrics_tracker.metrics,
                reasoning_events=self.event_emitter.get_events(),
            )
