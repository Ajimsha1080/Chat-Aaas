import time
from typing import Dict, List
from fastapi import HTTPException, Request

class RateLimiter:
    """
    In-memory Sliding Window Rate Limiter & Anti-Bot Protection for AI Q&A endpoints.
    Protects against runaway LLM costs, script scrapers, and malicious message spamming.
    """
    _requests: Dict[str, List[float]] = {}
    
    # Defaults: 20 messages per minute per IP / Session
    DEFAULT_MAX_REQUESTS_PER_MINUTE = 20
    WINDOW_SECONDS = 60.0

    @classmethod
    def check_rate_limit(
        cls, 
        client_identifier: str, 
        max_requests: int = DEFAULT_MAX_REQUESTS_PER_MINUTE
    ) -> bool:
        """
        Validates whether the client has exceeded their allowed requests in the last minute.
        Raises HTTP 429 if rate limit is exceeded.
        """
        now = time.time()
        cutoff = now - cls.WINDOW_SECONDS

        # Prune old timestamps
        cls._requests[client_identifier] = [
            ts for ts in cls._requests.get(client_identifier, []) if ts > cutoff
        ]

        # Check threshold
        if len(cls._requests[client_identifier]) >= max_requests:
            retry_after = int(cls.WINDOW_SECONDS - (now - cls._requests[client_identifier][0]))
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests from this IP/Session. Please wait {max(1, retry_after)} seconds before asking another question.",
                headers={"Retry-After": str(max(1, retry_after))}
            )

        # Record this request
        cls._requests[client_identifier].append(now)
        return True

    @classmethod
    def get_client_ip(cls, request: Request) -> str:
        """Extracts the true client IP, respecting proxies and load balancers."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "127.0.0.1"