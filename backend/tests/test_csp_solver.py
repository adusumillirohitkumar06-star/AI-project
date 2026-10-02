"""Comprehensive test suite for the Pure Python CSP Scheduling Engine.

Covers all 12 core test scenarios:
1. Simple assignment
2. Non-overlapping same gate
3. Overlapping flights
4. Aircraft incompatibility
5. International restriction
6. Closed gate
7. Terminal restriction
8. MRV heuristic
9. Forward checking
10. Backtracking search recovery
11. No-solution detection
12. Priority tie-breaking with hard constraints
Plus algorithmic strategy comparison (Basic Backtracking vs Backtracking + Forward Checking).
"""
from datetime import datetime, timedelta, timezone
import pytest

from app.ai.csp import (
    AircraftCategory,
    CSPSolver,
    FlightInput,
    FlightPriority,
    FlightType,
    GateCapability,
    GateInput,
    SolverEventType,
    SolverStrategy,
)


@pytest.fixture
def base_time():
    """Standard anchor timestamp for deterministic test time intervals."""
    return datetime(2026, 10, 2, 10, 0, 0, tzinfo=timezone.utc)


def test_scenario_1_simple_assignment(base_time):
    """Test 1 — Simple Assignment: 2 flights, 2 compatible gates -> both assigned."""
    f1 = FlightInput(
        flight_id="F1",
        flight_number="AA101",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
        aircraft_category=AircraftCategory.NARROW_BODY,
        flight_type=FlightType.DOMESTIC,
    )
    f2 = FlightInput(
        flight_id="F2",
        flight_number="DL202",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
        aircraft_category=AircraftCategory.NARROW_BODY,
        flight_type=FlightType.DOMESTIC,
    )

    g1 = GateInput(gate_id="G1", gate_code="A1", terminal_code="T1")
    g2 = GateInput(gate_id="G2", gate_code="A2", terminal_code="T1")

    solver = CSPSolver()
    result = solver.solve([f1, f2], [g1, g2])

    assert result.success is True
    assert len(result.assignments) == 2
    assigned_gates = {a.gate_id for a in result.assignments}
    assert assigned_gates == {"G1", "G2"}
    assert result.metrics.flights_assigned == 2


def test_scenario_2_non_overlapping_same_gate(base_time):
    """Test 2 — Non-overlapping Same Gate: Two flights use the same gate at different times."""
    f1 = FlightInput(
        flight_id="F1",
        flight_number="UA101",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
    )
    # Flight 2 arrives after Flight 1 departs
    f2 = FlightInput(
        flight_id="F2",
        flight_number="UA102",
        arrival_time=base_time + timedelta(hours=1, minutes=30),
        departure_time=base_time + timedelta(hours=2, minutes=30),
    )

    # Only 1 gate available
    g1 = GateInput(gate_id="G1", gate_code="B10", terminal_code="T2")

    solver = CSPSolver()
    result = solver.solve([f1, f2], [g1])

    assert result.success is True
    assert len(result.assignments) == 2
    assert all(a.gate_id == "G1" for a in result.assignments)


def test_scenario_3_overlapping_flights(base_time):
    """Test 3 — Overlapping Flights: Two flights require same gate at overlapping times."""
    f1 = FlightInput(
        flight_id="F1",
        flight_number="BA101",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1, minutes=30),
    )
    # Overlaps with F1
    f2 = FlightInput(
        flight_id="F2",
        flight_number="BA102",
        arrival_time=base_time + timedelta(minutes=45),
        departure_time=base_time + timedelta(hours=2),
    )

    # Only 1 gate available -> conflict must prevent invalid double-assignment
    g1 = GateInput(gate_id="G1", gate_code="C1", terminal_code="T3")

    solver = CSPSolver()
    result = solver.solve([f1, f2], [g1])

    assert result.success is False
    assert len(result.assignments) == 0
    assert len(result.unassigned_flights) > 0
    assert any(c.conflict_type == "GATE_OVERLAP" for c in result.conflicts)


