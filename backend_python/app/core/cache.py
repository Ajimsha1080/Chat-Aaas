import json
import time
import logging
from typing import Any, Optional, Dict
from app.core.config import settings

logger = logging.getLogger("cache")

class TenantCache:
    """
    Multi-tenant enterprise cache layer backed by Redis with local in-memory fallback
    and pub/sub event-driven invalidation.
    """
    def __init__(self):
        self.redis_client = None
        self._redis_tested = False
        self._redis_available = False
        self._local_cache: Dict[str, Dict[str, Any]] = {}

    async def _get_redis(self):
        if not self._redis_tested:
            try:
                import redis.asyncio as aioredis
                client = aioredis.from_url(settings.REDIS_URL, socket_timeout=1.0, socket_connect_timeout=1.0)
                await client.ping()
                self.redis_client = client
                self._redis_available = True
            except Exception as e:
                logger.info(f"Redis cache unavailable ({e}); using high-speed local tenant cache.")
                self._redis_available = False
            self._redis_tested = True
        return self.redis_client if self._redis_available else None

    def _build_key(self, company_id: str, entity_type: str, entity_id: str) -> str:
        return f"coarai:cache:{company_id}:{entity_type}:{entity_id}"

    async def get(self, company_id: str, entity_type: str, entity_id: str) -> Optional[Any]:
        """Retrieves cached entity scoped to company tenant."""
        key = self._build_key(company_id, entity_type, entity_id)
        redis = await self._get_redis()
        if redis:
            try:
                val = await redis.get(key)
                if val:
                    return json.loads(val.decode("utf-8") if isinstance(val, bytes) else val)
            except Exception:
                pass

        # In-memory fallback
        if key in self._local_cache:
            entry = self._local_cache[key]
            if entry["expires_at"] > time.time():
                return entry["data"]
            else:
                del self._local_cache[key]
        return None

    async def set(
        self,
        company_id: str,
        entity_type: str,
        entity_id: str,
        data: Any,
        ttl_seconds: int = 300
    ):
        """Stores entity in tenant cache with explicit TTL."""
        key = self._build_key(company_id, entity_type, entity_id)
        payload_str = json.dumps(data, ensure_ascii=False)
        redis = await self._get_redis()
        if redis:
            try:
                await redis.setex(key, ttl_seconds, payload_str)
            except Exception:
                pass

        # Local fallback
        self._local_cache[key] = {
            "data": data,
            "expires_at": time.time() + ttl_seconds
        }

    async def invalidate(self, company_id: str, entity_type: str, entity_id: Optional[str] = None):
        """Evicts tenant cache entries and publishes invalidation event."""
        redis = await self._get_redis()
        if entity_id:
            key = self._build_key(company_id, entity_type, entity_id)
            if key in self._local_cache:
                del self._local_cache[key]
            if redis:
                try:
                    await redis.delete(key)
                except Exception:
                    pass
        else:
            # Prefix wildcard eviction
            prefix = f"coarai:cache:{company_id}:{entity_type}:"
            to_del = [k for k in self._local_cache.keys() if k.startswith(prefix)]
            for k in to_del:
                del self._local_cache[k]
            if redis:
                try:
                    keys = await redis.keys(f"{prefix}*")
                    if keys:
                        await redis.delete(*keys)
                except Exception:
                    pass

        # Publish invalidation event for distributed workers
        if redis:
            try:
                event_payload = json.dumps({
                    "company_id": company_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "timestamp": time.time()
                })
                await redis.publish("coarai:events:cache_invalidation", event_payload)
            except Exception:
                pass

    async def invalidate_tenant(self, company_id: str):
        """Evicts all cached entities across all categories for a tenant."""
        prefix = f"coarai:cache:{company_id}:"
        to_del = [k for k in self._local_cache.keys() if k.startswith(prefix)]
        for k in to_del:
            del self._local_cache[k]

        redis = await self._get_redis()
        if redis:
            try:
                keys = await redis.keys(f"{prefix}*")
                if keys:
                    await redis.delete(*keys)
                await redis.publish("coarai:events:cache_invalidation", json.dumps({"company_id": company_id, "all": True}))
            except Exception:
                pass

tenant_cache = TenantCache()
