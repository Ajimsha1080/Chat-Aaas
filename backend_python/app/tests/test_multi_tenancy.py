import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.main import app
from app.core.security import create_jwt_token
from app.db.database import db

client = TestClient(app)

def test_tenant_agent_isolation():
    token_a = create_jwt_token("usr-alex", "comp-techflow", "owner")
    token_b = create_jwt_token("usr-apex-1", "comp-apex-health", "owner")

    res_a = client.get("/api/v1/agent", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a.status_code == 200
    assert res_a.json()["data"]["agent"]["companyId"] == "comp-techflow"

    res_b = client.get("/api/v1/agent", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b.status_code == 200
    assert res_b.json()["data"]["agent"]["companyId"] == "comp-apex-health"

def test_tenant_cannot_access_other_tenant_conversations():
    token_b = create_jwt_token("usr-apex-1", "comp-apex-health", "owner")
    
    # Try to access conversation belonging to comp-techflow
    res = client.get("/api/v1/conversations/conv-tf-101", headers={"Authorization": f"Bearer {token_b}"})
    assert res.status_code == 404

def test_rbac_authorization_matrix():
    viewer_token = create_jwt_token("usr-viewer", "comp-techflow", "viewer")
    editor_token = create_jwt_token("usr-editor", "comp-techflow", "agent_editor")
    owner_token = create_jwt_token("usr-alex", "comp-techflow", "owner")

    # 1. Viewer cannot edit agent draft
    res_v = client.put("/api/v1/agent/draft", json={"tone": "casual"}, headers={"Authorization": f"Bearer {viewer_token}"})
    assert res_v.status_code == 403

    # 2. Editor can edit agent draft but cannot publish
    res_e_draft = client.put("/api/v1/agent/draft", json={"tone": "friendly"}, headers={"Authorization": f"Bearer {editor_token}"})
    assert res_e_draft.status_code == 200

    res_e_pub = client.post("/api/v1/agent/publish", json={"changeSummary": "Editor attempt"}, headers={"Authorization": f"Bearer {editor_token}"})
    assert res_e_pub.status_code == 403

    # 3. Owner can publish draft
    res_o_pub = client.post("/api/v1/agent/publish", json={"changeSummary": "Owner release"}, headers={"Authorization": f"Bearer {owner_token}"})
    assert res_o_pub.status_code == 200
