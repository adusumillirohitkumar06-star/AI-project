from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.core.deps import get_current_user, require_admin, require_authenticated
from app.models.user import User
from app.schemas.auth import (
    TokenResponse,
    RegisterRequest,
    UserRead,
    UserManageUpdate,
    PasswordChangeRequest,
    LoginRequest
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(
    user_in: RegisterRequest,
    db: Session = Depends(get_db)
) -> Any:
    """Register a new user (default role VIEWER)."""
    return auth_service.create_user(db, user_in)

@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Any:
    """OAuth2 compatible token login."""
    user = auth_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login-json", response_model=TokenResponse)
def login_json(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """JSON login."""
    user = auth_service.authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserRead)
def read_users_me(
    current_user: User = Depends(require_authenticated)
) -> Any:
    """Get current user."""
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(require_authenticated)):
    """Client-side logout, just standard response."""
    return {"message": "Successfully logged out"}

@router.post("/change-password")
def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
) -> Any:
    """Change password for current user."""
    auth_service.change_password(db, current_user, password_data)
    return {"message": "Password changed successfully"}

@router.get("/users", response_model=List[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Any:
    """List all users (Admin only)."""
    return auth_service.list_users(db)

@router.put("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    update_data: UserManageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Any:
    """Update user role/status (Admin only)."""
    return auth_service.update_user_role(db, user_id, update_data)
