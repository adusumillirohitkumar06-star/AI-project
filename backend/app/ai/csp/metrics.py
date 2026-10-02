"""Real performance metrics collected during actual CSP solver execution."""
from dataclasses import dataclass
import time
from typing import Any, Dict


@dataclass
class SolverMetrics:
    """Quantitative performance and search space exploration metrics."""
    execution_time_ms: float = 0.0
    nodes_explored: int = 0
    assignments_attempted: int = 0
    backtracks: int = 0
    constraint_checks: int = 0
    conflicts_detected: int = 0
    flights_total: int = 0
    flights_assigned: int = 0
    domain_reductions: int = 0
    propagation_steps: int = 0
    maximum_search_depth: int = 0
    success: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary."""
        return {
            "execution_time_ms": round(self.execution_time_ms, 2),
            "nodes_explored": self.nodes_explored,
            "assignments_attempted": self.assignments_attempted,
            "backtracks": self.backtracks,
            "constraint_checks": self.constraint_checks,
            "conflicts_detected": self.conflicts_detected,
            "flights_total": self.flights_total,
            "flights_assigned": self.flights_assigned,
            "domain_reductions": self.domain_reductions,
            "propagation_steps": self.propagation_steps,
            "maximum_search_depth": self.maximum_search_depth,
            "success": self.success,
        }


class MetricsTracker:
    """Real-time performance tracker with timing stopwatch."""

    def __init__(self) -> None:
        self.metrics = SolverMetrics()
        self._start_perf: float = 0.0

    def start_timer(self) -> None:
        """Start the execution clock."""
        self._start_perf = time.perf_counter()

    def stop_timer(self) -> None:
        """Stop the execution clock and record elapsed milliseconds."""
        if self._start_perf > 0:
            elapsed_sec = time.perf_counter() - self._start_perf
            self.metrics.execution_time_ms = elapsed_sec * 1000.0

    def record_node_explored(self, depth: int) -> None:
        """Record search node expansion and update maximum depth reached."""
        self.metrics.nodes_explored += 1
        if depth > self.metrics.maximum_search_depth:
            self.metrics.maximum_search_depth = depth

    def record_assignment_attempt(self) -> None:
        """Increment count of attempted gate assignments."""
        self.metrics.assignments_attempted += 1

    def record_backtrack(self) -> None:
        """Increment backtracks counter."""
        self.metrics.backtracks += 1

    def record_constraint_check(self) -> None:
        """Increment evaluated constraint counter."""
        self.metrics.constraint_checks += 1

    def record_conflict(self) -> None:
        """Increment detected conflicts counter."""
        self.metrics.conflicts_detected += 1

    def record_domain_reduction(self, count: int = 1) -> None:
        """Increment count of gate values pruned from domains."""
        self.metrics.domain_reductions += count

    def record_propagation_step(self) -> None:
        """Increment inference/propagation steps executed."""
        self.metrics.propagation_steps += 1
