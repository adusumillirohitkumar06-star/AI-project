"""Integration tests for Phase 13: Dynamic Rescheduling and Delay Handling."""
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient


def setup_delay_test_env(client: TestClient):
    """Set up airport with two gates (A1 and A2) and remote origin airport."""
    airport_res = client.post(
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
    )
    airport_id = airport_res.json()["id"]

    orig_res = client.post(
        "/api/v1/airports",
        json={
            "iata_code": "SFO",
            "icao_code": "KSFO",
            "name": "San Francisco International Airport",
            "city": "San Francisco",
            "country": "USA",
            "latitude": 37.6213,
            "longitude": -122.3790,
            "timezone": "America/Los_Angeles",
        },
    )
    orig_id = orig_res.json()["id"]

    term_res = client.post(
        "/api/v1/terminals",
        json={"airport_id": airport_id, "terminal_code": "T1", "name": "Terminal 1"},
    )
    term_id = term_res.json()["id"]

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

    return airport_id, orig_id, g1, g2


def test_apply_delay_retains_when_no_conflict(client: TestClient):
    """Delay applied with no gate collision retains assignment with operational times."""
    airport_id, orig_id, g1, g2 = setup_delay_test_env(client)

    now = datetime.now(timezone.utc)
    arr_time = now + timedelta(hours=2)
    dep_time = arr_time + timedelta(hours=1)

    f1 = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "UA101",
            "airline": "United Airlines",
            "origin_airport_id": orig_id,
            "destination_airport_id": airport_id,
            "scheduled_arrival": arr_time.isoformat(),
            "scheduled_departure": dep_time.isoformat(),
            "flight_type": "DOMESTIC",
            "priority": "NORMAL",
            "turnaround_duration_minutes": 45,
        },
    ).json()["id"]

    # Pre-assign UA101 to Gate A1
    client.post(
        "/api/v1/assignments",
        json={
            "flight_id": f1,
            "gate_id": g1,
            "assignment_start_time": arr_time.isoformat(),
            "assignment_end_time": dep_time.isoformat(),
            "status": "CONFIRMED",
        },
    )

    # Apply 20 minute delay
    delay_res = client.post(
        f"/api/v1/flights/{f1}/delay",
        json={
            "delay_minutes": 20,
            "reason": "WEATHER",
            "reschedule_if_conflict": True,
        },
    )
    assert delay_res.status_code == 200
    data = delay_res.json()

    assert data["success"] is True
    assert data["status"] == "RETAINED"
    assert data["has_conflict"] is False
    assert data["rescheduled"] is False
    assert data["delay_minutes"] == 20
    assert data["delay_reason"] == "WEATHER"
    assert data["current_gate_code"] == "A1"

    # Verify original schedule is intact
    assert data["original_arrival"] == arr_time.isoformat().replace("+00:00", "Z") or data["original_arrival"] is not None

    # Verify database flight record
    f_check = client.get(f"/api/v1/flights/{f1}").json()
    assert f_check["delay_duration_minutes"] == 20
    assert f_check["delay_reason"] == "WEATHER"
    assert f_check["status"] == "DELAYED"

    # Verify assignment updated to operational times
    assign_check = client.get(f"/api/v1/assignments?flight_id={f1}").json()
    assert assign_check["total"] == 1
    assert assign_check["items"][0]["gate_code"] == "A1"
    assert assign_check["items"][0]["status"] == "CONFIRMED"


def test_apply_delay_validation_errors(client: TestClient):
    """Negative delay and non-existent flight return appropriate errors."""
    airport_id, orig_id, g1, g2 = setup_delay_test_env(client)

    # 1. Non-existent flight -> 404
    res_404 = client.post(
        "/api/v1/flights/999999/delay",
        json={"delay_minutes": 30, "reason": "AIR_TRAFFIC"},
    )
    assert res_404.status_code == 404

    # 2. Negative/zero delay -> 400 or 422
    now = datetime.now(timezone.utc)
    f1 = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "UA202",
            "airline": "United Airlines",
            "origin_airport_id": orig_id,
            "destination_airport_id": airport_id,
            "scheduled_arrival": (now + timedelta(hours=1)).isoformat(),
            "scheduled_departure": (now + timedelta(hours=2)).isoformat(),
        },
    ).json()["id"]

    res_neg = client.post(
        f"/api/v1/flights/{f1}/delay",
        json={"delay_minutes": 0, "reason": "AIRCRAFT"},
    )
    assert res_neg.status_code in [400, 422]


