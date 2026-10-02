"""Schemas for Analytics & Performance Dashboard endpoints."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AnalyticsOverviewResponse(BaseModel):
    """Factual summary metrics for airport operations."""
    total_flights: int = Field(..., description="Total flights in database or filter window")
    assigned_flights: int = Field(..., description="Flights with valid gate assignments")
    unassigned_flights: int = Field(..., description="Flights with no gate assignment")
    total_gates: int = Field(..., description="Total gates registered in inventory")
    gates_used: int = Field(..., description="Distinct gates with at least one assignment")
    active_conflicts: int = Field(..., description="Currently unresolved operational conflicts")
    delayed_flights: int = Field(..., description="Flights experiencing operational delay")
    total_delay_minutes: int = Field(..., description="Cumulative delay minutes across flights")
    avg_delay_minutes: float = Field(..., description="Average delay in minutes per delayed flight")
    max_delay_minutes: int = Field(..., description="Maximum single delay recorded")
    total_solver_runs: int = Field(..., description="Total CSP solver runs recorded")
    successful_solver_runs: int = Field(..., description="Successful CSP solver runs")


class AirportFlightCount(BaseModel):
    airport_id: int
    airport_code: str
    airport_name: str
    city: str
    departures: int
    arrivals: int


class FlightDelaySummary(BaseModel):
    delayed_count: int
    total_delay_minutes: int
    avg_delay_minutes: float
    max_delay_minutes: int
    by_reason: Dict[str, int]


class FlightAnalyticsResponse(BaseModel):
    """Detailed operational flight distribution analytics."""
    total_flights: int
    by_status: Dict[str, int]
    by_priority: Dict[str, int]
    by_flight_type: Dict[str, int]
    by_airport: List[AirportFlightCount]
    delay_summary: FlightDelaySummary


class GateUtilizationItem(BaseModel):
    gate_id: int
    gate_code: str
    terminal_code: str
    airport_code: str
    max_aircraft_size: str
    is_active: bool
    flight_count: int
    occupied_minutes: int
    utilization_percentage: float


class GateUtilizationResponse(BaseModel):
    """Gate capacity and utilization analytics based strictly on arrival->departure occupancy."""
    total_gates: int
    active_gates: int
    gates_used: int
    total_occupied_minutes: int
    overall_utilization_percentage: float
    analysis_window_minutes: int
    gates: List[GateUtilizationItem]


class ConflictTimelineItem(BaseModel):
    date_str: str
    count: int


class ConflictAnalyticsResponse(BaseModel):
    """Conflict diagnostics and distribution analytics."""
    total_conflicts: int
    open_conflicts: int
    resolved_conflicts: int
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
    timeline: List[ConflictTimelineItem]


class StrategyMetricSummary(BaseModel):
    strategy: str
    run_count: int
    success_count: int
    avg_execution_time_ms: float
    avg_nodes_explored: float
    avg_backtracks: float
    avg_assignments: float
    avg_constraint_checks: float


class SolverRunHistoryPoint(BaseModel):
    run_id: int
    strategy: str
    is_success: bool
    execution_time_ms: float
    nodes_explored: int
    backtracks_count: int
    created_at: str


class SolverPerformanceResponse(BaseModel):
    """CSP solver execution telemetry and strategy comparison."""
    total_runs: int
    successful_runs: int
    failed_runs: int
    avg_execution_time_ms: float
    total_nodes_explored: int
    total_backtracks: int
    strategy_comparison: List[StrategyMetricSummary]
    runs_history: List[SolverRunHistoryPoint]


class ReschedulingAnalyticsResponse(BaseModel):
    """Dynamic rescheduling and operational delay handling telemetry."""
    total_reschedule_events: int
    delays_applied: int
    reassignments_succeeded: int
    reassignments_failed: int
    conflicts_resolved: int
    affected_flights_count: int
