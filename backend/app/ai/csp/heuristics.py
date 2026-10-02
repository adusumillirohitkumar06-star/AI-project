"""CSP Heuristics: MRV, Degree Heuristic, Priority Tie-Breaker, and Least Constraining Value (LCV)."""
from typing import Dict, List, Set, Union

from app.ai.csp.events import EventEmitter, SolverEventType
from app.ai.csp.models import (
    FlightInput,
    GateInput,
    PRIORITY_WEIGHTS,
    TimeInterval,
)


def calculate_flight_degree(
    flight: FlightInput,
    unassigned_flights: List[FlightInput],
    inter_flight_buffer_minutes: int = 0,
) -> int:
    """Calculate the degree of a flight: number of temporal overlaps with other unassigned flights."""
    flight_interval = flight.get_occupancy_interval(inter_flight_buffer_minutes=inter_flight_buffer_minutes)
    degree = 0

    for other in unassigned_flights:
        if other.flight_id != flight.flight_id:
            other_interval = other.get_occupancy_interval(inter_flight_buffer_minutes=inter_flight_buffer_minutes)
            if flight_interval.overlaps_with(other_interval):
                degree += 1

    return degree


def select_unassigned_variable(
    unassigned_flights: List[FlightInput],
    domains: Dict[Union[int, str], List[GateInput]],
    event_emitter: EventEmitter,
    use_heuristics: bool = True,
    inter_flight_buffer_minutes: int = 0,
) -> FlightInput:
    """Select next flight variable to assign.

    When heuristics are enabled:
    1. Minimum Remaining Values (MRV): Smallest candidate domain.
    2. Degree Heuristic (Tie-Breaker): Highest number of overlapping unassigned flights.
    3. Operational Priority (Tie-Breaker): EMERGENCY > MEDICAL > VIP > NORMAL.
    4. Deterministic Tie-Breaker: Alphabetical/lexical flight number.
    """
    if not use_heuristics:
        # Standard static order (by arrival time / flight_id)
        selected = unassigned_flights[0]
        event_emitter.emit(
            event_type=SolverEventType.VARIABLE_SELECTED,
            message=f"Static order selected flight {selected.flight_number}",
            flight_id=selected.flight_id,
            details={
                "flight_number": selected.flight_number,
                "strategy": "STATIC",
                "domain_size": len(domains[selected.flight_id]),
            },
        )
        return selected

    def sort_key(flight: FlightInput):
        domain_size = len(domains[flight.flight_id])
        degree = calculate_flight_degree(
            flight, unassigned_flights, inter_flight_buffer_minutes=inter_flight_buffer_minutes
        )
        priority_weight = PRIORITY_WEIGHTS.get(flight.priority, 100)
        # MRV (ascending domain_size), Degree (descending -> -degree), Priority (descending -> -priority_weight)
        return (domain_size, -degree, -priority_weight, flight.flight_number, str(flight.flight_id))

    sorted_unassigned = sorted(unassigned_flights, key=sort_key)
    selected = sorted_unassigned[0]

    domain_size = len(domains[selected.flight_id])
    degree = calculate_flight_degree(
        selected, unassigned_flights, inter_flight_buffer_minutes=inter_flight_buffer_minutes
    )

    event_emitter.emit(
        event_type=SolverEventType.VARIABLE_SELECTED,
        message=f"MRV selected flight {selected.flight_number} (Domain size: {domain_size}, Degree: {degree}, Priority: {selected.priority.value})",
        flight_id=selected.flight_id,
        details={
            "flight_number": selected.flight_number,
            "domain_size": domain_size,
            "degree": degree,
            "priority": selected.priority.value,
            "strategy": "MRV_DEGREE_PRIORITY",
        },
    )

    return selected


def order_domain_values_lcv(
    flight: FlightInput,
    candidate_gates: List[GateInput],
    unassigned_flights: List[FlightInput],
    domains: Dict[Union[int, str], List[GateInput]],
    inter_flight_buffer_minutes: int = 0,
) -> List[GateInput]:
    """Order candidate gates using the Least Constraining Value (LCV) heuristic.

    Prefers gates that rule out the fewest choices for other overlapping unassigned flights.
    """
    if len(candidate_gates) <= 1 or not unassigned_flights:
        return candidate_gates

    flight_interval = flight.get_occupancy_interval(inter_flight_buffer_minutes=inter_flight_buffer_minutes)

    # Find which unassigned flights overlap in time with this flight
    overlapping_flights = [
        other
        for other in unassigned_flights
        if other.flight_id != flight.flight_id
        and flight_interval.overlaps_with(
            other.get_occupancy_interval(inter_flight_buffer_minutes=inter_flight_buffer_minutes)
        )
    ]

    if not overlapping_flights:
        return candidate_gates

    def gate_constraint_cost(gate: GateInput) -> int:
        # Count how many overlapping unassigned flights currently have this gate in their domain
        cost = 0
        for other in overlapping_flights:
            if any(g.gate_id == gate.gate_id for g in domains.get(other.flight_id, [])):
                cost += 1
        return cost

    # Sort ascending by constraint cost (lowest cost = least constraining first)
    # Secondary tie-breaker by gate_code for determinism
    return sorted(
        candidate_gates,
        key=lambda g: (gate_constraint_cost(g), g.gate_code, str(g.gate_id)),
    )
