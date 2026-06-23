import os
import hashlib
import json
import base64
import hmac
import bcrypt
from datetime import datetime, timedelta
from fastapi import Header, HTTPException, Depends, status, Cookie
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User

SECRET_KEY = os.getenv("JWT_SECRET", "second-brain-neural-secret-key-998822")

def hash_password(password: str) -> str:
    pw_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        # Check if bcrypt hashed
        if hashed.startswith('$2b$') or hashed.startswith('$2a$'):
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
            
        # Fallback to PBKDF2
        decoded = base64.b64decode(hashed.encode())
        salt = decoded[:16]
        stored_hash = decoded[16:]
        new_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        return hmac.compare_digest(stored_hash, new_hash)
    except Exception:
        return False

# Base64 URL helper functions for JWT encoding/decoding without external dependencies
def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def create_jwt(payload: dict, expires_in: timedelta) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload_copy = payload.copy()
    payload_copy["exp"] = int((datetime.utcnow() + expires_in).timestamp())
    
    header_json = json.dumps(header).encode('utf-8')
    payload_json = json.dumps(payload_copy).encode('utf-8')
    
    unsigned_token = f"{base64url_encode(header_json)}.{base64url_encode(payload_json)}"
    
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        unsigned_token.encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    return f"{unsigned_token}.{base64url_encode(signature)}"

def decode_jwt(token: str) -> dict:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid token parts")
        
        unsigned_token = f"{parts[0]}.{parts[1]}"
        signature = base64url_decode(parts[2])
        
        expected_sig = hmac.new(
            SECRET_KEY.encode('utf-8'),
            unsigned_token.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        if not hmac.compare_digest(signature, expected_sig):
            raise ValueError("Signature mismatch")
            
        payload = json.loads(base64url_decode(parts[1]).decode('utf-8'))
        
        if payload.get("exp", 0) < int(datetime.utcnow().timestamp()):
            raise ValueError("Token expired")
            
        return payload
    except Exception:
        return None

def get_current_user(
    authorization: str = Header(None),
    access_token: str = Cookie(None),
    db: Session = Depends(get_db)
):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif access_token:
        token = access_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
    payload = decode_jwt(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalid or expired"
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account suspended"
        )
    return user

def get_verified_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required"
        )
    return current_user
