"""Backtracking CSP search engine with state restoration and instrumentation."""
from typing import Dict, List, Optional, Set, Tuple, Union

from app.ai.csp.constraints import evaluate_binary_constraints
from app.ai.csp.events import EventEmitter, SolverEventType
from app.ai.csp.heuristics import order_domain_values_lcv, select_unassigned_variable
from app.ai.csp.metrics import MetricsTracker
from app.ai.csp.models import FlightInput, GateInput
from app.ai.csp.propagation import forward_check, restore_prunings


def backtrack_search(
    assignments: Dict[Union[int, str], GateInput],
    unassigned_flights: List[FlightInput],
    domains: Dict[Union[int, str], List[GateInput]],
    flight_lookup: Dict[Union[int, str], FlightInput],
    event_emitter: EventEmitter,
    metrics: MetricsTracker,
    use_propagation: bool = True,
    inter_flight_buffer_minutes: int = 0,
    depth: int = 0,
) -> bool:
    """Recursive backtracking algorithm.

    Args:
        assignments: Current partial assignment map (flight_id -> GateInput).
        unassigned_flights: List of flights remaining to be scheduled.
        domains: Current domains map (flight_id -> List[GateInput]).
        flight_lookup: Complete map of all flight inputs.
        event_emitter: Emitter for XAI reasoning logs.
        metrics: Performance tracker.
        use_propagation: If True, uses forward checking & pruning; if False, basic backtracking.
        inter_flight_buffer_minutes: Safety time buffer between flights at same gate.
        depth: Current depth in the search tree.

    Returns:
        True if a complete, valid assignment is found; False otherwise.
    """
    metrics.record_node_explored(depth)

    # Base case: All flights successfully assigned
    if not unassigned_flights:
        return True

    # 1. Variable Selection (MRV + Degree + Priority)
    selected_flight = select_unassigned_variable(
        unassigned_flights=unassigned_flights,
        domains=domains,
        event_emitter=event_emitter,
        use_heuristics=True,
        inter_flight_buffer_minutes=inter_flight_buffer_minutes,
    )

    remaining_flights = [f for f in unassigned_flights if f.flight_id != selected_flight.flight_id]
    candidate_gates = domains[selected_flight.flight_id]

    # 2. Value Ordering (LCV - Least Constraining Value)
    ordered_gates = order_domain_values_lcv(
        flight=selected_flight,
        candidate_gates=candidate_gates,
        unassigned_flights=remaining_flights,
        domains=domains,
        inter_flight_buffer_minutes=inter_flight_buffer_minutes,
    )

    for gate in ordered_gates:
        metrics.record_assignment_attempt()
        event_emitter.emit(
            event_type=SolverEventType.VALUE_CONSIDERED,
            message=f"Considering Gate {gate.gate_code} for flight {selected_flight.flight_number}",
            flight_id=selected_flight.flight_id,
            gate_id=gate.gate_id,
            details={"flight_number": selected_flight.flight_number, "gate_code": gate.gate_code},
        )

        # 3. Check Binary Hard Constraints (Temporal Overlap)
        metrics.record_constraint_check()
        is_valid, constraint_name, error_msg = evaluate_binary_constraints(
            flight=selected_flight,
            gate=gate,
            current_assignments=assignments,
            flight_lookup=flight_lookup,
            inter_flight_buffer_minutes=inter_flight_buffer_minutes,
        )

        if not is_valid:
            metrics.record_conflict()
            event_emitter.emit(
                event_type=SolverEventType.CONFLICT_DETECTED,
                message=f"Conflict assigning {selected_flight.flight_number} to {gate.gate_code}: {error_msg}",
                flight_id=selected_flight.flight_id,
                gate_id=gate.gate_id,
                constraint=constraint_name,
                details={"reason": error_msg},
            )
            continue

        # 4. Make Tentative Assignment
        assignments[selected_flight.flight_id] = gate
        event_emitter.emit(
            event_type=SolverEventType.ASSIGNMENT_MADE,
            message=f"Assigned {selected_flight.flight_number} -> Gate {gate.gate_code} (Terminal {gate.terminal_code})",
            flight_id=selected_flight.flight_id,
            gate_id=gate.gate_id,
            details={
                "flight_number": selected_flight.flight_number,
                "gate_code": gate.gate_code,
                "terminal_code": gate.terminal_code,
                "current_assigned_count": len(assignments),
            },
        )

        # 5. Inference (Forward Checking / Propagation)
        prunings: Dict[Union[int, str], List[GateInput]] = {}
        consistent = True

        if use_propagation:
            consistent, prunings = forward_check(
                assigned_flight=selected_flight,
                assigned_gate=gate,
                unassigned_flights=remaining_flights,
                domains=domains,
                event_emitter=event_emitter,
                metrics=metrics,
                inter_flight_buffer_minutes=inter_flight_buffer_minutes,
            )

        # 6. Recurse if consistent
        if consistent:
            result = backtrack_search(
                assignments=assignments,
                unassigned_flights=remaining_flights,
                domains=domains,
                flight_lookup=flight_lookup,
                event_emitter=event_emitter,
                metrics=metrics,
                use_propagation=use_propagation,
                inter_flight_buffer_minutes=inter_flight_buffer_minutes,
                depth=depth + 1,
            )
            if result:
                return True

        # 7. Backtrack: Undo Assignment & Restore Domains
        metrics.record_backtrack()
        event_emitter.emit(
            event_type=SolverEventType.BACKTRACK_STARTED,
            message=f"Backtracking: Revoking assignment {selected_flight.flight_number} -> Gate {gate.gate_code}",
            flight_id=selected_flight.flight_id,
            gate_id=gate.gate_id,
            details={
                "flight_number": selected_flight.flight_number,
                "gate_code": gate.gate_code,
                "depth": depth,
            },
        )

        del assignments[selected_flight.flight_id]
        if use_propagation and prunings:
            restore_prunings(domains, prunings)

        event_emitter.emit(
            event_type=SolverEventType.BACKTRACK_COMPLETED,
            message=f"Restored search state at depth {depth}",
            flight_id=selected_flight.flight_id,
            details={"depth": depth},
        )

    return False
