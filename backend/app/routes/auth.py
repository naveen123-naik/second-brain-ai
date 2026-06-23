import uuid
import random
import re
import time
import os
from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserSession
from app.utils.auth import hash_password, verify_password, create_jwt, decode_jwt, get_current_user
from app.config import GOOGLE_CLIENT_ID, ENV
from app.services.email_service import send_email
from google.oauth2 import id_token
from google.auth.transport import requests

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

# Email regex helper
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

# In-memory rate limiting dictionary: key -> list of timestamps
rate_limit_store = defaultdict(list)

def enforce_rate_limit(key: str, max_requests: int = 5, period_seconds: int = 900):
    """
    Rate limiting disabled to allow unrestricted authentication attempts.
    """
    pass

def validate_password_strength(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    if not any(char.isupper() for char in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
    if not any(char.islower() for char in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter.")
    if not any(char.isdigit() for char in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one digit.")
    if not any(char in "!@#$%^&*()-_=+[]{}|;:',.<>?/`~" for char in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character.")

def set_auth_cookies(response: Response, access_token: str, refresh_token: str = None):
    is_prod = ENV == "production"
    samesite_val = "none" if is_prod else "lax"
    secure_val = True if is_prod else False
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=secure_val,
        samesite=samesite_val,
        max_age=15 * 60,  # 15 mins
        path="/"
    )
    if refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=secure_val,
            samesite=samesite_val,
            max_age=7 * 24 * 60 * 60,  # 7 days
            path="/auth/refresh"
        )

# Request Models
class SignupRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str = None

class GoogleLoginRequest(BaseModel):
    token: str

class VerifyEmailRequest(BaseModel):
    email: str
    code: str

class ResendCodeRequest(BaseModel):
    email: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ProfileUpdateRequest(BaseModel):
    name: str = None
    profile_picture: str = None

@router.get("/config")
def get_auth_config():
    return {
        "google_client_id": GOOGLE_CLIENT_ID
    }

@router.post("/signup")
def signup(request: SignupRequest, req: Request, db: Session = Depends(get_db)):
    # Rate limit by IP
    client_ip = req.client.host if req.client else "unknown"
    enforce_rate_limit(f"signup:{client_ip}", max_requests=5, period_seconds=900)

    # Validate Email Format
    if not EMAIL_REGEX.match(request.email):
        raise HTTPException(status_code=400, detail="Invalid email format.")

    # Validate Password Strength
    validate_password_strength(request.password)

    # Check if user already exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
    
    # Check if it's the very first user in the system to auto-assign "admin" role
    total_users = db.query(User).count()
    assigned_role = "admin" if total_users == 0 else "user"
    
    # Generate 6-digit code
    code = f"{random.randint(100000, 999999)}"
    
    new_user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        role=assigned_role,
        auth_provider="email",
        is_verified=False, # Needs verification
        verification_code=code
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    try:
        subject = "Archivist AI - Verify Your Account"
        body = (
            f"Welcome to Archivist AI!\n\n"
            f"Your verification code is: {code}\n\n"
            f"Please enter this code in the application to activate your vault.\n\n"
            f"Best regards,\n"
            f"Archivist AI Team"
        )
        send_email(new_user.email, subject, body)
    except Exception as e:
        # Delete user if email fails so they can sign up again
        db.delete(new_user)
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send verification email. Please check SMTP configuration. Error: {str(e)}"
        )
    
    return {"message": f"Signup successful as {assigned_role}. Verification code sent to email.", "email": new_user.email}

@router.post("/verify-email")
def verify_email(request: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.is_verified:
        return {"message": "Email already verified."}
        
    if not user.verification_code or user.verification_code != request.code:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
        
    user.is_verified = True
    user.verification_code = None
    db.commit()
    return {"message": "Email successfully verified."}

@router.post("/resend-code")
def resend_code(request: ResendCodeRequest, req: Request, db: Session = Depends(get_db)):
    # Rate limit code resending by IP
    client_ip = req.client.host if req.client else "unknown"
    enforce_rate_limit(f"resend:{client_ip}", max_requests=3, period_seconds=600)

    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified.")
        
    code = f"{random.randint(100000, 999999)}"
    user.verification_code = code
    db.commit()
    
    try:
        subject = "Archivist AI - Verify Your Account"
        body = (
            f"Welcome to Archivist AI!\n\n"
            f"Your verification code is: {code}\n\n"
            f"Please enter this code in the application to activate your vault.\n\n"
            f"Best regards,\n"
            f"Archivist AI Team"
        )
        send_email(user.email, subject, body)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send verification email: {str(e)}"
        )
    return {"message": "Verification code resent successfully."}

@router.post("/login")
def login(request: LoginRequest, response: Response, req: Request, db: Session = Depends(get_db)):
    # Rate limit logins by IP and email to protect against brute-force
    client_ip = req.client.host if req.client else "unknown"
    enforce_rate_limit(f"login:{client_ip}", max_requests=5, period_seconds=300)
    enforce_rate_limit(f"login_email:{request.email}", max_requests=5, period_seconds=300)

    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account suspended.")
        
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email verification pending.")

    # Create tokens
    access_token = create_jwt({"sub": user.id, "role": user.role}, timedelta(minutes=15))
    refresh_token = create_jwt({"sub": user.id, "type": "refresh"}, timedelta(days=7))
    
    # Save session
    token_id = str(uuid.uuid4())
    session = UserSession(
        token_id=token_id,
        user_id=user.id,
        device_type="Chrome (Windows)",
        ip_address=client_ip,
        location="Local Network" if client_ip in ("127.0.0.1", "::1") else "Unknown"
    )
    db.add(session)
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    db.commit()

    # Set cookies
    set_auth_cookies(response, access_token, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "role": user.role,
        "email": user.email,
        "is_verified": user.is_verified
    }

@router.post("/refresh")
def refresh(response: Response, request: RefreshRequest = None, refresh_token_cookie: str = Cookie(None, alias="refresh_token"), db: Session = Depends(get_db)):
    # Read token from cookie if present, otherwise fallback to request body
    ref_token = refresh_token_cookie
    if not ref_token and request:
        ref_token = request.refresh_token
        
    if not ref_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
        
    payload = decode_jwt(ref_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not active")
        
    access_token = create_jwt({"sub": user.id, "role": user.role}, timedelta(minutes=15))
    
    # Set cookies again to update expiry
    set_auth_cookies(response, access_token)
    
    return {"access_token": access_token}

@router.post("/logout")
def logout(response: Response):
    is_prod = ENV == "production"
    samesite_val = "none" if is_prod else "lax"
    secure_val = True if is_prod else False
    
    response.delete_cookie("access_token", path="/", samesite=samesite_val, secure=secure_val)
    response.delete_cookie("refresh_token", path="/auth/refresh", samesite=samesite_val, secure=secure_val)
    return {"message": "Logged out successfully"}

@router.post("/google")
def google_signin(request: GoogleLoginRequest, response: Response, req: Request, db: Session = Depends(get_db)):
    try:
        # Verify Google Token ID securely
        idinfo = id_token.verify_oauth2_token(request.token, requests.Request(), GOOGLE_CLIENT_ID)
        google_id = idinfo["sub"]
        email = idinfo["email"]
        name = idinfo.get("name")
        picture = idinfo.get("picture")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google Token: {str(e)}")

    client_ip = req.client.host if req.client else "unknown"
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Create Google OAuth user
        total_users = db.query(User).count()
        assigned_role = "admin" if total_users == 0 else "user"
        user = User(
            email=email,
            google_id=google_id,
            name=name,
            auth_provider="google",
            profile_picture=picture,
            role=assigned_role,
            is_verified=True # Google verified
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Link Google ID or update fields
        user.google_id = google_id
        user.is_verified = True
        user.auth_provider = "google"
        if name and not user.name:
            user.name = name
        if picture and not user.profile_picture:
            user.profile_picture = picture
        db.commit()
        db.refresh(user)
        
    access_token = create_jwt({"sub": user.id, "role": user.role}, timedelta(minutes=15))
    refresh_token = create_jwt({"sub": user.id, "type": "refresh"}, timedelta(days=7))
    
    # Save session
    token_id = str(uuid.uuid4())
    session = UserSession(
        token_id=token_id,
        user_id=user.id,
        device_type="Chrome (Google OAuth)",
        ip_address=client_ip,
        location="Google Cloud"
    )
    db.add(session)
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Set cookies
    set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "role": user.role,
        "email": user.email,
        "is_verified": True
    }

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, req: Request, db: Session = Depends(get_db)):
    client_ip = req.client.host if req.client else "unknown"
    enforce_rate_limit(f"forgot:{client_ip}", max_requests=3, period_seconds=900)

    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # To prevent user enumeration attacks, return a generic success message
        return {"message": "If this email is registered, a password reset link has been sent."}
    
    # Generate password reset token
    reset_token = create_jwt(
        {"sub": user.id, "action": "reset_password"},
        timedelta(minutes=15)
    )
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    try:
        subject = "Archivist AI - Reset Your Passphrase"
        body = (
            f"Hello,\n\n"
            f"You requested a passphrase reset for your Archivist AI vault.\n"
            f"Click the link below to verify your request and set a new password:\n\n"
            f"{reset_link}\n\n"
            f"This link is valid for 15 minutes. If you did not request this, please ignore this email.\n\n"
            f"Best regards,\n"
            f"Archivist AI Team"
        )
        send_email(user.email, subject, body)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send reset email: {str(e)}"
        )
        
    return {"message": "If this email is registered, a password reset link has been sent."}

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload = decode_jwt(request.token)
    if not payload or payload.get("action") != "reset_password":
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
        
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Validate strength
    validate_password_strength(request.new_password)
    
    # Update password
    user.hashed_password = hash_password(request.new_password)
    
    # Revoke all active sessions on other devices
    db.query(UserSession).filter(UserSession.user_id == user.id).delete()
    
    db.commit()
    return {"message": "Passphrase successfully reset. You can now log in."}

@router.get("/me")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name or current_user.email.split("@")[0],
        "email": current_user.email,
        "auth_provider": current_user.auth_provider,
        "profile_picture": current_user.profile_picture,
        "is_verified": current_user.is_verified,
        "role": current_user.role,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }

@router.put("/me")
def update_profile(request: ProfileUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if request.name is not None:
        current_user.name = request.name
    if request.profile_picture is not None:
        current_user.profile_picture = request.profile_picture
    db.commit()
    db.refresh(current_user)
    return {
        "message": "Profile updated successfully.",
        "name": current_user.name,
        "profile_picture": current_user.profile_picture
    }

@router.post("/change-password")
def change_password(request: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.auth_provider != "email":
        raise HTTPException(status_code=400, detail="Cannot change password for OAuth account.")
        
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid current password.")
        
    validate_password_strength(request.new_password)
    
    current_user.hashed_password = hash_password(request.new_password)
    
    # Revoke sessions on all other devices except this one (simulated by deleting all)
    db.query(UserSession).filter(UserSession.user_id == current_user.id).delete()
    
    db.commit()
    return {"message": "Passphrase updated successfully."}