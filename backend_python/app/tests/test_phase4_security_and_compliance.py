import pytest
import time
import base64
import json
import uuid
from app.services.audit_service import AuditService, GENESIS_HASH
from app.services.sso_service import SSOService
from app.core.envelope_encryption import EnvelopeEncryption
from app.services.pii_service import PIIService
from app.services.webhook_service import WebhookService, CircuitState, WebhookCircuitBreaker
from app.db.database import db

class TestPhase4AuditTrail:
    def test_audit_hash_chaining_and_tamper_detection(self):
        company_id = f"comp_soc2_{uuid.uuid4().hex[:8]}"
        # 1. Generate chain of audit events
        log1 = AuditService.log(company_id, "user_1", "admin", "LOGIN", "User logged in", severity="info")
        log2 = AuditService.log(company_id, "user_1", "admin", "UPDATE_SETTINGS", "Changed MFA settings", severity="warn")
        log3 = AuditService.log(company_id, "user_2", "member", "READ_DOCUMENT", "Viewed confidential PDF", severity="info")

        assert log1["prevHash"] == GENESIS_HASH
        assert log2["prevHash"] == log1["hash"]
        assert log3["prevHash"] == log2["hash"]

        # 2. Verify intact chain
        is_valid, msg = AuditService.verify_audit_chain(company_id)
        assert is_valid is True
        assert "verified" in msg

        # 3. Export audit trail
        trail = AuditService.export_audit_trail(company_id)
        assert trail["isChainValid"] is True
        assert trail["totalEntries"] == 3
        assert len(trail["auditBundleSha256Digest"]) == 64

        # 4. Simulate tampering with a historical record
        target_log = [l for l in db.audit_logs if l["id"] == log2["id"]][0]
        original_details = target_log["details"]
        target_log["details"] = "TAMPERED: Altered audit log message"

        tampered_valid, tamper_msg = AuditService.verify_audit_chain(company_id)
        assert tampered_valid is False
        assert "Tamper detected" in tamper_msg or "Broken chain" in tamper_msg

        # Restore original
        target_log["details"] = original_details
        restored_valid, _ = AuditService.verify_audit_chain(company_id)
        assert restored_valid is True


class TestPhase4EnterpriseSSO:
    def test_sso_registration_and_discovery(self):
        comp_id = f"comp_sso_{uuid.uuid4().hex[:8]}"
        SSOService.register_sso_config(
            company_id=comp_id,
            provider_type="saml",
            idp_name="okta",
            domains=["acmecorp.in", "acme-global.com"],
            issuer="http://www.okta.com/exk123456789",
            entrypoint_url="https://acme.okta.com/app/coarai/sso/saml",
            cert_or_secret="MIIDqjCCApKgAwIBAgIGAX..."
        )

        # Discovery by domain
        config1 = SSOService.discover_tenant_by_email("rahul@acmecorp.in")
        assert config1 is not None
        assert config1["companyId"] == comp_id

        config2 = SSOService.discover_tenant_by_email("priya@acme-global.com")
        assert config2 is not None
        assert config2["companyId"] == comp_id

        config_unknown = SSOService.discover_tenant_by_email("stranger@gmail.com")
        assert config_unknown is None

    def test_saml_request_and_response_validation(self):
        comp_id = f"comp_saml_{uuid.uuid4().hex[:8]}"
        SSOService.register_sso_config(
            company_id=comp_id,
            provider_type="saml",
            idp_name="azure_ad",
            domains=["azure-enterprise.com"],
            issuer="https://sts.windows.net/azure-tenant-id/",
            entrypoint_url="https://login.microsoftonline.com/saml2",
            cert_or_secret="CERT_SECRET"
        )

        authn = SSOService.generate_saml_authn_request(comp_id, relay_state="/dashboard")
        assert authn["requestId"].startswith("_saml_")
        assert "SAMLRequest=" in authn["redirectUrl"]

        # Synthetic SAML assertion
        sample_xml = f"""
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
            <saml:Issuer>https://sts.windows.net/azure-tenant-id/</saml:Issuer>
            <saml:Assertion>
                <saml:Subject>
                    <saml:NameID>vikram@azure-enterprise.com</saml:NameID>
                </saml:Subject>
                <saml:AttributeStatement>
                    <saml:Attribute Name="firstName"><saml:AttributeValue>Vikram</saml:AttributeValue></saml:Attribute>
                    <saml:Attribute Name="lastName"><saml:AttributeValue>Sharma</saml:AttributeValue></saml:Attribute>
                    <saml:Attribute Name="role"><saml:AttributeValue>admin</saml:AttributeValue></saml:Attribute>
                </saml:AttributeStatement>
            </saml:Assertion>
        </samlp:Response>
        """
        b64_response = base64.b64encode(sample_xml.encode("utf-8")).decode("utf-8")
        user = SSOService.process_saml_response(comp_id, b64_response)
        assert user["email"] == "vikram@azure-enterprise.com"
        assert user["name"] == "Vikram Sharma"
        assert user["role"] == "admin"

    def test_oidc_token_claims(self):
        comp_id = f"comp_oidc_{uuid.uuid4().hex[:8]}"
        SSOService.register_sso_config(
            company_id=comp_id,
            provider_type="oidc",
            idp_name="google_workspace",
            domains=["google-corp.in"],
            issuer="https://accounts.google.com",
            entrypoint_url="https://accounts.google.com/o/oauth2/auth",
            cert_or_secret="GOCSPX-secret",
            client_id="coarai-client-123.apps.googleusercontent.com"
        )

        claims = {
            "iss": "https://accounts.google.com",
            "aud": "coarai-client-123.apps.googleusercontent.com",
            "email": "ananya@google-corp.in",
            "name": "Ananya Roy",
            "role": "member"
        }
        res = SSOService.process_oidc_token(comp_id, claims)
        assert res["email"] == "ananya@google-corp.in"
        assert res["name"] == "Ananya Roy"


