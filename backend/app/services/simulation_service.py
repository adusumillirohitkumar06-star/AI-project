"""Simulation service integrating the flight simulation with the pure Python CSP engine."""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.airport import Airport
from app.models.assignment import AssignmentStatus, GateAssignment
from app.models.flight import Flight
from app.models.gate import Gate
from app.models.terminal import Terminal
from app.schemas.scheduling import ScheduleSolveRequest, ScheduledAssignmentDto
from app.schemas.simulation import (
    SimulationGateAllocationRequest,
    SimulationGateAllocationResponse,
)
from app.services import scheduling_service


def allocate_gate_for_flight(
    db: Session, request: SimulationGateAllocationRequest
) -> SimulationGateAllocationResponse:
    """Evaluate and allocate a destination gate for an approaching flight using the CSP solver.

    Flow:
    1. Look up target flight and its destination airport.
    2. Check for an existing valid assignment at that destination.
       If valid (active, not closed, compatible, no collision) -> RETAIN it.
    3. If missing or invalid -> Trigger the CSP engine via scheduling_service.
       If CSP finds a solution -> Return ALLOCATED.
       If CSP finds no solution -> Return NO_GATE_AVAILABLE without forcing an invalid gate.
    """
    # 1. Fetch Flight & Aircraft
    flight = db.scalar(
        select(Flight)
        .where(Flight.id == request.flight_id)
        .options(joinedload(Flight.aircraft))
    )
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {request.flight_id} not found",
        )

    dest_airport_id = flight.destination_airport_id
    airport = db.get(Airport, dest_airport_id)
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination airport ID {dest_airport_id} for flight {flight.flight_number} not found",
        )

    # 2. Check for existing active/confirmed assignment at destination airport
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

    if existing_assignment:
        gate = existing_assignment.gate
        is_gate_open = gate.is_active and not gate.is_closed

        # Check gate capability
        cap_val = gate.capability.value
        flight_type_val = flight.flight_type.value
        is_cap_valid = cap_val == "BOTH" or cap_val == flight_type_val

        # Check collisions with any OTHER confirmed flight on this gate
        buffer_td = timedelta(minutes=request.inter_flight_buffer_minutes)
        collision = db.scalar(
            select(GateAssignment)
            .where(
                GateAssignment.gate_id == gate.id,
                GateAssignment.id != existing_assignment.id,
                GateAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.ACTIVE]),
                GateAssignment.assignment_start_time < existing_assignment.assignment_end_time + buffer_td,
                existing_assignment.assignment_start_time < GateAssignment.assignment_end_time + buffer_td,
            )
        )

        if is_gate_open and is_cap_valid and not collision:
            term_code = gate.terminal.terminal_code if gate.terminal else "T1"
            dto = ScheduledAssignmentDto(
                flight_id=flight.id,
                flight_number=flight.flight_number,
                gate_id=gate.id,
                gate_code=gate.gate_code,
                terminal_code=term_code,
                start_time=existing_assignment.assignment_start_time,
                end_time=existing_assignment.assignment_end_time,
            )
            return SimulationGateAllocationResponse(
                success=True,
                status="RETAINED",
                flight_id=flight.id,
                gate_id=gate.id,
                gate_code=gate.gate_code,
                terminal_code=term_code,
                message=f"Existing valid assignment for Gate {gate.gate_code} retained",
                assignment=dto,
            )

    # 3. Missing or Invalid: Invoke CSP Solver
    # Find all other confirmed flights currently assigned at this airport to preserve existing commitments
    other_flight_ids = list(
        db.scalars(
            select(GateAssignment.flight_id)
            .join(Gate, GateAssignment.gate_id == Gate.id)
            .join(Terminal, Gate.terminal_id == Terminal.id)
            .where(
                Terminal.airport_id == dest_airport_id,
                GateAssignment.status.in_([AssignmentStatus.CONFIRMED, AssignmentStatus.ACTIVE]),
                GateAssignment.flight_id != flight.id,
            )
        ).all()
    )

    flight_ids_to_solve = [flight.id] + other_flight_ids

    solve_req = ScheduleSolveRequest(
        airport_id=dest_airport_id,
        flight_ids=flight_ids_to_solve,
        strategy=request.strategy,
        inter_flight_buffer_minutes=request.inter_flight_buffer_minutes,
        trigger="SIMULATION",
    )

    solve_res = scheduling_service.solve_and_persist(db, solve_req)

    # Find if our flight was successfully assigned
    assigned_dto = next((a for a in solve_res.assignments if a.flight_id == flight.id), None)

    if assigned_dto:
        return SimulationGateAllocationResponse(
            success=True,
            status="ALLOCATED",
            flight_id=flight.id,
            gate_id=assigned_dto.gate_id,
            gate_code=assigned_dto.gate_code,
            terminal_code=assigned_dto.terminal_code,
            solver_run_id=solve_res.solver_run_id,
            assignment=assigned_dto,
            metrics=solve_res.metrics,
            message=f"Gate {assigned_dto.gate_code} successfully allocated via CSP engine",
        )
    else:
        return SimulationGateAllocationResponse(
            success=False,
            status="NO_GATE_AVAILABLE",
            flight_id=flight.id,
            solver_run_id=solve_res.solver_run_id,
            conflicts=solve_res.conflicts,
            metrics=solve_res.metrics,
            message=f"No compatible gate available at {airport.iata_code} for flight constraints",
        )
