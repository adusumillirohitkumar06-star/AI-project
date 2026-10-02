"""Tests for SolverRun inspection, reasoning retrieval, and traceability (Phase 14)."""
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient


def setup_test_environment(client: TestClient):
    """Helper to create airport, terminal, gates, aircraft, and flights."""
    # 1. Airports
    origin_res = client.post(
        "/api/v1/airports",
        json={
            "iata_code": "JFK",
            "icao_code": "KJFK",
            "name": "John F Kennedy Intl",
            "city": "New York",
            "country": "USA",
            "latitude": 40.6413,
            "longitude": -73.7781,
            "timezone": "America/New_York",
        },
    )
    origin_id = origin_res.json()["id"]

    dest_res = client.post(
        "/api/v1/airports",
        json={
            "iata_code": "BOS",
            "icao_code": "KBOS",
            "name": "Logan Intl",
            "city": "Boston",
            "country": "USA",
            "latitude": 42.3656,
            "longitude": -71.0096,
            "timezone": "America/New_York",
        },
    )
    dest_id = dest_res.json()["id"]

    # 2. Terminal
    term_res = client.post(
        "/api/v1/terminals",
        json={"airport_id": dest_id, "terminal_code": "T1", "name": "Terminal 1"},
    )
    term_id = term_res.json()["id"]

    # 3. Gate
    gate_res = client.post(
        "/api/v1/gates",
        json={
            "terminal_id": term_id,
            "gate_code": "B10",
            "capability": "BOTH",
            "max_aircraft_size": "WIDE_BODY",
        },
    )
    gate_id = gate_res.json()["id"]

    # 4. Aircraft
    ac_res = client.post(
        "/api/v1/aircraft",
        json={
            "registration": "N999XAI",
            "model": "A320",
            "aircraft_type": "A320",
            "airline": "Delta",
            "capacity": 160,
            "category": "NARROW_BODY",
        },
    )
    ac_id = ac_res.json()["id"]

    # 5. Flight
    now = datetime.now(timezone.utc)
    fl_res = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "DL501",
            "airline": "Delta",
            "origin_airport_id": origin_id,
            "destination_airport_id": dest_id,
            "aircraft_id": ac_id,
            "scheduled_arrival": (now + timedelta(hours=1)).isoformat(),
            "scheduled_departure": (now + timedelta(hours=2)).isoformat(),
            "flight_type": "DOMESTIC",
            "priority": "NORMAL",
            "status": "SCHEDULED",
        },
    )
    flight_id = fl_res.json()["id"]

    return dest_id, gate_id, flight_id


def test_list_and_get_solver_runs(client: TestClient):
    """Verify solver runs can be listed and retrieved by ID."""
    dest_id, gate_id, flight_id = setup_test_environment(client)

    # Solve schedule
    solve_res = client.post(
        "/api/v1/scheduling/solve",
        json={
            "airport_id": dest_id,
            "flight_ids": [flight_id],
            "trigger": "MANUAL",
        },
    )
    assert solve_res.status_code == 200
    solve_data = solve_res.json()
    run_id = solve_data["solver_run_id"]
    assert run_id is not None

    # 1. List solver runs
    list_res = client.get("/api/v1/scheduling/runs")
    assert list_res.status_code == 200
    runs = list_res.json()["items"]
    assert len(runs) >= 1
    found_run = next((r for r in runs if r["id"] == run_id), None)
    assert found_run is not None
    assert found_run["is_success"] is True

    # 2. Get solver run by ID
    get_res = client.get(f"/api/v1/scheduling/runs/{run_id}")
    assert get_res.status_code == 200
    run_detail = get_res.json()
    assert run_detail["id"] == run_id
    assert run_detail["nodes_explored"] >= 1
    assert run_detail["metadata_json"]["trigger"] == "MANUAL"

    # 3. Retrieve reasoning events
    reasoning_res = client.get(f"/api/v1/scheduling/runs/{run_id}/reasoning")
    assert reasoning_res.status_code == 200
    events = reasoning_res.json()
    assert isinstance(events, list)
    assert len(events) > 0
    # Check event structure
    event_types = [e["event_type"] for e in events]
    assert "DOMAIN_CREATED" in event_types
    assert "ASSIGNMENT_MADE" in event_types
    assert "SOLUTION_FOUND" in event_types


def test_solver_run_not_found(client: TestClient):
    """Verify 404 behavior for non-existent solver runs."""
    res = client.get("/api/v1/scheduling/runs/999999")
    assert res.status_code == 404

    reasoning_res = client.get("/api/v1/scheduling/runs/999999/reasoning")
    assert reasoning_res.status_code == 404
