"""Scheduling service integrating the pure Python CSP AI engine with database persistence."""
from datetime import datetime, timedelta, timezone
import math
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.ai.csp import (
    AircraftCategory,
    CSPSolver,
    FlightInput,
    FlightPriority,
    FlightType,
    GateCapability,
    GateInput,
    SolverStrategy as CspSolverStrategy,
)
from app.models.assignment import AssignmentStatus, GateAssignment
from app.models.airport import Airport
from app.models.conflict import Conflict, ConflictSeverity, ConflictType
from app.models.flight import Flight, FlightStatus
from app.models.gate import Gate
from app.models.solver import SolverRun, SolverStrategy
from app.models.terminal import Terminal
from app.schemas.scheduling import (
    ScheduleSolveRequest,
    ScheduleSolveResponse,
    ScheduledAssignmentDto,
)


def list_solver_runs(
    db: Session,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[SolverRun], int, int]:
    """Retrieve historical CSP solver executions with pagination."""
    query = select(SolverRun)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    offset = (page - 1) * page_size
    items = list(db.scalars(query.order_by(SolverRun.started_at.desc()).offset(offset).limit(page_size)).all())

    return items, total, total_pages


def get_solver_run(db: Session, run_id: int) -> Optional[SolverRun]:
    """Retrieve a solver execution record by ID."""
    return db.get(SolverRun, run_id)


def get_solver_run_reasoning(db: Session, run_id: int) -> List[Dict[str, Any]]:
    """Retrieve structured reasoning events for a specific solver execution run."""
    run = db.get(SolverRun, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solver run with ID {run_id} not found",
        )
    if run.metadata_json and isinstance(run.metadata_json, dict):
        events = run.metadata_json.get("reasoning_events")
        if isinstance(events, list):
            return events
    return []


