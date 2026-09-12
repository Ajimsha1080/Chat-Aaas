import pytest
import time
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import db
from app.core.security import create_jwt_token

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_super_admin_env():
    # Ensure fresh demo state with platform super admin
    db.clear()
    db.seed_demo_data()
    yield

def get_super_admin_headers():
    token = create_jwt_token("usr-root-admin", "comp-techflow", "super_admin")
    return {"Authorization": f"Bearer {token}", "X-Company-ID": "comp-techflow"}

def get_tenant_owner_headers():
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    return {"Authorization": f"Bearer {token}", "X-Company-ID": "comp-techflow"}

# ================= 1. AUTHORIZATION & ACCESS CONTROL ================= #

def test_admin_anonymous_access_rejected():
    res = client.get("/api/v1/admin/tenants")
    assert res.status_code == 401

def test_admin_tenant_owner_forbidden():
    res = client.get("/api/v1/admin/tenants", headers=get_tenant_owner_headers())
    assert res.status_code == 403
    assert "Super Admin privileges required" in res.json()["detail"]

def test_admin_role_tampering_attack_rejected():
    # Attacker passes role=super_admin in query or headers
    owner_token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    res = client.get(
        "/api/v1/admin/tenants?role=super_admin",
        headers={"Authorization": f"Bearer {owner_token}", "X-Role": "super_admin"}
    )
    assert res.status_code == 403

def test_admin_super_admin_access_granted():
    res = client.get("/api/v1/admin/tenants", headers=get_super_admin_headers())
    assert res.status_code == 200
    data = res.json()["data"]
    assert "companies" in data
    assert len(data["companies"]) >= 3

# ================= 2. TENANT LIFECYCLE & SUSPENSION ENFORCEMENT ================= #

