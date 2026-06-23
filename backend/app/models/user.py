from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    role = Column(String, default="user") # user, admin
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    google_id = Column(String, unique=True, index=True, nullable=True)
    verification_code = Column(String, nullable=True)
    name = Column(String, nullable=True)
    auth_provider = Column(String, default="email")
    profile_picture = Column(String, nullable=True)
    last_login = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_type = Column(String, nullable=False)
    ip_address = Column(String, nullable=False)
    location = Column(String, default="Unknown")
    last_active = Column(DateTime, default=datetime.utcnow)
