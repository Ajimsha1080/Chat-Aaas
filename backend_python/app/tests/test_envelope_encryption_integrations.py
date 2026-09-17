import json
import uuid
import base64
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import db
from app.core.envelope_encryption import EnvelopeEncryption
from app.core.security import encrypt_secret, decrypt_secret
from app.scripts.migrate_integration_credentials import run_migration, is_envelope_encrypted

client = TestClient(app)

def get_auth_token(email="alex@techflow.io", password="Password123!"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["token"]


def test_envelope_encryption_durability_across_process_restart():
    """Verify DEKs survive cache clearing / restarts and correctly decrypt previously encrypted tenant data."""
    company_id = f"comp-durability-{uuid.uuid4().hex[:8]}"
    secret_payload = "confidential-tenant-api-token-998811"

    # Encrypt
    encrypted_envelope = EnvelopeEncryption.encrypt_for_tenant(company_id, secret_payload)
    assert encrypted_envelope is not None

    # Simulate full process restart / cold boot by wiping in-memory registry
    EnvelopeEncryption._TENANT_DEK_REGISTRY.clear()
    assert company_id not in EnvelopeEncryption._TENANT_DEK_REGISTRY

    # Verify that decryption successfully restores DEK from DB and decrypts accurately
    decrypted = EnvelopeEncryption.decrypt_for_tenant(company_id, encrypted_envelope)
    assert decrypted == secret_payload

    # Verify memory registry was repopulated
    assert company_id in EnvelopeEncryption._TENANT_DEK_REGISTRY


def test_integration_credentials_not_recoverable_via_plain_base64():
    """Verify that credentials stored via POST /integrations/connect are encrypted with AES-256-GCM and not simple base64."""
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "provider": "slack",
        "name": "Production Slack Alerts",
        "credentials": {
            "bot_user_oauth_token": "xoxb-super-secret-production-token-12345",
            "signing_secret": "99aabbccddeeff0011223344"
        },
        "config": {"default_channel": "#alerts"}
    }

    res = client.post("/api/v1/integrations/connect", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    int_id = res.json()["data"]["id"]

    # Inspect the raw stored record in database
    record = db.integrations.get(int_id)
    assert record is not None
    stored_ciphertext = record["encryptedCredentials"]

    # 1. Plain base64 decode should NOT reveal plaintext credentials
    b64_decoded = base64.b64decode(stored_ciphertext.encode("utf-8")).decode("utf-8")
    assert "xoxb-super-secret-production-token-12345" not in b64_decoded
    assert "99aabbccddeeff0011223344" not in b64_decoded

    # 2. Legacy decrypt_secret should NOT yield plaintext credentials
    legacy_decrypted = decrypt_secret(stored_ciphertext)
    assert "xoxb-super-secret-production-token-12345" not in legacy_decrypted

    # 3. Envelope structure check
    envelope_obj = json.loads(b64_decoded)
    assert envelope_obj.get("alg") == "AES-256-GCM"
    assert envelope_obj.get("cid") == "comp-techflow"
    assert "iv" in envelope_obj
    assert "data" in envelope_obj

    # 4. Authorized tenant decryption should return the plaintext credentials
    company_id = record["companyId"]
    plaintext_json = EnvelopeEncryption.decrypt_for_tenant(company_id, stored_ciphertext)
    creds = json.loads(plaintext_json)
    assert creds["bot_user_oauth_token"] == "xoxb-super-secret-production-token-12345"
    assert creds["signing_secret"] == "99aabbccddeeff0011223344"


def test_cross_tenant_decryption_isolation():
    """Verify that a tenant cannot decrypt envelopes belonging to another tenant."""
    tenant_a = f"comp-alpha-{uuid.uuid4().hex[:8]}"
    tenant_b = f"comp-bravo-{uuid.uuid4().hex[:8]}"

    tenant_a_secret = "secret-alpha-keys-4321"
    envelope_a = EnvelopeEncryption.encrypt_for_tenant(tenant_a, tenant_a_secret)

    # Attempting to decrypt tenant A's envelope with tenant B context must raise ValueError
    with pytest.raises(ValueError) as exc_info:
        EnvelopeEncryption.decrypt_for_tenant(tenant_b, envelope_a)

    assert "Cross-tenant decryption attempt" in str(exc_info.value) or "Failed" in str(exc_info.value)


def test_envelope_key_rotation():
    """Verify that KEK rotation re-wraps DEKs and allows decryption under new master KEK."""
    company_id = f"comp-rotation-{uuid.uuid4().hex[:8]}"
    test_secret = "data-protected-across-rotation"

    old_kek = b"0" * 32
    new_kek = b"1" * 32

    # Encrypt under old KEK
    encrypted_envelope = EnvelopeEncryption.encrypt_for_tenant(company_id, test_secret, custom_kek=old_kek)

    # Rotate KEK
    rotated_meta = EnvelopeEncryption.rotate_tenant_kek(company_id, old_kek=old_kek, new_kek=new_kek)
    assert rotated_meta["version"] == 2
    assert "rotated_at" in rotated_meta

    # Verify decrypt with new KEK succeeds
    decrypted = EnvelopeEncryption.decrypt_for_tenant(company_id, encrypted_envelope, custom_kek=new_kek)
    assert decrypted == test_secret


def test_migration_script_re_encrypts_legacy_credentials():
    """Verify the migration script correctly upgrades legacy base64 credentials to envelope encryption."""
    legacy_company_id = f"comp-legacy-{uuid.uuid4().hex[:8]}"
    legacy_int_id = f"int-legacy-{uuid.uuid4().hex[:8]}"
    raw_credentials_str = json.dumps({"client_id": "legacy_client_1", "client_secret": "legacy_secret_abc"})

    # Store legacy base64 record
    legacy_b64 = encrypt_secret(raw_credentials_str)
    assert not is_envelope_encrypted(legacy_b64)

    db.integrations[legacy_int_id] = {
        "id": legacy_int_id,
        "companyId": legacy_company_id,
        "provider": "salesforce",
        "name": "Legacy Salesforce Connector",
        "status": "connected",
        "encryptedCredentials": legacy_b64,
        "config": {},
        "connectedAt": "2026-08-01T00:00:00Z",
        "createdAt": "2026-08-01T00:00:00Z"
    }

    # Run migration
    res = run_migration()
    assert res["status"] in ["success", "partial_success"]
    assert res["migrated_count"] >= 1

    # Check that record is now envelope encrypted
    migrated_record = db.integrations[legacy_int_id]
    new_encrypted = migrated_record["encryptedCredentials"]
    assert is_envelope_encrypted(new_encrypted)

    # Decrypt via EnvelopeEncryption
    decrypted_str = EnvelopeEncryption.decrypt_for_tenant(legacy_company_id, new_encrypted)
    decrypted_creds = json.loads(decrypted_str)
    assert decrypted_creds["client_id"] == "legacy_client_1"
    assert decrypted_creds["client_secret"] == "legacy_secret_abc"

