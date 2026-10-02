"""Inference mechanisms: Forward Checking and Constraint Propagation (AC-3)."""
from collections import deque
from typing import Dict, List, Optional, Set, Tuple, Union

from app.ai.csp.events import EventEmitter, SolverEventType
from app.ai.csp.metrics import MetricsTracker
from app.ai.csp.models import FlightInput, GateInput


def forward_check(
    assigned_flight: FlightInput,
    assigned_gate: GateInput,
    unassigned_flights: List[FlightInput],
    domains: Dict[Union[int, str], List[GateInput]],
    event_emitter: EventEmitter,
    metrics: MetricsTracker,
    inter_flight_buffer_minutes: int = 0,
) -> Tuple[bool, Dict[Union[int, str], List[GateInput]]]:
    """Perform forward checking after assigning a flight to a gate.

    Prunes the assigned gate from any overlapping unassigned flights' domains.
    Returns:
        (is_consistent, prunings_map)
    """
    prunings: Dict[Union[int, str], List[GateInput]] = {}
    assigned_interval = assigned_flight.get_occupancy_interval(
        inter_flight_buffer_minutes=inter_flight_buffer_minutes
    )

    metrics.record_propagation_step()
    event_emitter.emit(
        event_type=SolverEventType.PROPAGATION_STARTED,
        message=f"Forward checking consequences of {assigned_flight.flight_number} -> Gate {assigned_gate.gate_code}",
        flight_id=assigned_flight.flight_id,
        gate_id=assigned_gate.gate_id,
    )

    for other_flight in unassigned_flights:
        other_interval = other_flight.get_occupancy_interval(
            inter_flight_buffer_minutes=inter_flight_buffer_minutes
        )

        # Check temporal overlap
        if assigned_interval.overlaps_with(other_interval):
            current_domain = domains[other_flight.flight_id]
            # Check if assigned_gate is in other_flight's domain
            matching_gates = [g for g in current_domain if g.gate_id == assigned_gate.gate_id]

            if matching_gates:
                # Remove gate from domain
                domains[other_flight.flight_id] = [
                    g for g in current_domain if g.gate_id != assigned_gate.gate_id
                ]
                prunings.setdefault(other_flight.flight_id, []).extend(matching_gates)
                metrics.record_domain_reduction(len(matching_gates))

                event_emitter.emit(
                    event_type=SolverEventType.DOMAIN_REDUCED,
                    message=f"Pruned Gate {assigned_gate.gate_code} from {other_flight.flight_number} domain (overlap with {assigned_flight.flight_number})",
                    flight_id=other_flight.flight_id,
                    gate_id=assigned_gate.gate_id,
                    constraint="GATE_OVERLAP",
                    details={
                        "pruned_gate": assigned_gate.gate_code,
                        "remaining_domain_size": len(domains[other_flight.flight_id]),
                    },
                )

                # Check if domain was wiped out
                if not domains[other_flight.flight_id]:
                    metrics.record_conflict()
                    event_emitter.emit(
                        event_type=SolverEventType.CONFLICT_DETECTED,
                        message=f"Forward checking domain wipeout for flight {other_flight.flight_number}: no compatible gates remain",
                        flight_id=other_flight.flight_id,
                        gate_id=assigned_gate.gate_id,
                        constraint="GATE_OVERLAP",
                        details={
                            "trigger_flight": assigned_flight.flight_number,
                            "affected_flight": other_flight.flight_number,
                        },
                    )
                    return False, prunings

    event_emitter.emit(
        event_type=SolverEventType.PROPAGATION_COMPLETED,
        message=f"Forward checking completed successfully. Pruned gates across {len(prunings)} flights",
        flight_id=assigned_flight.flight_id,
        gate_id=assigned_gate.gate_id,
        details={"affected_flights_count": len(prunings)},
    )
    return True, prunings


def restore_prunings(
    domains: Dict[Union[int, str], List[GateInput]],
    prunings: Dict[Union[int, str], List[GateInput]],
) -> None:
    """Restore pruned gates to variables' domains during backtracking."""
    for flight_id, pruned_gates in prunings.items():
        existing_gate_ids = {g.gate_id for g in domains[flight_id]}
        for gate in pruned_gates:
            if gate.gate_id not in existing_gate_ids:
                domains[flight_id].append(gate)
                existing_gate_ids.add(gate.gate_id)
        # Re-sort for determinism
        domains[flight_id].sort(key=lambda g: (g.terminal_code, g.gate_code, str(g.gate_id)))


