"""Operational flight delay service with dynamic CSP AI rescheduling and conflict management."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.airport import Airport
from app.models.assignment import AssignmentStatus, GateAssignment
from app.models.conflict import Conflict, ConflictSeverity, ConflictType
from app.models.flight import Flight, FlightStatus
from app.models.gate import Gate
from app.models.simulation import SimulationEvent, SimulationEventType
from app.models.terminal import Terminal
from app.schemas.delay import FlightDelayRequest, FlightDelayResponse
from app.schemas.scheduling import ScheduleSolveRequest, ScheduledAssignmentDto
from app.services import scheduling_service


def apply_flight_delay(
    db: Session, flight_id: int, request: FlightDelayRequest
) -> FlightDelayResponse:
    """Apply an operational delay to a flight, evaluate gate validity, and dynamically reschedule if a conflict is detected.

    Workflow:
    1. Validate flight existence and positive delay minutes.
    2. Preserve original scheduled times while updating operational times.
    3. Record DELAY_APPLIED simulation audit event.
    4. Check existing gate assignment at destination airport.
    5. Evaluate CSP constraints (gate open, capability, temporal overlap without buffer).
       - NO CONFLICT: Retain gate assignment, adjust assignment start/end to operational times.
       - CONFLICT DETECTED:
         a. Record Conflict entity (GATE_OVERLAP) and GATE_CONFLICT_DETECTED event.
         b. If reschedule_if_conflict is True:
            Invoke pure Python CSP solver via scheduling_service.
            - If solution found: Revoke previous assignment, persist new assignment,
              mark Conflict as RESOLVED, record GATE_REASSIGNED and CONFLICT_RESOLVED events.
            - If no solution: Mark RESCHEDULING_FAILED, report NO_GATE_AVAILABLE without forcing invalid gates.
    """
    # 1. Validation
    if request.delay_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delay must be greater than 0 minutes",
        )

    flight = db.scalar(
        select(Flight)
        .where(Flight.id == flight_id)
        .options(joinedload(Flight.aircraft))
    )
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found",
        )

    if flight.status in [FlightStatus.COMPLETED, FlightStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot apply delay to flight in status {flight.status.value}",
        )

    # 2. Preserve Original Schedule & Compute Operational Times
    orig_arrival = flight.scheduled_arrival
    orig_departure = flight.scheduled_departure

    flight.delay_duration_minutes = request.delay_minutes
    flight.delay_reason = request.reason.value
    flight.status = FlightStatus.DELAYED

    op_arrival = orig_arrival + timedelta(minutes=request.delay_minutes)
    op_departure = orig_departure + timedelta(minutes=request.delay_minutes)

    # Ensure turnaround rule is preserved: departure >= arrival + turnaround
    min_departure = op_arrival + timedelta(minutes=flight.turnaround_duration_minutes)
    if op_departure < min_departure:
        op_departure = min_departure

    flight.actual_arrival = op_arrival
    flight.actual_departure = op_departure

    events_list: List[Dict[str, Any]] = []

    # 3. Record DELAY_APPLIED Simulation Event
    delay_event = SimulationEvent(
        flight_id=flight.id,
        airport_id=flight.destination_airport_id,
        event_type=SimulationEventType.DELAY_APPLIED,
        simulation_timestamp=op_arrival,
        details={
            "delay_minutes": request.delay_minutes,
            "reason": request.reason.value,
            "operational_arrival": op_arrival.isoformat(),
            "operational_departure": op_departure.isoformat(),
        },
    )
    db.add(delay_event)
    events_list.append({
        "type": "DELAY_APPLIED",
        "description": f"Applied +{request.delay_minutes}m delay ({request.reason.value}) to {flight.flight_number}",
        "time": op_arrival.isoformat(),
    })

    # 4. Check Existing Destination Gate Assignment
    dest_airport_id = flight.destination_airport_id
    existing_assignment = db.scalar(
        select(GateAssignment)
        .join(Gate, GateAssignment.gate_id == Gate.id)
        .join(Terminal, Gate.terminal_id == Terminal.id)
        .where(
            GateAssignment.flight_id == flight.id,
            GateAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.ACTIVE]),
            Terminal.airport_id == dest_airport_id,
        )
        .options(joinedload(GateAssignment.gate).joinedload(Gate.terminal))
    )

    if not existing_assignment:
        # Flight has no existing assignment to conflict with
        db.commit()
        return FlightDelayResponse(
            success=True,
            flight_id=flight.id,
            flight_number=flight.flight_number,
            airline=flight.airline,
            delay_minutes=request.delay_minutes,
            delay_reason=request.reason.value,
            original_arrival=orig_arrival,
            original_departure=orig_departure,
            operational_arrival=op_arrival,
            operational_departure=op_departure,
            has_conflict=False,
            rescheduled=False,
            status="UNASSIGNED",
            message=f"Flight timing updated (+{request.delay_minutes} min delay). No prior gate assignment existed.",
            events=events_list,
        )

    gate = existing_assignment.gate
    prev_gate_code = gate.gate_code
    prev_term_code = gate.terminal.terminal_code if gate.terminal else "T1"

    # 5. Check Gate Validity & Temporal Collisions
    is_gate_open = gate.is_active and not gate.is_closed
    cap_val = gate.capability.value
    flight_type_val = flight.flight_type.value
    is_cap_valid = cap_val == "BOTH" or cap_val == flight_type_val

    # Query all other active/confirmed assignments at this gate to check strict temporal overlap
    other_assignments = list(
        db.scalars(
            select(GateAssignment)
            .where(
                GateAssignment.gate_id == gate.id,
                GateAssignment.id != existing_assignment.id,
                GateAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.ACTIVE]),
            )
            .options(joinedload(GateAssignment.flight))
        ).all()
    )

    colliding_assignment: Optional[GateAssignment] = None
    for other in other_assignments:
        # Strict interval overlap rule: A_start < B_end and B_start < A_end
        if other.assignment_start_time < op_departure and op_arrival < other.assignment_end_time:
            colliding_assignment = other
            break

    has_conflict = not is_gate_open or not is_cap_valid or (colliding_assignment is not None)

    # -------------------------------------------------------------
    # CASE A: NO CONFLICT -> RETAIN ASSIGNMENT
    # -------------------------------------------------------------
    if not has_conflict:
        # Adjust existing assignment time window to operational schedule
        existing_assignment.assignment_start_time = op_arrival
        existing_assignment.assignment_end_time = op_departure
        existing_assignment.reason = (
            f"Timing adjusted for +{request.delay_minutes} min delay ({request.reason.value})"
        )
        db.commit()

        assigned_dto = ScheduledAssignmentDto(
            flight_id=flight.id,
            flight_number=flight.flight_number,
            gate_id=gate.id,
            gate_code=prev_gate_code,
            terminal_code=prev_term_code,
            start_time=op_arrival,
            end_time=op_departure,
        )

        return FlightDelayResponse(
            success=True,
            flight_id=flight.id,
            flight_number=flight.flight_number,
            airline=flight.airline,
            delay_minutes=request.delay_minutes,
            delay_reason=request.reason.value,
            original_arrival=orig_arrival,
            original_departure=orig_departure,
            operational_arrival=op_arrival,
            operational_departure=op_departure,
            has_conflict=False,
            rescheduled=False,
            status="RETAINED",
            previous_gate_code=prev_gate_code,
            current_gate_code=prev_gate_code,
            current_terminal_code=prev_term_code,
            assignment=assigned_dto,
            message=f"Existing assignment on Gate {prev_gate_code} remains valid and was retained with operational times.",
            events=events_list,
        )

    # -------------------------------------------------------------
    # CASE B: CONFLICT DETECTED -> CREATE CONFLICT & RESCHEDULE
    # -------------------------------------------------------------
    conflict_desc = (
        f"Flight {flight.flight_number} delayed to {op_arrival.strftime('%H:%M')}–{op_departure.strftime('%H:%M')} overlaps with {colliding_assignment.flight.flight_number} ({colliding_assignment.assignment_start_time.strftime('%H:%M')}–{colliding_assignment.assignment_end_time.strftime('%H:%M')}) on Gate {prev_gate_code}"
        if colliding_assignment
        else f"Gate {prev_gate_code} is closed or incompatible for delayed flight {flight.flight_number}"
    )

    conflict_entity = Conflict(
        flight_id=flight.id,
        gate_id=gate.id,
        conflict_type=ConflictType.GATE_OVERLAP if colliding_assignment else ConflictType.GATE_CLOSED,
        severity=ConflictSeverity.CRITICAL,
        description=conflict_desc,
        is_resolved=False,
    )
    db.add(conflict_entity)
    db.flush()

    conflict_event = SimulationEvent(
        flight_id=flight.id,
        airport_id=dest_airport_id,
        event_type=SimulationEventType.GATE_CONFLICT_DETECTED,
        simulation_timestamp=op_arrival,
        details={
            "conflict_id": conflict_entity.id,
            "gate_code": prev_gate_code,
            "description": conflict_desc,
        },
    )
    db.add(conflict_event)
    events_list.append({
        "type": "GATE_CONFLICT_DETECTED",
        "description": conflict_desc,
        "time": op_arrival.isoformat(),
    })

    if not request.reschedule_if_conflict:
        db.commit()
        return FlightDelayResponse(
            success=True,
            flight_id=flight.id,
            flight_number=flight.flight_number,
            airline=flight.airline,
            delay_minutes=request.delay_minutes,
            delay_reason=request.reason.value,
            original_arrival=orig_arrival,
            original_departure=orig_departure,
            operational_arrival=op_arrival,
            operational_departure=op_departure,
            has_conflict=True,
            conflict_detected={
                "conflict_id": conflict_entity.id,
                "description": conflict_desc,
            },
            rescheduled=False,
            status="CONFLICT_UNRESOLVED",
            previous_gate_code=prev_gate_code,
            message="Gate collision detected after delay. Rescheduling was skipped per request parameter.",
            events=events_list,
        )

    # Trigger Dynamic CSP Rescheduling
    resched_req_event = SimulationEvent(
        flight_id=flight.id,
        airport_id=dest_airport_id,
        event_type=SimulationEventType.RESCHEDULING_REQUESTED,
        simulation_timestamp=op_arrival,
        details={
            "delayed_flight": flight.flight_number,
            "conflict_gate": prev_gate_code,
        },
    )
    db.add(resched_req_event)
    events_list.append({
        "type": "RESCHEDULING_REQUESTED",
        "description": f"Invoking CSP solver for dynamic conflict recovery at airport",
        "time": op_arrival.isoformat(),
    })

    # Collect confirmed flight assignments at destination airport to preserve existing commitments (Section 11)
    other_assignments_records = list(
        db.scalars(
            select(GateAssignment)
            .join(Gate, GateAssignment.gate_id == Gate.id)
            .join(Terminal, Gate.terminal_id == Terminal.id)
            .where(
                Terminal.airport_id == dest_airport_id,
                GateAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.ACTIVE]),
                GateAssignment.flight_id != flight.id,
            )
        ).all()
    )

    other_flight_ids = [a.flight_id for a in other_assignments_records]
    fixed_assignments_map = {a.flight_id: a.gate_id for a in other_assignments_records}

    flight_ids_to_solve = [flight.id] + other_flight_ids

    # Try solving with unaffected assignments fixed first to minimize operational disruption (Section 11)
    solve_req = ScheduleSolveRequest(
        airport_id=dest_airport_id,
        flight_ids=flight_ids_to_solve,
        fixed_assignments=fixed_assignments_map,
        inter_flight_buffer_minutes=0,
        trigger="DYNAMIC_RESCHEDULING",
    )

    solve_res = scheduling_service.solve_and_persist(db, solve_req)

    # If fixing unaffected flights has no solution, broaden the scope by allowing the CSP engine
    # to reschedule across the airport if necessary
    if not solve_res.success and other_flight_ids:
        broad_solve_req = ScheduleSolveRequest(
            airport_id=dest_airport_id,
            flight_ids=flight_ids_to_solve,
            fixed_assignments=None,
            inter_flight_buffer_minutes=0,
            trigger="DYNAMIC_RESCHEDULING",
        )
        broad_res = scheduling_service.solve_and_persist(db, broad_solve_req)
        if broad_res.success:
            solve_res = broad_res

    new_assigned_dto = next((a for a in solve_res.assignments if a.flight_id == flight.id), None)

    if solve_res.success and new_assigned_dto:
        # Conflict is successfully resolved!
        conflict_entity.is_resolved = True
        conflict_entity.resolution_info = (
            f"Resolved via CSP dynamic rescheduling: reallocated from Gate {prev_gate_code} "
            f"to Gate {new_assigned_dto.gate_code} ({new_assigned_dto.terminal_code}) "
            f"(SolverRun #{solve_res.solver_run_id})"
        )

        reassign_event = SimulationEvent(
            flight_id=flight.id,
            airport_id=dest_airport_id,
            event_type=SimulationEventType.GATE_REASSIGNED,
            simulation_timestamp=op_arrival,
            details={
                "previous_gate": prev_gate_code,
                "new_gate": new_assigned_dto.gate_code,
                "solver_run_id": solve_res.solver_run_id,
            },
        )
        db.add(reassign_event)

        resolved_event = SimulationEvent(
            flight_id=flight.id,
            airport_id=dest_airport_id,
            event_type=SimulationEventType.CONFLICT_RESOLVED,
            simulation_timestamp=op_arrival,
            details={
                "conflict_id": conflict_entity.id,
                "resolution_gate": new_assigned_dto.gate_code,
            },
        )
        db.add(resolved_event)
        db.commit()

        events_list.append({
            "type": "GATE_REASSIGNED",
            "description": f"Flight {flight.flight_number} reassigned to Gate {new_assigned_dto.gate_code} ({new_assigned_dto.terminal_code})",
            "time": op_arrival.isoformat(),
        })
        events_list.append({
            "type": "CONFLICT_RESOLVED",
            "description": f"Gate conflict on {prev_gate_code} resolved by AI CSP Solver",
            "time": op_arrival.isoformat(),
        })

        return FlightDelayResponse(
            success=True,
            flight_id=flight.id,
            flight_number=flight.flight_number,
            airline=flight.airline,
            delay_minutes=request.delay_minutes,
            delay_reason=request.reason.value,
            original_arrival=orig_arrival,
            original_departure=orig_departure,
            operational_arrival=op_arrival,
            operational_departure=op_departure,
            has_conflict=True,
            conflict_detected={
                "conflict_id": conflict_entity.id,
                "description": conflict_desc,
                "is_resolved": True,
            },
            rescheduled=True,
            status="RESCHEDULED",
            previous_gate_code=prev_gate_code,
            current_gate_code=new_assigned_dto.gate_code,
            current_terminal_code=new_assigned_dto.terminal_code,
            solver_run_id=solve_res.solver_run_id,
            assignment=new_assigned_dto,
            message=f"Collision detected on Gate {prev_gate_code}. Successfully rescheduled to Gate {new_assigned_dto.gate_code} via pure Python CSP solver.",
            events=events_list,
            metrics=solve_res.metrics,
        )
    else:
        # No compatible gate found without violating hard constraints
        # Revoke the colliding assignment so conflicting flight isn't occupying colliding gate
        existing_assignment.status = AssignmentStatus.REVOKED
        existing_assignment.reason = (
            f"Revoked: Unresolved temporal collision on Gate {prev_gate_code} due to +{request.delay_minutes}m delay"
        )

        fail_event = SimulationEvent(
            flight_id=flight.id,
            airport_id=dest_airport_id,
            event_type=SimulationEventType.RESCHEDULING_FAILED,
            simulation_timestamp=op_arrival,
            details={
                "flight_number": flight.flight_number,
                "failed_gate": prev_gate_code,
                "reason": "No compatible replacement gate available satisfying hard constraints",
            },
        )
        db.add(fail_event)
        db.commit()

        events_list.append({
            "type": "RESCHEDULING_FAILED",
            "description": f"No compatible replacement gate available for {flight.flight_number} under hard constraints",
            "time": op_arrival.isoformat(),
        })

        return FlightDelayResponse(
            success=False,
            flight_id=flight.id,
            flight_number=flight.flight_number,
            airline=flight.airline,
            delay_minutes=request.delay_minutes,
            delay_reason=request.reason.value,
            original_arrival=orig_arrival,
            original_departure=orig_departure,
            operational_arrival=op_arrival,
            operational_departure=op_departure,
            has_conflict=True,
            conflict_detected={
                "conflict_id": conflict_entity.id,
                "description": conflict_desc,
                "is_resolved": False,
            },
            rescheduled=False,
            status="NO_GATE_AVAILABLE",
            previous_gate_code=prev_gate_code,
            current_gate_code=None,
            current_terminal_code=None,
            solver_run_id=solve_res.solver_run_id,
            message="Collision detected on previous gate, and no compatible replacement gate is currently available satisfying hard constraints.",
            events=events_list,
            metrics=solve_res.metrics,
        )
