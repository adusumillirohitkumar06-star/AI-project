"""API endpoints for Analytics & Performance Dashboard."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    ConflictAnalyticsResponse,
    FlightAnalyticsResponse,
    GateUtilizationResponse,
    ReschedulingAnalyticsResponse,
    SolverPerformanceResponse,
)
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics & Performance"])


@router.get("/overview", response_model=AnalyticsOverviewResponse, summary="Get top-level operations overview")
def get_analytics_overview(
    airport_id: Optional[int] = Query(default=None, description="Optional airport ID filter"),
    start_time: Optional[datetime] = Query(default=None, description="Optional start timestamp filter"),
    end_time: Optional[datetime] = Query(default=None, description="Optional end timestamp filter"),
    db: Session = Depends(get_db),
) -> AnalyticsOverviewResponse:
    """Retrieve operational high-level metrics across flights, gates, conflicts, and solver runs."""
    return analytics_service.get_analytics_overview(
        db=db,
        airport_id=airport_id,
        start_time=start_time,
        end_time=end_time,
    )


@router.get("/flights", response_model=FlightAnalyticsResponse, summary="Get flight distributions and delay analytics")
def get_flight_analytics(
    airport_id: Optional[int] = Query(default=None, description="Optional airport ID filter"),
    start_time: Optional[datetime] = Query(default=None, description="Optional start timestamp filter"),
    end_time: Optional[datetime] = Query(default=None, description="Optional end timestamp filter"),
    db: Session = Depends(get_db),
) -> FlightAnalyticsResponse:
    """Retrieve distributions of flights by status, priority, type, airport, and delay reasons."""
    return analytics_service.get_flight_analytics(
        db=db,
        airport_id=airport_id,
        start_time=start_time,
        end_time=end_time,
    )


@router.get("/gates", response_model=GateUtilizationResponse, summary="Get gate utilization and occupancy metrics")
def get_gate_utilization(
    airport_id: Optional[int] = Query(default=None, description="Optional airport ID filter"),
    terminal_id: Optional[int] = Query(default=None, description="Optional terminal ID filter"),
    start_time: Optional[datetime] = Query(default=None, description="Optional start timestamp filter"),
    end_time: Optional[datetime] = Query(default=None, description="Optional end timestamp filter"),
    db: Session = Depends(get_db),
) -> GateUtilizationResponse:
    """Retrieve per-gate occupancy and capacity utilization derived strictly from arrival->departure intervals."""
    return analytics_service.get_gate_utilization(
        db=db,
        airport_id=airport_id,
        terminal_id=terminal_id,
        start_time=start_time,
        end_time=end_time,
    )


@router.get("/conflicts", response_model=ConflictAnalyticsResponse, summary="Get conflict diagnostics analytics")
def get_conflict_analytics(
    airport_id: Optional[int] = Query(default=None, description="Optional airport ID filter"),
    start_time: Optional[datetime] = Query(default=None, description="Optional start timestamp filter"),
    end_time: Optional[datetime] = Query(default=None, description="Optional end timestamp filter"),
    db: Session = Depends(get_db),
) -> ConflictAnalyticsResponse:
    """Retrieve conflict frequency, severity, type breakdown, and historical occurrences."""
    return analytics_service.get_conflict_analytics(
        db=db,
        airport_id=airport_id,
        start_time=start_time,
        end_time=end_time,
    )


@router.get("/solver", response_model=SolverPerformanceResponse, summary="Get CSP solver performance telemetry")
def get_solver_performance(
    db: Session = Depends(get_db),
) -> SolverPerformanceResponse:
    """Retrieve solver execution performance, strategy comparison measurements, and search tree telemetry."""
    return analytics_service.get_solver_performance(db=db)


@router.get("/rescheduling", response_model=ReschedulingAnalyticsResponse, summary="Get dynamic rescheduling analytics")
def get_rescheduling_analytics(
    db: Session = Depends(get_db),
) -> ReschedulingAnalyticsResponse:
    """Retrieve dynamic delay injection, gate reassignment, and conflict resolution metrics."""
    return analytics_service.get_rescheduling_analytics(db=db)
