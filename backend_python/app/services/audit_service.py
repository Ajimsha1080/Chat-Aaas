import time
from typing import Dict, Any, List
from app.db.database import db

class AuditService:
    @staticmethod
    def log(
        company_id: str,
        actor: str,
        actor_role: str,
        action: str,
        details: str,
        severity: str = "info",
        ip_address: str = "127.0.0.1"
    ) -> Dict[str, Any]:
        log_entry = {
            "id": f"aud-{int(time.time() * 1000)}",
            "companyId": company_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "actor": actor,
            "actorRole": actor_role,
            "action": action,
            "details": details,
            "ipAddress": ip_address,
            "severity": severity
        }
        db.audit_logs.append(log_entry)
        return log_entry

    @staticmethod
    def get_logs_for_company(company_id: str) -> List[Dict[str, Any]]:
        logs = [l for l in db.audit_logs if l.get("companyId") == company_id]
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return logs