class TestPhase4EnvelopeEncryptionCMEK:
    def test_aes_gcm_tenant_encryption_and_isolation(self):
        t1 = f"tenant_{uuid.uuid4().hex[:8]}"
        t2 = f"tenant_{uuid.uuid4().hex[:8]}"
        secret_data = "CoarAI-Confidential-Financial-Record-2026"

        # Encrypt under tenant 1
        encrypted_t1 = EnvelopeEncryption.encrypt_for_tenant(t1, secret_data)
        assert encrypted_t1 != secret_data

        # Decrypt under tenant 1
        decrypted = EnvelopeEncryption.decrypt_for_tenant(t1, encrypted_t1)
        assert decrypted == secret_data

        # Cross-tenant decryption attempt must fail
        with pytest.raises(ValueError, match="Cross-tenant decryption attempt"):
            EnvelopeEncryption.decrypt_for_tenant(t2, encrypted_t1)

    def test_kek_rotation_without_data_reencryption(self):
        tenant = f"tenant_{uuid.uuid4().hex[:8]}"
        secret = "Top-Secret-Database-Credential"

        custom_kek_1 = b"12345678901234567890123456789012"
        custom_kek_2 = b"98765432109876543210987654321098"

        encrypted = EnvelopeEncryption.encrypt_for_tenant(tenant, secret, custom_kek=custom_kek_1)

        # Rotate KEK from 1 to 2
        meta = EnvelopeEncryption.rotate_tenant_kek(tenant, old_kek=custom_kek_1, new_kek=custom_kek_2)
        assert meta["version"] == 2

        # Decrypt with new KEK should succeed seamlessly
        decrypted = EnvelopeEncryption.decrypt_for_tenant(tenant, encrypted, custom_kek=custom_kek_2)
        assert decrypted == secret


class TestPhase4DynamicPIIRedaction:
    def test_indian_aadhaar_redaction(self):
        text = "Customer Aadhaar is 2182 5064 1250 and alternate is 3675-9834-6015"
        redacted, counts = PIIService.redact_text(text)
        assert "[AADHAAR_REDACTED]" in redacted
        assert "2182" not in redacted
        assert counts.get("aadhaar", 0) >= 1

    def test_indian_pan_redaction(self):
        text = "Company PAN is ABCDE1234F and founder PAN is FGHIJ5678K."
        redacted, counts = PIIService.redact_text(text)
        assert redacted == "Company PAN is [PAN_REDACTED] and founder PAN is [PAN_REDACTED]."
        assert counts["pan"] == 2

    def test_indian_phone_and_email_and_card(self):
        text = "Contact +91 9876543210 or email test@enterprise.in with card 4111-1111-1111-1111"
        redacted, counts = PIIService.redact_text(text)
        assert "[PHONE_REDACTED]" in redacted
        assert "[EMAIL_REDACTED]" in redacted
        assert "[CARD_REDACTED]" in redacted
        assert "9876543210" not in redacted
        assert "test@enterprise.in" not in redacted

    def test_partial_masking_for_ui(self):
        assert PIIService.mask_partial("ABCDE1234F", "pan") == "AB****4F"
        assert PIIService.mask_partial("9876543210", "phone") == "+91 ****** 3210"
        assert PIIService.mask_partial("raj@company.com", "email") == "r***@company.com"


class TestPhase4WebhookCircuitBreaker:
    def test_circuit_breaker_trips_to_open_after_failures(self):
        breaker = WebhookCircuitBreaker(failure_threshold=3, cooldown_seconds=0.2)
        ep = f"ep_{uuid.uuid4().hex[:8]}"

        assert breaker.get_circuit_state(ep) == CircuitState.CLOSED

        breaker.record_failure(ep, "Connection refused")
        breaker.record_failure(ep, "502 Bad Gateway")
        assert breaker.get_circuit_state(ep) == CircuitState.CLOSED

        # 3rd failure trips the breaker
        state = breaker.record_failure(ep, "503 Service Unavailable")
        assert state == CircuitState.OPEN
        assert breaker.get_circuit_state(ep) == CircuitState.OPEN

        # Fast forward past cooldown
        time.sleep(0.25)
        assert breaker.get_circuit_state(ep) == CircuitState.HALF_OPEN

        # Success in HALF_OPEN resets circuit to CLOSED
        breaker.record_success(ep)
        assert breaker.get_circuit_state(ep) == CircuitState.CLOSED

    def test_webhook_signature_computation(self):
        payload = b'{"event":"payment.captured","amount":99900}'
        secret = "whsec_test_secret_key_123"
        ts = 1715000000

        sig = WebhookService.compute_signature(payload, secret, ts)
        assert sig.startswith(f"t={ts},v1=")
        assert len(sig.split("v1=")[1]) == 64
