"""Scheduling and CSP solver execution endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.scheduling import ScheduleSolveRequest, ScheduleSolveResponse
from app.schemas.solver import SolverRunRead
from app.services import scheduling_service

router = APIRouter(prefix="/scheduling", tags=["AI Scheduling & CSP Solver"])


@router.post("/solve", response_model=ScheduleSolveResponse, summary="Execute CSP Gate Allocation Solver")
def solve_schedule(request: ScheduleSolveRequest, db: Session = Depends(get_db)) -> ScheduleSolveResponse:
    """Run the pure Python CSP engine on airport flights and gates, persisting results transactionally."""
    return scheduling_service.solve_and_persist(db, request)


@router.get("/runs", response_model=PaginatedResponse[SolverRunRead], summary="List historical solver runs")
def list_solver_runs(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[SolverRunRead]:
    """Retrieve historical solver execution telemetry."""
    items, total, total_pages = scheduling_service.list_solver_runs(db, page=page, page_size=page_size)
    return PaginatedResponse[SolverRunRead](
        items=[SolverRunRead.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/runs/{run_id}", response_model=SolverRunRead, summary="Get solver run by ID")
def get_solver_run(run_id: int, db: Session = Depends(get_db)) -> SolverRunRead:
    """Retrieve details for a specific solver execution run."""
    run = scheduling_service.get_solver_run(db, run_id)
    if not run:
        raise HTTPException(
            status_code=404,
            detail=f"Solver run with ID {run_id} not found",
        )
    return SolverRunRead.model_validate(run)


@router.get("/runs/{run_id}/reasoning", summary="Get reasoning events for a solver run")
def get_solver_run_reasoning(run_id: int, db: Session = Depends(get_db)):
    """Retrieve chronological structured reasoning events recorded for a specific solver execution run."""
    return scheduling_service.get_solver_run_reasoning(db, run_id)

