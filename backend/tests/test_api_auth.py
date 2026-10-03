"""Comprehensive Phase 16 Authentication & Authorization Test Suite."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User, UserRole


def test_password_hashing():
    """Test secure hashing and verification."""
    password = "SuperSecurePassword123!"
    pw_hash = get_password_hash(password)
    assert pw_hash != password
    assert verify_password(password, pw_hash) is True
    assert verify_password("WrongPassword!", pw_hash) is False


def test_user_registration_success(client: TestClient):
    """Test public registration yields default VIEWER role."""
    payload = {
        "name": "Jane Viewer",
        "email": "jane.viewer@airport.test",
        "password": "Password123!",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "jane.viewer@airport.test"
    assert data["role"] == "VIEWER"
    assert "password" not in data
    assert "password_hash" not in data


def test_duplicate_user_registration_rejected(client: TestClient):
    """Test duplicate registration error."""
    payload = {
        "name": "Dup User",
        "email": "dup@airport.test",
        "password": "Password123!",
    }
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 400
    assert "already exists" in r2.json()["detail"].lower()


def test_login_success_and_token_generation(client: TestClient, db_session: Session):
    """Test successful login via JSON returns JWT token and user info."""
    user = User(
        name="Test Operator",
        email="operator@airport.test",
        password_hash=get_password_hash("OperatorPass123"),
        role=UserRole.OPERATOR,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login-json",
        json={"email": "operator@airport.test", "password": "OperatorPass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "OPERATOR"


def test_login_failure_invalid_credentials(client: TestClient):
    """Test that failed credentials return generic message without leaking information."""
    response = client.post(
        "/api/v1/auth/login-json",
        json={"email": "nonexistent@airport.test", "password": "WrongPassword"},
    )
    assert response.status_code == 401
    assert "invalid credentials" in response.json()["detail"].lower()


def test_inactive_user_login_rejected(client: TestClient, db_session: Session):
    """Test that deactivated users cannot log in."""
    user = User(
        name="Inactive User",
        email="inactive@airport.test",
        password_hash=get_password_hash("Pass123456"),
        role=UserRole.VIEWER,
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login-json",
        json={"email": "inactive@airport.test", "password": "Pass123456"},
    )
    assert response.status_code == 400
    assert "inactive" in response.json()["detail"].lower()


def test_current_user_me_endpoint(client: TestClient, db_session: Session):
    """Test /api/v1/auth/me returns current authenticated user profile."""
    user = User(
        name="Me User",
        email="me@airport.test",
        password_hash=get_password_hash("MePass1234"),
        role=UserRole.VIEWER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token(subject=user.id)
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user.id
    assert data["email"] == "me@airport.test"
    assert "password_hash" not in data


def test_unauthenticated_protected_endpoint_returns_401(client: TestClient):
    """Test unauthenticated call to protected endpoint returns 401."""
    response = client.post(
        "/api/v1/flights",
        json={"flight_number": "XX100", "airline": "Test", "flight_type": "DOMESTIC"},
    )
    assert response.status_code == 401


def test_viewer_insufficient_role_returns_403(client: TestClient, db_session: Session):
    """Test VIEWER cannot invoke OPERATOR-restricted mutation endpoints."""
    viewer = User(
        name="Viewer User",
        email="viewer@airport.test",
        password_hash=get_password_hash("Viewer123!"),
        role=UserRole.VIEWER,
        is_active=True,
    )
    db_session.add(viewer)
    db_session.commit()

    token = create_access_token(subject=viewer.id)
    response = client.post(
        "/api/v1/flights",
        json={"flight_number": "XX101", "airline": "Air", "flight_type": "DOMESTIC"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert "insufficient permissions" in response.json()["detail"].lower()


def test_operator_can_access_operator_endpoints(client: TestClient, db_session: Session):
    """Test OPERATOR has permission to run solver endpoints."""
    operator = User(
        name="Op User",
        email="op@airport.test",
        password_hash=get_password_hash("OpPass123!"),
        role=UserRole.OPERATOR,
        is_active=True,
    )
    db_session.add(operator)
    db_session.commit()

    token = create_access_token(subject=operator.id)
    response = client.post(
        "/api/v1/scheduling/solve",
        json={"time_window_hours": 24, "strategy": "BACKTRACKING"},
        headers={"Authorization": f"Bearer {token}"},
    )
    # The endpoint runs (may return 200 or 400 depending on db seed, but NOT 401 or 403)
    assert response.status_code not in (401, 403)


def test_operator_cannot_access_admin_endpoints(client: TestClient, db_session: Session):
    """Test OPERATOR cannot manage users."""
    operator = User(
        name="Op User 2",
        email="op2@airport.test",
        password_hash=get_password_hash("OpPass123!"),
        role=UserRole.OPERATOR,
        is_active=True,
    )
    db_session.add(operator)
    db_session.commit()

    token = create_access_token(subject=operator.id)
    response = client.get(
        "/api/v1/auth/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert "admin role required" in response.json()["detail"].lower()


def test_admin_can_list_users(client: TestClient, db_session: Session):
    """Test ADMIN role can access user management listing."""
    admin = User(
        name="Super Admin",
        email="admin@test.local",
        password_hash=get_password_hash("AdminPass1!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()

    token = create_access_token(subject=admin.id)
    response = client.get(
        "/api/v1/auth/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_admin_can_update_user_role(client: TestClient, db_session: Session):
    """Test ADMIN can promote a VIEWER to OPERATOR."""
    admin = User(
        name="Admin",
        email="admin_promo@test.local",
        password_hash=get_password_hash("AdminPass1!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    target = User(
        name="To Promote",
        email="promotee@test.local",
        password_hash=get_password_hash("TargetPass1!"),
        role=UserRole.VIEWER,
        is_active=True,
    )
    db_session.add_all([admin, target])
    db_session.commit()

    token = create_access_token(subject=admin.id)
    response = client.put(
        f"/api/v1/auth/users/{target.id}",
        json={"role": "OPERATOR"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["role"] == "OPERATOR"


def test_last_admin_protection_safeguard(client: TestClient, db_session: Session):
    """Test safeguard preventing demotion of the last active administrator."""
    only_admin = User(
        name="Only Admin",
        email="only_admin@test.local",
        password_hash=get_password_hash("AdminPass1!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(only_admin)
    db_session.commit()

    token = create_access_token(subject=only_admin.id)
    response = client.put(
        f"/api/v1/auth/users/{only_admin.id}",
        json={"role": "VIEWER"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert "cannot demote or deactivate the last" in response.json()["detail"].lower()


def test_change_password_workflow(client: TestClient, db_session: Session):
    """Test secure password change requires correct current password."""
    user = User(
        name="PW Changer",
        email="pwchange@test.local",
        password_hash=get_password_hash("OldPassword123!"),
        role=UserRole.VIEWER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token(subject=user.id)
    # Incorrect current password fails
    bad_res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "WrongPassword!", "new_password": "NewPassword123!"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert bad_res.status_code == 400

    # Correct current password succeeds
    good_res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "OldPassword123!", "new_password": "NewPassword123!"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert good_res.status_code == 200


def test_logout_endpoint(client: TestClient, db_session: Session):
    """Test logout endpoint returns confirmation."""
    user = User(
        name="Logout User",
        email="logout@test.local",
        password_hash=get_password_hash("Pass1234!"),
        role=UserRole.VIEWER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token(subject=user.id)
    response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert "logged out" in response.json()["message"].lower()


def test_invalid_input_validation(client: TestClient):
    """Test input validation for registration rejects malformed input."""
    # Password too short (< 8 chars)
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "A", "email": "valid@email.com", "password": "short"},
    )
    assert response.status_code == 422


def test_passwords_never_returned_in_api(client: TestClient, db_session: Session):
    """Verify password and password_hash are completely excluded from UserRead."""
    admin = User(
        name="Auditor",
        email="auditor@test.local",
        password_hash=get_password_hash("SecretPassword1!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()

    token = create_access_token(subject=admin.id)
    users_res = client.get("/api/v1/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert users_res.status_code == 200
    for u in users_res.json():
        assert "password" not in u
        assert "password_hash" not in u


def test_admin_role_creation_safeguard(client: TestClient):
    """Ensure public registration cannot inject ADMIN role."""
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Hacker", "email": "hacker@test.local", "password": "Password123!", "role": "ADMIN"},
    )
    assert response.status_code == 201
    assert response.json()["role"] == "VIEWER"


def test_operator_simulation_apply_delay_permission(client: TestClient, db_session: Session):
    """Test simulation delay mutation requires OPERATOR+."""
    viewer = User(
        name="Sim Viewer",
        email="sim_viewer@test.local",
        password_hash=get_password_hash("Password123!"),
        role=UserRole.VIEWER,
        is_active=True,
    )
    db_session.add(viewer)
    db_session.commit()

    token = create_access_token(subject=viewer.id)
    response = client.post(
        "/api/v1/simulation/allocate-gate",
        json={"flight_id": 1, "simulation_time": "2026-10-03T12:00:00Z"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
