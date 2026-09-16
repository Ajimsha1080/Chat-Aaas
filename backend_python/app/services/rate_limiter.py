import os
import time
import logging
from typing import Dict, List, Optional
from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)

class RateLimiter:
    """
    Distributed Redis-backed Token Bucket & Sliding Window Rate Limiter.
    Includes in-memory fallback for development and offline testing.
    Protects API, Authentication, Uploads, Crawler, and LLM surface against denial-of-wallet attacks.
    """
    _in_memory_requests: Dict[str, List[float]] = {}
    _redis_client = None

    @classmethod
    def reset(cls):
        """Clears in-memory request store for test isolation."""
        cls._in_memory_requests.clear()

    @classmethod
    def _get_redis(cls):
        if cls._redis_client is None:
            redis_url = os.getenv("REDIS_URL")
            if redis_url and not ("localhost" in redis_url or "127.0.0.1" in redis_url):
                try:
                    import redis
                    cls._redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
                except Exception as e:
                    logger.warning(f"Redis rate limiter connection failed: {e}. Using in-memory fallback.")
        return cls._redis_client

    @classmethod
    def check_rate_limit(
        cls,
        client_identifier: str,
        max_requests: int = 20,
        window_seconds: float = 60.0
    ) -> bool:
        """
        Validates whether client_identifier has exceeded max_requests within window_seconds.
        Raises HTTP 429 with Retry-After header on breach.
        """
        r = cls._get_redis()
        now = time.time()

        if r:
            try:
                key = f"ratelimit:{client_identifier}"
                pipeline = r.pipeline()
                pipeline.zremrangebyscore(key, 0, now - window_seconds)
                pipeline.zcard(key)
                pipeline.zadd(key, {str(now): now})
                pipeline.expire(key, int(window_seconds) + 1)
                results = pipeline.execute()

                current_count = results[1]
                if current_count >= max_requests:
                    retry_after = int(window_seconds)
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit exceeded ({max_requests} req/{int(window_seconds)}s). Please wait {retry_after}s.",
                        headers={"Retry-After": str(retry_after)}
                    )
                return True
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Redis rate limit error: {e}")

        # In-Memory Sliding Window Fallback
        cutoff = now - window_seconds
        cls._in_memory_requests[client_identifier] = [
            ts for ts in cls._in_memory_requests.get(client_identifier, []) if ts > cutoff
        ]

        if len(cls._in_memory_requests[client_identifier]) >= max_requests:
            first_ts = cls._in_memory_requests[client_identifier][0]
            retry_after = max(1, int(window_seconds - (now - first_ts)))
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests from this client. Please wait {retry_after} seconds before retrying.",
                headers={"Retry-After": str(retry_after)}
            )

        cls._in_memory_requests[client_identifier].append(now)
        return True

    @classmethod
    def check_auth_rate_limit(cls, client_ip: str) -> bool:
        """Limits authentication attempts (login/signup) to 10 requests per minute per IP."""
        return cls.check_rate_limit(f"auth:{client_ip}", max_requests=10, window_seconds=60.0)

    @classmethod
    def check_upload_rate_limit(cls, company_id: str) -> bool:
        """Limits document uploads to 30 uploads per minute per tenant."""
        return cls.check_rate_limit(f"upload:{company_id}", max_requests=30, window_seconds=60.0)

    @classmethod
    def check_crawler_rate_limit(cls, company_id: str) -> bool:
        """Limits web crawling triggers to 5 jobs per minute per tenant."""
        return cls.check_rate_limit(f"crawler:{company_id}", max_requests=5, window_seconds=60.0)

    @classmethod
    def validate_widget_origin(cls, origin: Optional[str], allowed_domains: List[str]) -> bool:
        """
        Validates widget Origin header against registered tenant domain allowlist.
        Rejects rogue websites attempting to embed and consume tenant's LLM quota.
        """
        if not allowed_domains or "*" in allowed_domains:
            return True
        if not origin:
            return True

        from urllib.parse import urlparse
        parsed = urlparse(origin)
        hostname = (parsed.hostname or origin).lower().strip()

        for allowed in allowed_domains:
            clean_allowed = allowed.lower().strip().replace("https://", "").replace("http://", "").split("/")[0]
            if hostname == clean_allowed or hostname.endswith(f".{clean_allowed}"):
                return True

        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: Origin domain '{origin}' is not authorized to embed this assistant."
        )

    @classmethod
    def get_client_ip(cls, request: Request) -> str:
        """Extracts true client IP considering proxy headers."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "127.0.0.1"