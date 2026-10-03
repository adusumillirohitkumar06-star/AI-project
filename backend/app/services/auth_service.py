from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.schemas.auth import RegisterRequest, UserManageUpdate, PasswordChangeRequest
from app.core.security import verify_password, get_password_hash

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def create_user(db: Session, user_in: RegisterRequest, role: UserRole = UserRole.VIEWER) -> User:
    if get_user_by_email(db, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )
    
    db_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=role,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def list_users(db: Session) -> List[User]:
    return db.query(User).all()

def update_user_role(db: Session, user_id: int, update_data: UserManageUpdate) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Safeguard: Do not deactivate or demote the last active admin
    if user.role == UserRole.ADMIN and (
        (update_data.role is not None and update_data.role != UserRole.ADMIN) or
        (update_data.is_active is not None and not update_data.is_active)
    ):
        active_admins_count = db.query(User).filter(
            User.role == UserRole.ADMIN,
            User.is_active == True,
            User.id != user_id
        ).count()
        if active_admins_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote or deactivate the last remaining active administrator."
            )
    
    if update_data.role is not None:
        user.role = update_data.role
    if update_data.is_active is not None:
        user.is_active = update_data.is_active
        
    db.commit()
    db.refresh(user)
    return user

def change_password(db: Session, current_user: User, password_data: PasswordChangeRequest) -> None:
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid current password")
    
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.add(current_user)
    db.commit()
