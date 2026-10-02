"""initial_schema

Revision ID: 6f02e11c339c
Revises: 
Create Date: 2026-10-02 11:57:53.107664

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6f02e11c339c'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema with core airport, flight, and simulation entities."""
    # 1. Users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('ADMIN', 'OPERATOR', 'VIEWER', name='user_role_enum'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_users_email'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 2. Airports
    op.create_table(
        'airports',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('iata_code', sa.String(length=3), nullable=False),
        sa.Column('icao_code', sa.String(length=4), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('country', sa.String(length=100), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('timezone', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('iata_code', name='uq_airports_iata'),
        sa.UniqueConstraint('icao_code', name='uq_airports_icao'),
    )
    op.create_index('ix_airports_iata_code', 'airports', ['iata_code'], unique=True)
    op.create_index('ix_airports_icao_code', 'airports', ['icao_code'], unique=True)

    # 3. Terminals
    op.create_table(
        'terminals',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('airport_id', sa.Integer(), nullable=False),
        sa.Column('terminal_code', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['airport_id'], ['airports.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('airport_id', 'terminal_code', name='uq_terminal_airport_code'),
    )
    op.create_index('ix_terminals_airport_id', 'terminals', ['airport_id'], unique=False)

    # 4. Gates
    op.create_table(
        'gates',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('terminal_id', sa.Integer(), nullable=False),
        sa.Column('gate_code', sa.String(length=20), nullable=False),
        sa.Column('gate_type', sa.String(length=50), server_default='JET_BRIDGE', nullable=False),
        sa.Column('capability', sa.Enum('DOMESTIC', 'INTERNATIONAL', 'BOTH', name='gate_capability_enum'), nullable=False),
        sa.Column('supported_aircraft_types', sa.String(length=255), server_default='REGIONAL,NARROW_BODY,WIDE_BODY', nullable=False),
        sa.Column('max_aircraft_size', sa.String(length=50), server_default='WIDE_BODY', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('is_closed', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('closure_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['terminal_id'], ['terminals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('terminal_id', 'gate_code', name='uq_gate_terminal_code'),
    )
    op.create_index('ix_gates_terminal_id', 'gates', ['terminal_id'], unique=False)

    # 5. Aircraft
    op.create_table(
        'aircraft',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('registration', sa.String(length=20), nullable=False),
        sa.Column('model', sa.String(length=100), nullable=False),
        sa.Column('aircraft_type', sa.String(length=20), nullable=False),
        sa.Column('airline', sa.String(length=100), nullable=False),
        sa.Column('capacity', sa.Integer(), server_default='180', nullable=False),
        sa.Column('category', sa.Enum('REGIONAL', 'NARROW_BODY', 'WIDE_BODY', 'HEAVY', name='aircraft_category_enum'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('registration', name='uq_aircraft_registration'),
    )
    op.create_index('ix_aircraft_registration', 'aircraft', ['registration'], unique=True)

    # 6. Flights
    op.create_table(
        'flights',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('flight_number', sa.String(length=20), nullable=False),
        sa.Column('airline', sa.String(length=100), nullable=False),
        sa.Column('origin_airport_id', sa.Integer(), nullable=False),
        sa.Column('destination_airport_id', sa.Integer(), nullable=False),
        sa.Column('aircraft_id', sa.Integer(), nullable=True),
        sa.Column('scheduled_arrival', sa.DateTime(timezone=True), nullable=False),
        sa.Column('scheduled_departure', sa.DateTime(timezone=True), nullable=False),
        sa.Column('actual_arrival', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_departure', sa.DateTime(timezone=True), nullable=True),
        sa.Column('flight_type', sa.Enum('DOMESTIC', 'INTERNATIONAL', name='flight_type_enum'), nullable=False),
        sa.Column('passenger_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('priority', sa.Enum('NORMAL', 'VIP', 'MEDICAL', 'EMERGENCY', name='flight_priority_enum'), nullable=False),
        sa.Column('turnaround_duration_minutes', sa.Integer(), server_default='45', nullable=False),
        sa.Column('delay_duration_minutes', sa.Integer(), server_default='0', nullable=False),
        sa.Column('status', sa.Enum('SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_AIR', 'APPROACHING', 'LANDED', 'AT_GATE', 'DELAYED', 'CANCELLED', 'COMPLETED', name='flight_status_enum'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['aircraft_id'], ['aircraft.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['destination_airport_id'], ['airports.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['origin_airport_id'], ['airports.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_flights_aircraft_id', 'flights', ['aircraft_id'], unique=False)
    op.create_index('ix_flights_destination_airport_id', 'flights', ['destination_airport_id'], unique=False)
    op.create_index('ix_flights_flight_number', 'flights', ['flight_number'], unique=False)
    op.create_index('ix_flights_origin_airport_id', 'flights', ['origin_airport_id'], unique=False)
    op.create_index('ix_flights_priority', 'flights', ['priority'], unique=False)
    op.create_index('ix_flights_scheduled_arrival', 'flights', ['scheduled_arrival'], unique=False)
    op.create_index('ix_flights_scheduled_departure', 'flights', ['scheduled_departure'], unique=False)
    op.create_index('ix_flights_status', 'flights', ['status'], unique=False)

    # 7. Solver Runs
    op.create_table(
        'solver_runs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('strategy', sa.Enum('BACKTRACKING', 'BACKTRACKING_FORWARD_CHECKING', 'BACKTRACKING_CONSTRAINT_PROPAGATION', name='solver_strategy_enum'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('execution_time_ms', sa.Float(), nullable=True),
        sa.Column('flights_considered', sa.Integer(), server_default='0', nullable=False),
        sa.Column('assignments_produced', sa.Integer(), server_default='0', nullable=False),
        sa.Column('nodes_explored', sa.Integer(), server_default='0', nullable=False),
        sa.Column('backtracks_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('conflicts_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_success', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('solver_configuration', sa.JSON(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_solver_runs_strategy', 'solver_runs', ['strategy'], unique=False)

    # 8. Gate Assignments
    op.create_table(
        'gate_assignments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('flight_id', sa.Integer(), nullable=False),
        sa.Column('gate_id', sa.Integer(), nullable=False),
        sa.Column('solver_run_id', sa.Integer(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('assignment_start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('assignment_end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.Enum('TENTATIVE', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'REVOKED', name='assignment_status_enum'), nullable=False),
        sa.Column('source', sa.String(length=50), server_default='CSP_SOLVER', nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['flight_id'], ['flights.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['gate_id'], ['gates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['solver_run_id'], ['solver_runs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gate_assignments_flight_id', 'gate_assignments', ['flight_id'], unique=False)
    op.create_index('ix_gate_assignments_gate_id', 'gate_assignments', ['gate_id'], unique=False)
    op.create_index('ix_gate_assignments_solver_run_id', 'gate_assignments', ['solver_run_id'], unique=False)
    op.create_index('ix_gate_assignments_assignment_start_time', 'gate_assignments', ['assignment_start_time'], unique=False)
    op.create_index('ix_gate_assignments_assignment_end_time', 'gate_assignments', ['assignment_end_time'], unique=False)
    op.create_index('ix_gate_assignments_status', 'gate_assignments', ['status'], unique=False)
    op.create_index(
        'ix_gate_assignment_time_window',
        'gate_assignments',
        ['gate_id', 'assignment_start_time', 'assignment_end_time'],
        unique=False,
    )

    # 9. Simulation Events
    op.create_table(
        'simulation_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('flight_id', sa.Integer(), nullable=True),
        sa.Column('airport_id', sa.Integer(), nullable=True),
        sa.Column('event_type', sa.Enum('FLIGHT_CREATED', 'DEPARTURE', 'TAKEOFF', 'IN_AIR', 'APPROACHING', 'LANDING', 'GATE_ASSIGNED', 'GATE_OCCUPIED', 'TURNAROUND_STARTED', 'TURNAROUND_COMPLETED', 'GATE_RELEASED', 'DELAY', 'CANCELLATION', name='simulation_event_type_enum'), nullable=False),
        sa.Column('simulation_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('actual_timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['airport_id'], ['airports.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['flight_id'], ['flights.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_simulation_events_airport_id', 'simulation_events', ['airport_id'], unique=False)
    op.create_index('ix_simulation_events_event_type', 'simulation_events', ['event_type'], unique=False)
    op.create_index('ix_simulation_events_flight_id', 'simulation_events', ['flight_id'], unique=False)
    op.create_index('ix_simulation_events_simulation_timestamp', 'simulation_events', ['simulation_timestamp'], unique=False)

    # 10. Conflicts
    op.create_table(
        'conflicts',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('flight_id', sa.Integer(), nullable=True),
        sa.Column('gate_id', sa.Integer(), nullable=True),
        sa.Column('conflict_type', sa.Enum('GATE_OVERLAP', 'INCOMPATIBLE_GATE', 'TERMINAL_RESTRICTION', 'GATE_CLOSED', 'TURNAROUND_VIOLATION', 'TIMING_CONFLICT', 'UNASSIGNED_FLIGHT', name='conflict_type_enum'), nullable=False),
        sa.Column('severity', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='conflict_severity_enum'), server_default='MEDIUM', nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('detected_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('is_resolved', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('resolution_info', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['flight_id'], ['flights.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['gate_id'], ['gates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_conflicts_conflict_type', 'conflicts', ['conflict_type'], unique=False)
    op.create_index('ix_conflicts_flight_id', 'conflicts', ['flight_id'], unique=False)
    op.create_index('ix_conflicts_gate_id', 'conflicts', ['gate_id'], unique=False)
    op.create_index('ix_conflicts_is_resolved', 'conflicts', ['is_resolved'], unique=False)


def downgrade() -> None:
    """Downgrade schema dropping all tables."""
    op.drop_table('conflicts')
    op.drop_table('simulation_events')
    op.drop_table('gate_assignments')
    op.drop_table('solver_runs')
    op.drop_table('flights')
    op.drop_table('aircraft')
    op.drop_table('gates')
    op.drop_table('terminals')
    op.drop_table('airports')
    op.drop_table('users')
