"""Modular hard constraint implementations for airport gate allocation.

All constraints are independent functions that return a boolean status and an explanatory message.
"""
from datetime import timedelta
from typing import Dict, List, Optional, Tuple, Union

from app.ai.csp.models import (
    AircraftCategory,
    FlightInput,
    FlightType,
    GateCapability,
    GateInput,
    TimeInterval,
)


# Constraint Name Constants
CONSTRAINT_GATE_AVAILABILITY = "GATE_AVAILABILITY"
CONSTRAINT_AIRCRAFT_COMPATIBILITY = "AIRCRAFT_COMPATIBILITY"
CONSTRAINT_DOMESTIC_INTERNATIONAL = "DOMESTIC_INTERNATIONAL"
CONSTRAINT_TERMINAL_COMPATIBILITY = "TERMINAL_COMPATIBILITY"
CONSTRAINT_TURNAROUND = "TURNAROUND"
CONSTRAINT_GATE_OVERLAP = "GATE_OVERLAP"


def check_gate_availability(flight: FlightInput, gate: GateInput) -> Tuple[bool, Optional[str]]:
    """Verify that the gate is active, not closed, and available for the flight window."""
    if not gate.is_active:
        return False, f"Gate {gate.gate_code} is inactive"
    if gate.is_closed:
        reason = f" ({gate.closure_reason})" if gate.closure_reason else ""
        return False, f"Gate {gate.gate_code} is closed{reason}"

    flight_interval = flight.get_occupancy_interval()
    if gate.available_from and flight_interval.start < gate.available_from:
        return False, f"Gate {gate.gate_code} not available until {gate.available_from.isoformat()}"
    if gate.available_to and flight_interval.end > gate.available_to:
        return False, f"Gate {gate.gate_code} closes at {gate.available_to.isoformat()}"

    return True, None


def check_aircraft_compatibility(flight: FlightInput, gate: GateInput) -> Tuple[bool, Optional[str]]:
    """Verify that the gate can physically accommodate the aircraft category/size."""
    if not gate.is_aircraft_compatible(flight.aircraft_category):
        return (
            False,
            f"Gate {gate.gate_code} (max: {gate.max_aircraft_size.value}) cannot accommodate {flight.aircraft_type} ({flight.aircraft_category.value})",
        )
    return True, None


def check_domestic_international(flight: FlightInput, gate: GateInput) -> Tuple[bool, Optional[str]]:
    """Verify domestic/international routing match."""
    if not gate.is_flight_type_compatible(flight.flight_type):
        return (
            False,
            f"Flight {flight.flight_number} is {flight.flight_type.value}, but Gate {gate.gate_code} is restricted to {gate.capability.value}",
        )
    return True, None


def check_terminal_compatibility(flight: FlightInput, gate: GateInput) -> Tuple[bool, Optional[str]]:
    """Verify terminal alignment if flight specifies terminal requirement."""
    if flight.required_terminal and flight.required_terminal != gate.terminal_code:
        return (
            False,
            f"Flight {flight.flight_number} requires Terminal {flight.required_terminal}, but Gate {gate.gate_code} is in Terminal {gate.terminal_code}",
        )
    return True, None


def check_turnaround(flight: FlightInput) -> Tuple[bool, Optional[str]]:
    """Verify that scheduled departure provides at least the minimum turnaround duration."""
    required_min_departure = flight.arrival_time + timedelta(minutes=flight.turnaround_minutes)
    if flight.departure_time < required_min_departure:
        deficit = (required_min_departure - flight.departure_time).total_seconds() / 60.0
        return (
            False,
            f"Flight {flight.flight_number} scheduled departure leaves insufficient turnaround time (deficit: {deficit:.0f} mins)",
        )
    return True, None


def check_gate_overlap(
    flight: FlightInput,
    gate: GateInput,
    current_assignments: Dict[Union[int, str], GateInput],
    flight_lookup: Dict[Union[int, str], FlightInput],
    inter_flight_buffer_minutes: int = 0,
) -> Tuple[bool, Optional[str]]:
    """Verify that no other flight assigned to the same gate overlaps temporally with this flight."""
    new_interval = flight.get_occupancy_interval(inter_flight_buffer_minutes=inter_flight_buffer_minutes)

    for assigned_flight_id, assigned_gate in current_assignments.items():
        if assigned_gate.gate_id == gate.gate_id:
            assigned_flight = flight_lookup[assigned_flight_id]
            assigned_interval = assigned_flight.get_occupancy_interval(
                inter_flight_buffer_minutes=inter_flight_buffer_minutes
            )

            if new_interval.overlaps_with(assigned_interval):
                return (
                    False,
                    f"Gate {gate.gate_code} is already assigned to {assigned_flight.flight_number} from {assigned_interval.start.strftime('%H:%M')} to {assigned_interval.end.strftime('%H:%M')} (overlaps with {flight.flight_number})",
                )

    return True, None


def evaluate_unary_constraints(
    flight: FlightInput, gate: GateInput
) -> Tuple[bool, Optional[str], Optional[str]]:
    """Evaluate all unary constraints (flight + gate properties independent of other assignments).

    Returns:
        (is_valid, constraint_name, error_message)
    """
    # 1. Gate Availability
    valid, msg = check_gate_availability(flight, gate)
    if not valid:
        return False, CONSTRAINT_GATE_AVAILABILITY, msg

    # 2. Aircraft Compatibility
    valid, msg = check_aircraft_compatibility(flight, gate)
    if not valid:
        return False, CONSTRAINT_AIRCRAFT_COMPATIBILITY, msg

    # 3. Domestic / International
    valid, msg = check_domestic_international(flight, gate)
    if not valid:
        return False, CONSTRAINT_DOMESTIC_INTERNATIONAL, msg

    # 4. Terminal Compatibility
    valid, msg = check_terminal_compatibility(flight, gate)
    if not valid:
        return False, CONSTRAINT_TERMINAL_COMPATIBILITY, msg

    # 5. Turnaround
    valid, msg = check_turnaround(flight)
    if not valid:
        return False, CONSTRAINT_TURNAROUND, msg

    return True, None, None


def evaluate_binary_constraints(
    flight: FlightInput,
    gate: GateInput,
    current_assignments: Dict[Union[int, str], GateInput],
    flight_lookup: Dict[Union[int, str], FlightInput],
    inter_flight_buffer_minutes: int = 0,
) -> Tuple[bool, Optional[str], Optional[str]]:
    """Evaluate binary non-overlap constraints against existing assignments.

    Returns:
        (is_valid, constraint_name, error_message)
    """
    valid, msg = check_gate_overlap(
        flight, gate, current_assignments, flight_lookup, inter_flight_buffer_minutes
    )
    if not valid:
        return False, CONSTRAINT_GATE_OVERLAP, msg

    return True, None, None