def test_scenario_4_aircraft_incompatibility(base_time):
    """Test 4 — Aircraft Incompatibility: Heavy/Wide-body aircraft cannot use Regional-only gate."""
    # Wide-body Boeing 777
    heavy_flight = FlightInput(
        flight_id="F_WIDE",
        flight_number="EK201",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=2),
        aircraft_category=AircraftCategory.WIDE_BODY,
    )

    small_gate = GateInput(
        gate_id="G_SMALL",
        gate_code="R1",
        terminal_code="T1",
        supported_aircraft_categories={AircraftCategory.REGIONAL},
        max_aircraft_size=AircraftCategory.REGIONAL,
    )
    large_gate = GateInput(
        gate_id="G_LARGE",
        gate_code="W1",
        terminal_code="T1",
        supported_aircraft_categories={AircraftCategory.WIDE_BODY, AircraftCategory.HEAVY},
        max_aircraft_size=AircraftCategory.HEAVY,
    )

    solver = CSPSolver()
    result = solver.solve([heavy_flight], [small_gate, large_gate])

    assert result.success is True
    assert len(result.assignments) == 1
    # Must be assigned to large gate only
    assert result.assignments[0].gate_id == "G_LARGE"


def test_scenario_5_international_restriction(base_time):
    """Test 5 — International Restriction: International flight cannot use domestic-only gate."""
    intl_flight = FlightInput(
        flight_id="F_INTL",
        flight_number="AF006",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=2),
        flight_type=FlightType.INTERNATIONAL,
    )

    domestic_gate = GateInput(
        gate_id="G_DOM",
        gate_code="D1",
        terminal_code="T1",
        capability=GateCapability.DOMESTIC,
    )
    intl_gate = GateInput(
        gate_id="G_INTL",
        gate_code="I1",
        terminal_code="T1",
        capability=GateCapability.INTERNATIONAL,
    )

    solver = CSPSolver()
    result = solver.solve([intl_flight], [domestic_gate, intl_gate])

    assert result.success is True
    assert result.assignments[0].gate_id == "G_INTL"


def test_scenario_6_closed_gate(base_time):
    """Test 6 — Closed Gate: Closed gate cannot be assigned."""
    flight = FlightInput(
        flight_id="F1",
        flight_number="LH400",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
    )

    closed_gate = GateInput(
        gate_id="G_CLOSED",
        gate_code="A10",
        terminal_code="T1",
        is_closed=True,
        closure_reason="Runway taxiway sinkhole maintenance",
    )
    open_gate = GateInput(
        gate_id="G_OPEN",
        gate_code="A11",
        terminal_code="T1",
        is_closed=False,
    )

    solver = CSPSolver()
    result = solver.solve([flight], [closed_gate, open_gate])

    assert result.success is True
    assert result.assignments[0].gate_id == "G_OPEN"


def test_scenario_7_terminal_restriction(base_time):
    """Test 7 — Terminal Restriction: Flight requires Terminal 2, Terminal 1 gates invalid."""
    flight = FlightInput(
        flight_id="F_T2",
        flight_number="VS10",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
        required_terminal="T2",
    )

    gate_t1 = GateInput(gate_id="G_T1", gate_code="101", terminal_code="T1")
    gate_t2 = GateInput(gate_id="G_T2", gate_code="201", terminal_code="T2")

    solver = CSPSolver()
    result = solver.solve([flight], [gate_t1, gate_t2])

    assert result.success is True
    assert result.assignments[0].gate_id == "G_T2"
    assert result.assignments[0].terminal_code == "T2"


