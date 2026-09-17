"""
One-Time Migration Script: Upgrade Integration Credentials to AES-256-GCM Envelope Encryption

Features:
1. Automated pre-migration backups of SQLite DB and JSON state files.
2. Safe inspection and identification of legacy base64 strings vs AES-256-GCM envelope JSONs.
3. Tenant-scoped envelope re-encryption using EnvelopeEncryption.encrypt_for_tenant().
4. Atomic database commit and durable state flushing.
5. Detailed audit output with migration metrics.
"""

import os
import sys
import shutil
import time
import json
import base64
from typing import Dict, Any

current_dir = os.path.dirname(os.path.abspath(__file__))
app_dir = os.path.dirname(current_dir)
backend_root = os.path.dirname(app_dir)
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.db.database import db
from app.core.envelope_encryption import EnvelopeEncryption
from app.core.security import decrypt_secret


def create_pre_migration_backup(data_dir: str) -> Dict[str, str]:
    """Creates a timestamped backup of the database and state snapshot before migration."""
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    os.makedirs(data_dir, exist_ok=True)
    backups = {}

    db_file = os.path.join(data_dir, "chat_aaas.db")
    if os.path.exists(db_file):
        backup_db = os.path.join(data_dir, f"chat_aaas_backup_pre_envelope_{timestamp}.db")
        shutil.copy2(db_file, backup_db)
        backups["db"] = backup_db

    state_file = os.path.join(data_dir, "chat_aaas_state.json")
    if os.path.exists(state_file):
        backup_state = os.path.join(data_dir, f"chat_aaas_state_backup_pre_envelope_{timestamp}.json")
        shutil.copy2(state_file, backup_state)
        backups["state"] = backup_state

    return backups


def is_envelope_encrypted(raw_value: str) -> bool:
    """Checks if the stored secret is already in AES-256-GCM envelope format."""
    if not raw_value:
        return False
    try:
        decoded = base64.b64decode(raw_value.encode("utf-8")).decode("utf-8")
        parsed = json.loads(decoded)
        return (
            isinstance(parsed, dict)
            and parsed.get("alg") == "AES-256-GCM"
            and "iv" in parsed
            and "data" in parsed
            and "cid" in parsed
        )
    except Exception:
        return False


def run_migration() -> Dict[str, Any]:
    """Executes the envelope encryption migration on all integration records."""
    print("=" * 70)
    print("MIGRATION: Upgrading Integration Credentials to Envelope Encryption")
    print("=" * 70)

    data_dir = db.db_dir
    print(f"[*] Target Data Directory: {data_dir}")
    backups = create_pre_migration_backup(data_dir)
    for k, path in backups.items():
        print(f"[*] Created Pre-Migration Backup ({k}): {path}")

    total_scanned = 0
    migrated_count = 0
    already_encrypted_count = 0
    errors = []

    for int_id, record in list(db.integrations.items()):
        total_scanned += 1
        company_id = record.get("companyId")
        raw_encrypted = record.get("encryptedCredentials", "")

        if not company_id:
            errors.append(f"Integration {int_id} missing companyId, skipping.")
            continue

        if not raw_encrypted:
            continue

        if is_envelope_encrypted(raw_encrypted):
            already_encrypted_count += 1
            continue

        try:
            # Decode legacy base64 secret or fallback to raw
            plaintext = decrypt_secret(raw_encrypted)

            # Re-encrypt with tenant envelope encryption
            new_encrypted = EnvelopeEncryption.encrypt_for_tenant(
                company_id=company_id,
                plain_data=plaintext
            )

            record["encryptedCredentials"] = new_encrypted
            migrated_count += 1
            print(f"[+] Migrated integration '{int_id}' for company '{company_id}'")
        except Exception as e:
            errors.append(f"Failed to migrate integration {int_id}: {str(e)}")

    if migrated_count > 0:
        db.save_state()
        print(f"[*] Flushed {migrated_count} updated integration records to durable database.")

    summary = {
        "status": "success" if not errors else "partial_success",
        "total_scanned": total_scanned,
        "migrated_count": migrated_count,
        "already_encrypted_count": already_encrypted_count,
        "backups": backups,
        "errors": errors
    }

    print("-" * 70)
    print(f"Migration Complete: {migrated_count} migrated, {already_encrypted_count} already encrypted, {len(errors)} errors.")
    print("=" * 70)
    return summary


if __name__ == "__main__":
    result = run_migration()
    if result["errors"]:
        sys.exit(1)