def solve_and_persist(db: Session, request: ScheduleSolveRequest) -> ScheduleSolveResponse:
    """Execute CSP gate allocation on database entities and record results transactionally.

    1. Validates target airport exists.
    2. Loads active gates in that airport.
    3. Loads requested flights.
    4. Transforms ORM entities to pure Python CSP DTOs.
    5. Runs pure Python CSPSolver.
    6. Transactionally records SolverRun, GateAssignments, and/or Conflicts.
    7. Returns complete explainable response payload.
    """
    # 1. Validate Airport
    airport = db.get(Airport, request.airport_id)
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airport with ID {request.airport_id} not found",
        )

    # 2. Load Airport Gates
    gates_query = (
        select(Gate)
        .join(Terminal, Gate.terminal_id == Terminal.id)
        .where(
            Terminal.airport_id == request.airport_id,
            Gate.is_active == True,
        )
        .options(joinedload(Gate.terminal))
    )
    db_gates = list(db.scalars(gates_query).all())

    if not db_gates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Airport '{airport.iata_code}' has no active gates available for scheduling",
        )

    # 3. Load Target Flights
    if request.flight_ids is not None:
        if len(request.flight_ids) == 0:
            return ScheduleSolveResponse(
                success=True,
                strategy=request.strategy.value,
                assignments=[],
                unassigned_flights=[],
                conflicts=[],
                metrics={"message": "No flights specified for scheduling"},
                reasoning_events=[],
            )

        flights_query = (
            select(Flight)
            .where(Flight.id.in_(request.flight_ids))
            .options(joinedload(Flight.aircraft))
        )
        db_flights = list(db.scalars(flights_query).all())

        found_ids = {f.id for f in db_flights}
        missing_ids = set(request.flight_ids) - found_ids
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Flights not found with IDs: {list(missing_ids)}",
            )
    else:
        # Default: all scheduled/approaching flights arriving or departing at this airport
        flights_query = (
            select(Flight)
            .where(
                or_(
                    Flight.destination_airport_id == request.airport_id,
                    Flight.origin_airport_id == request.airport_id,
                ),
                Flight.status.in_([
                    FlightStatus.SCHEDULED,
                    FlightStatus.APPROACHING,
                    FlightStatus.LANDED,
                    FlightStatus.DELAYED,
                ]),
            )
            .options(joinedload(Flight.aircraft))
        )
        db_flights = list(db.scalars(flights_query).all())

    if not db_flights:
        return ScheduleSolveResponse(
            success=True,
            strategy=request.strategy.value,
            assignments=[],
            unassigned_flights=[],
            conflicts=[],
            metrics={"message": "No matching flights requiring gate allocation at this airport"},
            reasoning_events=[],
        )

    # 4. Transform ORM Gates to CSP GateInputs
    gate_inputs: List[GateInput] = []
    for g in db_gates:
        cats: Set[AircraftCategory] = set()
        if g.supported_aircraft_types:
            for part in g.supported_aircraft_types.split(","):
                p = part.strip()
                if p:
                    try:
                        cats.add(AircraftCategory(p))
                    except ValueError:
                        pass
        if not cats:
            cats = {
                AircraftCategory.REGIONAL,
                AircraftCategory.NARROW_BODY,
                AircraftCategory.WIDE_BODY,
            }

        max_size = AircraftCategory.WIDE_BODY
        if g.max_aircraft_size:
            try:
                max_size = AircraftCategory(g.max_aircraft_size)
            except ValueError:
                pass

        gate_inputs.append(
            GateInput(
                gate_id=g.id,
                gate_code=g.gate_code,
                terminal_code=g.terminal.terminal_code if g.terminal else "T1",
                capability=GateCapability(g.capability.value),
                supported_aircraft_categories=cats,
                max_aircraft_size=max_size,
                is_active=g.is_active,
                is_closed=g.is_closed,
                closure_reason=g.closure_reason,
            )
        )

    # 5. Transform ORM Flights to CSP FlightInputs
    flight_inputs: List[FlightInput] = []
    for f in db_flights:
        ac_type = f.aircraft.aircraft_type if f.aircraft else "B738"
        ac_cat = (
            AircraftCategory(f.aircraft.category.value)
            if f.aircraft
            else AircraftCategory.NARROW_BODY
        )
        req_gate_id = None
        if request.fixed_assignments and f.id in request.fixed_assignments:
            req_gate_id = request.fixed_assignments[f.id]

        flight_inputs.append(
            FlightInput(
                flight_id=f.id,
                flight_number=f.flight_number,
                arrival_time=f.operational_arrival,
                departure_time=f.operational_departure,
                aircraft_type=ac_type,
                aircraft_category=ac_cat,
                flight_type=FlightType(f.flight_type.value),
                priority=FlightPriority(f.priority.value),
                turnaround_minutes=f.turnaround_duration_minutes,
                airline=f.airline,
                required_gate_id=req_gate_id,
            )
        )

    # 6. Run Pure Python CSP Solver
    csp_strategy = CspSolverStrategy(request.strategy.value)
    solver = CSPSolver()
    solver_result = solver.solve(
        flights=flight_inputs,
        gates=gate_inputs,
        strategy=csp_strategy,
        inter_flight_buffer_minutes=request.inter_flight_buffer_minutes,
    )

    # 7. Atomic Transactional Persistence
    solver_run_id: Optional[int] = None
    try:
        now_utc = datetime.now(timezone.utc)
        start_time_est = now_utc - timedelta(milliseconds=solver_result.metrics.execution_time_ms)

        db_strat = (
            SolverStrategy.BACKTRACKING_CONSTRAINT_PROPAGATION
            if "PROPAGATION" in request.strategy.value
            else (
                SolverStrategy.BACKTRACKING_FORWARD_CHECKING
                if "FORWARD" in request.strategy.value
                else SolverStrategy.BACKTRACKING
            )
        )
        solver_run = SolverRun(
            strategy=db_strat,
            started_at=start_time_est,
            completed_at=now_utc,
            execution_time_ms=solver_result.metrics.execution_time_ms,
            flights_considered=solver_result.metrics.flights_total,
            assignments_produced=solver_result.metrics.flights_assigned,
            nodes_explored=solver_result.metrics.nodes_explored,
            backtracks_count=solver_result.metrics.backtracks,
            conflicts_count=len(solver_result.conflicts),
            is_success=solver_result.success,
            solver_configuration={
                "airport_id": request.airport_id,
                "strategy": request.strategy.value,
                "inter_flight_buffer_minutes": request.inter_flight_buffer_minutes,
                "flight_ids": [f.flight_id for f in flight_inputs],
                "trigger": request.trigger,
            },
            metadata_json={
                "trigger": request.trigger,
                "maximum_search_depth": solver_result.metrics.maximum_search_depth,
                "domain_reductions": solver_result.metrics.domain_reductions,
                "propagation_steps": solver_result.metrics.propagation_steps,
                "assignments_attempted": solver_result.metrics.assignments_attempted,
                "constraint_checks": solver_result.metrics.constraint_checks,
                "reasoning_events": [e.to_dict() for e in solver_result.reasoning_events],
            },
        )
        db.add(solver_run)
        db.flush()
        solver_run_id = solver_run.id

        if solver_result.success:
            # Revoke previous tentative or confirmed assignments for these flights
            scheduled_flight_ids = [int(a.flight_id) for a in solver_result.assignments]
            prior_assignments = list(
                db.scalars(
                    select(GateAssignment).where(
                        GateAssignment.flight_id.in_(scheduled_flight_ids),
                        GateAssignment.status.in_([
                            AssignmentStatus.TENTATIVE,
                            AssignmentStatus.CONFIRMED,
                        ]),
                    )
                ).all()
            )
            for old_assignment in prior_assignments:
                old_assignment.status = AssignmentStatus.REVOKED
                old_assignment.reason = f"Superceded by SolverRun #{solver_run_id}"

            # Create new confirmed assignments
            for a in solver_result.assignments:
                assignment_entity = GateAssignment(
                    flight_id=int(a.flight_id),
                    gate_id=int(a.gate_id),
                    solver_run_id=solver_run_id,
                    assignment_start_time=a.start_time,
                    assignment_end_time=a.end_time,
                    status=AssignmentStatus.CONFIRMED,
                    source="CSP_SOLVER",
                    reason=f"Optimal CSP assignment via {request.strategy.value}",
                )
                db.add(assignment_entity)

        else:
            # Persist conflict records for diagnostic inspection
            for c in solver_result.conflicts:
                f_id = (
                    int(c.flight_id)
                    if isinstance(c.flight_id, int)
                    or (isinstance(c.flight_id, str) and c.flight_id.isdigit())
                    else None
                )
                g_id = (
                    int(c.gate_id)
                    if isinstance(c.gate_id, int)
                    or (isinstance(c.gate_id, str) and c.gate_id.isdigit())
                    else None
                )
                conflict_entity = Conflict(
                    flight_id=f_id,
                    gate_id=g_id,
                    conflict_type=ConflictType.GATE_OVERLAP,
                    severity=ConflictSeverity.CRITICAL,
                    description=c.description,
                    is_resolved=False,
                )
                db.add(conflict_entity)

        db.commit()

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during scheduling transaction: {str(exc)}",
        )

    # 8. Build API Response
    result_assignments: List[ScheduledAssignmentDto] = [
        ScheduledAssignmentDto(
            flight_id=int(a.flight_id),
            flight_number=a.flight_number,
            gate_id=int(a.gate_id),
            gate_code=a.gate_code,
            terminal_code=a.terminal_code,
            start_time=a.start_time,
            end_time=a.end_time,
        )
        for a in solver_result.assignments
    ]

    return ScheduleSolveResponse(
        success=solver_result.success,
        solver_run_id=solver_run_id,
        strategy=solver_result.strategy,
        assignments=result_assignments,
        unassigned_flights=[f.__dict__ if hasattr(f, "__dict__") else dict(f) for f in solver_result.unassigned_flights],
        conflicts=[c.to_dict() for c in solver_result.conflicts],
        metrics=solver_result.metrics.to_dict(),
        reasoning_events=[e.to_dict() for e in solver_result.reasoning_events],
    )
