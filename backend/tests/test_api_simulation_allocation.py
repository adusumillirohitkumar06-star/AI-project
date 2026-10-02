"""Integration tests for Simulation Gate Allocation endpoint and pure CSP coordination."""
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient


def setup_simulation_test_env(client: TestClient):
    """Helper to set up an airport, remote airport, terminal, and gate."""
    # Destination Airport
    dest_res = client.post(
        "/api/v1/airports",
        json={
            "iata_code": "JFK",
            "icao_code": "KJFK",
            "name": "John F Kennedy International Airport",
            "city": "New York",
            "country": "USA",
            "latitude": 40.6413,
            "longitude": -73.7781,
            "timezone": "America/New_York",
        },
    )
    dest_id = dest_res.json()["id"]

    # Origin Airport
    orig_res = client.post(
        "/api/v1/airports",
        json={
            "iata_code": "LAX",
            "icao_code": "KLAX",
            "name": "Los Angeles International Airport",
            "city": "Los Angeles",
            "country": "USA",
            "latitude": 33.9416,
            "longitude": -118.4085,
            "timezone": "America/Los_Angeles",
        },
    )
    orig_id = orig_res.json()["id"]

    # Terminal at JFK
    term_res = client.post(
        "/api/v1/terminals",
        json={"airport_id": dest_id, "terminal_code": "T4", "name": "Terminal 4"},
    )
    term_id = term_res.json()["id"]

    # Gate B20 at JFK
    gate_res = client.post(
        "/api/v1/gates",
        json={
            "terminal_id": term_id,
            "gate_code": "B20",
            "capability": "BOTH",
            "max_aircraft_size": "WIDE_BODY",
        },
    )
    gate_id = gate_res.json()["id"]

    return dest_id, orig_id, term_id, gate_id


def test_simulation_allocate_gate_success(client: TestClient):
    """Approaching flight with no prior assignment triggers CSP and gets allocated."""
    dest_id, orig_id, term_id, gate_id = setup_simulation_test_env(client)

    now = datetime.now(timezone.utc)
    flight_res = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "DL450",
            "airline": "Delta Air Lines",
            "origin_airport_id": orig_id,
            "destination_airport_id": dest_id,
            "scheduled_arrival": (now + timedelta(hours=2)).isoformat(),
            "scheduled_departure": (now + timedelta(hours=3)).isoformat(),
            "flight_type": "DOMESTIC",
            "priority": "NORMAL",
        },
    )
    assert flight_res.status_code == 201
    flight_id = flight_res.json()["id"]

    # Send simulation allocation request
    req = {
        "flight_id": flight_id,
        "inter_flight_buffer_minutes": 15,
        "strategy": "BACKTRACKING_WITH_CONSTRAINT_PROPAGATION",
    }
    res = client.post("/api/v1/simulation/allocate-gate", json=req)
    assert res.status_code == 200
    data = res.json()

    assert data["success"] is True
    assert data["status"] == "ALLOCATED"
    assert data["flight_id"] == flight_id
    assert data["gate_code"] == "B20"
    assert data["terminal_code"] == "T4"
    assert data["assignment"] is not None
    assert data["assignment"]["gate_code"] == "B20"

    # Verify assignment is persisted in the database
    assignments_res = client.get(f"/api/v1/assignments?flight_id={flight_id}")
    assert assignments_res.status_code == 200
    assignments_data = assignments_res.json()
    assert assignments_data["total"] == 1
    assert assignments_data["items"][0]["gate_code"] == "B20"


