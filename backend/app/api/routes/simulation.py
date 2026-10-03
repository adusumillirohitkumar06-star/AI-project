"""Simulation and dynamic AI gate allocation endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_operator_or_above
from app.models.user import User
from app.schemas.delay import FlightDelayRequest, FlightDelayResponse
from app.schemas.simulation import (
    SimulationGateAllocationRequest,
    SimulationGateAllocationResponse,
)
from app.services import delay_service, simulation_service

router = APIRouter(prefix="/simulation", tags=["Simulation Gate Allocation & Dynamic Rescheduling"])


@router.post(
    "/allocate-gate",
    response_model=SimulationGateAllocationResponse,
    summary="Evaluate and allocate destination gate for flight during simulation",
)
def allocate_gate(
    request: SimulationGateAllocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_above),
) -> SimulationGateAllocationResponse:
    """Evaluate and assign a destination gate using the CSP solver when a flight approaches destination."""
    return simulation_service.allocate_gate_for_flight(db, request)


@router.post(
    "/flights/{flight_id}/delay",
    response_model=FlightDelayResponse,
    summary="Apply operational flight delay and dynamically reschedule gate during simulation",
)
def simulation_apply_delay(
    flight_id: int,
    request: FlightDelayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_above),
) -> FlightDelayResponse:
    """Apply an operational flight delay from simulation console and trigger dynamic CSP rescheduling."""
    return delay_service.apply_flight_delay(db, flight_id, request)
