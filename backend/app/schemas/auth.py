from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from app.models.user import UserRole

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserRead"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str
    password: str = Field(..., min_length=8)

class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class UserManageUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

TokenResponse.model_rebuild()