def test_scenario_8_mrv_heuristic(base_time):
    """Test 8 — MRV Heuristic: Flight with fewer remaining valid gates selected first."""
    # F_RESTRICTED can only use Gate B (Terminal 2)
    f_restricted = FlightInput(
        flight_id="F_RESTRICTED",
        flight_number="MRV_FEW",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
        required_terminal="T2",
    )
    # F_FLEXIBLE can use Gate A or Gate B (both terminals)
    f_flexible = FlightInput(
        flight_id="F_FLEXIBLE",
        flight_number="MRV_MANY",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
    )

    gate_t1 = GateInput(gate_id="G1", gate_code="A1", terminal_code="T1")
    gate_t2 = GateInput(gate_id="G2", gate_code="B1", terminal_code="T2")

    solver = CSPSolver()
    result = solver.solve([f_flexible, f_restricted], [gate_t1, gate_t2])

    assert result.success is True
    # Verify MRV event occurred: F_RESTRICTED was selected first
    variable_selected_events = [
        e for e in result.reasoning_events if e.event_type == SolverEventType.VARIABLE_SELECTED
    ]
    assert len(variable_selected_events) > 0
    # First selected variable should be the one with domain size 1 (F_RESTRICTED)
    first_selection = variable_selected_events[0]
    assert first_selection.flight_id == "F_RESTRICTED"
    assert first_selection.details["domain_size"] == 1


def test_scenario_9_forward_checking(base_time):
    """Test 9 — Forward Checking: Assignment prunes overlapping domains, causing early backtrack."""
    # F1 and F2 overlap
    f1 = FlightInput(
        flight_id="F1",
        flight_number="FC1",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
    )
    f2 = FlightInput(
        flight_id="F2",
        flight_number="FC2",
        arrival_time=base_time + timedelta(minutes=15),
        departure_time=base_time + timedelta(hours=1, minutes=15),
    )

    # Only 1 gate available
    g1 = GateInput(gate_id="G1", gate_code="FC_GATE", terminal_code="T1")

    solver = CSPSolver()
    result = solver.solve(
        [f1, f2],
        [g1],
        strategy=SolverStrategy.BACKTRACKING_WITH_CONSTRAINT_PROPAGATION,
    )

    # Must fail cleanly and report conflict via forward checking
    assert result.success is False
    domain_reduced_events = [
        e for e in result.reasoning_events if e.event_type == SolverEventType.DOMAIN_REDUCED
    ]
    assert len(domain_reduced_events) > 0


def test_scenario_10_backtracking_recovery(base_time):
    """Test 10 — Backtracking: First attempted choice causes dead-end; solver backtracks and finds solution."""
    # F1 can use G1 or G2
    f1 = FlightInput(
        flight_id="F1",
        flight_number="BT1",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
    )
    # F2 can ONLY use G1 (e.g. required terminal T1) and overlaps with F1
    f2 = FlightInput(
        flight_id="F2",
        flight_number="BT2",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
        required_terminal="T1",
    )

    # G1 in T1, G2 in T2
    g1 = GateInput(gate_id="G1", gate_code="A1", terminal_code="T1")
    g2 = GateInput(gate_id="G2", gate_code="B1", terminal_code="T2")

    solver = CSPSolver()
    result = solver.solve([f1, f2], [g1, g2])

    assert result.success is True
    # F2 must receive G1 and F1 must receive G2
    assignments_by_flight = {a.flight_id: a.gate_id for a in result.assignments}
    assert assignments_by_flight["F2"] == "G1"
    assert assignments_by_flight["F1"] == "G2"


