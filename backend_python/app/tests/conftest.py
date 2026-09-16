import os
import sys
import pytest

# Ensure backend_python is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.db.database import db

from app.core.security import _REVOKED_TOKENS, _REVOKED_USERS, _REVOKED_TENANTS
from app.services.rate_limiter import RateLimiter
from app.services.email_service import EmailService

@pytest.fixture(autouse=True)
def setup_test_db(request):
    _REVOKED_TOKENS.clear()
    _REVOKED_USERS.clear()
    _REVOKED_TENANTS.clear()
    RateLimiter.reset()
    EmailService.reset_tokens()
    if 'clean_db' in request.keywords:
        db.clear()
    else:
        db.seed_demo_data()
    yield
    _REVOKED_TOKENS.clear()
    _REVOKED_USERS.clear()
    _REVOKED_TENANTS.clear()
    RateLimiter.reset()
    EmailService.reset_tokens()
    if 'clean_db' in request.keywords:
        db.seed_demo_data()
