"""Pytest fixtures for database isolation and FastAPI TestClient overrides."""
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app

# Ensure tests run in isolated test environment
settings.ENVIRONMENT = "testing"

# In-memory SQLite shared across connections in a test session
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Provide a clean, isolated database session per test function."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


from app.core.deps import get_current_user, require_authenticated, require_operator_or_above, require_admin
from app.models.user import User, UserRole


@pytest.fixture(scope="function")
def test_admin_user(db_session: Session, request: pytest.FixtureRequest) -> User | None:
    """Provide a default admin user in the test database for non-auth test suites."""
    node_path = str(getattr(request.node, "fspath", ""))
    if "test_api_auth.py" in node_path:
        return None

    admin = User(
        name="Test Administrator",
        email="test_admin@airport.test",
        password_hash="$2b$12$e8pA.7U71l56lQd8kZ1zquxI6mH46cK93Cj6Y78g650lK7Hq3q7C6",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture(scope="function")
def client(db_session: Session, test_admin_user: User | None, request: pytest.FixtureRequest) -> Generator[TestClient, None, None]:
    """Provide TestClient with database session dependency override and authenticated admin user for non-auth tests."""
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Only provide default admin override for non-auth test files so test_api_auth tests real security headers
    node_path = str(getattr(request.node, "fspath", ""))
    if "test_api_auth.py" not in node_path and test_admin_user is not None:
        def override_current_user() -> User:
            return test_admin_user

        app.dependency_overrides[get_current_user] = override_current_user
        app.dependency_overrides[require_authenticated] = override_current_user
        app.dependency_overrides[require_operator_or_above] = override_current_user
        app.dependency_overrides[require_admin] = override_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()

