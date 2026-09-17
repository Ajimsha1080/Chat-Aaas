import base64
import json
import os
import time
from typing import Dict, Any, Optional, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

# Master Key for wrapping tenant DEKs (256-bit)
# In production, this can come from AWS KMS / GCP KMS / HashiCorp Vault.
DEFAULT_MASTER_KEK = getattr(settings, "MASTER_ENCRYPTION_KEY", None)
if not DEFAULT_MASTER_KEK:
    # 32-byte key derived from JWT_SECRET or default seed
    import hashlib
    DEFAULT_MASTER_KEK = hashlib.sha256((settings.JWT_SECRET + "_master_kek_salt").encode()).digest()
elif isinstance(DEFAULT_MASTER_KEK, str):
    import hashlib
    DEFAULT_MASTER_KEK = hashlib.sha256(DEFAULT_MASTER_KEK.encode()).digest()

class EnvelopeEncryption:
    """
    Enterprise Envelope Encryption (CMEK / BYOK) with AES-256-GCM.
    Root Key Encryption Key (KEK) wraps tenant Data Encryption Keys (DEK).
    All tenant data at rest is encrypted with tenant-specific DEKs.
    """

    # In-memory or persisted registry of tenant wrapped DEKs
    _TENANT_DEK_REGISTRY: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_or_create_tenant_dek(
        cls,
        company_id: str,
        custom_kek: Optional[bytes] = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Retrieves decrypted DEK for tenant, generating and wrapping a new DEK if none exists.
        Returns (plaintext_dek, wrapped_metadata).
        """
        kek = custom_kek or DEFAULT_MASTER_KEK
        aes_kek = AESGCM(kek)

        # 1. Check in-memory registry
        meta = cls._TENANT_DEK_REGISTRY.get(company_id)

        # 2. If not in memory, query durable database
        if not meta:
            try:
                from app.db.database import db
                meta = db.get_tenant_key(company_id)
                if meta:
                    cls._TENANT_DEK_REGISTRY[company_id] = meta
            except Exception:
                meta = None

        # 3. If found in registry or DB, unwrap and return
        if meta:
            nonce = base64.b64decode(meta["nonce"])
            ciphertext = base64.b64decode(meta["wrapped_dek"])
            try:
                plaintext_dek = aes_kek.decrypt(nonce, ciphertext, company_id.encode("utf-8"))
                return plaintext_dek, meta
            except Exception as e:
                if custom_kek is not None:
                    raise ValueError(f"Failed to unwrap DEK for tenant {company_id}: {str(e)}")
                # If default KEK fails to unwrap (e.g. ephemeral dev/test secret regenerated), generate a fresh DEK

        # 4. Generate fresh 256-bit DEK, wrap and persist
        plaintext_dek = os.urandom(32)
        nonce = os.urandom(12)  # 96-bit nonce for GCM
        wrapped_dek = aes_kek.encrypt(nonce, plaintext_dek, company_id.encode("utf-8"))

        meta = {
            "company_id": company_id,
            "version": 1,
            "nonce": base64.b64encode(nonce).decode("utf-8"),
            "wrapped_dek": base64.b64encode(wrapped_dek).decode("utf-8"),
            "algorithm": "AES-256-GCM",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        cls._TENANT_DEK_REGISTRY[company_id] = meta
        try:
            from app.db.database import db
            db.save_tenant_key(meta)
        except Exception:
            pass
        return plaintext_dek, meta

    @classmethod
    def rotate_tenant_kek(
        cls,
        company_id: str,
        old_kek: Optional[bytes],
        new_kek: bytes
    ) -> Dict[str, Any]:
        """
        Rotates KEK by unwrapping existing DEK with old KEK and re-wrapping with new KEK.
        Does not require re-encrypting existing database rows.
        """
        old_k = old_kek or DEFAULT_MASTER_KEK
        old_aes = AESGCM(old_k)
        new_aes = AESGCM(new_kek)

        meta = cls._TENANT_DEK_REGISTRY.get(company_id)
        if not meta:
            try:
                from app.db.database import db
                meta = db.get_tenant_key(company_id)
                if meta:
                    cls._TENANT_DEK_REGISTRY[company_id] = meta
            except Exception:
                meta = None

        if not meta:
            raise ValueError(f"No existing DEK found for tenant {company_id}")

        old_nonce = base64.b64decode(meta["nonce"])
        old_wrapped = base64.b64decode(meta["wrapped_dek"])
        plaintext_dek = old_aes.decrypt(old_nonce, old_wrapped, company_id.encode("utf-8"))

        new_nonce = os.urandom(12)
        new_wrapped = new_aes.encrypt(new_nonce, plaintext_dek, company_id.encode("utf-8"))

        meta["nonce"] = base64.b64encode(new_nonce).decode("utf-8")
        meta["wrapped_dek"] = base64.b64encode(new_wrapped).decode("utf-8")
        meta["version"] = meta.get("version", 1) + 1
        meta["rotated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")

        cls._TENANT_DEK_REGISTRY[company_id] = meta
        try:
            from app.db.database import db
            db.save_tenant_key(meta)
        except Exception:
            pass
        return meta

    @classmethod
    def encrypt_for_tenant(
        cls,
        company_id: str,
        plain_data: str,
        custom_kek: Optional[bytes] = None
    ) -> str:
        """
        Encrypts plaintext string with tenant's AES-256-GCM DEK.
        Returns a compact JSON envelope string.
        """
        plaintext_dek, meta = cls.get_or_create_tenant_dek(company_id, custom_kek=custom_kek)
        aes_dek = AESGCM(plaintext_dek)

        nonce = os.urandom(12)
        ciphertext = aes_dek.encrypt(nonce, plain_data.encode("utf-8"), company_id.encode("utf-8"))

        envelope = {
            "v": meta.get("version", 1),
            "alg": "AES-256-GCM",
            "cid": company_id,
            "iv": base64.b64encode(nonce).decode("utf-8"),
            "data": base64.b64encode(ciphertext).decode("utf-8")
        }
        return base64.b64encode(json.dumps(envelope).encode("utf-8")).decode("utf-8")

    @classmethod
    def decrypt_for_tenant(
        cls,
        company_id: str,
        encrypted_envelope: str,
        custom_kek: Optional[bytes] = None
    ) -> str:
        """
        Decrypts an envelope encrypted payload using the tenant's DEK.
        """
        try:
            raw_json = base64.b64decode(encrypted_envelope.encode("utf-8")).decode("utf-8")
            envelope = json.loads(raw_json)
        except Exception:
            # Fallback if unencrypted legacy plain text
            return encrypted_envelope

        if envelope.get("cid") != company_id:
            raise ValueError(f"Cross-tenant decryption attempt: envelope tenant {envelope.get('cid')} != current tenant {company_id}")

        plaintext_dek, _ = cls.get_or_create_tenant_dek(company_id, custom_kek=custom_kek)
        aes_dek = AESGCM(plaintext_dek)

        nonce = base64.b64decode(envelope["iv"])
        ciphertext = base64.b64decode(envelope["data"])

        decrypted_bytes = aes_dek.decrypt(nonce, ciphertext, company_id.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
