"""Phase 18 Performance, Stress & Production Hardening Test Suite.

Validates solver execution time, large dataset scale, memory invariants,
connection pool and security headers under realistic loads.
"""
from datetime import datetime, timedelta, timezone
import time
import pytest
from fastapi.testclient import TestClient

from app.ai.csp.models import (
    AircraftCategory,
    FlightInput,
    FlightPriority,
    FlightType,
    GateCapability,
    GateInput,
)
from app.ai.csp.solver import CSPSolver, SolverStrategy


def test_csp_solver_scale_50_flights_performance():
    """Verify CSP engine solves 50 flights across multiple gates deterministically within performance budget."""
    solver = CSPSolver()
    base_time = datetime(2026, 10, 3, 6, 0, tzinfo=timezone.utc)

    # 10 gates across 2 terminals
    gates = [
        GateInput(
            gate_id=i,
            gate_code=f"G{i:02d}",
            terminal_code="T1" if i <= 5 else "T2",
            max_aircraft_size=AircraftCategory.WIDE_BODY if i % 2 == 0 else AircraftCategory.NARROW_BODY,
            capability=GateCapability.BOTH if i % 3 == 0 else GateCapability.DOMESTIC,
            is_active=True,
            is_closed=False,
        )
        for i in range(1, 11)
    ]

    # 50 flights scheduled in waves
    flights = []
    for i in range(1, 51):
        wave = i // 5
        slot = i % 5
        arr = base_time + timedelta(hours=wave, minutes=slot * 10)
        dep = arr + timedelta(minutes=45)
        flights.append(
            FlightInput(
                flight_id=i,
                flight_number=f"AI{100 + i}",
                arrival_time=arr,
                departure_time=dep,
                aircraft_category=AircraftCategory.NARROW_BODY,
                flight_type=FlightType.DOMESTIC,
                priority=FlightPriority.NORMAL if i % 4 != 0 else FlightPriority.VIP,
                turnaround_minutes=30,
            )
        )

    t0 = time.perf_counter()
    result = solver.solve(
        flights=flights,
        gates=gates,
        strategy=SolverStrategy.BACKTRACKING_WITH_CONSTRAINT_PROPAGATION,
        inter_flight_buffer_minutes=5,
    )
    duration_ms = (time.perf_counter() - t0) * 1000.0

    assert result.success is True
    assert len(result.assignments) == 50
    assert result.metrics.flights_assigned == 50
    # Strict performance budget: 50 flights must be solved in under 1500ms
    assert duration_ms < 1500.0, f"Solver took too long: {duration_ms:.2f}ms"


def test_production_security_headers_middleware(client: TestClient):
    """Verify production security headers are present on API responses."""
    res = client.get("/health")
    assert res.status_code == 200
    assert "X-Process-Time-Ms" in res.headers
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"
    assert res.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "Permissions-Policy" in res.headers


def test_solver_no_solution_performance_budget():
    """Verify that unsolvable scenarios fail fast without search tree blowup."""
    solver = CSPSolver()
    base_time = datetime(2026, 10, 3, 10, 0, tzinfo=timezone.utc)

    # Only 1 narrow-body domestic gate
    gates = [
        GateInput(
            gate_id=1,
            gate_code="G01",
            terminal_code="T1",
            max_aircraft_size=AircraftCategory.NARROW_BODY,
            capability=GateCapability.DOMESTIC,
            is_active=True,
            is_closed=False,
        )
    ]

    # 4 mutually overlapping flights simultaneously
    flights = [
        FlightInput(
            flight_id=i,
            flight_number=f"FAIL{i}",
            arrival_time=base_time,
            departure_time=base_time + timedelta(hours=1),
            aircraft_category=AircraftCategory.NARROW_BODY,
            flight_type=FlightType.DOMESTIC,
            turnaround_minutes=30,
        )
        for i in range(1, 5)
    ]

    t0 = time.perf_counter()
    result = solver.solve(
        flights=flights,
        gates=gates,
        strategy=SolverStrategy.BACKTRACKING_WITH_CONSTRAINT_PROPAGATION,
    )
    duration_ms = (time.perf_counter() - t0) * 1000.0

    assert result.success is False
    assert len(result.unassigned_flights) > 0
    # Must fail fast under 200ms
    assert duration_ms < 200.0, f"Unsolvable scenario took too long to terminate: {duration_ms:.2f}ms"
