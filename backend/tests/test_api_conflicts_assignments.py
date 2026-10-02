"""Tests for Gate Assignments and Conflict endpoints."""
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from tests.test_api_scheduling import setup_airport_environment


def test_assignment_manual_crud_and_collision(client: TestClient):
    """Test manual assignment validation, collision rejection, and updates."""
    airport_id, remote_id, gate_ids = setup_airport_environment(client)

    now = datetime.now(timezone.utc)
    t1 = now + timedelta(hours=1)
    t2 = t1 + timedelta(hours=1)

    f1 = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "ASG01",
            "airline": "Delta",
            "origin_airport_id": remote_id,
            "destination_airport_id": airport_id,
            "scheduled_arrival": t1.isoformat(),
            "scheduled_departure": t2.isoformat(),
        },
    ).json()["id"]

    f2 = client.post(
        "/api/v1/flights",
        json={
            "flight_number": "ASG02",
            "airline": "Delta",
            "origin_airport_id": remote_id,
            "destination_airport_id": airport_id,
            "scheduled_arrival": t1.isoformat(),
            "scheduled_departure": t2.isoformat(),
        },
    ).json()["id"]

    # 1. Create valid assignment
    asg_res = client.post(
        "/api/v1/assignments",
        json={
            "flight_id": f1,
            "gate_id": gate_ids[0],
            "assignment_start_time": t1.isoformat(),
            "assignment_end_time": t2.isoformat(),
            "status": "CONFIRMED",
            "source": "MANUAL",
        },
    )
    assert asg_res.status_code == 201
    asg_id = asg_res.json()["id"]

    # 2. Reject colliding assignment at same gate and overlapping time
    dup_asg = client.post(
        "/api/v1/assignments",
        json={
            "flight_id": f2,
            "gate_id": gate_ids[0],
            "assignment_start_time": (t1 + timedelta(minutes=15)).isoformat(),
            "assignment_end_time": (t2 + timedelta(minutes=15)).isoformat(),
            "status": "CONFIRMED",
            "source": "MANUAL",
        },
    )
    assert dup_asg.status_code == 409
    assert "already assigned" in dup_asg.json()["detail"]

    # 3. Read assignment
    get_res = client.get(f"/api/v1/assignments/{asg_id}")
    assert get_res.status_code == 200
    assert get_res.json()["flight_id"] == f1

    # 4. Update assignment
    up_res = client.patch(f"/api/v1/assignments/{asg_id}", json={"status": "ACTIVE"})
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "ACTIVE"

    # 5. Delete assignment
    del_res = client.delete(f"/api/v1/assignments/{asg_id}")
    assert del_res.status_code == 204


def test_conflict_inspection_and_resolution(client: TestClient):
    """Test conflict retrieval and manual resolution workflow."""
    airport_id, remote_id, gate_ids = setup_airport_environment(client)

    now = datetime.now(timezone.utc)
    # Trigger an impossible schedule to create conflict records
    client.patch(f"/api/v1/gates/{gate_ids[1]}", json={"is_closed": True, "closure_reason": "Maintenance"})

    f_ids = []
    for i in range(2):
        fid = client.post(
            "/api/v1/flights",
            json={
                "flight_number": f"CONF{i+1}",
                "airline": "Delta",
                "origin_airport_id": remote_id,
                "destination_airport_id": airport_id,
                "scheduled_arrival": (now + timedelta(hours=3)).isoformat(),
                "scheduled_departure": (now + timedelta(hours=4)).isoformat(),
            },
        ).json()["id"]
        f_ids.append(fid)

    client.post(
        "/api/v1/scheduling/solve",
        json={"airport_id": airport_id, "flight_ids": f_ids},
    )

    # List conflicts
    conf_list = client.get(f"/api/v1/conflicts?is_resolved=false")
    assert conf_list.status_code == 200
    conf_data = conf_list.json()
    assert conf_data["total"] >= 1

    conflict_id = conf_data["items"][0]["id"]

    # Get single conflict
    conf_get = client.get(f"/api/v1/conflicts/{conflict_id}")
    assert conf_get.status_code == 200
    assert conf_get.json()["is_resolved"] is False

    # Resolve conflict
    res_patch = client.patch(
        f"/api/v1/conflicts/{conflict_id}/resolve",
        json={"is_resolved": True, "resolution_info": "Holding pattern assigned and gate opened"},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["is_resolved"] is True
    assert res_patch.json()["resolution_info"] == "Holding pattern assigned and gate opened"
