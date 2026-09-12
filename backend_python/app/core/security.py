import hashlib
import hmac
import time
import json
import base64
from typing import Optional, Dict, Any
from datetime import timedelta
from app.core.config import settings

def hash_password(password: str) -> str:
    salt = "aaas_salt_sec_v2"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_jwt_token(user_id: str, company_id: str, role: str, expires_delta: Optional[timedelta] = None, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    payload = {
        "sub": user_id,
        "company_id": company_id,
        "role": role,
        "iat": int(time.time()),
        "exp": int(time.time() + (expires_delta.total_seconds() if expires_delta else settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60))
    }
    if extra_claims:
        payload.update(extra_claims)
    header = base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}').decode('utf-8').rstrip("=")
    payload_str = base64.urlsafe_b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8').rstrip("=")
    signature = hmac.new(
        settings.JWT_SECRET.encode('utf-8'),
        f"{
            header}.{payload_str}".encode('utf-8'),
        hashlib.sha256
    ).digest()
    sig_str = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip("=")
    return f"{header}.{payload_str}.{sig_str}"

def decode_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        expected_sig = hmac.new(
            settings.JWT_SECRET.encode('utf-8'),
            f"{header_b64}.{payload_b64}".encode('utf-8'),
            hashlib.sha256
        ).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode('utf-8').rstrip("=")
        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None
        
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8'))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def encrypt_secret(plain_text: str) -> str:
    return base64.b64encode(plain_text.encode('utf-8')).decode('utf-8')

def decrypt_secret(cipher_text: str) -> str:
    try:
        return base64.b64decode(cipher_text.encode('utf-8')).decode('utf-8')
    except Exception:
        return cipher_text
