import os
import secrets
import logging
from typing import List, Optional
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

_ENVIRONMENT = os.getenv("ENVIRONMENT", "development")


def _require_secret(env_var: str, *, min_length: int = 32) -> str:
    """
    In production: crash immediately if an env var is missing or still set to
    a well-known insecure placeholder — never ship with baked-in defaults.
    In development: auto-generate a random value and warn loudly.
    """
    value = os.getenv(env_var, "")
    _KNOWN_INSECURE = {
        "super-secret-jwt-key-for-tenant-sessions-change-in-prod",
        "secret-internal-key-change-in-prod",
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "secret",
        "changeme",
        "",
    }

    if value and value not in _KNOWN_INSECURE and len(value) >= min_length:
        return value

    if _ENVIRONMENT == "production":
        raise RuntimeError(
            f"[SECURITY] Environment variable '{env_var}' is missing or insecure. "
            f"Set a cryptographically random value of at least {min_length} characters "
            f"before starting the server in production."
        )

    # Development: generate a random ephemeral secret and warn
    generated = secrets.token_hex(32)
    logger.warning(
        "[SECURITY] %s is not set or is insecure. "
        "Using a random ephemeral value for this session. "
        "Set a stable secret in .env for local persistence.",
        env_var,
    )
    return generated


class Settings(BaseSettings):
    PROJECT_NAME: str = "CoarAI Enterprise AI Assistant Platform"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"

    ENVIRONMENT: str = _ENVIRONMENT
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    PORT: int = int(os.getenv("PORT", "8000"))

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/chat_aaas",
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # --- Secrets: required in production, auto-generated (with warning) in dev ---
    JWT_SECRET: str = _require_secret("JWT_SECRET", min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    INTERNAL_SERVICE_SECRET: str = _require_secret("PYTHON_AI_INTERNAL_SECRET", min_length=32)

    # ENCRYPTION_KEY must be at least 32 characters (256-bit).
    ENCRYPTION_KEY: str = _require_secret("ENCRYPTION_KEY", min_length=32)

    _raw_origins = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ]
    if _ENVIRONMENT == "production":
        if "*" in _raw_origins:
            raise RuntimeError("[SECURITY] Wildcard '*' CORS origin is strictly forbidden in production.")

    ALLOWED_ORIGINS: List[str] = _raw_origins

    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY") or None
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY") or None
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY") or None
    SARVAM_API_KEY: Optional[str] = os.getenv("SARVAM_API_KEY") or None

    # Custom / Private LLM endpoint
    CUSTOM_LLM_API_URL: Optional[str] = os.getenv(
        "CUSTOM_LLM_API_URL", "https://api.sarvam.ai/v1/chat/completions"
    )
    CUSTOM_LLM_API_KEY: Optional[str] = (
        os.getenv("CUSTOM_LLM_API_KEY") or os.getenv("SARVAM_API_KEY") or None
    )
    DEFAULT_LLM_MODEL: str = os.getenv("DEFAULT_LLM_MODEL", "sarvam-2b")

    # Demo / Seed Data (Must NEVER be enabled in production)
    _seed_env: bool = os.getenv("SEED_DEMO_DATA", "false").lower() == "true"
    if _ENVIRONMENT == "production" and _seed_env:
        raise RuntimeError(
            "[SECURITY] SEED_DEMO_DATA cannot be set to true in production. "
            "Production environments must not boot with mock/demo seed data."
        )

    SEED_DEMO_DATA: bool = _seed_env

    # Indian GST Statutory Settings
    SUPPLIER_GSTIN: str = os.getenv("SUPPLIER_GSTIN", "29AABCU9603R1ZM")
    SUPPLIER_LEGAL_NAME: str = os.getenv("SUPPLIER_LEGAL_NAME", "CoarAI Technologies Private Limited")
    SUPPLIER_STATE_CODE: str = os.getenv("SUPPLIER_STATE_CODE", "29")  # Karnataka
    SUPPLIER_ADDRESS: str = os.getenv("SUPPLIER_ADDRESS", "Brigade Tech Park, Whitefield, Bengaluru, Karnataka 560066")
    DEFAULT_SAC_CODE: str = os.getenv("DEFAULT_SAC_CODE", "998313")  # Information technology software services


settings = Settings()
