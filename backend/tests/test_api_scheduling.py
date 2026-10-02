"""Integration tests for CSP scheduling endpoint, persistence, and failure handling."""
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient


def setup_airport_environment(client: TestClient):
    """Helper to create an airport, terminal, aircraft, and gates."""
    # 1. Airport
    airport_res = client.post(
        "/api/v1/airports",
        json={
            "iata_code": "DFW",
            "icao_code": "KDFW",
            "name": "Dallas/Fort Worth International Airport",
            "city": "Dallas",
            "country": "USA",
            "latitude": 32.8998,
            "longitude": -97.0403,
            "timezone": "America/Chicago",
        },
    )
    airport_id = airport_res.json()["id"]

    # 2. Remote Origin Airport
    dest_res = client.post(
        "/api/v1/airports",
        json={
            "iata_code": "MIA",
            "icao_code": "KMIA",
            "name": "Miami International Airport",
            "city": "Miami",
            "country": "USA",
            "latitude": 25.7959,
            "longitude": -80.2870,
            "timezone": "America/New_York",
        },
    )
    remote_id = dest_res.json()["id"]

    # 3. Terminal
    term_res = client.post(
        "/api/v1/terminals",
        json={"airport_id": airport_id, "terminal_code": "TA", "name": "Terminal A"},
    )
    term_id = term_res.json()["id"]

    # 4. Two Gates
    g1 = client.post(
        "/api/v1/gates",
        json={
            "terminal_id": term_id,
            "gate_code": "A1",
            "capability": "BOTH",
            "max_aircraft_size": "WIDE_BODY",
        },
    ).json()["id"]

    g2 = client.post(
        "/api/v1/gates",
        json={
            "terminal_id": term_id,
            "gate_code": "A2",
            "capability": "BOTH",
            "max_aircraft_size": "WIDE_BODY",
        },
    ).json()["id"]

    return airport_id, remote_id, [g1, g2]


def test_scheduling_solve_success_and_persistence(client: TestClient):
    """Verify CSP scheduler allocates gates, returns metrics, and persists assignments."""
    airport_id, remote_id, gate_ids = setup_airport_environment(client)

    now = datetime.now(timezone.utc)
    arr1 = now + timedelta(hours=1)
    dep1 = arr1 + timedelta(minutes=45)

    arr2 = now + timedelta(hours=1, minutes=10)
    dep2 = arr2 + timedelta(minutes=45)

    # Create two overlapping flights arriving at DFW
    f1 = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "AA101",
            "airline": "American Airlines",
            "origin_airport_id": remote_id,
            "destination_airport_id": airport_id,
            "scheduled_arrival": arr1.isoformat(),
            "scheduled_departure": dep1.isoformat(),
            "flight_type": "DOMESTIC",
            "priority": "VIP",
        },
    ).json()["id"]

    f2 = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "AA202",
            "airline": "American Airlines",
            "origin_airport_id": remote_id,
            "destination_airport_id": airport_id,
            "scheduled_arrival": arr2.isoformat(),
            "scheduled_departure": dep2.isoformat(),
            "flight_type": "DOMESTIC",
            "priority": "NORMAL",
        },
    ).json()["id"]

    # Trigger CSP Scheduler
    solve_req = {
        "airport_id": airport_id,
        "flight_ids": [f1, f2],
        "strategy": "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION",
        "inter_flight_buffer_minutes": 10,
    }
    res = client.post("/api/v1/scheduling/solve", json=solve_req)
    assert res.status_code == 200
    data = res.json()

    assert data["success"] is True
    assert len(data["assignments"]) == 2
    assert data["solver_run_id"] is not None
    assert "execution_time_ms" in data["metrics"]
    assert data["metrics"]["nodes_explored"] > 0
    assert len(data["reasoning_events"]) > 0

    solver_run_id = data["solver_run_id"]

    # Verify assignments were persisted in database
    assigned_res = client.get(f"/api/v1/assignments?solver_run_id={solver_run_id}")
    assert assigned_res.status_code == 200
    assignments_data = assigned_res.json()
    assert assignments_data["total"] == 2

    # Verify SolverRun record was saved in database
    run_res = client.get(f"/api/v1/scheduling/runs/{solver_run_id}")
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["is_success"] is True
    assert run_data["flights_considered"] == 2
    assert run_data["assignments_produced"] == 2


def test_scheduling_solve_impossible_scenario(client: TestClient):
    """Verify impossible scheduling scenario fails gracefully without persisting invalid assignments."""
    airport_id, remote_id, gate_ids = setup_airport_environment(client)

    # Close one of the two gates so only 1 remains open
    client.patch(f"/api/v1/gates/{gate_ids[1]}", json={"is_closed": True, "closure_reason": "Pavement crack"})

    now = datetime.now(timezone.utc)
    # Create 3 simultaneous overlapping flights with only 1 open gate
    flight_ids = []
    for i in range(3):
        fid = client.post(
            "/api/v1/flights",
            json={
                "flight_number": f"OVERLAP{i+1}",
                "airline": "American Airlines",
                "origin_airport_id": remote_id,
                "destination_airport_id": airport_id,
                "scheduled_arrival": (now + timedelta(hours=2)).isoformat(),
                "scheduled_departure": (now + timedelta(hours=3)).isoformat(),
            },
        ).json()["id"]
        flight_ids.append(fid)

    solve_req = {
        "airport_id": airport_id,
        "flight_ids": flight_ids,
        "strategy": "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION",
    }
    res = client.post("/api/v1/scheduling/solve", json=solve_req)
    assert res.status_code == 200
    data = res.json()

    # Must report success = False
    assert data["success"] is False
    assert len(data["assignments"]) == 0
    assert len(data["conflicts"]) > 0
    assert data["solver_run_id"] is not None

    solver_run_id = data["solver_run_id"]

    # Verify NO invalid assignments were persisted
    assigned_res = client.get(f"/api/v1/assignments?solver_run_id={solver_run_id}")
    assert assigned_res.status_code == 200
    assert assigned_res.json()["total"] == 0

    # Verify SolverRun reflects failure
    run_res = client.get(f"/api/v1/scheduling/runs/{solver_run_id}")
    assert run_res.status_code == 200
    assert run_res.json()["is_success"] is False


def test_scheduling_transaction_rollback(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    """Verify that a database failure during persistence triggers a complete rollback."""
    airport_id, remote_id, gate_ids = setup_airport_environment(client)

    now = datetime.now(timezone.utc)
    f1 = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "ROLLBACK1",
            "airline": "American Airlines",
            "origin_airport_id": remote_id,
            "destination_airport_id": airport_id,
            "scheduled_arrival": (now + timedelta(hours=1)).isoformat(),
            "scheduled_departure": (now + timedelta(hours=2)).isoformat(),
        },
    ).json()["id"]

    from sqlalchemy.orm import Session

    original_commit = Session.commit

    def failing_commit(self):
        raise RuntimeError("Simulated unrecoverable DB failure during commit")

    monkeypatch.setattr(Session, "commit", failing_commit)

    solve_req = {
        "airport_id": airport_id,
        "flight_ids": [f1],
        "strategy": "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION",
    }
    res = client.post("/api/v1/scheduling/solve", json=solve_req)
    assert res.status_code == 500
    assert "Database error during scheduling transaction" in res.json()["detail"]

    # Restore commit and verify NO assignments or solver runs were left committed
    monkeypatch.undo()
    runs_res = client.get("/api/v1/scheduling/runs")
    assert runs_res.status_code == 200
    assert runs_res.json()["total"] == 0