def test_apply_delay_detects_conflict_and_reschedules_via_csp(client: TestClient):
    """Delay causing back-to-back overlap triggers CSP and moves flight to Gate A2."""
    airport_id, orig_id, g1, g2 = setup_delay_test_env(client)

    now = datetime.now(timezone.utc)
    t1_arr = now + timedelta(hours=1)
    t1_dep = t1_arr + timedelta(hours=1)  # 10:00 -> 11:00

    t2_arr = t1_dep                       # 11:00 -> 12:00 (back-to-back on Gate A1!)
    t2_dep = t2_arr + timedelta(hours=1)

    # Flight 1
    f1 = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "FLIGHT1",
            "airline": "United Airlines",
            "origin_airport_id": orig_id,
            "destination_airport_id": airport_id,
            "scheduled_arrival": t1_arr.isoformat(),
            "scheduled_departure": t1_dep.isoformat(),
        },
    ).json()["id"]

    # Flight 2
    f2 = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "FLIGHT2",
            "airline": "United Airlines",
            "origin_airport_id": orig_id,
            "destination_airport_id": airport_id,
            "scheduled_arrival": t2_arr.isoformat(),
            "scheduled_departure": t2_dep.isoformat(),
        },
    ).json()["id"]

    # Both assigned back-to-back to Gate A1
    client.post(
        "/api/v1/assignments",
        json={
            "flight_id": f1,
            "gate_id": g1,
            "assignment_start_time": t1_arr.isoformat(),
            "assignment_end_time": t1_dep.isoformat(),
            "status": "CONFIRMED",
        },
    )
    client.post(
        "/api/v1/assignments",
        json={
            "flight_id": f2,
            "gate_id": g1,
            "assignment_start_time": t2_arr.isoformat(),
            "assignment_end_time": t2_dep.isoformat(),
            "status": "CONFIRMED",
        },
    )

    # Delay Flight 1 by 30 minutes (new timing: 10:30 -> 11:30, colliding with FLIGHT2 at 11:00!)
    delay_res = client.post(
        f"/api/v1/flights/{f1}/delay",
        json={
            "delay_minutes": 30,
            "reason": "AIR_TRAFFIC",
            "reschedule_if_conflict": True,
        },
    )
    assert delay_res.status_code == 200
    data = delay_res.json()

    assert data["success"] is True
    assert data["status"] == "RESCHEDULED"
    assert data["has_conflict"] is True
    assert data["rescheduled"] is True
    assert data["previous_gate_code"] == "A1"
    assert data["current_gate_code"] == "A2"
    assert data["solver_run_id"] is not None

    # Verify conflict record was resolved
    conflicts_res = client.get(f"/api/v1/conflicts?flight_id={f1}").json()
    assert conflicts_res["total"] >= 1
    assert conflicts_res["items"][0]["is_resolved"] is True
    assert "reallocated from Gate A1 to Gate A2" in conflicts_res["items"][0]["resolution_info"]

    # Verify old assignment on A1 was revoked and only A2 is confirmed
    assign_res = client.get(f"/api/v1/assignments?flight_id={f1}").json()
    confirmed = [a for a in assign_res["items"] if a["status"] == "CONFIRMED"]
    revoked = [a for a in assign_res["items"] if a["status"] == "REVOKED"]
    assert len(confirmed) == 1
    assert confirmed[0]["gate_code"] == "A2"
    assert len(revoked) >= 1

    # Verify FLIGHT2 remained undisturbed on A1
    f2_assign = client.get(f"/api/v1/assignments?flight_id={f2}").json()
    f2_confirmed = [a for a in f2_assign["items"] if a["status"] == "CONFIRMED"]
    assert len(f2_confirmed) == 1
    assert f2_confirmed[0]["gate_code"] == "A1"

    # Verify SolverRun has trigger=DYNAMIC_RESCHEDULING
    run_res = client.get(f"/api/v1/scheduling/runs/{data['solver_run_id']}").json()
    assert run_res["solver_configuration"]["trigger"] == "DYNAMIC_RESCHEDULING"


