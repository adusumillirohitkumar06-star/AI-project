from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def init_db():
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == "admin@airport.local").first()
        if not admin_user:
            admin_user = User(
                name="System Administrator",
                email="admin@airport.local",
                password_hash=get_password_hash("Admin@123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
    finally:
        db.close()
