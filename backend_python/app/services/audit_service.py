import hashlib
import json
import time
from typing import Dict, Any, List, Tuple, Optional
from app.db.database import db

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

class AuditService:
    """
    SOC2 Type II & ISO27001 compliant immutable audit logging engine
    with cryptographic SHA-256 tamper-evident hash chaining.
    """
    @staticmethod
    def _compute_hash(
        prev_hash: str,
        log_id: str,
        company_id: str,
        timestamp: str,
        actor: str,
        actor_role: str,
        action: str,
        details: str,
        severity: str,
        ip_address: str
    ) -> str:
        payload = f"{prev_hash}|{log_id}|{company_id}|{timestamp}|{actor}|{actor_role}|{action}|{details}|{severity}|{ip_address}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @staticmethod
    def log(
        company_id: str,
        actor: str,
        actor_role: str,
        action: str,
        details: str,
        severity: str = "info",
        ip_address: str = "127.0.0.1",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Atomically appends an audit record linked to the previous tenant record hash."""
        tenant_logs = [l for l in db.audit_logs if l.get("companyId") == company_id]
        prev_hash = tenant_logs[-1]["hash"] if tenant_logs and "hash" in tenant_logs[-1] else GENESIS_HASH

        now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        log_id = f"aud_{int(time.time() * 1000)}_{len(db.audit_logs) + 1}"
        
        current_hash = AuditService._compute_hash(
            prev_hash=prev_hash,
            log_id=log_id,
            company_id=company_id,
            timestamp=now_str,
            actor=actor,
            actor_role=actor_role,
            action=action,
            details=details,
            severity=severity,
            ip_address=ip_address
        )

        log_entry = {
            "id": log_id,
            "companyId": company_id,
            "timestamp": now_str,
            "createdAt": now_str,
            "actor": actor,
            "actorId": actor,
            "actorRole": actor_role,
            "action": action,
            "details": details,
            "severity": severity,
            "ipAddress": ip_address,
            "metadata": metadata or {},
            "prevHash": prev_hash,
            "hash": current_hash
        }

        db.audit_logs.append(log_entry)
        db.flush_durable_storage()
        return log_entry

    @staticmethod
    def get_logs_for_company(company_id: str) -> List[Dict[str, Any]]:
        """Returns sorted audit logs for tenant."""
        logs = [l for l in db.audit_logs if l.get("companyId") == company_id]
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return logs

    @staticmethod
    def verify_audit_chain(company_id: str) -> Tuple[bool, str]:
        """
        Cryptographically validates the entire chronological audit chain for a tenant.
        Returns (True, 'Valid') if untampered, or (False, reason) if corruption/tampering is detected.
        """
        tenant_logs = [l for l in db.audit_logs if l.get("companyId") == company_id]
        tenant_logs.sort(key=lambda x: x.get("timestamp", ""))

        if not tenant_logs:
            return True, "Audit log chain is empty and valid."

        expected_prev = GENESIS_HASH
        for i, entry in enumerate(tenant_logs):
            actual_prev = entry.get("prevHash", GENESIS_HASH)
            if actual_prev != expected_prev:
                return False, f"Broken chain link at log {entry['id']} (index {i}): expected prevHash {expected_prev}, got {actual_prev}"

            computed = AuditService._compute_hash(
                prev_hash=actual_prev,
                log_id=entry["id"],
                company_id=company_id,
                timestamp=entry.get("timestamp") or entry.get("createdAt", ""),
                actor=entry.get("actor") or entry.get("actorId", ""),
                actor_role=entry.get("actorRole", ""),
                action=entry.get("action", ""),
                details=entry.get("details", ""),
                severity=entry.get("severity", "info"),
                ip_address=entry.get("ipAddress", "127.0.0.1")
            )

            if computed != entry.get("hash"):
                return False, f"Tamper detected at log {entry['id']}: record hash {entry.get('hash')} does not match computed digest {computed}"

            expected_prev = entry.get("hash", computed)

        return True, f"Cryptographic audit chain verified ({len(tenant_logs)} blocks valid)."

    @staticmethod
    def export_audit_trail(company_id: str) -> Dict[str, Any]:
        """Generates a SOC2 compliance audit export bundle with cryptographic seal."""
        logs = [l for l in db.audit_logs if l.get("companyId") == company_id]
        is_valid, reason = AuditService.verify_audit_chain(company_id)
        
        canonical_json = json.dumps(logs, sort_keys=True, ensure_ascii=False)
        bundle_digest = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

        return {
            "complianceStandard": "SOC2_Type_II_ISO27001",
            "companyId": company_id,
            "exportTimestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "totalEntries": len(logs),
            "isChainValid": is_valid,
            "chainVerificationMessage": reason,
            "auditBundleSha256Digest": bundle_digest,
            "logs": logs
        }
