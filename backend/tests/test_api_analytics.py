"""Integration tests for Phase 15: Analytics & Performance Dashboard API endpoints."""
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.airport import Airport
from app.models.aircraft import Aircraft, AircraftCategory
from app.models.flight import Flight, FlightStatus, FlightPriority, FlightType
from app.models.gate import Gate
from app.models.terminal import Terminal
from app.models.assignment import GateAssignment, AssignmentStatus
from app.models.conflict import Conflict, ConflictType, ConflictSeverity
from app.models.solver import SolverRun, SolverStrategy


def test_analytics_endpoints(client: TestClient, db_session: Session):
    """Test full suite of analytics endpoints with real seeded database records."""
    # 1. Seed Airport, Terminal, Gate, Aircraft
    airport = Airport(
        iata_code="ANL",
        icao_code="KANL",
        name="Analytics Intl",
        city="Boston",
        country="USA",
        latitude=42.36,
        longitude=-71.05,
        timezone="UTC",
    )
    db_session.add(airport)
    db_session.commit()

    terminal = Terminal(airport_id=airport.id, terminal_code="T1", name="Terminal 1")
    db_session.add(terminal)
    db_session.commit()

    gate1 = Gate(
        terminal_id=terminal.id,
        gate_code="A1",
        max_aircraft_size="WIDE_BODY",
        is_active=True,
    )
    gate2 = Gate(
        terminal_id=terminal.id,
        gate_code="A2",
        max_aircraft_size="NARROW_BODY",
        is_active=True,
    )
    db_session.add_all([gate1, gate2])
    db_session.commit()

    aircraft = Aircraft(
        registration="N-ANL1",
        model="B737-800",
        aircraft_type="B738",
        category=AircraftCategory.NARROW_BODY,
        airline="Alpha Air",
    )
    db_session.add(aircraft)
    db_session.commit()

    # 2. Seed Flights with delays
    now = datetime.now(timezone.utc)
    f1 = Flight(
        flight_number="AA100",
        airline="Alpha Air",
        origin_airport_id=airport.id,
        destination_airport_id=airport.id,
        aircraft_id=aircraft.id,
        scheduled_arrival=now,
        scheduled_departure=now + timedelta(minutes=60),
        status=FlightStatus.SCHEDULED,
        priority=FlightPriority.NORMAL,
        flight_type=FlightType.DOMESTIC,
        delay_duration_minutes=30,
        delay_reason="WEATHER",
    )
    f2 = Flight(
        flight_number="AA200",
        airline="Alpha Air",
        origin_airport_id=airport.id,
        destination_airport_id=airport.id,
        aircraft_id=aircraft.id,
        scheduled_arrival=now + timedelta(minutes=90),
        scheduled_departure=now + timedelta(minutes=150),
        status=FlightStatus.IN_AIR,
        priority=FlightPriority.VIP,
        flight_type=FlightType.INTERNATIONAL,
        delay_duration_minutes=0,
        delay_reason=None,
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    # 3. Seed GateAssignment (60 min occupancy on Gate A1)
    asg = GateAssignment(
        flight_id=f1.id,
        gate_id=gate1.id,
        assignment_start_time=f1.scheduled_arrival,
        assignment_end_time=f1.scheduled_departure,
        status=AssignmentStatus.CONFIRMED,
        source="CSP_SOLVER",
    )
    db_session.add(asg)

    # 4. Seed Conflict
    conflict = Conflict(
        conflict_type=ConflictType.GATE_OVERLAP,
        severity=ConflictSeverity.HIGH,
        is_resolved=False,
        flight_id=f1.id,
        gate_id=gate1.id,
        description="Gate overlap detected",
        detected_at=now,
    )
    db_session.add(conflict)

    # 5. Seed SolverRun
    run = SolverRun(
        strategy=SolverStrategy.BACKTRACKING_CONSTRAINT_PROPAGATION,
        started_at=now,
        completed_at=now + timedelta(milliseconds=15),
        execution_time_ms=15.0,
        flights_considered=2,
        assignments_produced=2,
        nodes_explored=4,
        backtracks_count=0,
        conflicts_count=0,
        is_success=True,
        solver_configuration={"trigger": "MANUAL"},
        metadata_json={"reasoning_events": []},
    )
    db_session.add(run)
    db_session.commit()

    # TEST Overview endpoint
    resp = client.get("/api/v1/analytics/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_flights"] >= 2
    assert data["assigned_flights"] >= 1
    assert data["delayed_flights"] >= 1
    assert data["total_delay_minutes"] >= 30
    assert data["active_conflicts"] >= 1
    assert data["total_solver_runs"] >= 1

    # TEST Overview with airport filter
    resp_apt = client.get(f"/api/v1/analytics/overview?airport_id={airport.id}")
    assert resp_apt.status_code == 200
    data_apt = resp_apt.json()
    assert data_apt["total_flights"] == 2
    assert data_apt["assigned_flights"] == 1
    assert data_apt["total_gates"] == 2
    assert data_apt["gates_used"] == 1

    # TEST Flights analytics
    resp_flights = client.get(f"/api/v1/analytics/flights?airport_id={airport.id}")
    assert resp_flights.status_code == 200
    f_data = resp_flights.json()
    assert f_data["total_flights"] == 2
    assert f_data["by_status"]["SCHEDULED"] >= 1
    assert f_data["by_status"]["IN_AIR"] >= 1
    assert f_data["by_priority"]["VIP"] >= 1
    assert f_data["delay_summary"]["delayed_count"] == 1
    assert f_data["delay_summary"]["by_reason"]["WEATHER"] == 1

    # TEST Gates utilization
    resp_gates = client.get(f"/api/v1/analytics/gates?airport_id={airport.id}")
    assert resp_gates.status_code == 200
    g_data = resp_gates.json()
    assert g_data["total_gates"] == 2
    assert g_data["active_gates"] == 2
    assert g_data["gates_used"] == 1
    assert g_data["total_occupied_minutes"] == 60  # Departure - Arrival = 60 min
    assert len(g_data["gates"]) == 2
    # Gate A1 should have 60 min occupied
    a1_item = next(g for g in g_data["gates"] if g["gate_code"] == "A1")
    assert a1_item["occupied_minutes"] == 60
    assert a1_item["flight_count"] == 1

    # TEST Conflicts analytics
    resp_conflicts = client.get("/api/v1/analytics/conflicts")
    assert resp_conflicts.status_code == 200
    c_data = resp_conflicts.json()
    assert c_data["total_conflicts"] >= 1
    assert c_data["open_conflicts"] >= 1
    assert c_data["by_type"]["GATE_OVERLAP"] >= 1

    # TEST Solver performance
    resp_solver = client.get("/api/v1/analytics/solver")
    assert resp_solver.status_code == 200
    s_data = resp_solver.json()
    assert s_data["total_runs"] >= 1
    assert s_data["successful_runs"] >= 1
    assert len(s_data["strategy_comparison"]) >= 1
    assert len(s_data["runs_history"]) >= 1

    # TEST Rescheduling analytics
    resp_resched = client.get("/api/v1/analytics/rescheduling")
    assert resp_resched.status_code == 200
    assert "total_reschedule_events" in resp_resched.json()