def test_simulation_allocate_gate_retains_valid_existing_assignment(client: TestClient):
    """Flight with already valid assignment retains it without re-solving."""
    dest_id, orig_id, term_id, gate_id = setup_simulation_test_env(client)

    now = datetime.now(timezone.utc)
    start_time = now + timedelta(hours=1)
    end_time = now + timedelta(hours=2)

    flight_res = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "AA100",
            "airline": "American Airlines",
            "origin_airport_id": orig_id,
            "destination_airport_id": dest_id,
            "scheduled_arrival": start_time.isoformat(),
            "scheduled_departure": end_time.isoformat(),
            "flight_type": "DOMESTIC",
            "priority": "NORMAL",
        },
    )
    flight_id = flight_res.json()["id"]

    # Pre-assign flight to Gate B20
    assign_res = client.post(
        "/api/v1/assignments",
        json={
            "flight_id": flight_id,
            "gate_id": gate_id,
            "assignment_start_time": start_time.isoformat(),
            "assignment_end_time": end_time.isoformat(),
            "status": "CONFIRMED",
        },
    )
    assert assign_res.status_code == 201

    # Request simulation gate allocation
    res = client.post(
        "/api/v1/simulation/allocate-gate",
        json={"flight_id": flight_id},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["success"] is True
    assert data["status"] == "RETAINED"
    assert data["gate_code"] == "B20"
    assert "retained" in data["message"].lower()


def test_simulation_allocate_gate_no_gate_available(client: TestClient):
    """When no gate satisfies constraints (e.g., capability mismatch), reports NO_GATE_AVAILABLE."""
    dest_id, orig_id, term_id, gate_id = setup_simulation_test_env(client)

    # Change gate capability to DOMESTIC only
    patch_res = client.patch(f"/api/v1/gates/{gate_id}", json={"capability": "DOMESTIC"})
    assert patch_res.status_code == 200

    now = datetime.now(timezone.utc)
    # Flight is INTERNATIONAL
    flight_res = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "BA117",
            "airline": "British Airways",
            "origin_airport_id": orig_id,
            "destination_airport_id": dest_id,
            "scheduled_arrival": (now + timedelta(hours=3)).isoformat(),
            "scheduled_departure": (now + timedelta(hours=4)).isoformat(),
            "flight_type": "INTERNATIONAL",
            "priority": "NORMAL",
        },
    )
    flight_id = flight_res.json()["id"]

    res = client.post(
        "/api/v1/simulation/allocate-gate",
        json={"flight_id": flight_id},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["success"] is False
    assert data["status"] == "NO_GATE_AVAILABLE"
    assert data["gate_id"] is None
    assert len(data["conflicts"]) > 0

    # Ensure no assignment was created in database
    assign_check = client.get(f"/api/v1/assignments?flight_id={flight_id}")
    assert assign_check.status_code == 200
    assert assign_check.json()["total"] == 0


def test_simulation_allocate_gate_idempotent_multiple_calls(client: TestClient):
    """Repeated calls for the same flight first ALLOCATE then RETAIN without duplicating assignments."""
    dest_id, orig_id, term_id, gate_id = setup_simulation_test_env(client)

    now = datetime.now(timezone.utc)
    flight_res = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "UA555",
            "airline": "United Airlines",
            "origin_airport_id": orig_id,
            "destination_airport_id": dest_id,
            "scheduled_arrival": (now + timedelta(hours=1)).isoformat(),
            "scheduled_departure": (now + timedelta(hours=2)).isoformat(),
            "flight_type": "DOMESTIC",
            "priority": "NORMAL",
        },
    )
    flight_id = flight_res.json()["id"]

    # First call: ALLOCATED
    res1 = client.post(
        "/api/v1/simulation/allocate-gate",
        json={"flight_id": flight_id},
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "ALLOCATED"

    # Second call: RETAINED
    res2 = client.post(
        "/api/v1/simulation/allocate-gate",
        json={"flight_id": flight_id},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "RETAINED"
    assert res2.json()["gate_code"] == res1.json()["gate_code"]

    # Check that database has exactly 1 assignment for this flight
    assignments_res = client.get(f"/api/v1/assignments?flight_id={flight_id}")
    assert assignments_res.status_code == 200
    assert assignments_res.json()["total"] == 1


def test_simulation_allocate_gate_not_found(client: TestClient):
    """Non-existent flight yields 404."""
    res = client.post(
        "/api/v1/simulation/allocate-gate",
        json={"flight_id": 999999},
    )
    assert res.status_code == 404
