"""Tests for SQLAlchemy ORM models, relationships, and metadata validation."""
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
import pytest

from app.core.database import Base
from app.models import (
    Airport,
    Terminal,
    Gate,
    GateCapability,
    Aircraft,
    AircraftCategory,
    Flight,
    FlightPriority,
    FlightStatus,
    FlightType,
    GateAssignment,
    AssignmentStatus,
    SimulationEvent,
    SimulationEventType,
    Conflict,
    ConflictSeverity,
    ConflictType,
    SolverRun,
    SolverStrategy,
    User,
    UserRole,
)


@pytest.fixture(scope="module")
def db_session():
    """In-memory SQLite database session fixture for model testing."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


def test_metadata_tables_registered():
    """Verify that all 10 required domain tables are registered in Base.metadata."""
    expected_tables = {
        "users",
        "airports",
        "terminals",
        "gates",
        "aircraft",
        "flights",
        "gate_assignments",
        "simulation_events",
        "conflicts",
        "solver_runs",
    }
    actual_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(actual_tables), f"Missing tables: {expected_tables - actual_tables}"


def test_create_user(db_session):
    """Verify User model creation and defaults."""
    user = User(
        name="Airport Operator",
        email="operator@airport.test",
        password_hash="$2b$12$fakehashedpasswordfortest123",
        role=UserRole.OPERATOR,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert user.is_active is True
    assert user.role == UserRole.OPERATOR


def test_user_email_unique_constraint(db_session):
    """Verify duplicate user email violation."""
    duplicate_user = User(
        name="Duplicate User",
        email="operator@airport.test",
        password_hash="anyhash",
        role=UserRole.VIEWER,
    )
    db_session.add(duplicate_user)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_airport_terminal_gate_hierarchy(db_session):
    """Verify Airport -> Terminal -> Gate hierarchy and cascading relationships."""
    airport = Airport(
        iata_code="JFK",
        icao_code="KJFK",
        name="John F. Kennedy International Airport",
        city="New York",
        country="USA",
        latitude=40.6413,
        longitude=-73.7781,
        timezone="America/New_York",
    )
    db_session.add(airport)
    db_session.commit()
    db_session.refresh(airport)

    terminal = Terminal(
        airport_id=airport.id,
        terminal_code="T4",
        name="International Terminal 4",
    )
    db_session.add(terminal)
    db_session.commit()
    db_session.refresh(terminal)

    gate = Gate(
        terminal_id=terminal.id,
        gate_code="B22",
        capability=GateCapability.BOTH,
        supported_aircraft_types="WIDE_BODY,HEAVY",
        max_aircraft_size="HEAVY",
    )
    db_session.add(gate)
    db_session.commit()
    db_session.refresh(gate)

    # Test relationships
    assert len(airport.terminals) == 1
    assert airport.terminals[0].terminal_code == "T4"
    assert len(terminal.gates) == 1
    assert terminal.gates[0].gate_code == "B22"
    assert gate.terminal.airport.iata_code == "JFK"


def test_aircraft_and_flight_lifecycle(db_session):
    """Verify Aircraft, Flight, and GateAssignment relationship flow."""
    # Lookup airport
    jfk = db_session.query(Airport).filter_by(iata_code="JFK").first()

    # Create destination airport
    lhr = Airport(
        iata_code="LHR",
        icao_code="EGLL",
        name="London Heathrow Airport",
        city="London",
        country="UK",
        latitude=51.4700,
        longitude=-0.4543,
        timezone="Europe/London",
    )
    db_session.add(lhr)
    db_session.commit()

    aircraft = Aircraft(
        registration="N101AA",
        model="Boeing 777-300ER",
        aircraft_type="B77W",
        airline="American Airlines",
        capacity=304,
        category=AircraftCategory.WIDE_BODY,
    )
    db_session.add(aircraft)
    db_session.commit()

    now = datetime.datetime.now(datetime.timezone.utc)
    arrival_time = now + datetime.timedelta(hours=2)
    departure_time = arrival_time + datetime.timedelta(hours=1, minutes=30)

    flight = Flight(
        flight_number="AA100",
        airline="American Airlines",
        origin_airport_id=jfk.id,
        destination_airport_id=lhr.id,
        aircraft_id=aircraft.id,
        scheduled_arrival=arrival_time,
        scheduled_departure=departure_time,
        flight_type=FlightType.INTERNATIONAL,
        priority=FlightPriority.VIP,
        status=FlightStatus.SCHEDULED,
    )
    db_session.add(flight)
    db_session.commit()
    db_session.refresh(flight)

    assert flight.id is not None
    assert flight.origin_airport.iata_code == "JFK"
    assert flight.destination_airport.iata_code == "LHR"
    assert flight.aircraft.registration == "N101AA"

    # Solver Run and Assignment
    solver_run = SolverRun(
        strategy=SolverStrategy.BACKTRACKING_CONSTRAINT_PROPAGATION,
        flights_considered=1,
        assignments_produced=1,
        nodes_explored=4,
        backtracks_count=0,
        execution_time_ms=12.4,
        is_success=True,
    )
    db_session.add(solver_run)
    db_session.commit()

    gate = db_session.query(Gate).filter_by(gate_code="B22").first()
    assignment = GateAssignment(
        flight_id=flight.id,
        gate_id=gate.id,
        solver_run_id=solver_run.id,
        assignment_start_time=arrival_time,
        assignment_end_time=departure_time,
        status=AssignmentStatus.CONFIRMED,
        source="CSP_SOLVER",
    )
    db_session.add(assignment)
    db_session.commit()

    assert len(flight.assignments) == 1
    assert flight.assignments[0].gate.gate_code == "B22"
    assert flight.assignments[0].solver_run.strategy == SolverStrategy.BACKTRACKING_CONSTRAINT_PROPAGATION


def test_simulation_event_and_conflict_models(db_session):
    """Verify SimulationEvent and Conflict records."""
    flight = db_session.query(Flight).filter_by(flight_number="AA100").first()
    gate = db_session.query(Gate).filter_by(gate_code="B22").first()

    now = datetime.datetime.now(datetime.timezone.utc)
    sim_event = SimulationEvent(
        flight_id=flight.id,
        airport_id=flight.origin_airport_id,
        event_type=SimulationEventType.GATE_ASSIGNED,
        simulation_timestamp=now,
        details={"gate": "B22", "turnaround_minutes": 45},
    )
    db_session.add(sim_event)

    conflict = Conflict(
        flight_id=flight.id,
        gate_id=gate.id,
        conflict_type=ConflictType.TURNAROUND_VIOLATION,
        severity=ConflictSeverity.HIGH,
        description="Turnaround time buffer insufficient by 15 minutes",
    )
    db_session.add(conflict)
    db_session.commit()

    assert sim_event.id is not None
    assert conflict.id is not None
    assert conflict.is_resolved is False
    assert conflict.flight.flight_number == "AA100"
