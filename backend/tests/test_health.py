"""Test root and health check endpoints."""
from fastapi.testclient import TestClient

from app.main import app

baseline_client = TestClient(app)


def test_root_endpoint():
    """Verify that the root endpoint returns 200 and expected metadata."""
    response = baseline_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert "version" in data
    assert "message" in data


def test_health_endpoint():
    """Verify that the health check endpoint returns 200 and status ok."""
    response = baseline_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-airport-backend"
    assert "environment" in data


def test_api_v1_health_endpoint(client: TestClient):
    """Verify that the v1 health endpoint returns 200 and reports database telemetry."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-airport-api-v1"
    assert "database" in data
    assert data["database"]["status"] == "connected"