def ac3_propagate(
    unassigned_flights: List[FlightInput],
    domains: Dict[Union[int, str], List[GateInput]],
    event_emitter: EventEmitter,
    metrics: MetricsTracker,
    inter_flight_buffer_minutes: int = 0,
) -> Tuple[bool, Dict[Union[int, str], List[GateInput]]]:
    """Arc Consistency 3 (AC-3) constraint propagation.

    Ensures that for every pair of temporally overlapping unassigned flights (Xi, Xj),
    every gate in Xi's domain has at least one valid gate assignment in Xj's domain.
    """
    prunings: Dict[Union[int, str], List[GateInput]] = {}
    flight_map = {f.flight_id: f for f in unassigned_flights}

    # Initialize queue with all directed arcs between overlapping flights
    queue: deque[Tuple[Union[int, str], Union[int, str]]] = deque()
    for i, f1 in enumerate(unassigned_flights):
        int1 = f1.get_occupancy_interval(inter_flight_buffer_minutes=inter_flight_buffer_minutes)
        for f2 in unassigned_flights[i + 1 :]:
            int2 = f2.get_occupancy_interval(inter_flight_buffer_minutes=inter_flight_buffer_minutes)
            if int1.overlaps_with(int2):
                queue.append((f1.flight_id, f2.flight_id))
                queue.append((f2.flight_id, f1.flight_id))

    while queue:
        xi_id, xj_id = queue.popleft()
        metrics.record_propagation_step()

        revised, removed_gates = _revise_arc(
            xi_id, xj_id, domains, flight_map, inter_flight_buffer_minutes
        )
        if revised:
            prunings.setdefault(xi_id, []).extend(removed_gates)
            metrics.record_domain_reduction(len(removed_gates))

            event_emitter.emit(
                event_type=SolverEventType.DOMAIN_REDUCED,
                message=f"AC-3 pruned {len(removed_gates)} gates from flight {flight_map[xi_id].flight_number}",
                flight_id=xi_id,
                details={
                    "pruned_count": len(removed_gates),
                    "remaining_domain_size": len(domains[xi_id]),
                },
            )

            if not domains[xi_id]:
                metrics.record_conflict()
                event_emitter.emit(
                    event_type=SolverEventType.CONFLICT_DETECTED,
                    message=f"AC-3 domain wipeout for flight {flight_map[xi_id].flight_number}",
                    flight_id=xi_id,
                    constraint="ARC_CONSISTENCY",
                )
                return False, prunings

            # Enqueue all neighbors Xk of Xi (where Xk != Xj)
            xi_int = flight_map[xi_id].get_occupancy_interval(
                inter_flight_buffer_minutes=inter_flight_buffer_minutes
            )
            for xk in unassigned_flights:
                if xk.flight_id != xi_id and xk.flight_id != xj_id:
                    xk_int = xk.get_occupancy_interval(
                        inter_flight_buffer_minutes=inter_flight_buffer_minutes
                    )
                    if xk_int.overlaps_with(xi_int):
                        queue.append((xk.flight_id, xi_id))

    return True, prunings


def _revise_arc(
    xi_id: Union[int, str],
    xj_id: Union[int, str],
    domains: Dict[Union[int, str], List[GateInput]],
    flight_map: Dict[Union[int, str], FlightInput],
    inter_flight_buffer_minutes: int,
) -> Tuple[bool, List[GateInput]]:
    """Revise domain of Xi with respect to Xj.

    Removes gate from Xi if there is no choice for Xj that allows non-overlap.
    For overlapping flights, if Xj has only one gate [G] and Xi also has [G],
    then Xi cannot use G if it forces Xj to have no options.
    """
    revised = False
    removed_gates: List[GateInput] = []
    xi_domain = domains[xi_id]
    xj_domain = domains[xj_id]

    new_xi_domain: List[GateInput] = []
    for g_i in xi_domain:
        # Check if there exists at least one g_j in xj_domain such that g_j != g_i
        has_support = any(g_j.gate_id != g_i.gate_id for g_j in xj_domain)
        if has_support:
            new_xi_domain.append(g_i)
        else:
            removed_gates.append(g_i)
            revised = True

    if revised:
        domains[xi_id] = new_xi_domain

    return revised, removed_gates