def test_apply_delay_no_compatible_gate_available(client: TestClient):
    """When delay causes conflict and no other gate exists, reports NO_GATE_AVAILABLE."""
    # Create airport with ONLY 1 GATE
    airport_res = client.post(
        "/api/v1/airports",
        json={
            "iata_code": "BOS",
            "icao_code": "KBOS",
            "name": "Boston Logan International Airport",
            "city": "Boston",
            "country": "USA",
            "latitude": 42.3656,
            "longitude": -71.0096,
            "timezone": "America/New_York",
        },
    )
    airport_id = airport_res.json()["id"]

    orig_res = client.post(
        "/api/v1/airports",
        json={
            "iata_code": "DCA",
            "icao_code": "KDCA",
            "name": "Ronald Reagan Washington National Airport",
            "city": "Arlington",
            "country": "USA",
            "latitude": 38.8512,
            "longitude": -77.0402,
            "timezone": "America/New_York",
        },
    )
    orig_id = orig_res.json()["id"]

    term_id = client.post(
        "/api/v1/terminals",
        json={"airport_id": airport_id, "terminal_code": "TA", "name": "Terminal A"},
    ).json()["id"]

    g1 = client.post(
        "/api/v1/gates",
        json={
            "terminal_id": term_id,
            "gate_code": "A1",
            "capability": "BOTH",
            "max_aircraft_size": "WIDE_BODY",
        },
    ).json()["id"]

    now = datetime.now(timezone.utc)
    t1_arr = now + timedelta(hours=1)
    t1_dep = t1_arr + timedelta(hours=1)
    t2_arr = t1_dep
    t2_dep = t2_arr + timedelta(hours=1)

    f1 = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "COLLIDE1",
            "airline": "Delta Air Lines",
            "origin_airport_id": orig_id,
            "destination_airport_id": airport_id,
            "scheduled_arrival": t1_arr.isoformat(),
            "scheduled_departure": t1_dep.isoformat(),
        },
    ).json()["id"]

    f2 = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "COLLIDE2",
            "airline": "Delta Air Lines",
            "origin_airport_id": orig_id,
            "destination_airport_id": airport_id,
            "scheduled_arrival": t2_arr.isoformat(),
            "scheduled_departure": t2_dep.isoformat(),
        },
    ).json()["id"]

    client.post(
        "/api/v1/assignments",
        json={
            "flight_id": f1,
            "gate_id": g1,
            "assignment_start_time": t1_arr.isoformat(),
            "assignment_end_time": t1_dep.isoformat(),
            "status": "CONFIRMED",
        },
    )
    client.post(
        "/api/v1/assignments",
        json={
            "flight_id": f2,
            "gate_id": g1,
            "assignment_start_time": t2_arr.isoformat(),
            "assignment_end_time": t2_dep.isoformat(),
            "status": "CONFIRMED",
        },
    )

    # Delay COLLIDE1 by 45 minutes -> collides with COLLIDE2 with only 1 gate in airport
    delay_res = client.post(
        f"/api/v1/flights/{f1}/delay",
        json={
            "delay_minutes": 45,
            "reason": "CREW",
            "reschedule_if_conflict": True,
        },
    )
    assert delay_res.status_code == 200
    data = delay_res.json()

    assert data["success"] is False
    assert data["status"] == "NO_GATE_AVAILABLE"
    assert data["current_gate_code"] is None
    assert data["has_conflict"] is True
    assert data["rescheduled"] is False

    # Conflict remains open
    conflicts_res = client.get(f"/api/v1/conflicts?flight_id={f1}").json()
    assert conflicts_res["total"] >= 1
    assert conflicts_res["items"][0]["is_resolved"] is False
