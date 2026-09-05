import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.main import app
from app.core.security import create_jwt_token

client = TestClient(app)

def test_full_agent_versioning_and_rollback_cycle():
    token = create_jwt_token("usr-alex", "comp-techflow", "owner")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Update draft
    draft_res = client.put(
        "/api/v1/agent/draft",
        json={
            "greetingMessage": "Hello! Welcome to FlowBot v3 Enterprise.",
            "tone": "empathetic"
        },
        headers=headers
    )
    assert draft_res.status_code == 200

    # 2. Publish new version
    pub_res = client.post(
        "/api/v1/agent/publish",
        json={"changeSummary": "Released empathetic tone"},
        headers=headers
    )
    assert pub_res.status_code == 200
    new_ver = pub_res.json()["data"]["version"]
    assert new_ver["status"] == "published"
    assert new_ver["versionNumber"] >= 2

    # 3. Check version history list
    ver_res = client.get("/api/v1/agent/versions", headers=headers)
    assert ver_res.status_code == 200
    versions = ver_res.json()["data"]["versions"]
    assert len(versions) >= 2

    # 4. Rollback to version 1
    v1 = [v for v in versions if v["versionNumber"] == 1][0]
    roll_res = client.post(
        "/api/v1/agent/rollback",
        json={"targetVersionId": v1["id"]},
        headers=headers
    )
    assert roll_res.status_code == 200
    assert roll_res.json()["data"]["activeVersion"]["versionNumber"] == 1