def test_tenant_suspension_and_enforcement():
    admin_headers = get_super_admin_headers()
    target_comp = "comp-urbancraft"

    # 1. Suspend tenant
    suspend_res = client.post(
        f"/api/v1/admin/tenants/{target_comp}/suspend",
        headers=admin_headers,
        json={"reason": "Payment delinquency & SLA violation"}
    )
    assert suspend_res.status_code == 200
    assert db.companies[target_comp]["isSuspended"] is True
    assert db.companies[target_comp]["planStatus"] == "suspended"

    # 2. Verify audit log was recorded
    audit_res = client.get(f"/api/v1/admin/audit-logs?company_id={target_comp}", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()["data"]["logs"]
    assert any(l["action"] == "COMPANY_SUSPENDED" for l in logs)

    # 3. Suspended tenant user attempting access must be blocked (403)
    user_token = create_jwt_token("usr-uc-owner", target_comp, "owner")
    blocked_res = client.get("/api/v1/companies/current", headers={"Authorization": f"Bearer {user_token}", "X-Company-ID": target_comp})
    assert blocked_res.status_code == 403
    assert "suspended" in blocked_res.json()["detail"].lower()

    # 4. Suspended tenant API key must be blocked (403)
    api_key = db.companies[target_comp].get("apiKey")
    if api_key:
        api_res = client.get("/api/v1/companies/current", headers={"X-API-Key": api_key, "X-Company-ID": target_comp})
        assert api_res.status_code == 403

    # 5. Public Chat Widget visitor on suspended company deployment must be blocked (403)
    dep_id = f"dep-{target_comp}"
    db.deployments[dep_id] = {
        "id": dep_id,
        "companyId": target_comp,
        "status": "active",
        "channel": "website_widget"
    }
    widget_res = client.post(
        "/api/v1/chat",
        headers={"X-Deployment-ID": dep_id},
        json={"message": "Hello"}
    )
    assert widget_res.status_code == 403
    assert "suspended" in widget_res.json()["detail"].lower()

    # 6. Re-activate tenant
    activate_res = client.post(f"/api/v1/admin/tenants/{target_comp}/activate", headers=admin_headers)
    assert activate_res.status_code == 200
    assert db.companies[target_comp]["isSuspended"] is False

    # 7. Access is restored
    restored_res = client.get("/api/v1/companies/current", headers={"Authorization": f"Bearer {user_token}", "X-Company-ID": target_comp})
    assert restored_res.status_code == 200

# ================= 3. USER MANAGEMENT & LAST SUPER ADMIN PROTECTION ================= #

def test_user_management_and_last_super_admin_protection():
    admin_headers = get_super_admin_headers()

    # 1. List users
    users_res = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    users = users_res.json()["data"]["users"]
    assert len(users) >= 2

    # 2. Attempt to demote the sole super admin -> MUST FAIL (400)
    demote_res = client.patch(
        "/api/v1/admin/users/usr-root-admin/role",
        headers=admin_headers,
        json={"role": "viewer"}
    )
    assert demote_res.status_code == 400
    assert "Cannot demote the last active platform Super Admin" in demote_res.json()["detail"]

    # 3. Attempt to suspend the sole super admin -> MUST FAIL (400)
    suspend_res = client.post(
        "/api/v1/admin/users/usr-root-admin/suspend",
        headers=admin_headers
    )
    assert suspend_res.status_code == 400
    assert "Cannot suspend the last active platform Super Admin" in suspend_res.json()["detail"]

    # 4. Promote another user to super_admin
    promote_res = client.patch(
        "/api/v1/admin/users/usr-alex/role",
        headers=admin_headers,
        json={"role": "super_admin"}
    )
    assert promote_res.status_code == 200

    # 5. Now demoting root admin succeeds because second super admin exists
    demote_res2 = client.patch(
        "/api/v1/admin/users/usr-root-admin/role",
        headers=admin_headers,
        json={"role": "viewer"}
    )
    assert demote_res2.status_code == 200

# ================= 4. IMPERSONATION SESSION SECURITY ================= #

def test_impersonation_session_isolation():
    admin_headers = get_super_admin_headers()

    # 1. Start impersonation of comp-urbancraft
    imp_res = client.post(
        "/api/v1/admin/impersonate",
        headers=admin_headers,
        json={"companyId": "comp-urbancraft"}
    )
    assert imp_res.status_code == 200
    imp_data = imp_res.json()["data"]
    imp_token = imp_data["token"]
    assert imp_data["isImpersonation"] is True
    assert imp_data["impersonatorUserId"] == "usr-root-admin"

    imp_headers = {
        "Authorization": f"Bearer {imp_token}",
        "X-Company-ID": "comp-urbancraft"
    }

    # 2. Impersonated token can access target company resources
    comp_res = client.get("/api/v1/companies", headers=imp_headers)
    assert comp_res.status_code == 200

    # 3. Impersonated token MUST BE STRICTLY FORBIDDEN from calling /admin/* endpoints
    admin_probe = client.get("/api/v1/admin/tenants", headers=imp_headers)
    assert admin_probe.status_code == 403
    assert "Impersonation sessions cannot access super admin" in admin_probe.json()["detail"]

    # 4. Impersonation audit log must exist
    logs_res = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert any(l["action"] == "TENANT_IMPERSONATION_STARTED" for l in logs_res.json()["data"]["logs"])

# ================= 5. OBSERVABILITY, HEALTH PROBES & METRICS ================= #

def test_real_system_health_and_metrics():
    admin_headers = get_super_admin_headers()

    # 1. Health Probe
    h_res = client.get("/api/v1/admin/health", headers=admin_headers)
    assert h_res.status_code == 200
    h_data = h_res.json()["data"]
    assert h_data["overallStatus"] in ["healthy", "degraded"]
    assert len(h_data["services"]) >= 3
    # Check measured latency is real (integer > 0)
    for svc in h_data["services"]:
        assert svc["latencyMs"] >= 0
        assert "uptimePercent" in svc

    # 2. Metrics Reconciled
    m_res = client.get("/api/v1/admin/metrics", headers=admin_headers)
    assert m_res.status_code == 200
    m_data = m_res.json()["data"]
    assert m_data["totalTenants"] == len(db.companies)
    assert m_data["activeTenants"] <= m_data["totalTenants"]
    assert m_data["totalMRRINR"] > 0
    assert m_data["totalARRINR"] == m_data["totalMRRINR"] * 12

# ================= 6. EMERGENCY GLOBAL AI KILLSWITCH ================= #

def test_emergency_global_ai_killswitch():
    admin_headers = get_super_admin_headers()
    alex_headers = get_tenant_owner_headers()

    # 1. Verify killswitch is initially inactive
    k_status = client.get("/api/v1/admin/killswitch", headers=admin_headers)
    assert k_status.status_code == 200
    assert k_status.json()["data"]["active"] is False

    # 2. Activate Killswitch
    act_res = client.post(
        "/api/v1/admin/killswitch",
        headers=admin_headers,
        json={"active": True, "reason": "Upstream OpenAI incident outage"}
    )
    assert act_res.status_code == 200
    assert act_res.json()["data"]["active"] is True
    assert db.global_killswitch_active is True

    # 3. Chat request across all tenants must immediately receive 503
    chat_res = client.post(
        "/api/v1/chat",
        headers=alex_headers,
        json={"message": "Hello, are you there?"}
    )
    assert chat_res.status_code == 503
    assert "paused by platform administration" in chat_res.json()["detail"]

    # 4. Deactivate Killswitch
    deact_res = client.post(
        "/api/v1/admin/killswitch",
        headers=admin_headers,
        json={"active": False, "reason": "Incident resolved"}
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["data"]["active"] is False
    assert db.global_killswitch_active is False

    # 5. Chat request succeeds again
    chat_res2 = client.post(
        "/api/v1/chat",
        headers=alex_headers,
        json={"message": "What is TechFlow Cloud SLA?"}
    )
    assert chat_res2.status_code == 200

# ================= 7. TENANT DIAGNOSTICS ================= #

def test_tenant_diagnostic_probe():
    admin_headers = get_super_admin_headers()
    diag_res = client.post("/api/v1/admin/diagnostics/comp-techflow", headers=admin_headers)
    assert diag_res.status_code == 200
    diag_data = diag_res.json()["data"]
    assert diag_data["tenantId"] == "comp-techflow"
    assert "pgvectorLatency" in diag_data
    assert "knowledgeChunksIndexed" in diag_data
