"""Central API router grouping all v1 domain resource routes."""
from fastapi import APIRouter

from app.api.routes import (
    aircraft,
    airports,
    analytics,
    assignments,
    conflicts,
    flights,
    gates,
    health,
    scheduling,
    simulation,
    terminals,
    auth,
)

api_router = APIRouter(prefix="/api/v1")

# Include sub-routers
api_router.include_router(auth.router)
api_router.include_router(health.router)
api_router.include_router(airports.router)
api_router.include_router(terminals.router)
api_router.include_router(gates.router)
api_router.include_router(aircraft.router)
api_router.include_router(flights.router)
api_router.include_router(assignments.router)
api_router.include_router(conflicts.router)
api_router.include_router(scheduling.router)
api_router.include_router(simulation.router)
api_router.include_router(analytics.router)
