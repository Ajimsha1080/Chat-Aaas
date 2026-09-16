"""
Security helpers for Chat-AaaS.

JWT  — python-jose (HS256).  Never hand-roll token crypto.
Passwords — passlib CryptContext with argon2 (bcrypt fallback for legacy hashes).
Secrets  — base64 thin wrapper kept for API-key storage; swap for Fernet if you
           need confidentiality guarantees beyond what the DB already provides.
"""

import base64
import logging
from datetime import timedelta
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Password hashing
# Argon2 (preferred) when argon2-cffi is installed; bcrypt otherwise.
# Both are supported by passlib and are safe choices.
# ---------------------------------------------------------------------------

try:
    # passlib delays backend errors to hash() call time, so we must actually
    # call hash() on a dummy value to confirm argon2-cffi is installed.
    _test_ctx = CryptContext(schemes=["argon2"])
    _test_ctx.hash("probe")
    _primary_scheme = "argon2"
    _extra_kwargs: dict = {
        "argon2__time_cost": 3,
        "argon2__memory_cost": 65536,
        "argon2__parallelism": 2,
    }
    logger.info("Password hashing: using argon2")
except Exception:
    # argon2-cffi not installed (e.g. local dev).
    # sha256_crypt is a pure-Python fallback — safe for dev, not for prod.
    # Production Docker image must have argon2-cffi installed via requirements.txt.
    _primary_scheme = "sha256_crypt"
    _extra_kwargs = {"sha256_crypt__rounds": 656000}
    logger.warning(
        "[SECURITY] argon2-cffi is not available. Falling back to sha256_crypt. "
        "This is acceptable for local development only — install argon2-cffi in production."
    )

# Build the scheme list: primary + sha256_crypt for legacy verify (unless sha256_crypt IS primary)
_schemes = [_primary_scheme] if _primary_scheme == "sha256_crypt" else [_primary_scheme, "sha256_crypt"]
_deprecated = [] if _primary_scheme == "sha256_crypt" else ["sha256_crypt"]

_pwd_context = CryptContext(
    schemes=_schemes,
    deprecated=_deprecated,
    **_extra_kwargs,
)

# Legacy bare-sha256 that was used before this refactor.
# Only kept so existing stored hashes don't break on first login.
import hashlib as _hashlib

_LEGACY_SALT = "aaas_salt_sec_v2"


def _is_legacy_hash(h: str) -> bool:
    """64-char hex string → was produced by the old bare-SHA256 scheme."""
    return len(h) == 64 and all(c in "0123456789abcdef" for c in h)


def _legacy_hash(password: str) -> str:
    return _hashlib.sha256((password + _LEGACY_SALT).encode()).hexdigest()


def hash_password(password: str) -> str:
    """Hash a new password with argon2."""
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its stored hash.
    Transparently handles both argon2 hashes (new) and legacy bare-SHA256 (old).
    """
    if _is_legacy_hash(hashed_password):
        return _legacy_hash(plain_password) == hashed_password
    return _pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# JWT & Server-Side Session Invalidation
# ---------------------------------------------------------------------------

_REVOKED_TOKENS: set = set()
_REVOKED_USERS: Dict[str, float] = {}
_REVOKED_TENANTS: Dict[str, float] = {}

def revoke_token(jti: str) -> None:
    """Revokes a specific token by its unique JWT ID."""
    if jti:
        _REVOKED_TOKENS.add(jti)

def revoke_user_sessions(user_id: str) -> None:
    """Immediately invalidates all active sessions issued for a user."""
    import time
    _REVOKED_USERS[user_id] = time.time()

def revoke_tenant_sessions(company_id: str) -> None:
    """Immediately invalidates all active sessions issued for an entire tenant."""
    import time
    _REVOKED_TENANTS[company_id] = time.time()

def create_jwt_token(
    user_id: str,
    company_id: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Issue a signed HS256 JWT access token with unique JTI."""
    import time
    import uuid

    expire_seconds = (
        expires_delta.total_seconds()
        if expires_delta
        else settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    payload: Dict[str, Any] = {
        "jti": f"jwt_{uuid.uuid4().hex}",
        "sub": user_id,
        "company_id": company_id,
        "role": role,
        "token_type": "access",
        "iat": int(time.time()),
        "exp": int(time.time() + expire_seconds),
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(
    user_id: str,
    company_id: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Issue a signed refresh token with 7-day default expiry."""
    import time
    import uuid

    expire_seconds = (
        expires_delta.total_seconds()
        if expires_delta
        else 7 * 24 * 3600
    )
    payload: Dict[str, Any] = {
        "jti": f"ref_{uuid.uuid4().hex}",
        "sub": user_id,
        "company_id": company_id,
        "role": role,
        "token_type": "refresh",
        "iat": int(time.time()),
        "exp": int(time.time() + expire_seconds),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify signature, algorithm, and expiry; check revocation registry; return claims or None.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        jti = payload.get("jti")
        if jti and jti in _REVOKED_TOKENS:
            logger.debug("JWT rejected: token JTI is revoked")
            return None

        user_id = payload.get("sub")
        company_id = payload.get("company_id")
        iat = payload.get("iat", 0)

        if user_id and iat <= _REVOKED_USERS.get(user_id, 0):
            logger.debug(f"JWT rejected: user {user_id} sessions were revoked after issuance")
            return None

        if company_id and iat <= _REVOKED_TENANTS.get(company_id, 0):
            logger.debug(f"JWT rejected: tenant {company_id} sessions were revoked after issuance")
            return None

        return payload
    except JWTError as exc:
        logger.debug("JWT decode failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Thin secret store helpers (API keys stored in DB)
# ---------------------------------------------------------------------------

def encrypt_secret(plain_text: str) -> str:
    """Base64-encode a plain-text secret before storing in the DB."""
    return base64.b64encode(plain_text.encode("utf-8")).decode("utf-8")


def decrypt_secret(cipher_text: str) -> str:
    """Decode a base64-encoded secret retrieved from the DB."""
    try:
        return base64.b64decode(cipher_text.encode("utf-8")).decode("utf-8")
    except Exception:
        return cipher_text
