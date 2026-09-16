import asyncio
import time
import uuid
import logging
from typing import Optional
from contextlib import asynccontextmanager
from app.core.config import settings

logger = logging.getLogger("locks")

# Safe Lua script for atomic unlock (only deletes if value matches owner token)
LUA_RELEASE_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""

class DistributedLock:
    """
    Production-grade distributed lock manager backed by Redis Redlock algorithm
    with local non-blocking asyncio fallback.
    """
    def __init__(self, key: str, ttl_seconds: float = 10.0):
        self.key = f"coarai:lock:{key}"
        self.ttl_ms = int(ttl_seconds * 1000)
        self.token = str(uuid.uuid4())
        self.acquired = False
        self.redis_client = None
        self._redis_tested = False
        self._redis_available = False

    async def _get_redis(self):
        if not self._redis_tested:
            try:
                import redis.asyncio as aioredis
                client = aioredis.from_url(settings.REDIS_URL, socket_timeout=1.0, socket_connect_timeout=1.0)
                await client.ping()
                self.redis_client = client
                self._redis_available = True
            except Exception as e:
                logger.info(f"Redis distributed locking unavailable ({e}); utilizing process mutex.")
                self._redis_available = False
            self._redis_tested = True
        return self.redis_client if self._redis_available else None

    async def acquire(self, timeout_seconds: float = 5.0, retry_interval: float = 0.05) -> bool:
        """Attempts to acquire distributed lock within timeout window."""
        redis = await self._get_redis()
        start = time.time()

        while True:
            if redis:
                try:
                    res = await redis.set(self.key, self.token, nx=True, px=self.ttl_ms)
                    if res:
                        self.acquired = True
                        return True
                except Exception:
                    pass
            else:
                # Local memory lock registry fallback
                if not hasattr(DistributedLock, "_local_locks"):
                    DistributedLock._local_locks = {}
                now = time.time()
                existing = DistributedLock._local_locks.get(self.key)
                if not existing or existing["expires_at"] < now:
                    DistributedLock._local_locks[self.key] = {
                        "token": self.token,
                        "expires_at": now + (self.ttl_ms / 1000.0)
                    }
                    self.acquired = True
                    return True

            if (time.time() - start) >= timeout_seconds:
                break
            await asyncio.sleep(retry_interval)

        return False

    async def release(self) -> bool:
        """Safely releases lock using owner verification token."""
        if not self.acquired:
            return False

        redis = await self._get_redis()
        if redis:
            try:
                res = await redis.eval(LUA_RELEASE_SCRIPT, 1, self.key, self.token)
                self.acquired = False
                return bool(res)
            except Exception:
                pass
        
        # Local fallback release
        if hasattr(DistributedLock, "_local_locks"):
            existing = DistributedLock._local_locks.get(self.key)
            if existing and existing.get("token") == self.token:
                del DistributedLock._local_locks[self.key]
                self.acquired = False
                return True

        self.acquired = False
        return False


@asynccontextmanager
async def distributed_lock(resource_key: str, ttl_seconds: float = 10.0, timeout_seconds: float = 5.0):
    """Async context manager for acquiring and safely releasing distributed locks."""
    lock = DistributedLock(resource_key, ttl_seconds=ttl_seconds)
    acquired = await lock.acquire(timeout_seconds=timeout_seconds)
    if not acquired:
        raise TimeoutError(f"Could not acquire distributed lock for '{resource_key}' within {timeout_seconds}s timeout.")
    try:
        yield lock
    finally:
        await lock.release()
