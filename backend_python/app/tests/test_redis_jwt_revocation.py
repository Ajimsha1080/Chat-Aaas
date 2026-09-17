import time
import pytest
from app.core.security import (
    create_jwt_token,
    create_refresh_token,
    decode_jwt_token,
    revoke_token,
    revoke_user_sessions,
    revoke_tenant_sessions,
    set_redis_client,
    _REVOKED_TOKENS,
    _REVOKED_USERS,
    _REVOKED_TENANTS
)


class MockDistributedRedis:
    """Simulated standalone distributed Redis store shared across instances."""
    def __init__(self):
        self.data = {}

    def setex(self, key, ttl, value):
        self.data[key] = str(value)

    def get(self, key):
        return self.data.get(key)

    def delete(self, *keys):
        for k in keys:
            self.data.pop(k, None)

    def ping(self):
        return True


@pytest.fixture(autouse=True)
def setup_distributed_redis():
    shared_redis = MockDistributedRedis()
    set_redis_client(shared_redis)
    _REVOKED_TOKENS.clear()
    _REVOKED_USERS.clear()
    _REVOKED_TENANTS.clear()
    yield shared_redis
    set_redis_client(None)
    _REVOKED_TOKENS.clear()
    _REVOKED_USERS.clear()
    _REVOKED_TENANTS.clear()


def test_token_revocation_persists_across_in_memory_reset(setup_distributed_redis):
    """Verify that token revocation survives process memory clearing by reading from Redis."""
    token = create_jwt_token("usr-test-1", "comp-test-1", "admin")
    payload = decode_jwt_token(token)
    assert payload is not None
    jti = payload["jti"]

    # Revoke token on Instance A
    revoke_token(jti)

    # Simulate Instance B (or process restart) by completely wiping in-memory structures
    _REVOKED_TOKENS.clear()
    assert jti not in _REVOKED_TOKENS

    # Decoding on Instance B must reject the token by reading from Redis
    rejected_payload = decode_jwt_token(token)
    assert rejected_payload is None, "Token was not rejected after memory reset; Redis revocation lookup failed!"


def test_user_session_revocation_persists_across_in_memory_reset(setup_distributed_redis):
    """Verify that user session revocation invalidates all issued tokens across instances."""
    user_id = "usr-targeted-revocation"
    token = create_jwt_token(user_id, "comp-test-2", "member")
    assert decode_jwt_token(token) is not None

    time.sleep(0.01)  # Ensure revocation timestamp is strictly after token issuance iat

    # Revoke all sessions for user
    revoke_user_sessions(user_id)

    # Wipe in-memory user revocation dict
    _REVOKED_USERS.clear()
    assert user_id not in _REVOKED_USERS

    # Token must be rejected across any instance
    assert decode_jwt_token(token) is None


def test_tenant_session_revocation_persists_across_in_memory_reset(setup_distributed_redis):
    """Verify that tenant-wide suspension immediately invalidates all tenant tokens across instances."""
    company_id = "comp-suspended-tenant"
    token_1 = create_jwt_token("usr-emp-1", company_id, "viewer")
    token_2 = create_jwt_token("usr-emp-2", company_id, "admin")

    assert decode_jwt_token(token_1) is not None
    assert decode_jwt_token(token_2) is not None

    time.sleep(0.01)

    # Suspend tenant across cluster
    revoke_tenant_sessions(company_id)

    # Wipe in-memory tenant revocation dict
    _REVOKED_TENANTS.clear()
    assert company_id not in _REVOKED_TENANTS

    # Both tokens must be rejected across all instances
    assert decode_jwt_token(token_1) is None
    assert decode_jwt_token(token_2) is None


def test_unrevoked_tokens_remain_valid(setup_distributed_redis):
    """Verify that valid tokens for unrevoked users and tenants decode successfully."""
    token = create_jwt_token("usr-active-user", "comp-active-company", "owner")
    claims = decode_jwt_token(token)
    assert claims is not None
    assert claims["sub"] == "usr-active-user"
    assert claims["company_id"] == "comp-active-company"
    assert claims["role"] == "owner"
