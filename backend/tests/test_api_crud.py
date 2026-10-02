"""Tests for REST API CRUD operations and input validations."""
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient


def test_airports_crud_and_rejections(client: TestClient):
    """Test Airport CRUD lifecycle and uniqueness constraints."""
    # 1. Create airport
    payload = {
        "iata_code": "JFK",
        "icao_code": "KJFK",
        "name": "John F. Kennedy International Airport",
        "city": "New York",
        "country": "United States",
        "latitude": 40.6413,
        "longitude": -73.7781,
        "timezone": "America/New_York",
        "is_active": True,
    }
    res = client.post("/api/v1/airports", json=payload)
    assert res.status_code == 201
    airport_data = res.json()
    airport_id = airport_data["id"]
    assert airport_data["iata_code"] == "JFK"

    # 2. Reject duplicate IATA code
    dup_res = client.post("/api/v1/airports", json={**payload, "icao_code": "KJFX"})
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"]

    # 3. Read airport
    get_res = client.get(f"/api/v1/airports/{airport_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "John F. Kennedy International Airport"

    # 4. List airports with pagination
    list_res = client.get("/api/v1/airports?page=1&page_size=10")
    assert list_res.status_code == 200
    body = list_res.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1

    # 5. Update airport
    update_res = client.patch(f"/api/v1/airports/{airport_id}", json={"name": "JFK International"})
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "JFK International"

    # 6. Delete airport
    del_res = client.delete(f"/api/v1/airports/{airport_id}")
    assert del_res.status_code == 204

    # Confirm deletion
    get_del = client.get(f"/api/v1/airports/{airport_id}")
    assert get_del.status_code == 404


def test_terminals_and_gates_crud(client: TestClient):
    """Test Terminal and Gate creation, parent foreign keys, and code constraints."""
    # 1. Setup airport
    airport_res = client.post(
        "/api/v1/airports",
        json={
            "iata_code": "LHR",
            "icao_code": "EGLL",
            "name": "London Heathrow Airport",
            "city": "London",
            "country": "United Kingdom",
            "latitude": 51.4700,
            "longitude": -0.4543,
            "timezone": "Europe/London",
        },
    )
    airport_id = airport_res.json()["id"]

    # 2. Create Terminal
    term_res = client.post(
        "/api/v1/terminals",
        json={
            "airport_id": airport_id,
            "terminal_code": "T2",
            "name": "The Queen's Terminal",
        },
    )
    assert term_res.status_code == 201
    terminal_id = term_res.json()["id"]

    # 3. Reject terminal for non-existent airport
    bad_term = client.post(
        "/api/v1/terminals",
        json={
            "airport_id": 99999,
            "terminal_code": "T9",
            "name": "Invalid",
        },
    )
    assert bad_term.status_code == 404

    # 4. Create Gate
    gate_res = client.post(
        "/api/v1/gates",
        json={
            "terminal_id": terminal_id,
            "gate_code": "A10",
            "gate_type": "JET_BRIDGE",
            "capability": "BOTH",
            "supported_aircraft_types": "NARROW_BODY,WIDE_BODY",
            "max_aircraft_size": "WIDE_BODY",
            "is_active": True,
        },
    )
    assert gate_res.status_code == 201
    gate_id = gate_res.json()["id"]
    assert gate_res.json()["gate_code"] == "A10"

    # 5. Reject gate with invalid terminal
    bad_gate = client.post(
        "/api/v1/gates",
        json={
            "terminal_id": 88888,
            "gate_code": "B1",
        },
    )
    assert bad_gate.status_code == 404

    # 6. Read and update Gate
    up_gate = client.patch(f"/api/v1/gates/{gate_id}", json={"is_closed": True, "closure_reason": "Maintenance"})
    assert up_gate.status_code == 200
    assert up_gate.json()["is_closed"] is True
    assert up_gate.json()["closure_reason"] == "Maintenance"

    # 7. List gates
    list_gates = client.get(f"/api/v1/gates?airport_id={airport_id}")
    assert list_gates.status_code == 200
    assert list_gates.json()["total"] == 1


def test_aircraft_crud_and_uniqueness(client: TestClient):
    """Test Aircraft registration validation and duplicate rejection."""
    payload = {
        "registration": "N789AA",
        "model": "Boeing 787-9 Dreamliner",
        "aircraft_type": "B789",
        "airline": "American Airlines",
        "capacity": 285,
        "category": "WIDE_BODY",
        "is_active": True,
    }
    create_res = client.post("/api/v1/aircraft", json=payload)
    assert create_res.status_code == 201
    aircraft_id = create_res.json()["id"]

    # Reject duplicate registration
    dup_res = client.post("/api/v1/aircraft", json=payload)
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"]

    # Read aircraft
    get_res = client.get(f"/api/v1/aircraft/{aircraft_id}")
    assert get_res.status_code == 200
    assert get_res.json()["registration"] == "N789AA"


def test_flights_crud_and_validations(client: TestClient):
    """Test Flight CRUD and rejection of invalid timing / foreign keys."""
    # Create 2 airports
    a1 = client.post(
        "/api/v1/airports",
        json={
            "iata_code": "ORD",
            "icao_code": "KORD",
            "name": "O'Hare International Airport",
            "city": "Chicago",
            "country": "USA",
            "latitude": 41.9742,
            "longitude": -87.9073,
            "timezone": "America/Chicago",
        },
    ).json()["id"]

    a2 = client.post(
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
    ).json()["id"]

    now = datetime.now(timezone.utc)
    arr = (now + timedelta(hours=2)).isoformat()
    dep = (now + timedelta(hours=3)).isoformat()

    # 1. Valid Flight Creation
    flight_res = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "UA100",
            "airline": "United Airlines",
            "origin_airport_id": a1,
            "destination_airport_id": a2,
            "scheduled_arrival": arr,
            "scheduled_departure": dep,
            "flight_type": "DOMESTIC",
            "priority": "NORMAL",
            "passenger_count": 160,
        },
    )
    assert flight_res.status_code == 201
    flight_id = flight_res.json()["id"]

    # 2. Reject flight when departure < arrival
    bad_time_res = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "UA999",
            "airline": "United Airlines",
            "origin_airport_id": a1,
            "destination_airport_id": a2,
            "scheduled_arrival": dep,
            "scheduled_departure": arr,  # earlier than arrival!
        },
    )
    assert bad_time_res.status_code in [400, 422]

    # 3. Reject flight with identical origin and destination
    same_airport_res = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "UA888",
            "airline": "United Airlines",
            "origin_airport_id": a1,
            "destination_airport_id": a1,
            "scheduled_arrival": arr,
            "scheduled_departure": dep,
        },
    )
    assert same_airport_res.status_code in [400, 422]

    # 4. Reject flight with non-existent airport
    bad_airport_res = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "UA777",
            "airline": "United Airlines",
            "origin_airport_id": 99999,
            "destination_airport_id": a2,
            "scheduled_arrival": arr,
            "scheduled_departure": dep,
        },
    )
    assert bad_airport_res.status_code == 404

    # 5. List flights with filter
    list_res = client.get(f"/api/v1/flights?airport_id={a1}&airline=United")
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 1
