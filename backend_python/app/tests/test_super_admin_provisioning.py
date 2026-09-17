import os
import pytest
import subprocess
import sys
from app.db.database import db, DatabaseStore
from app.core.config import settings
from app.core.security import hash_password, verify_password

def test_production_refuses_boot_with_default_admin_credentials(monkeypatch):
    """Confirms production startup check throws RuntimeError if admin@chataaas.internal has default password."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    
    # Put default admin in db
    db.users["usr-root-admin"] = {
        "id": "usr-root-admin",
        "email": "admin@chataaas.internal",
        "passwordHash": hash_password("SuperAdmin123!"),
        "fullName": "Platform Super Administrator"
    }
    
    with pytest.raises(RuntimeError, match="Default super-admin account.*detected in production"):
        db.enforce_production_security_checks()

def test_production_allows_boot_with_rotated_admin_credentials(monkeypatch):
    """Confirms production startup succeeds when admin@chataaas.internal has rotated strong password."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    
    # Put rotated admin in db
    db.users["usr-root-admin"] = {
        "id": "usr-root-admin",
        "email": "admin@chataaas.internal",
        "passwordHash": hash_password("FreshComplexRandomPassword!9872"),
        "fullName": "Platform Super Administrator"
    }
    
    # Should not raise
    db.enforce_production_security_checks()

def test_production_allows_boot_without_default_admin(monkeypatch):
    """Confirms production startup succeeds when no default admin exists."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    
    if "usr-root-admin" in db.users:
        del db.users["usr-root-admin"]
    
    # Should not raise
    db.enforce_production_security_checks()

def test_cli_create_super_admin_script():
    """Tests provisioning a super admin via CLI script create_super_admin.py."""
    script_path = os.path.join(os.path.dirname(__file__), "../scripts/create_super_admin.py")
    
    res = subprocess.run(
        [sys.executable, script_path, "--email", "ops-lead@enterprise.com", "--password", "StrongOpsPass2026!#"],
        capture_output=True,
        text=True
    )
    assert res.returncode == 0
    assert "PLATFORM SUPER-ADMIN ACCOUNT SUCCESSFULLY PROVISIONED" in res.stdout or "PLATFORM SUPER-ADMIN ACCOUNT SUCCESSFULLY PROVISIONED" in res.stderr
    
    # Verify user exists in database
    user = db.get_user_by_email("ops-lead@enterprise.com")
    assert user is not None
    assert verify_password("StrongOpsPass2026!#", user["passwordHash"])

def test_cli_rejects_insecure_default_password():
    """Confirms CLI refuses to provision with the known hardcoded password."""
    script_path = os.path.join(os.path.dirname(__file__), "../scripts/create_super_admin.py")
    
    res = subprocess.run(
        [sys.executable, script_path, "--email", "bad-admin@enterprise.com", "--password", "SuperAdmin123!"],
        capture_output=True,
        text=True
    )
    assert res.returncode != 0
    assert "Cannot use known default password" in res.stderr or "Cannot use known default password" in res.stdout
