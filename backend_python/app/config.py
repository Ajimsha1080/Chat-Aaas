import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agent-as-a-Service (AaaS) AI Runtime"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    NODE_ENV: str = "development"
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secure-jwt-secret-min-32-chars-aaas")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_DAYS: int = 7
    KMS_MASTER_KEY_HEX: str = os.getenv("ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
    
    # LLM Providers
    DEFAULT_LLM_PROVIDER: str = "openai"
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    # Vector Search
    VECTOR_DIMENSIONS: int = 1536
    SIMILARITY_THRESHOLD: float = 0.72
    
    # SSRF Protection Blocklist
    BLOCKED_NETWORKS: list[str] = [
        "127.0.0.0/8",
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "169.254.169.254/32",
        "::1/128",
        "fc00::/7"
    ]
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