def test_scenario_11_no_solution(base_time):
    """Test 11 — No Solution: 3 international flights, only 1 international gate, overlapping times."""
    f1 = FlightInput(
        flight_id="F1",
        flight_number="INT1",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=2),
        flight_type=FlightType.INTERNATIONAL,
    )
    f2 = FlightInput(
        flight_id="F2",
        flight_number="INT2",
        arrival_time=base_time + timedelta(minutes=30),
        departure_time=base_time + timedelta(hours=2, minutes=30),
        flight_type=FlightType.INTERNATIONAL,
    )
    f3 = FlightInput(
        flight_id="F3",
        flight_number="INT3",
        arrival_time=base_time + timedelta(minutes=45),
        departure_time=base_time + timedelta(hours=2, minutes=45),
        flight_type=FlightType.INTERNATIONAL,
    )

    intl_gate = GateInput(
        gate_id="G_INTL",
        gate_code="I1",
        terminal_code="T1",
        capability=GateCapability.INTERNATIONAL,
    )
    # Domestic gate cannot be used by international flights
    dom_gate = GateInput(
        gate_id="G_DOM",
        gate_code="D1",
        terminal_code="T1",
        capability=GateCapability.DOMESTIC,
    )

    solver = CSPSolver()
    result = solver.solve([f1, f2, f3], [intl_gate, dom_gate])

    assert result.success is False
    assert len(result.assignments) == 0
    assert len(result.unassigned_flights) > 0
    # Must emit NO_SOLUTION event
    no_solution_events = [
        e for e in result.reasoning_events if e.event_type == SolverEventType.NO_SOLUTION
    ]
    assert len(no_solution_events) > 0


def test_scenario_12_priority_with_hard_constraints(base_time):
    """Test 12 — Priority: EMERGENCY flight prioritized in ordering, but hard constraints strictly enforced."""
    emergency_flight = FlightInput(
        flight_id="F_EMERGENCY",
        flight_number="MEDEVAC911",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
        priority=FlightPriority.EMERGENCY,
        flight_type=FlightType.INTERNATIONAL,
    )
    normal_flight = FlightInput(
        flight_id="F_NORMAL",
        flight_number="COMMERCIAL1",
        arrival_time=base_time,
        departure_time=base_time + timedelta(hours=1),
        priority=FlightPriority.NORMAL,
        flight_type=FlightType.DOMESTIC,
    )

    # Only 1 gate available, but it is DOMESTIC only!
    domestic_only_gate = GateInput(
        gate_id="G_DOM",
        gate_code="D10",
        terminal_code="T1",
        capability=GateCapability.DOMESTIC,
    )

    solver = CSPSolver()
    result = solver.solve([emergency_flight, normal_flight], [domestic_only_gate])

    # Emergency flight cannot violate international/domestic constraint even though priority is EMERGENCY!
    # Therefore, normal domestic flight gets the gate, and emergency flight is not given an invalid gate.
    assert result.success is False  # Cannot assign all flights
    # Verify the domestic gate was never assigned to the emergency international flight
    emergency_assigned = any(
        a.flight_id == "F_EMERGENCY" and a.gate_id == "G_DOM" for a in result.assignments
    )
    assert emergency_assigned is False


def test_solver_strategy_comparison(base_time):
    """Verify execution comparison between basic Backtracking and Backtracking + Propagation."""
    # Set up 4 overlapping flights and 3 gates
    flights = [
        FlightInput(
            flight_id=f"F{i}",
            flight_number=f"FL{i}",
            arrival_time=base_time + timedelta(minutes=i * 15),
            departure_time=base_time + timedelta(minutes=i * 15 + 45),
        )
        for i in range(4)
    ]
    gates = [
        GateInput(gate_id=f"G{j}", gate_code=f"Gate{j}", terminal_code="T1")
        for j in range(3)
    ]

    solver = CSPSolver()

    res_bt = solver.solve(flights, gates, strategy=SolverStrategy.BACKTRACKING)
    res_fc = solver.solve(
        flights, gates, strategy=SolverStrategy.BACKTRACKING_WITH_CONSTRAINT_PROPAGATION
    )

    assert res_bt.success is True
    assert res_fc.success is True
    assert res_bt.strategy == "BACKTRACKING"
    assert res_fc.strategy == "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION"

    # Both must have genuine positive metrics
    assert res_bt.metrics.execution_time_ms >= 0.0
    assert res_fc.metrics.execution_time_ms >= 0.0
    assert res_bt.metrics.nodes_explored > 0
    assert res_fc.metrics.nodes_explored > 0
    assert res_fc.metrics.propagation_steps > 0
