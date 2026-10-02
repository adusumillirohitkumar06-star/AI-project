"""Domain generation and deterministic initial candidate gate filtering."""
from typing import Dict, List, Union

from app.ai.csp.constraints import evaluate_unary_constraints
from app.ai.csp.events import EventEmitter, SolverEventType
from app.ai.csp.metrics import MetricsTracker
from app.ai.csp.models import FlightInput, GateInput


def generate_initial_domains(
    flights: List[FlightInput],
    gates: List[GateInput],
    event_emitter: EventEmitter,
    metrics: MetricsTracker,
) -> Dict[Union[int, str], List[GateInput]]:
    """Deterministically filter all gates against each flight's unary constraints.

    Returns:
        Mapping of flight_id to list of compatible candidate gates.
    """
    domains: Dict[Union[int, str], List[GateInput]] = {}

    # Sort gates deterministically
    sorted_gates = sorted(gates, key=lambda g: (g.terminal_code, g.gate_code, str(g.gate_id)))

    for flight in flights:
        candidate_gates: List[GateInput] = []
        rejected_reasons: List[str] = []

        for gate in sorted_gates:
            metrics.record_constraint_check()
            is_valid, constraint_name, reason = evaluate_unary_constraints(flight, gate)

            if is_valid:
                candidate_gates.append(gate)
            else:
                rejected_reasons.append(f"{gate.gate_code}: {reason}")
                metrics.record_domain_reduction(1)

        if flight.required_gate_id is not None:
            candidate_gates = [g for g in candidate_gates if str(g.gate_id) == str(flight.required_gate_id)]

        domains[flight.flight_id] = candidate_gates

        event_emitter.emit(
            event_type=SolverEventType.DOMAIN_CREATED,
            message=f"Initialized domain for flight {flight.flight_number}: {len(candidate_gates)} compatible gates",
            flight_id=flight.flight_id,
            details={
                "flight_number": flight.flight_number,
                "domain_size": len(candidate_gates),
                "compatible_gates": [g.gate_code for g in candidate_gates],
                "rejected_count": len(rejected_reasons),
                "rejections": rejected_reasons[:5],  # Sample first few for explanation
            },
        )

    return domains
